# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

**Trace** is an AI-powered "Diagram-to-Code" engine. Users upload an architecture/flowchart diagram image and ask a question. The system:
1. Parses the diagram via Gemini Vision → structured nodes + edges
2. Answers the user's question using the parsed graph + conversation history
3. Generates boilerplate code (SQL DDL for Database nodes, FastAPI skeletons for Actor/Process nodes)

## Commands

### Backend
```bash
# Activate virtualenv
source .venv/bin/activate

# Run backend (dev)
uvicorn trace.api.main:app --host 0.0.0.0 --port 8000 --reload

# Or via the root shim (backward compat)
python main.py

# Run tests
pip install -r requirements-dev.txt
pytest tests/ -v
```

### Frontend
```bash
cd frontend
npm install
npm run dev     # Next.js dev server on localhost:3000
npm run build
npm run lint
```

## Environment Variables

**Backend** (`.env` at repo root):
```
GEMINI_API_KEY=...         # Required — NOT "GOOGLE_API_KEY" (README is wrong)
PORT=8000                  # Optional
GEMINI_MODEL=gemini-flash-latest  # Optional
ALLOWED_ORIGINS=http://localhost:3000  # Optional, comma-separated
```

**Frontend** (`frontend/.env.local`):
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Architecture

### Backend: `trace/` package

```
trace/
├── config.py          # pydantic-settings: GEMINI_API_KEY, GEMINI_MODEL, PORT, etc.
├── api/main.py        # FastAPI app + /chat endpoint
├── graph/
│   ├── nodes.py       # TraceState, all helpers, all LangGraph node functions
│   └── pipeline.py    # Graph assembly → exports trace_brain
├── nodes/             # Placeholder package (empty, reserved for future node modules)
└── library/           # Placeholder package (empty, reserved for RAG library)
```

Root `main.py` is a backward-compat shim that re-exports `app` from `trace.api.main`.

The LangGraph pipeline is:

```
vision_parser_node  →  analysis_node (parallel: rag_node + code_gen_node)  →  END
```

- **`vision_parser_node`**: Sends the uploaded image to Gemini with a structured prompt. Returns parsed `rectangles` (nodes with `id`, `label`, `type`, `attributes`, `methods`) and `edges` (`from`, `to`, `label`). Re-indexes all node IDs to sequential `n1, n2, n3...`. Image is resized to ≤1024px via Pillow before sending.
- **`analysis_node`**: Runs `rag_node` and `code_gen_node` concurrently via `ThreadPoolExecutor`. Both functions are sync and safe to run this way inside uvicorn's event loop.
- **`rag_node`**: Second Gemini call — answers the user query using the parsed graph structure + conversation history.
- **`code_gen_node`**: Rule-based (no LLM). Inspects node types: `Database` → SQL DDL, `Actor`/`Process` → FastAPI endpoints, `Decision` → if/else blocks.

**State type** (`TraceState` TypedDict, defined in `trace/graph/nodes.py`):
```python
user_query, image_bytes, rectangles, edges, gemini_raw, response, generated_code, chat_history, diagram_type
```

**`_archive/state.py`** defines `GlyphState` — this is **legacy/unused**. Ignore it.

**Retry logic**: `_gemini_generate_with_retry()` in `trace/graph/nodes.py` wraps all Gemini calls with tenacity exponential backoff on 429/RESOURCE_EXHAUSTED errors.

**Single endpoint**: `POST /chat` in `trace/api/main.py` — accepts `multipart/form-data` with `query` (str), `file` (image), `history` (JSON string of prior messages).

### Frontend: `frontend/`

- **Landing page** (`app/page.tsx`): Assembles `CosmicNav`, `HeroSection`, `BentoPreview`, `FeaturesSection`, `CtaSection`, `CosmicFooter`.
- **Chat workspace** (`app/chat/page.tsx`, ~1080 lines): Split-pane layout — `NebulaCanvas` (left, interactive node graph with drag, zoom, SVG edges) + `ChatSidebar` (right, 420px fixed). No external graph library — canvas is hand-rolled with absolute positioning and SVG connectors.
- The frontend sends the full image on every message (no session caching). This re-runs vision parsing every turn.
- Backend URL read from `process.env.NEXT_PUBLIC_API_URL`, falls back to `http://localhost:8000`.

### Design System (Cosmic Noir)

The UI is strictly achromatic glassmorphism. Key rules:
- **Fonts**: Sora (headlines), Geist (body), JetBrains Mono (code/metadata) — loaded via `next/font/google`
- **Background**: `#131313` / `#0e0e0e`; glass panels use `rgba(255,255,255,0.02)` + `backdrop-filter: blur(20px)`
- **Borders**: `1px solid rgba(255,255,255,0.1)`; top/left edges brighter (`rgba(255,255,255,0.25)`) for specular highlight
- **Spacing**: 4px base unit; all spacing multiples of 4px
- The full spec is in `DESIGN.md`

## Known Issues (from `docs/corrections.md`)

1. **XSS**: `inlineMd()` in `chat/page.tsx` calls `dangerouslySetInnerHTML` without escaping Gemini output first. Fix: call `escapeHtml(t)` before regex replacements.
2. **Blocking event loop**: `trace_brain.invoke()` is synchronous; should be `await trace_brain.ainvoke()` or `await asyncio.to_thread(trace_brain.invoke, initial_state)`.
3. **No upload size limit**: `/chat` reads the full file with no cap. Add `MAX_UPLOAD_BYTES = 10 * 1024 * 1024` guard.
4. **Vision re-runs on every follow-up**: No session caching — each message parses the image from scratch.

## What's Unused / Placeholder

- `faiss-cpu` is in `requirements.txt` but never imported — the RAG retrieval from a personal code library described in the README is not implemented.
- `library/`, `nodes/`, `uploads/` directories are empty.
- `_archive/state.py` is legacy.
- Frontend components **not imported anywhere** (moved to `frontend/components/_unused/`): `FeatureCards.tsx`, `Footer.tsx`, `MeshBackground.tsx`, `ThemeToggle.tsx`, `TraceChat.tsx`.
