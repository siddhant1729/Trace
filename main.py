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
    rectangles:     List[dict]   # Parsed nodes  {"id", "label", "type", "bbox"}
    edges:          List[dict]   # Parsed edges  {"from", "to", "label"}
    gemini_raw:     str          # Raw Gemini text
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
    """Returns node dicts with keys: id, label, type, bbox."""
    raw_items = _parse_json_objects(raw, {"id", "label", "type"})
    return [
        {
            "id":    str(it["id"]),
            "label": str(it["label"]),
            "type":  str(it["type"]),
            "bbox":  it.get("bbox", []),
        }
        for it in raw_items
    ]


def parse_edges_from_json(raw: str) -> List[dict]:
    """Returns edge dicts with keys: from, to, label."""
    raw_items = _parse_json_objects(raw, {"from", "to"})
    return [
        {
            "from":  str(it["from"]),
            "to":    str(it["to"]),
            "label": str(it.get("label", "connects")),
        }
        for it in raw_items
    ]


def get_next_step(node_id, state):
    """Finds which node an arrow points to from a specific ID."""
    for edge in state.get('edges', []):
        if edge['from'] == node_id:
            return edge['to'], edge.get('label', '')
    return None, None


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
        "You are an expert flowchart parser. Analyze the diagram in the image.\n\n"
        "Return ONLY a single valid JSON object following this schema. Do NOT include markdown fences or prose.\n"
        "{\n"
        '  "nodes": [\n'
        '    {"id": "n1", "label": "Text", "type": "Process|Decision|Actor|Database", "bbox": [ymin, xmin, ymax, xmax]}\n'
        "  ],\n"
        '  "edges": [\n'
        '    {"from": "node_id", "to": "node_id", "label": "Yes|No|Action"}\n'
        "  ]\n"
        "}\n\n"
        "Rules:\n"
        "- Identify EVERY process box, decision diamond, actor, and database.\n"
        "- BBox values are 0-1000 integers [ymin, xmin, ymax, xmax].\n"
        "- If an arrow has a 'Yes' or 'No' label, include it in the edge's 'label'.\n"
        "- If it's a Decision node, ensure it has labeled outgoing edges."
    )

    fallback_node  = [{"id": "n1", "label": "Unknown Component", "type": "Process", "bbox": []}]
    fallback_edges: List[dict] = []

    try:
        img = Image.open(io.BytesIO(state["image_bytes"]))

        print(f"[Vision] Sending request to gemini-flash-latest (1.5)...")
        resp     = client.models.generate_content(
            model="gemini-flash-latest",
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
        if not raw_nodes and isinstance(data, list):
            # Maybe the model returned a list of objects instead of a wrapped object
             raw_nodes = [item for item in data if "label" in item and "id" in item]
             raw_edges = [item for item in data if "from" in item and "to" in item]
        else:
            raw_edges = data.get("edges", []) if isinstance(data, dict) else []

        entities: List[dict] = [
            {"id": str(n["id"]), "label": str(n["label"]), "type": str(n.get("type", "Process")), "bbox": n.get("bbox", [])}
            for n in raw_nodes if isinstance(n, dict) and "id" in n and "label" in n
        ]
        edges: List[dict] = [
            {"from": str(e["from"]), "to": str(e["to"]), "label": str(e.get("label", "connects"))}
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
        if any(x in err_str for x in ["RESOURCE_EXHAUSTED", "429", "404", "NOT_FOUND"]):
            raise
        return {
            "rectangles": fallback_node,
            "edges":      fallback_edges,
            "gemini_raw": f"[API unavailable: {err_str[:200]}]",
        }


def rag_node(state: TraceState):
    """
    Answers the user query using detected entities, edges, and Gemini's raw analysis.
    Uses a second (text-only) Gemini pass to provide a human-readable explanation.
    """
    query    = state["user_query"]
    entities = state["rectangles"]
    edges    = state.get("edges", [])
    id_to_label = {e["id"]: e["label"] for e in entities}
    labels      = [e["label"] for e in entities]

    if not entities:
        return {"response": "No entities detected. Please upload a clearer diagram."}

    # 1. Build a text representation of the graph for Gemini
    nodes_text = "\n".join([f"- {n['label']} ({n['type']})" for n in entities])
    edges_text = "\n".join([f"- {id_to_label.get(e['from'], 'Unknown')} --[{e['label']}]--> {id_to_label.get(e['to'], 'Unknown')}" for e in edges])
    
    analysis_prompt = (
        f"The user has uploaded a diagram and asked: \"{query}\"\n\n"
        "Here is the parsed structure of the diagram:\n"
        f"Nodes:\n{nodes_text}\n\n"
        f"Relationships (Edges):\n{edges_text}\n\n"
        "Please provide a concise, professional explanation of the diagram and answer the user's specific query. "
        "Focus on the flow and logic. Do NOT mention IDs like 'n1'. Use the labels provided."
    )

    try:
        # Use gemini-1.5-flash for the text analysis (usually has better quota for text-only)
        resp = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=analysis_prompt,
        )
        response = resp.text
    except Exception as e:
        print(f"RAG Analysis error: {e}")
        # Fallback to local summary if Gemini text pass fails
        edge_summary = "\n".join([f"  {id_to_label.get(ed['from'], ed['from'])} --[{ed['label']}]--> {id_to_label.get(ed['to'], ed['to'])}" for ed in edges])
        response = f"I identified the following components: {', '.join(labels)}.\n\nDetected relationships:\n{edge_summary}"

    return {"response": response}


def code_gen_node(state: TraceState):
    """
    Trace-to-Code:
    - Database nodes       → SQL CREATE TABLE DDL
    - DB → DB edge         → FOREIGN KEY constraint
    - Actor + Process      → FastAPI endpoint skeleton
    - Actor → Process edge → endpoint accepts actor_id path parameter
    - Decision node        → if/else block
    - Database edge        → db.save() call
    """
    print("--- TRACE CODE GEN: GENERATING PROJECT SKELETON ---")

    entities = state["rectangles"]
    edges    = state.get("edges", [])
    types    = {e["type"] for e in entities}
    labels   = [e["label"] for e in entities]
    id_to_node = {e["id"]: e for e in entities}

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

        # FOREIGN KEYs for DB → DB edges (Database edges in SQL)
        for ed in edges:
            src_node = id_to_node.get(ed["from"])
            tgt_node = id_to_node.get(ed["to"])
            if src_node and tgt_node and src_node["type"] == "Database" and tgt_node["type"] == "Database":
                src = safe_id(src_node["label"])
                tgt = safe_id(tgt_node["label"])
                sql_lines.append(
                    f"ALTER TABLE {src}\n"
                    f"    ADD COLUMN  {tgt}_id INT REFERENCES {tgt}(id)  -- Link: {ed['label']}\n"
                    f"    ON DELETE SET NULL;\n\n"
                )

        code_sections.append("".join(sql_lines))

    # ── FastAPI skeleton (Python Logic) ──────────────────────────────────────
    if any(t in types for t in ["Actor", "Process", "Decision"]):
        py_lines: List[str] = [
            "# ============================================================\n",
            "# FastAPI Project Skeleton  (auto-generated by Trace)\n",
            "# ============================================================\n\n",
            "from fastapi import FastAPI, HTTPException\n",
            "from pydantic import BaseModel\n",
            "from typing import Optional\n\n",
            "app = FastAPI(title=\"Trace Generated API\")\n\n",
        ]

        process_nodes = [e for e in entities if e["type"] == "Process"]
        actor_nodes   = [e for e in entities if e["type"] == "Actor"]

        for proc in process_nodes:
            cls       = safe_class(proc["label"])
            route     = "/" + safe_id(proc["label"]).lower()
            
            # Find incoming actor
            actor_info = None
            for ed in edges:
                if ed["to"] == proc["id"]:
                    src = id_to_node.get(ed["from"])
                    if src and src["type"] == "Actor":
                        actor_info = (src["label"], ed["label"])
                        break

            if actor_info:
                actor_label, action_label = actor_info
                actor_id_param = f"\n    {safe_id(actor_label).lower()}_id: int,  # from edge: {action_label}"
                actor_comment  = f"Triggered by '{actor_label}' via '{action_label}'"
            else:
                actor_id_param = ""
                actor_comment  = "No direct actor edge detected"

            # Logic starting from this process
            logic_body = []
            
            # Check for outgoing to Decision or Database
            next_id, next_label = get_next_step(proc["id"], state)
            if next_id:
                next_node = id_to_node.get(next_id)
                if next_node:
                    if next_node["type"] == "Decision":
                        # Decision logic
                        yes_id, _ = next(( (ed["to"], ed["label"]) for ed in edges if ed["from"] == next_id and ed["label"].lower() == "yes"), (None, None))
                        no_id, _ = next(( (ed["to"], ed["label"]) for ed in edges if ed["from"] == next_id and ed["label"].lower() == "no"), (None, None))
                        
                        yes_node = id_to_node.get(yes_id) if yes_id else None
                        no_node = id_to_node.get(no_id) if no_id else None
                        
                        logic_body.append(f"    if True: # Logic for: {next_node['label']}")
                        if yes_node:
                            if yes_node["type"] == "Database":
                                logic_body.append(f"        # Yes: Save to {yes_node['label']}\n        db.save({safe_id(yes_node['label'])})")
                            else:
                                logic_body.append(f"        # Yes: Proceed to {yes_node['label']}")
                        else:
                            logic_body.append("        pass")
                            
                        logic_body.append("    else:")
                        if no_node:
                            if no_node["type"] == "Database":
                                logic_body.append(f"        # No: Save to {no_node['label']}\n        db.save({safe_id(no_node['label'])})")
                            else:
                                logic_body.append(f"        # No: Proceed to {no_node['label']}")
                        else:
                            logic_body.append("        pass")
                    
                    elif next_node["type"] == "Database":
                        # Database edge logic
                        logic_body.append(f"    # Save to {next_node['label']}\n    db.save({safe_id(next_node['label'])})")

            if not logic_body:
                logic_body.append("    # TODO: implement logic")

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
                + "\n".join(logic_body) + "\n"
                f"    return {{\"status\": \"ok\"}}\n\n\n"
            )

        code_sections.append("".join(py_lines))

    # ── Default fallback ─────────────────────────────────────────────────────
    if not code_sections:
        code_sections.append(
            f"# Trace detected: {', '.join(labels)}\n"
            f"# Edges: {[(id_to_node.get(ed['from'], {'label': ed['from']})['label'], ed['label'], id_to_node.get(ed['to'], {'label': ed['to']})['label']) for ed in edges]}\n"
            f"# No code template matched — add Database, Actor, or Process nodes.\n"
        )

    generated_code = "\n".join(code_sections)
    print(f"Generated code ({len(generated_code)} chars)")
    return {"generated_code": generated_code}

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