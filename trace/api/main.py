import json
from typing import List

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware

from trace.config import settings
from trace.graph.nodes import TraceState
from trace.graph.pipeline import trace_brain

app = FastAPI(title="Trace AI Backend")

ALLOWED_ORIGINS = settings.allowed_origins.split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/chat")
async def chat_with_trace(
    query: str = Form(...),
    file: UploadFile = File(...),
    history: str = Form(default="[]"),
):
    """Accepts image file, text query, and optional JSON chat history."""
    try:
        image_data = await file.read()

        try:
            parsed_history: List[dict] = json.loads(history)
        except (json.JSONDecodeError, TypeError):
            parsed_history = []

        initial_state: TraceState = {
            "user_query":     query,
            "image_bytes":    image_data,
            "rectangles":     [],
            "edges":          [],
            "gemini_raw":     "",
            "response":       "",
            "generated_code": "",
            "chat_history":   parsed_history,
            "diagram_type":   "",
        }
        result = trace_brain.invoke(initial_state)

        id_to_label = {e["id"]: e["label"] for e in result["rectangles"]}
        id_to_type  = {e["id"]: e["type"]  for e in result["rectangles"]}
        resolved_edges = [
            {
                "from":      id_to_label.get(ed["from"], ed["from"]),
                "to":        id_to_label.get(ed["to"],   ed["to"]),
                "from_id":   ed["from"],
                "to_id":     ed["to"],
                "from_type": id_to_type.get(ed["from"], "Process"),
                "to_type":   id_to_type.get(ed["to"],   "Process"),
                "label":     ed.get("label", "connects"),
                "action":    ed.get("label", "connects"),
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
    uvicorn.run(app, host="0.0.0.0", port=settings.port)
