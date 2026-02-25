import os
import io
import re
import json
from typing import TypedDict, List
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from langgraph.graph import StateGraph, END
from PIL import Image

# Load environment variables
load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY")
if not API_KEY:
    raise RuntimeError("GEMINI_API_KEY is not set. Please add it to your .env file.")
PORT = int(os.getenv("PORT", 8000))

# Initialize Gemini Client (google-genai, current SDK)
client = genai.Client(api_key=API_KEY)


# ─────────────────────────────────────────
# 1. State
# ─────────────────────────────────────────
class TraceState(TypedDict):
    user_query:     str
    image_bytes:    bytes
    rectangles:     List[dict]   # Parsed nodes  {"label", "type", "bbox"}
    edges:          List[dict]   # Parsed edges  {"from", "to", "action"}
    gemini_raw:     str          # Raw Gemini text (node pass)
    response:       str
    generated_code: str          # Trace-to-Code output


# ─────────────────────────────────────────
# 2. Helpers
# ─────────────────────────────────────────

def strip_json_markdown(text: str) -> str:
    """Strips ```json ... ``` or ``` ... ``` fences from Gemini responses."""
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*\n?", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\n?```\s*$", "", text)
    return text.strip()


def _parse_json_objects(raw: str, required_keys: set) -> List[dict]:
    """
    Robustly extracts JSON objects from Gemini's response regardless of how
    it is wrapped (markdown fences, prose paragraphs, mixed content, etc.).

    Strategy:
      1. Strip outer markdown fences.
      2. Try to json.loads the whole thing as an array or single object.
      3. Use regex to find every {...} block anywhere in the text and parse each.
    Only items that contain all `required_keys` are kept.
    """
    results: List[dict] = []
    seen: set = set()
    cleaned = strip_json_markdown(raw)

    def _accept(item: dict) -> bool:
        """Check required keys and dedup."""
        if not required_keys.issubset(item):
            return False
        key = tuple(sorted((k, str(v)) for k, v in item.items() if k in required_keys))
        if key in seen:
            return False
        seen.add(key)
        return True

    # Attempt 1 — whole payload is a JSON array
    try:
        data = json.loads(cleaned)
        if isinstance(data, list):
            for item in data:
                if isinstance(item, dict) and _accept(item):
                    results.append(item)
            if results:
                return results
        elif isinstance(data, dict) and _accept(data):
            return [data]
    except json.JSONDecodeError:
        pass

    # Attempt 2 — regex: find every {...} block (handles nested braces)
    # Walk character-by-character to extract balanced brace blocks
    i, n = 0, len(cleaned)
    while i < n:
        if cleaned[i] != "{":
            i += 1
            continue
        depth, j = 0, i
        while j < n:
            if cleaned[j] == "{": depth += 1
            elif cleaned[j] == "}": depth -= 1
            if depth == 0:
                break
            j += 1
        candidate = cleaned[i:j + 1]
        try:
            item = json.loads(candidate)
            if isinstance(item, dict) and _accept(item):
                results.append(item)
        except json.JSONDecodeError:
            pass
        i = j + 1

    return results


def parse_entities_from_json(raw: str) -> List[dict]:
    """Returns node dicts with keys: label, type, bbox."""
    raw_items = _parse_json_objects(raw, {"label", "type"})
    return [
        {
            "label": str(it["label"]),
            "type":  str(it["type"]),
            "bbox":  it.get("bbox", []),
        }
        for it in raw_items
    ]


def parse_edges_from_json(raw: str) -> List[dict]:
    """Returns edge dicts with keys: from, to, action."""
    raw_items = _parse_json_objects(raw, {"from", "to"})
    return [
        {
            "from":   str(it["from"]),
            "to":     str(it["to"]),
            "action": str(it.get("action", "connects")),
        }
        for it in raw_items
    ]


# ─────────────────────────────────────────
# 3. Nodes
# ─────────────────────────────────────────

def vision_parser_node(state: TraceState):
    """
    Single-pass Gemini Vision call (uses gemini-2.0-flash-lite for free-tier headroom).
    Asks for a unified JSON object containing both 'nodes' and 'edges' arrays,
    cutting API quota usage in half vs. the old two-pass approach.
    """
    print("--- TRACE VISION: ANALYZING DIAGRAM ---")

    unified_prompt = (
        "You are a diagram parser. Analyze the image carefully.\n\n"
        "Return ONLY a single valid JSON object — no prose, no markdown fences — in this exact schema:\n"
        "{\n"
        '  "nodes": [\n'
        '    {"label": "NODE_NAME", "type": "TYPE", "bbox": [ymin, xmin, ymax, xmax]}\n'
        "  ],\n"
        '  "edges": [\n'
        '    {"from": "SOURCE_LABEL", "to": "TARGET_LABEL", "action": "VERB_OR_LINE_LABEL"}\n'
        "  ]\n"
        "}\n\n"
        "Rules:\n"
        "- 'nodes': every box, circle, cylinder, actor, or cloud in the diagram.\n"
        "  type must be one of: Actor, Process, Database, Interface.\n"
        "- 'edges': every arrow, line, or dotted connector between nodes.\n"
        "  Use the exact labels visible in the diagram; infer a verb if no label exists.\n"
        "- bbox values are normalised floats 0-1 (ymin, xmin, ymax, xmax).\n"
        "- Do NOT output anything except the JSON object."
    )

    fallback_node  = [{"label": "Unknown Component", "type": "Process", "bbox": []}]
    fallback_edges: List[dict] = []

    try:
        img = Image.open(io.BytesIO(state["image_bytes"]))

        resp     = client.models.generate_content(
            model="gemini-2.0-flash-lite",
            contents=[unified_prompt, img],
        )
        raw_text = resp.text
        print(f"[Vision] raw ({len(raw_text)} chars): {raw_text[:300]}...")

        # ── Parse unified response ───────────────────────────────────────────
        cleaned = strip_json_markdown(raw_text)
        try:
            data = json.loads(cleaned)
        except json.JSONDecodeError:
            # Try to salvage by finding the outermost {...} block
            m = re.search(r"\{.*\}", cleaned, re.DOTALL)
            data = json.loads(m.group(0)) if m else {}

        raw_nodes = data.get("nodes", []) if isinstance(data, dict) else []
        raw_edges = data.get("edges", []) if isinstance(data, dict) else []

        entities: List[dict] = [
            {"label": str(n["label"]), "type": str(n.get("type", "Process")), "bbox": n.get("bbox", [])}
            for n in raw_nodes if isinstance(n, dict) and "label" in n
        ]
        edges: List[dict] = [
            {"from": str(e["from"]), "to": str(e["to"]), "action": str(e.get("action", "connects"))}
            for e in raw_edges if isinstance(e, dict) and "from" in e and "to" in e
        ]

        # If the top-level parse found nothing, fall back to the robust scanner
        if not entities:
            print("Unified parse yielded 0 nodes — running fallback scanner...")
            entities = parse_entities_from_json(raw_text)
        if not edges:
            edges = parse_edges_from_json(raw_text)
        if not entities:
            entities = fallback_node

        print(f"Parsed {len(entities)} nodes, {len(edges)} edges")
        return {
            "rectangles": entities,
            "edges":      edges,
            "gemini_raw": raw_text,
        }

    except Exception as e:
        err_str = str(e)
        print(f"Gemini vision error: {err_str[:200]}")
        # Re-raise quota/rate-limit errors so the API returns a proper HTTP error
        # instead of silently showing 'Unknown Component' to the user.
        if "RESOURCE_EXHAUSTED" in err_str or "429" in err_str:
            raise
        return {
            "rectangles": fallback_node,
            "edges":      fallback_edges,
            "gemini_raw": f"[API unavailable: {err_str[:200]}]",
        }


def rag_node(state: TraceState):
    """
    Answers the user query using detected entities, edges, and Gemini's raw analysis.
    """
    query    = state["user_query"]
    entities = state["rectangles"]
    edges    = state.get("edges", [])
    raw      = state.get("gemini_raw", "")
    labels   = [e["label"] for e in entities]

    if not entities:
        return {"response": "No entities detected. Please upload a clearer diagram."}

    edge_summary = ""
    if edges:
        lines = [f"  {ed['from']} --[{ed['action']}]--> {ed['to']}" for ed in edges]
        edge_summary = "\n\nDetected relationships:\n" + "\n".join(lines)

    if raw and not raw.startswith("[API"):
        response = (
            f"Based on your diagram, I identified: {', '.join(labels)}.{edge_summary}\n\n"
            f'Regarding "{query}":\n{raw[:400]}'
        )
    else:
        q = query.lower()
        if "flow" in q or "work" in q or "how" in q:
            if edges:
                flow = " → ".join(f"{ed['from']} ({ed['action']}) {ed['to']}" for ed in edges)
                response = f"The diagram shows this flow:\n{flow}"
            else:
                response = f"The diagram shows the following components: {' → '.join(labels)}."
        elif len(labels) >= 2:
            response = (
                f"Your diagram contains: {labels}. "
                f'Ensure "{labels[1]}" correctly handles input from "{labels[0]}".'
            )
        else:
            response = f"I detected '{labels[0]}'. Could you clarify what you'd like to know?"

    return {"response": response}


def code_gen_node(state: TraceState):
    """
    Trace-to-Code (Relational Edition):
    - Database nodes       → SQL CREATE TABLE DDL
    - DB → DB edge         → FOREIGN KEY constraint
    - Actor + Process      → FastAPI endpoint skeleton
    - Actor → Process edge → endpoint accepts actor_id path parameter
    - Default              → comment summary
    """
    print("--- TRACE CODE GEN: GENERATING PROJECT SKELETON ---")

    entities = state["rectangles"]
    edges    = state.get("edges", [])
    types    = {e["type"] for e in entities}
    labels   = [e["label"] for e in entities]

    def safe_id(name: str) -> str:
        return re.sub(r"[^A-Za-z0-9_]", "_", name)

    def safe_class(name: str) -> str:
        return re.sub(r"[^A-Za-z0-9]", "", name)

    code_sections: List[str] = []

    # ── SQL DDL ──────────────────────────────────────────────────────────────
    db_nodes = [e for e in entities if e["type"] == "Database"]
    if db_nodes:
        sql_lines: List[str] = ["-- ============================================================\n",
                                "-- SQL DDL  (auto-generated by Trace)\n",
                                "-- ============================================================\n\n"]

        # CREATE TABLE for every DB node
        for node in db_nodes:
            tbl = safe_id(node["label"])
            sql_lines.append(
                f"CREATE TABLE IF NOT EXISTS {tbl} (\n"
                f"    id          SERIAL PRIMARY KEY,\n"
                f"    created_at  TIMESTAMP DEFAULT NOW()\n"
                f"    -- TODO: add columns for '{node['label']}'\n"
                f");\n\n"
            )

        # FOREIGN KEYs for DB → DB edges
        fk_edges = [
            ed for ed in edges
            if any(e["label"] == ed["from"] and e["type"] == "Database" for e in entities)
            and any(e["label"] == ed["to"]   and e["type"] == "Database" for e in entities)
        ]
        if fk_edges:
            sql_lines.append("-- Relationships\n")
            for ed in fk_edges:
                src = safe_id(ed["from"])
                tgt = safe_id(ed["to"])
                sql_lines.append(
                    f"ALTER TABLE {src}\n"
                    f"    ADD COLUMN  {tgt}_id INT REFERENCES {tgt}(id)  -- {ed['action']}\n"
                    f"    ON DELETE SET NULL;\n\n"
                )

        code_sections.append("".join(sql_lines))

    # ── FastAPI skeleton ──────────────────────────────────────────────────────
    if "Actor" in types and "Process" in types:
        actor_nodes   = [e for e in entities if e["type"] == "Actor"]
        process_nodes = [e for e in entities if e["type"] == "Process"]

        py_lines: List[str] = [
            "# ============================================================\n",
            "# FastAPI Project Skeleton  (auto-generated by Trace)\n",
            "# ============================================================\n\n",
            "from fastapi import FastAPI, HTTPException\n",
            "from pydantic import BaseModel\n",
            "from typing import Optional\n\n",
            "app = FastAPI(title=\"Trace Generated API\")\n\n",
        ]

        # Build a lookup: which actor(s) connect to which process via edges
        actor_for_proc: dict = {}
        for ed in edges:
            frm_actor = next((e for e in actor_nodes   if e["label"] == ed["from"]), None)
            to_proc   = next((e for e in process_nodes if e["label"] == ed["to"]),   None)
            if frm_actor and to_proc:
                actor_for_proc[to_proc["label"]] = (frm_actor["label"], ed["action"])

        for proc in process_nodes:
            cls       = safe_class(proc["label"])
            route     = "/" + safe_id(proc["label"]).lower()
            actor_info = actor_for_proc.get(proc["label"])

            if actor_info:
                actor_label, action_verb = actor_info
                actor_id_param = f"\n    {safe_id(actor_label).lower()}_id: int,  # from edge: {action_verb}"
                actor_comment  = f"Triggered by '{actor_label}' via '{action_verb}'"
            else:
                actor_id_param = ""
                actor_comment  = "No direct actor edge detected"

            py_lines.append(
                f"class {cls}Request(BaseModel):\n"
                f"    # TODO: define fields  ({actor_comment})\n"
                f"    pass\n\n"
                f"@app.post(\"{route}\")\n"
                f"async def {safe_id(proc['label']).lower()}({actor_id_param}\n"
                f"    request: {cls}Request,\n"
                f"):\n"
                f"    \"\"\"\n"
                f"    {actor_comment}\n"
                f"    Process: {proc['label']}\n"
                f"    \"\"\"\n"
                f"    # TODO: implement\n"
                f"    return {{\"status\": \"ok\"}}\n\n\n"
            )

        code_sections.append("".join(py_lines))

    # ── Default fallback ─────────────────────────────────────────────────────
    if not code_sections:
        code_sections.append(
            f"# Trace detected: {', '.join(labels)}\n"
            f"# Edges: {[(ed['from'], ed['action'], ed['to']) for ed in edges]}\n"
            f"# No code template matched — add Database or (Actor + Process) nodes.\n"
        )

    generated_code = "\n".join(code_sections)
    print(f"Generated code ({len(generated_code)} chars)")
    return {"generated_code": generated_code}


# ─────────────────────────────────────────
# 4. Compile the Graph
# ─────────────────────────────────────────
workflow = StateGraph(TraceState)
workflow.add_node("vision_parser",  vision_parser_node)
workflow.add_node("rag_engine",     rag_node)
workflow.add_node("code_generator", code_gen_node)

workflow.set_entry_point("vision_parser")
workflow.add_edge("vision_parser",  "rag_engine")
workflow.add_edge("rag_engine",     "code_generator")
workflow.add_edge("code_generator", END)

trace_brain = workflow.compile()


# ─────────────────────────────────────────
# 5. FastAPI Setup
# ─────────────────────────────────────────
app = FastAPI(title="Trace AI Backend")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/chat")
async def chat_with_trace(
    query: str = Form(...),
    file: UploadFile = File(...),
):
    """Accepts image file and text query, runs Trace Vision → RAG → Code Gen."""
    try:
        image_data = await file.read()
        initial_state: TraceState = {
            "user_query":     query,
            "image_bytes":    image_data,
            "rectangles":     [],
            "edges":          [],
            "gemini_raw":     "",
            "response":       "",
            "generated_code": "",
        }
        result = trace_brain.invoke(initial_state)
        return {
            "reply":          result["response"],
            "entities":       result["rectangles"],
            "edges":          result.get("edges", []),
            "generated_code": result.get("generated_code", ""),
        }
    except Exception as e:
        err_str = str(e)
        print(f"Endpoint error: {err_str[:200]}")
        if "RESOURCE_EXHAUSTED" in err_str or "429" in err_str:
            raise HTTPException(
                status_code=503,
                detail=(
                    "Gemini API quota exhausted (free tier limit reached). "
                    "Please wait a minute and try again, or add billing to your Google AI Studio account."
                ),
            )
        raise HTTPException(status_code=500, detail=err_str[:300])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)