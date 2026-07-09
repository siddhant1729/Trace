# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

**Trace** is an AI-powered "Diagram-to-Code" engine. Users upload an architecture/flowchart diagram image and ask a question. The system:
1. Parses the diagram via Gemini Vision → structured nodes + edges
2. Retrieves matching code patterns from a ChromaDB vector library (RAG) and answers the user's question using the parsed graph + retrieved patterns + conversation history
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

# Seed / inspect the RAG vector store (ChromaDB)
python scripts/ingest_corpus.py     # embed the code-pattern corpus (idempotent)
python scripts/inspect_chroma.py    # print collection count + sample entries
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
GEMINI_MODEL=gemini-flash-latest              # Optional
EMBEDDING_MODEL=models/gemini-embedding-001   # Optional — model used for RAG embeddings
CHROMA_PATH=./chroma_db                       # Optional — persistent ChromaDB location
ALLOWED_ORIGINS=http://localhost:3000  # Optional, comma-separated
```

Note: `models/text-embedding-004` is NOT available on this API tier — use `models/gemini-embedding-001` (the default).

**Frontend** (`frontend/.env.local`):
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Architecture

### Backend: `trace/` package

```
trace/
├── config.py          # pydantic-settings: GEMINI_API_KEY, GEMINI_MODEL, EMBEDDING_MODEL, CHROMA_PATH, PORT, etc.
├── api/main.py        # FastAPI app + /chat endpoint
├── graph/
│   ├── nodes.py       # TraceState, all helpers, all LangGraph node functions
│   └── pipeline.py    # Graph assembly → exports trace_brain
├── library/           # RAG code-pattern library (ChromaDB-backed)
│   ├── corpus.py      # CORPUS: ~19 code-pattern snippets, each with {type, stack} metadata
│   └── vector_store.py # GeminiEmbeddingFunction, ingest_corpus(), get_relevant_patterns()
└── nodes/             # Placeholder package (empty, reserved for future node modules)
```

RAG helper scripts live in `scripts/`: `ingest_corpus.py` (seed the store) and `inspect_chroma.py` (inspect it).

Root `main.py` is a backward-compat shim that re-exports `app` from `trace.api.main`.

The LangGraph pipeline is:

```
vision_parser_node  →  analysis_node (parallel: rag_node + code_gen_node)  →  END
```

- **`vision_parser_node`**: Sends the uploaded image to Gemini with a structured prompt. Returns parsed `rectangles` (nodes with `id`, `label`, `type`, `attributes`, `methods`) and `edges` (`from`, `to`, `label`). Re-indexes all node IDs to sequential `n1, n2, n3...`. Image is resized to ≤1024px via Pillow before sending.
- **`analysis_node`**: Runs `rag_node` and `code_gen_node` concurrently via `ThreadPoolExecutor`. Both functions are sync and safe to run this way inside uvicorn's event loop.
- **`rag_node`**: Second Gemini call — answers the user query using the parsed graph structure + conversation history. **Now RAG-augmented**: before building the prompt it calls `get_relevant_patterns()` (Gemini-embedded query against the ChromaDB `trace_patterns` collection) and injects the top-3 matching code-pattern snippets into the prompt. Retrieval is wrapped in try/except and degrades to the original behavior if the store is empty/missing or embedding fails — it never breaks the existing flow.
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

## RAG Vector Retrieval (`trace/library/`)

RAG is **implemented** with ChromaDB (this replaced the never-used `faiss-cpu` dependency):

- **`corpus.py`** — `CORPUS`, ~19 production-shaped code-pattern snippets (FastAPI routes, SQLAlchemy/Postgres/Mongo models, Redis caching, RabbitMQ/Kafka/Celery consumers, JWT/logging middleware, Nginx, Dockerfile). Each entry is `{"id", "document", "metadata": {"type", "stack"}}` where `type ∈ {service, database, cache, queue, middleware, gateway}`.
- **`vector_store.py`** — the retrieval engine:
  - `GeminiEmbeddingFunction` — Chroma `EmbeddingFunction` backed by the Gemini embeddings API (client built lazily, so importing the module does no network I/O). Implements `name()`/`get_config()`/`build_from_config()` as Chroma ≥1.0 requires.
  - `ingest_corpus(collection=None, corpus=None)` — idempotent: only adds entries whose `id` is not already present, so re-running never duplicates.
  - `get_relevant_patterns(query, stack=None, k=5, collection=None)` — embeds the query, optionally filters by `stack` metadata, returns top-k `{id, document, metadata, distance}` dicts. Returns `[]` gracefully on empty/missing store or blank query.
  - The embedding function is **injectable everywhere** so tests substitute a deterministic offline fake (`tests/conftest.py`) — no network, no real Gemini calls.
- Collection name: `trace_patterns`, persisted at `settings.chroma_path` (`./chroma_db`, gitignored).
- Tests: `tests/test_retrieval.py` (retrieval, metadata filtering, empty store, idempotent ingest, corpus schema) run entirely against an in-memory ChromaDB.

## What's Unused / Placeholder

- `nodes/`, `uploads/` directories are empty (`library/` is now implemented).
- `_archive/state.py` is legacy.
- Frontend components **not imported anywhere** (moved to `frontend/components/_unused/`): `FeatureCards.tsx`, `Footer.tsx`, `MeshBackground.tsx`, `ThemeToggle.tsx`, `TraceChat.tsx`.
