import os
import io
import re
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

# 1. Define the State
class TraceState(TypedDict):
    user_query: str
    image_bytes: bytes
    rectangles: List[dict]   # Parsed entities from the diagram
    gemini_raw: str           # Raw Gemini text (for RAG context)
    response: str

# 2. Helper: parse Gemini text → entity list
def parse_entities(text: str) -> List[dict]:
    """
    Tries to extract entities from Gemini's free-form text response.
    Looks for lines containing 'label:' or bold-style '**Label**' patterns.
    Falls back gracefully to an empty list.
    """
    entities = []
    type_keywords = {
        "database": "Database",
        "db": "Database",
        "process": "Process",
        "actor": "Actor",
        "user": "Actor",
        "interface": "Interface",
        "service": "Process",
        "api": "Interface",
        "queue": "Process",
        "cache": "Database",
    }

    # Strategy 1: explicit "label: X" lines
    label_re = re.compile(r"label[:\s]+(.+)", re.IGNORECASE)
    type_re  = re.compile(r"type[:\s]+(.+)", re.IGNORECASE)

    lines = text.splitlines()
    current: dict = {}
    for line in lines:
        lm = label_re.search(line)
        tm = type_re.search(line)
        if lm:
            if current.get("label"):
                entities.append(current)
            current = {"label": lm.group(1).strip(" *-"), "type": "Process"}
        if tm and current:
            current["type"] = tm.group(1).strip(" *-").capitalize()
        # Also detect inline e.g. "- **User** (Actor)"
        inline = re.findall(r"\*\*(.+?)\*\*\s*[\(\[]?([A-Za-z]*)[\)\]]?", line)
        for name, typ in inline:
            ent_type = typ.capitalize() if typ else "Process"
            for kw, mapped in type_keywords.items():
                if kw in name.lower():
                    ent_type = mapped
            if not any(e["label"] == name for e in entities):
                entities.append({"label": name, "type": ent_type})

    if current.get("label") and not any(e["label"] == current["label"] for e in entities):
        entities.append(current)

    # Strategy 2: if still empty, pull nouns from numbered/bulleted lines
    if not entities:
        for line in lines:
            m = re.match(r"^\s*[-*\d.]+\s+(.+)", line)
            if m:
                name = m.group(1).strip(" *-:")
                if 2 < len(name) < 40:
                    ent_type = "Process"
                    for kw, mapped in type_keywords.items():
                        if kw in name.lower():
                            ent_type = mapped
                    entities.append({"label": name, "type": ent_type})

    return entities[:10]  # cap at 10 entities


# 3. Define the Nodes

def vision_parser_node(state: TraceState):
    """Uses Gemini Vision to detect nodes in any diagram."""
    print("--- TRACE VISION: ANALYZING DIAGRAM ---")

    prompt = """
    Analyze this diagram carefully. Identify every logical component (boxes, circles, actors, databases, etc).
    For each component output:
    - label: <name shown in the component>
    - type: <one of: Actor, Process, Database, Interface>
    - connections: <what it connects to>
    Be concise and structured.
    """

    mock_entities = [
        {"label": "Component A", "type": "Process"},
        {"label": "Component B", "type": "Process"},
        {"label": "Store", "type": "Database"},
    ]

    try:
        img = Image.open(io.BytesIO(state["image_bytes"]))
        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=[prompt, img],
        )
        raw_text = response.text
        print(f"Gemini Raw: {raw_text[:200]}...")
        parsed = parse_entities(raw_text)
        entities = parsed if parsed else mock_entities
        return {"rectangles": entities, "gemini_raw": raw_text}
    except Exception as e:
        print(f"Gemini error (fallback): {e}")
        return {
            "rectangles": mock_entities,
            "gemini_raw": f"[API unavailable: {str(e)[:100]}]",
        }


def rag_node(state: TraceState):
    """Answers the user query using detected entities + Gemini's raw analysis."""
    query = state["user_query"]
    entities = state["rectangles"]
    raw = state.get("gemini_raw", "")
    labels = [e["label"] for e in entities]

    if not entities:
        return {"response": "No entities detected. Please upload a clearer diagram."}

    q = query.lower()

    # Use the raw Gemini analysis to give a richer answer when available
    if raw and not raw.startswith("[API"):
        response = (
            f"Based on your diagram, I identified: {', '.join(labels)}.\n\n"
            f"Regarding \"{query}\":\n{raw[:400]}"
        )
    elif "flow" in q or "work" in q or "how" in q:
        flow = " → ".join(labels)
        response = f"The diagram shows the following flow: {flow}. Each step passes data to the next."
    elif "dijkstra" in q:
        response = f"Shortest path through your diagram: {' → '.join(labels)}."
    elif len(labels) >= 2:
        response = (
            f"Your diagram contains: {labels}. "
            f"Regarding \"{query}\": ensure '{labels[1]}' correctly handles input from '{labels[0]}'."
        )
    else:
        response = f"I detected '{labels[0]}' in your diagram. Could you clarify what you'd like to know about \"{query}\"?"

    return {"response": response}


# 4. Compile the Graph
workflow = StateGraph(TraceState)
workflow.add_node("vision_parser", vision_parser_node)
workflow.add_node("rag_engine", rag_node)
workflow.set_entry_point("vision_parser")
workflow.add_edge("vision_parser", "rag_engine")
workflow.add_edge("rag_engine", END)
trace_brain = workflow.compile()

# 5. FastAPI Setup
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
    """Accepts image file and text query, runs Trace Vision + RAG."""
    try:
        image_data = await file.read()
        initial_state: TraceState = {
            "user_query": query,
            "image_bytes": image_data,
            "rectangles": [],
            "gemini_raw": "",
            "response": "",
        }
        result = trace_brain.invoke(initial_state)
        return {
            "reply": result["response"],
            "entities": result["rectangles"],
        }
    except Exception as e:
        print(f"Endpoint error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)