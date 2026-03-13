import os
import io
import re
import json
import time
from concurrent.futures import ThreadPoolExecutor
from typing import TypedDict, List
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from langgraph.graph import StateGraph, END
from PIL import Image

# ── Tenacity for Backoff & Retry ──────────────────────────────────────────────
from tenacity import (
    retry,
    stop_after_attempt,
    wait_random_exponential,
    retry_if_exception,
)

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


def resize_image(image_bytes: bytes, max_px: int = 1024) -> Image.Image:
    """
    Resize image so its longest side is at most `max_px` pixels.
    Maintains aspect ratio. Returns a PIL Image object ready for Gemini.
    """
    img = Image.open(io.BytesIO(image_bytes))
    w, h = img.size
    if max(w, h) > max_px:
        scale = max_px / max(w, h)
        new_w, new_h = int(w * scale), int(h * scale)
        img = img.resize((new_w, new_h), Image.LANCZOS)
        print(f"[Vision] Resized image from {w}x{h} → {new_w}x{new_h}")
    else:
        print(f"[Vision] Image {w}x{h} is within size limit, no resize needed")
    return img


def _is_quota_error(exc: Exception) -> bool:
    """Returns True if the exception is a quota/rate-limit error from Gemini."""
    err = str(exc)
    return any(x in err for x in ["RESOURCE_EXHAUSTED", "429", "quota"])


def _gemini_generate_with_retry(model: str, contents, max_attempts: int = 3):
    """
    Calls client.models.generate_content with exponential backoff on quota errors.
    Uses tenacity for robust retry logic.
    """
    @retry(
        retry=retry_if_exception(_is_quota_error),
        wait=wait_random_exponential(multiplier=1, min=4, max=30),
        stop=stop_after_attempt(max_attempts),
        reraise=True,
    )
    def _call():
        return client.models.generate_content(model=model, contents=contents)

    attempt = 0

    @retry(
        retry=retry_if_exception(_is_quota_error),
        wait=wait_random_exponential(multiplier=1, min=4, max=30),
        stop=stop_after_attempt(max_attempts),
        reraise=True,
        before_sleep=lambda rs: print(
            f"[Retry] Quota error — attempt {rs.attempt_number + 1} of {max_attempts}. "
            f"Waiting {rs.outcome_timestamp:.1f}s..."
        ),
    )
    def _call_with_log():
        return client.models.generate_content(model=model, contents=contents)

    return _call_with_log()


def _validate_edges(edges: List[dict], valid_ids: set) -> List[dict]:
    """
    Removes edges whose from/to does not reference a valid node ID,
    and removes self-loops. Deduplicates (from, to, label) triples.
    """
    seen = set()
    clean = []
    for ed in edges:
        f, t = ed["from"], ed["to"]
        if f not in valid_ids or t not in valid_ids:
            print(f"[EdgeValidation] Dropping edge {f}→{t}: unknown ID(s)")
            continue
        if f == t:
            print(f"[EdgeValidation] Dropping self-loop edge {f}→{f}")
            continue
        key = (f, t, ed.get("label", ""))
        if key in seen:
            continue
        seen.add(key)
        clean.append(ed)
    return clean


def _reindex_nodes(nodes: List[dict]) -> List[dict]:
    """
    Ensures nodes have sequential IDs n1, n2, n3 … regardless of what the model
    returned. Returns (reindexed_nodes, id_map) where id_map maps old→new ID.
    """
    reindexed = []
    id_map = {}
    for i, node in enumerate(nodes, start=1):
        new_id = f"n{i}"
        id_map[node["id"]] = new_id
        reindexed.append({**node, "id": new_id})
    return reindexed, id_map


# ─────────────────────────────────────────
# 3. Nodes
# ─────────────────────────────────────────

def vision_parser_node(state: TraceState):
    """
    Single-pass Gemini Vision call.
    - Resizes image to ≤ 1024px before sending (bandwidth reduction).
    - Asks for unified JSON with 'nodes' and 'edges'.
    - Validates edge IDs reference real nodes.
    - Re-indexes nodes to guarantee sequential n1, n2, n3 IDs.
    - Retries on quota errors with exponential backoff.
    """
    print("--- TRACE VISION: ANALYZING DIAGRAM ---")

    unified_prompt = (
        "You are an expert flowchart parser. Analyze the diagram in the image.\n\n"
        "Return ONLY a single valid JSON object following this schema exactly. "
        "Do NOT include markdown fences, prose, or any text outside the JSON.\n"
        "{\n"
        '  "nodes": [\n'
        '    {"id": "n1", "label": "Start",      "type": "Process",  "bbox": [ymin, xmin, ymax, xmax]},\n'
        '    {"id": "n2", "label": "In Stock?",   "type": "Decision", "bbox": [ymin, xmin, ymax, xmax]},\n'
        '    {"id": "n3", "label": "Order Items", "type": "Process",  "bbox": [ymin, xmin, ymax, xmax]}\n'
        "  ],\n"
        '  "edges": [\n'
        '    {"from": "n1", "to": "n2", "label": "connects"},\n'
        '    {"from": "n2", "to": "n3", "label": "No"}\n'
        "  ]\n"
        "}\n\n"
        "Rules:\n"
        "- Assign IDs sequentially: n1, n2, n3, … in top-to-bottom, left-to-right order.\n"
        "- Node types are EXACTLY one of: Process | Decision | Actor | Database\n"
        "- BBox values are 0-1000 integers [ymin, xmin, ymax, xmax].\n"
        "- Edges: 'from' and 'to' MUST be IDs that exist in the nodes array.\n"
        "- Every arrow must have a label. Use 'Yes' or 'No' for decision branches, "
        "  a verb/action for process arrows (e.g., 'validates', 'triggers'), or 'connects' if truly unlabeled.\n"
        "- If a Decision node has 'Yes'/'No' branches, label those edges 'Yes' and 'No'.\n"
        "- Do NOT create self-loops (from == to).\n"
        "- Identify EVERY process box, decision diamond, actor/swimlane, and database cylinder."
    )

    fallback_node  = [{"id": "n1", "label": "Unknown Component", "type": "Process", "bbox": []}]
    fallback_edges: List[dict] = []

    try:
        # ── Feature 4a: Resize image before sending ──────────────────────────
        img = resize_image(state["image_bytes"], max_px=1024)

        print("[Vision] Sending request to gemini-flash-latest (1.5) with retry...")
        resp     = _gemini_generate_with_retry(
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
            m = re.search(r"\{.*\}", cleaned, re.DOTALL)
            data = json.loads(m.group(0)) if m else {}

        raw_nodes = data.get("nodes", []) if isinstance(data, dict) else []
        if not raw_nodes and isinstance(data, list):
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

        # Fallback scanner if top-level parse yielded nothing
        if not entities:
            print("Unified parse yielded 0 nodes — running fallback scanner...")
            entities = parse_entities_from_json(raw_text)
        if not edges:
            edges = parse_edges_from_json(raw_text)
        if not entities:
            entities = fallback_node

        # ── Feature 1: Re-index to guarantee sequential IDs ──────────────────
        entities, id_map = _reindex_nodes(entities)
        print(f"[Vision] Node ID mapping: {id_map}")

        # Remap edge IDs to new sequential IDs
        remapped_edges = []
        for ed in edges:
            new_from = id_map.get(ed["from"])
            new_to   = id_map.get(ed["to"])
            if new_from and new_to:
                remapped_edges.append({"from": new_from, "to": new_to, "label": ed["label"]})
            else:
                print(f"[Vision] Edge {ed['from']}→{ed['to']} dropped (unmappable ID)")
        edges = remapped_edges

        # ── Feature 2: Validate edges reference real node IDs ────────────────
        valid_ids = {n["id"] for n in entities}
        edges = _validate_edges(edges, valid_ids)

        print(f"Parsed {len(entities)} nodes, {len(edges)} edges")
        return {
            "rectangles": entities,
            "edges":      edges,
            "gemini_raw": raw_text,
        }

    except Exception as e:
        err_str = str(e)
        print(f"Gemini vision error: {err_str[:200]}")
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
    Retries on quota errors with exponential backoff.
    """
    query    = state["user_query"]
    entities = state["rectangles"]
    edges    = state.get("edges", [])
    id_to_label = {e["id"]: e["label"] for e in entities}
    labels      = [e["label"] for e in entities]

    if not entities:
        return {"response": "No entities detected. Please upload a clearer diagram."}

    # Build a text representation of the graph
    nodes_text = "\n".join([f"- {n['label']} ({n['type']})" for n in entities])
    edges_text = "\n".join([
        f"- {id_to_label.get(e['from'], e['from'])} --[{e['label']}]--> {id_to_label.get(e['to'], e['to'])}"
        for e in edges
    ])

    analysis_prompt = (
        f"The user has uploaded a diagram and asked: \"{query}\"\n\n"
        "Here is the parsed structure of the diagram:\n"
        f"Nodes:\n{nodes_text}\n\n"
        f"Relationships (Edges):\n{edges_text}\n\n"
        "Please provide a concise, professional explanation of the diagram and answer the user's specific query. "
        "Focus on the flow and logic. Do NOT mention IDs like 'n1'. Use the labels provided."
    )

    try:
        resp = _gemini_generate_with_retry(
            model="gemini-flash-latest",
            contents=analysis_prompt,
        )
        response = resp.text
    except Exception as e:
        print(f"RAG Analysis error: {e}")
        # Build a clean, readable fallback response
        component_lines = "\n".join([f"  • {n['label']} ({n['type']})" for n in entities])
        edge_lines = "\n".join([
            f"  • {id_to_label.get(ed['from'], ed['from'])} → {id_to_label.get(ed['to'], ed['to'])}" +
            (f"  ({ed['label']})" if ed.get('label') and ed['label'] != 'connects' else '')
            for ed in edges
        ])
        response = (
            f"**Diagram Components:**\n{component_lines}\n\n"
            f"**Relationships:**\n{edge_lines}\n\n"
            f"_(Gemini analysis unavailable — showing parsed structure)_"
        )

    return {"response": response}


def code_gen_node(state: TraceState):
    """
    Trace-to-Code:
    - Database nodes       → SQL CREATE TABLE DDL
    - DB → DB edge         → FOREIGN KEY constraint
    - Process → DB edge    → INSERT INTO statement
    - Actor + Process      → FastAPI endpoint skeleton
    - Actor → Process edge → endpoint accepts actor_id path parameter
    - Decision node        → if/else block
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
        sql_lines: List[str] = [
            "-- ============================================================\n",
            "-- SQL DDL  (auto-generated by Trace)\n",
            "-- ============================================================\n\n",
        ]

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

        for proc in process_nodes:
            cls   = safe_class(proc["label"])
            route = "/" + safe_id(proc["label"]).lower()

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

            # Logic body: check outgoing edges from this process
            logic_body = []
            next_id, next_label = get_next_step(proc["id"], state)
            if next_id:
                next_node = id_to_node.get(next_id)
                if next_node:
                    if next_node["type"] == "Decision":
                        # Decision if/else block
                        yes_id = next(
                            (ed["to"] for ed in edges if ed["from"] == next_id and ed["label"].lower() == "yes"),
                            None,
                        )
                        no_id  = next(
                            (ed["to"] for ed in edges if ed["from"] == next_id and ed["label"].lower() == "no"),
                            None,
                        )
                        yes_node = id_to_node.get(yes_id) if yes_id else None
                        no_node  = id_to_node.get(no_id)  if no_id  else None

                        logic_body.append(f"    if True:  # Decision: {next_node['label']}")
                        if yes_node:
                            if yes_node["type"] == "Database":
                                tbl = safe_id(yes_node["label"])
                                logic_body.append(
                                    f"        # Yes → persist to {yes_node['label']}\n"
                                    f"        db.execute(\"INSERT INTO {tbl} DEFAULT VALUES\")"
                                )
                            else:
                                logic_body.append(f"        # Yes → proceed to: {yes_node['label']}")
                                logic_body.append("        pass")
                        else:
                            logic_body.append("        pass")

                        logic_body.append("    else:")
                        if no_node:
                            if no_node["type"] == "Database":
                                tbl = safe_id(no_node["label"])
                                logic_body.append(
                                    f"        # No → persist to {no_node['label']}\n"
                                    f"        db.execute(\"INSERT INTO {tbl} DEFAULT VALUES\")"
                                )
                            else:
                                logic_body.append(f"        # No → proceed to: {no_node['label']}")
                                logic_body.append("        pass")
                        else:
                            logic_body.append("        pass")

                    elif next_node["type"] == "Database":
                        # Feature 3: INSERT INTO for Process → Database edge
                        tbl = safe_id(next_node["label"])
                        logic_body.append(
                            f"    # Persist to {next_node['label']}  (edge: '{next_label}')\n"
                            f"    db.execute(\"INSERT INTO {tbl} DEFAULT VALUES\")  # TODO: supply column values"
                        )

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


# ─────────────────────────────────────────
# 4. Parallel Analysis Node (RAG + Code-Gen)
# ─────────────────────────────────────────

def analysis_node(state: TraceState) -> dict:
    """
    Feature 4b — Parallel Execution:
    Runs rag_node and code_gen_node concurrently in OS threads via
    ThreadPoolExecutor — safe inside uvicorn's already-running event loop
    (unlike asyncio.run() which raises RuntimeError in that context).
    """
    print("--- TRACE ANALYSIS: RUNNING RAG + CODE-GEN IN PARALLEL ---")
    t_start = time.perf_counter()

    with ThreadPoolExecutor(max_workers=2) as pool:
        future_rag  = pool.submit(rag_node,      state)
        future_code = pool.submit(code_gen_node, state)
        rag_result  = future_rag.result()
        code_result = future_code.result()

    elapsed = time.perf_counter() - t_start
    print(f"[Analysis] Both nodes finished in {elapsed:.2f}s (parallel)")
    return {
        "response":       rag_result.get("response", ""),
        "generated_code": code_result.get("generated_code", ""),
    }


# ─────────────────────────────────────────
# 5. Compile the Graph
# ─────────────────────────────────────────
workflow = StateGraph(TraceState)
workflow.add_node("vision_parser", vision_parser_node)
workflow.add_node("analysis",      analysis_node)        # replaces sequential rag → codegen

workflow.set_entry_point("vision_parser")
workflow.add_edge("vision_parser", "analysis")
workflow.add_edge("analysis",      END)

trace_brain = workflow.compile()


# ─────────────────────────────────────────
# 6. FastAPI Setup
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
    """Accepts image file and text query, runs Trace Vision → Analysis (RAG + Code-Gen in parallel)."""
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

        # Resolve edge IDs → human-readable labels for the frontend
        id_to_label = {e["id"]: e["label"] for e in result["rectangles"]}
        id_to_type  = {e["id"]: e["type"]  for e in result["rectangles"]}
        resolved_edges = [
            {
                "from":       id_to_label.get(ed["from"], ed["from"]),
                "to":         id_to_label.get(ed["to"],   ed["to"]),
                "from_id":    ed["from"],
                "to_id":      ed["to"],
                "from_type":  id_to_type.get(ed["from"], "Process"),
                "to_type":    id_to_type.get(ed["to"],   "Process"),
                "label":      ed.get("label", "connects"),
                "action":     ed.get("label", "connects"),
            }
            for ed in result.get("edges", [])
        ]

        return {
            "reply":          result["response"],
            "entities":       result["rectangles"],
            "edges":          resolved_edges,
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