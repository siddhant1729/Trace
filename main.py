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
    user_query: str
    image_bytes: bytes
    rectangles: List[dict]   # Parsed entities from the diagram
    gemini_raw: str           # Raw Gemini text (for RAG context)
    response: str
    generated_code: str       # Trace-to-Code output


# ─────────────────────────────────────────
# 2. Helpers
# ─────────────────────────────────────────

def strip_json_markdown(text: str) -> str:
    """
    Strips ```json ... ``` or ``` ... ``` fences from Gemini responses
    so we get clean, parseable JSON/text.
    """
    # Remove leading/trailing whitespace
    text = text.strip()
    # Strip code-fence blocks like ```json\n...\n``` or ```\n...\n```
    text = re.sub(r"^```(?:json)?\s*\n?", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\n?```\s*$", "", text)
    return text.strip()


def parse_entities_from_json(raw: str) -> List[dict]:
    """
    Parses Gemini's structured JSON response into entity dicts.
    Expected format (one item per line or as a JSON array):
      {"label": "NAME", "type": "TYPE", "bbox": [ymin, xmin, ymax, xmax]}
    Falls back to an empty list on any error.
    """
    entities: List[dict] = []
    cleaned = strip_json_markdown(raw)

    # Try to parse as a JSON array first
    try:
        data = json.loads(cleaned)
        if isinstance(data, list):
            for item in data:
                if isinstance(item, dict) and "label" in item and "type" in item:
                    entities.append({
                        "label": str(item["label"]),
                        "type":  str(item["type"]),
                        "bbox":  item.get("bbox", []),
                    })
            return entities
    except json.JSONDecodeError:
        pass

    # Fallback: scan line-by-line for individual JSON objects
    for line in cleaned.splitlines():
        line = line.strip().rstrip(",")
        if not line.startswith("{"):
            continue
        try:
            item = json.loads(line)
            if "label" in item and "type" in item:
                entities.append({
                    "label": str(item["label"]),
                    "type":  str(item["type"]),
                    "bbox":  item.get("bbox", []),
                })
        except json.JSONDecodeError:
            continue

    return entities


# ─────────────────────────────────────────
# 3. Nodes
# ─────────────────────────────────────────

def vision_parser_node(state: TraceState):
    """
    Uses Gemini Vision with a structured prompt to extract diagram entities
    as machine-readable JSON objects rather than free-form prose.
    """
    print("--- TRACE VISION: ANALYZING DIAGRAM ---")

    structured_prompt = (
        'List every node in this diagram. For each node, output exactly one JSON object '
        'on its own line with these keys: '
        '{"label": "NAME", "type": "TYPE", "bbox": [ymin, xmin, ymax, xmax]}. '
        'TYPE must be one of: Actor, Process, Database, Interface. '
        'Do NOT add any prose, headers, or markdown fences — only the JSON objects.'
    )

    try:
        img = Image.open(io.BytesIO(state["image_bytes"]))
        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=[structured_prompt, img],
        )
        raw_text = response.text
        print(f"Gemini Raw: {raw_text[:300]}...")
        entities = parse_entities_from_json(raw_text)

        if not entities:
            # Last-resort fallback when JSON parsing fully fails
            print("JSON parse failed — using fallback prose labels")
            entities = [{"label": "Unknown Component", "type": "Process", "bbox": []}]

        return {"rectangles": entities, "gemini_raw": raw_text}

    except Exception as e:
        print(f"Gemini vision error: {e}")
        return {
            "rectangles": [{"label": "Unknown Component", "type": "Process", "bbox": []}],
            "gemini_raw": f"[API unavailable: {str(e)[:120]}]",
        }


def rag_node(state: TraceState):
    """
    Answers the user query using detected entities and Gemini's raw analysis.
    """
    query   = state["user_query"]
    entities = state["rectangles"]
    raw     = state.get("gemini_raw", "")
    labels  = [e["label"] for e in entities]

    if not entities:
        return {"response": "No entities detected. Please upload a clearer diagram."}

    if raw and not raw.startswith("[API"):
        response = (
            f"Based on your diagram, I identified: {', '.join(labels)}.\n\n"
            f'Regarding "{query}":\n{raw[:400]}'
        )
    else:
        q = query.lower()
        if "flow" in q or "work" in q or "how" in q:
            response = f"The diagram shows the following flow: {' → '.join(labels)}."
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
    Trace-to-Code: inspects the detected entities and generates boilerplate code.

    Rules:
      - Database entity  → SQL CREATE TABLE DDL
      - Actor + Process  → Python FastAPI endpoint skeleton
      - Default          → plain summary comment block
    """
    print("--- TRACE CODE GEN: GENERATING BOILERPLATE ---")

    entities = state["rectangles"]
    types    = {e["type"] for e in entities}
    labels   = [e["label"] for e in entities]

    code_lines: List[str] = []

    # ── SQL DDL for Database nodes ──────────────────────────────────────────
    db_nodes = [e for e in entities if e["type"] == "Database"]
    if db_nodes:
        code_lines.append("-- SQL DDL  (auto-generated by Trace)\n")
        for node in db_nodes:
            table = re.sub(r"[^A-Za-z0-9_]", "_", node["label"])
            code_lines.append(
                f"CREATE TABLE IF NOT EXISTS {table} (\n"
                f"    id          SERIAL PRIMARY KEY,\n"
                f"    created_at  TIMESTAMP DEFAULT NOW(),\n"
                f"    -- TODO: add columns for {node['label']}\n"
                f");\n"
            )

    # ── FastAPI endpoint for Actor + Process combos ──────────────────────────
    if "Actor" in types and "Process" in types:
        actor_nodes   = [e for e in entities if e["type"] == "Actor"]
        process_nodes = [e for e in entities if e["type"] == "Process"]

        if code_lines:
            code_lines.append("\n")

        code_lines.append("# FastAPI skeleton  (auto-generated by Trace)\n\n")
        code_lines.append("from fastapi import FastAPI, HTTPException\nfrom pydantic import BaseModel\n\napp = FastAPI()\n\n")

        for proc in process_nodes:
            route = "/" + re.sub(r"[^A-Za-z0-9]", "_", proc["label"]).lower()
            actor_label = actor_nodes[0]["label"] if actor_nodes else "Client"
            code_lines.append(
                f"class {re.sub(r'[^A-Za-z0-9]', '', proc['label'])}Request(BaseModel):\n"
                f"    # TODO: define request body for {actor_label}\n"
                f"    pass\n\n"
                f"@app.post(\"{route}\")\n"
                f"async def {re.sub(r'[^A-Za-z0-9_]', '_', proc['label']).lower()}(\n"
                f"    request: {re.sub(r'[^A-Za-z0-9]', '', proc['label'])}Request,\n"
                f"):\n"
                f"    # TODO: implement logic triggered by {actor_label}\n"
                f"    return {{\"status\": \"ok\"}}\n\n"
            )

    # ── Default: nothing diagnosable, emit a comment summary ────────────────
    if not code_lines:
        code_lines.append(
            f"# Trace detected: {', '.join(labels)}\n"
            f"# No code template matched. Add more specific node types (Database, Actor + Process).\n"
        )

    generated_code = "".join(code_lines)
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
            "gemini_raw":     "",
            "response":       "",
            "generated_code": "",
        }
        result = trace_brain.invoke(initial_state)
        return {
            "reply":          result["response"],
            "entities":       result["rectangles"],
            "generated_code": result.get("generated_code", ""),
        }
    except Exception as e:
        print(f"Endpoint error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)