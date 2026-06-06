# Trace — Complete Codebase Walkthrough

> Generated from an exhaustive review of **every file** in the repository.
> All line numbers, function names, and variable names reference the actual source code.

---

## STEP 1 — PROJECT OVERVIEW

**Trace** is an AI-powered "Diagram-to-Code" engine. You upload an image of a hand-drawn or digital flowchart/architecture diagram, ask a question about it, and the system does three things:

1. **Vision Parsing** — Gemini Flash analyzes the image and extracts every node (process boxes, decision diamonds, actors, database cylinders) and every directed edge (arrows) into structured JSON.
2. **RAG Analysis** — A second Gemini call takes the parsed graph structure + your question + any prior conversation history and produces a human-readable answer about the diagram.
3. **Code Generation** — A rule-based code generator inspects the graph and emits SQL DDL for Database nodes, FastAPI endpoint skeletons for Actor/Process nodes, and if/else scaffolding for Decision nodes.

The backend is a **Python FastAPI** server orchestrated by **LangGraph**. The frontend is a **Next.js 16** app with a cinematic "Cosmic Noir" landing page and a split-pane chat+canvas workspace.

**Input**: An image file (PNG/JPG/WebP) + a natural language question.
**Output**: A structured analysis reply, a list of parsed entities & edges, and generated boilerplate code (SQL + Python).

---

## STEP 2 — FOLDER STRUCTURE

```
Trace/
├── .env                          # Gemini API key & port
├── .gitignore                    # Excludes venv, pycache, frontend build artifacts
├── DESIGN.md                     # Full design system spec (Cosmic Noir)
├── Procfile                      # Heroku deployment command
├── README.md                     # Project introduction and setup guide
├── main.py                       # ★ CORE — FastAPI server + LangGraph pipeline (761 lines)
├── state.py                      # Legacy/unused state definition (GlyphState)
├── requirements.txt              # Python dependencies (11 packages)
├── push_helper.sh                # One-off git push script
├── package-lock.json             # Empty root-level lockfile (placeholder)
├── uploads/                      # Empty dir — intended for uploaded images
├── library/                      # Empty dir — intended for RAG code snippets
├── nodes/                        # Empty dir — intended for node definitions
├── learn/
│   └── langgraph.ipynb           # Jupyter notebook — LangGraph learning scratchpad
├── frontend/
│   ├── .env.local                # Backend URL (http://localhost:8000)
│   ├── .gitignore                # Standard Next.js ignores
│   ├── README.md                 # Default create-next-app README
│   ├── package.json              # Frontend deps: React 19, Next 16, framer-motion, lucide
│   ├── package-lock.json         # Full lockfile (230 KB)
│   ├── next.config.ts            # Empty Next.js config
│   ├── tsconfig.json             # TypeScript strict config
│   ├── eslint.config.mjs         # ESLint with Next.js core-web-vitals + TS
│   ├── postcss.config.mjs        # Tailwind v4 via @tailwindcss/postcss
│   ├── next-env.d.ts             # Auto-generated Next.js types
│   ├── tsconfig.tsbuildinfo      # Incremental TS build cache
│   ├── public/                   # Static assets (SVGs: file, globe, next, vercel, window)
│   ├── app/
│   │   ├── globals.css           # ★ Design system tokens + utilities (288 lines)
│   │   ├── layout.tsx            # Root layout: Sora + Geist + JetBrains Mono fonts, SEO meta
│   │   ├── page.tsx              # Landing page: assembles all sections
│   │   └── chat/
│   │       └── page.tsx          # ★ Chat workspace: Canvas + Sidebar (1080 lines)
│   └── components/
│       ├── StarField.tsx          # Animated starfield background (180 stars)
│       ├── CosmicNav.tsx          # Fixed top navigation with mobile hamburger
│       ├── HeroSection.tsx        # Full-viewport hero with animated entrance
│       ├── BentoPreview.tsx       # 12-col bento grid: canvas mockup + inspector
│       ├── FeaturesSection.tsx    # 3-col feature cards with IntersectionObserver
│       ├── FeatureCards.tsx       # ⚠️ UNUSED — alternate feature cards (framer-motion)
│       ├── CtaSection.tsx         # Call-to-action panel with metrics
│       ├── CosmicFooter.tsx       # Footer with nav columns, status chip
│       ├── Footer.tsx             # ⚠️ UNUSED — alternate footer (framer-motion)
│       ├── MeshBackground.tsx     # ⚠️ UNUSED — animated mesh gradient background
│       ├── ThemeToggle.tsx        # ⚠️ UNUSED — dark/light theme toggle button
│       └── TraceChat.tsx          # ⚠️ UNUSED — earlier standalone chat component
```

> [!IMPORTANT]
> 5 component files (`FeatureCards.tsx`, `Footer.tsx`, `MeshBackground.tsx`, `ThemeToggle.tsx`, `TraceChat.tsx`) are **not imported anywhere** in the active codebase. They appear to be remnants from an earlier design iteration.

---

## STEP 3 — DEPENDENCIES

### Python (`requirements.txt`)

| Package | What it does | Why Trace needs it | Where used |
|---|---|---|---|
| `langchain` | LLM application framework | Transitive dependency for `langgraph`; not directly imported in `main.py` | Indirect |
| `langgraph` | Stateful multi-step agent graphs | Orchestrates the 2-node pipeline: `vision_parser` → `analysis` | [main.py:12](file:///home/shaurya/Trace/main.py#L12), [L665–L673](file:///home/shaurya/Trace/main.py#L665-L673) |
| `langchain-google-genai` | Google Gemini integration for LangChain | Transitive dependency; not directly imported | Indirect |
| `google-genai` | Official Google GenAI SDK | Used to call `client.models.generate_content()` | [main.py:11](file:///home/shaurya/Trace/main.py#L11), [L31](file:///home/shaurya/Trace/main.py#L31) |
| `faiss-cpu` | Facebook's vector similarity search | Listed in README for RAG retrieval — **not actually used in code** | Unused |
| `python-dotenv` | Loads `.env` files into `os.environ` | Reads `GEMINI_API_KEY` and `PORT` | [main.py:8](file:///home/shaurya/Trace/main.py#L8), [L24](file:///home/shaurya/Trace/main.py#L24) |
| `pillow` | Python Imaging Library | Resizes uploaded images to ≤ 1024px before sending to Gemini | [main.py:13](file:///home/shaurya/Trace/main.py#L13), [L160–L174](file:///home/shaurya/Trace/main.py#L160-L174) |
| `tenacity` | Retry with exponential backoff | Retries Gemini API calls on 429/RESOURCE_EXHAUSTED errors | [main.py:16–21](file:///home/shaurya/Trace/main.py#L16-L21), [L183–L212](file:///home/shaurya/Trace/main.py#L183-L212) |
| `fastapi` | Async web framework | Serves the `/chat` POST endpoint | [main.py:9](file:///home/shaurya/Trace/main.py#L9), [L679](file:///home/shaurya/Trace/main.py#L679) |
| `uvicorn` | ASGI server | Runs the FastAPI app | [main.py:760–761](file:///home/shaurya/Trace/main.py#L760-L761) |
| `python-multipart` | Multipart form parsing | Required by FastAPI for `UploadFile` / `Form` fields | Implicit — FastAPI raises at runtime without it |

### Frontend (`frontend/package.json`)

| Package | Version | What it does | Where used |
|---|---|---|---|
| `next` | 16.1.6 | React meta-framework (SSR, routing, bundling) | Entire frontend |
| `react` | 19.2.3 | UI library | Every `.tsx` file |
| `react-dom` | 19.2.3 | React DOM renderer | Implicit |
| `framer-motion` | ^12.34.3 | Declarative animation library | [chat/page.tsx](file:///home/shaurya/Trace/frontend/app/chat/page.tsx#L4), [TraceChat.tsx](file:///home/shaurya/Trace/frontend/components/TraceChat.tsx#L4), unused components |
| `lucide-react` | ^0.575.0 | Icon library (Send, Upload, Bot, etc.) | [chat/page.tsx](file:///home/shaurya/Trace/frontend/app/chat/page.tsx#L6-L10), [TraceChat.tsx](file:///home/shaurya/Trace/frontend/components/TraceChat.tsx#L6-L8) |
| `tailwindcss` | ^4 (dev) | Utility CSS framework | Used via `@import "tailwindcss"` in [globals.css:2](file:///home/shaurya/Trace/frontend/app/globals.css#L2), but most styling is vanilla CSS |
| `@tailwindcss/postcss` | ^4 (dev) | PostCSS plugin for Tailwind v4 | [postcss.config.mjs](file:///home/shaurya/Trace/frontend/postcss.config.mjs#L3) |
| `typescript` | ^5 (dev) | TypeScript compiler | All `.tsx` files |
| `eslint` + `eslint-config-next` | ^9 / 16.1.6 (dev) | Linting | [eslint.config.mjs](file:///home/shaurya/Trace/frontend/eslint.config.mjs) |

---

## STEP 4 — ENTRY POINT

### Backend

Execution starts at [main.py:759–761](file:///home/shaurya/Trace/main.py#L759-L761):

```python
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)
```

When `python main.py` runs:

1. **L24**: `load_dotenv()` reads `.env`, loading `GEMINI_API_KEY` and `PORT`.
2. **L25–28**: `API_KEY` is validated (raises `RuntimeError` if missing). `PORT` defaults to `8000`.
3. **L31**: A `genai.Client` is created with the API key.
4. **L665–L673**: A `StateGraph(TraceState)` is built with two nodes (`vision_parser`, `analysis`) and compiled into `trace_brain`.
5. **L679–L691**: The FastAPI `app` is created with CORS middleware allowing `http://localhost:3000`.
6. **L694–L756**: The single `/chat` POST endpoint is registered.
7. **L761**: Uvicorn starts serving on `0.0.0.0:PORT`.

### Frontend

Execution starts at [frontend/app/layout.tsx](file:///home/shaurya/Trace/frontend/app/layout.tsx), which loads three Google Fonts (Sora, Geist, JetBrains Mono) and sets metadata. The root route `/` renders [frontend/app/page.tsx](file:///home/shaurya/Trace/frontend/app/page.tsx), which assembles `StarField → CosmicNav → HeroSection → BentoPreview → FeaturesSection → CtaSection → CosmicFooter`.

The `/chat` route renders [frontend/app/chat/page.tsx](file:///home/shaurya/Trace/frontend/app/chat/page.tsx), which is the main workspace: a split-pane with `NebulaCanvas` on the left and `ChatSidebar` on the right.

### Deployment

The [Procfile](file:///home/shaurya/Trace/Procfile) runs `uvicorn main:app --host 0.0.0.0 --port $PORT`, which is the Heroku-compatible entry point.

---

## STEP 5 — CORE PIPELINE / DATA FLOW

The entire data pipeline is triggered when a user sends a message from the chat UI:

```
┌──────────────────────────────────────────────────────────────────────────┐
│  FRONTEND (chat/page.tsx)                                                │
│  ┌──────────┐   FormData (query,file,history)   ┌──────────────────┐    │
│  │ User      │ ─────────────────────────────────→│ POST /chat       │    │
│  │ uploads   │                                   │ (FastAPI)        │    │
│  │ diagram + │   JSON response                   │                  │    │
│  │ question  │ ←─────────────────────────────────│ reply, entities, │    │
│  └──────────┘                                   │ edges, code      │    │
│                                                  └──────┬───────────┘    │
└──────────────────────────────────────────────────────────┼───────────────┘
                                                           │
                                                           ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  BACKEND (main.py)                                                       │
│                                                                          │
│  trace_brain.invoke(initial_state)                                       │
│                                                                          │
│  1. vision_parser_node (L256)                                            │
│     ├── resize_image() → PIL Image ≤ 1024px                             │
│     ├── _gemini_generate_with_retry("gemini-flash-latest", [prompt,img])│
│     ├── Parse JSON → nodes + edges                                       │
│     ├── _reindex_nodes() → sequential n1,n2,n3                          │
│     └── _validate_edges() → drop invalid, self-loops                    │
│                                                                          │
│  2. analysis_node (L638) — PARALLEL via ThreadPoolExecutor:              │
│     ├── rag_node (L380)                                                  │
│     │   ├── Build text representation of graph                           │
│     │   ├── Append conversation history                                  │
│     │   └── _gemini_generate_with_retry("gemini-flash-latest", prompt)  │
│     │                                                                    │
│     └── code_gen_node (L449)                                             │
│         ├── Database nodes → SQL CREATE TABLE DDL                        │
│         ├── DB→DB edges → ALTER TABLE ADD FOREIGN KEY                    │
│         ├── Process→DB edges → INSERT INTO                               │
│         ├── Actor+Process → FastAPI endpoint skeleton                    │
│         └── Decision nodes → if/else blocks                              │
│                                                                          │
│  3. Return JSON to frontend:                                             │
│     {reply, entities, edges (with resolved labels), generated_code}      │
└──────────────────────────────────────────────────────────────────────────┘
```

### Step-by-step detail:

1. **Frontend `handleSubmit`** ([chat/page.tsx:918](file:///home/shaurya/Trace/frontend/app/chat/page.tsx#L918)): Creates a `FormData` with `query`, `file`, and serialized `history`, then `POST`s to `/chat`.

2. **`chat_with_trace`** ([main.py:695](file:///home/shaurya/Trace/main.py#L695)): Reads the uploaded file bytes, parses history JSON, builds an `initial_state: TraceState`, and invokes `trace_brain.invoke(initial_state)`.

3. **`vision_parser_node`** ([main.py:256](file:///home/shaurya/Trace/main.py#L256)): Resizes the image, sends it with a detailed prompt to Gemini, receives JSON with nodes + edges, parses it (with 2-level fallback: full JSON → brace-scanning), re-indexes node IDs, validates edges.

4. **`analysis_node`** ([main.py:638](file:///home/shaurya/Trace/main.py#L638)): Runs `rag_node` and `code_gen_node` in **parallel** via `ThreadPoolExecutor(max_workers=2)`.

5. **`rag_node`** ([main.py:380](file:///home/shaurya/Trace/main.py#L380)): Builds a text context from the parsed graph, appends conversation history, asks Gemini to answer the user's question.

6. **`code_gen_node`** ([main.py:449](file:///home/shaurya/Trace/main.py#L449)): Generates code based on node types. It's purely rule-based — no LLM call. It pattern-matches on `Database`, `Process`, `Decision`, `Actor` types.

7. **Response** ([main.py:722–744](file:///home/shaurya/Trace/main.py#L722-L744)): The endpoint resolves edge IDs to human-readable labels and returns the full JSON payload.

8. **Frontend updates** ([chat/page.tsx:940–977](file:///home/shaurya/Trace/frontend/app/chat/page.tsx#L940-L977)): Stores the response in `messages`, maps entities to `CanvasNode[]` with a grid layout, maps backend edges to canvas edges, and renders everything in the canvas + chat sidebar.

---

## STEP 6 — EVERY FILE IN DETAIL

---

### [main.py](file:///home/shaurya/Trace/main.py) — Backend Core (761 lines)

This is the heart of the project. It contains the entire backend in a single file.

#### Imports & Initialization (L1–L31)

- Loads `.env` via `dotenv`, validates `GEMINI_API_KEY` exists (L25–27).
- Creates a `genai.Client` singleton (L31).
- `PORT` defaults to `8000` if not set (L28).

#### `TraceState` (L37–L45)

A `TypedDict` defining the state schema flowing through the LangGraph pipeline:
- `user_query` (str) — the user's natural language question
- `image_bytes` (bytes) — raw uploaded image data
- `rectangles` (List[dict]) — parsed nodes with `id`, `label`, `type`, `bbox`
- `edges` (List[dict]) — parsed edges with `from`, `to`, `label`
- `gemini_raw` (str) — raw text from Gemini vision response
- `response` (str) — the final analysis text
- `generated_code` (str) — the code generation output
- `chat_history` (List[dict]) — prior conversation turns

#### `strip_json_markdown(text)` (L52–L57)

Strips markdown code fences (` ```json ... ``` `) from Gemini responses. This is necessary because Gemini often wraps JSON in markdown fences even when told not to.

#### `_parse_json_objects(raw, required_keys)` (L60–L122)

The most robust parsing function. Uses a **2-level fallback strategy**:
1. Try `json.loads()` on the whole cleaned string.
2. If that fails, **walk character-by-character** tracking brace depth to extract balanced `{...}` blocks, then `json.loads` each one individually.

Has deduplication via a `seen` set (L72) based on key-value tuples. Items must contain all `required_keys` to be accepted (L77).

#### `parse_entities_from_json(raw)` (L125–L136)

Wraps `_parse_json_objects` with `required_keys={"id", "label", "type"}`. Normalizes to `{id, label, type, bbox}`.

#### `parse_edges_from_json(raw)` (L139–L149)

Wraps `_parse_json_objects` with `required_keys={"from", "to"}`. Defaults label to `"connects"`.

#### `get_next_step(node_id, state)` (L152–L157)

Simple graph traversal: finds the first edge where `edge['from'] == node_id` and returns `(to_id, label)`.

#### `resize_image(image_bytes, max_px=1024)` (L160–L174)

Opens image bytes as PIL Image, resizes proportionally so longest side ≤ `max_px`. Uses `Image.LANCZOS` for high-quality downsampling.

#### `_is_quota_error(exc)` (L177–L180)

Checks if an exception string contains `"RESOURCE_EXHAUSTED"`, `"429"`, or `"quota"`.

#### `_gemini_generate_with_retry(model, contents, max_attempts=3)` (L183–L212)

Wraps `client.models.generate_content()` with `tenacity` retry logic:
- Retries only on quota errors (`retry_if_exception(_is_quota_error)`)
- Exponential backoff: random between 4–30 seconds (`wait_random_exponential`)
- Max 3 attempts (configurable)

> [!WARNING]
> There's a dead function `_call` defined at L194 that's never used — only `_call_with_log` (L209) is called at L212. The `attempt` variable at L197 is also dead code.

#### `_validate_edges(edges, valid_ids)` (L215–L235)

Removes edges with invalid IDs, self-loops (`from == to`), and duplicates.

#### `_reindex_nodes(nodes)` (L238–L249)

Guarantees sequential IDs `n1, n2, n3 ...` regardless of what Gemini returned. Returns `(reindexed_nodes, id_map)` where `id_map` maps old→new IDs.

#### `vision_parser_node(state)` (L256–L377)

The main vision node. Key behaviors:
- **Prompt** (L267–L292): Asks for a single JSON object with `nodes[]` and `edges[]` arrays. Specifies exact schema, node types (`Process | Decision | Actor | Database`), bbox format, edge labeling rules.
- **Image resize** (L299): Calls `resize_image()` to reduce bandwidth.
- **Parsing** (L310–L338): Tries unified parse first (top-level `data.nodes` / `data.edges`), then fallback to flat array detection, then `parse_entities_from_json` / `parse_edges_from_json`.
- **Re-indexing** (L343–L355): Calls `_reindex_nodes`, then remaps all edge IDs to the new sequential IDs.
- **Validation** (L358–L359): Drops edges with invalid node references.
- **Error handling** (L368–L377): Re-raises quota/404 errors; for all others, returns a fallback single-node result.

#### `rag_node(state)` (L380–L446)

Builds a textual representation of the graph:
- `nodes_text`: bullet list of `label (type)`
- `edges_text`: arrow notation `Label A --[edge label]--> Label B`
- `history_block`: formatted prior conversation

Sends this to Gemini with the user's question. Falls back to a structured dump of components if Gemini fails.

#### `code_gen_node(state)` (L449–L631)

Purely rule-based code generator. Inspects node types and generates:

1. **SQL DDL** (L476–L508):
   - `CREATE TABLE` for every `Database` node
   - `ALTER TABLE ADD FOREIGN KEY` for every `Database → Database` edge

2. **FastAPI Skeleton** (L510–L619):
   - `BaseModel` request class for every `Process` node
   - `@app.post` endpoint for every `Process` node
   - If the Process has an incoming `Actor` edge, adds an `actor_id` path parameter
   - If the Process leads to a `Decision` node, generates `if/else` with `Yes`/`No` branches
   - If the Process leads to a `Database` node, generates `INSERT INTO`

3. **Fallback** (L622–L627): If no templates match, outputs a comment listing detected nodes/edges.

#### `analysis_node(state)` (L638–L659)

Runs `rag_node` and `code_gen_node` **in parallel** using `ThreadPoolExecutor(max_workers=2)`. Logs elapsed time for the parallel execution.

#### LangGraph Compilation (L665–L673)

```python
workflow = StateGraph(TraceState)
workflow.add_node("vision_parser", vision_parser_node)
workflow.add_node("analysis",      analysis_node)
workflow.set_entry_point("vision_parser")
workflow.add_edge("vision_parser", "analysis")
workflow.add_edge("analysis",      END)
trace_brain = workflow.compile()
```

A simple 2-node linear graph: `vision_parser → analysis → END`.

#### FastAPI Setup (L679–L691)

- Creates `app` with title `"Trace AI Backend"`.
- CORS: allows origins from `ALLOWED_ORIGINS` env var (defaults to `http://localhost:3000`).

#### `/chat` Endpoint (L694–L756)

- Accepts `query` (Form), `file` (UploadFile), `history` (Form, default `"[]"`).
- Reads image bytes, parses history, builds `initial_state`, invokes `trace_brain`.
- Post-processes: resolves edge IDs to labels/types for frontend consumption.
- Error handling: returns 503 for quota exhaustion, 500 for everything else.

---

### [state.py](file:///home/shaurya/Trace/state.py) — Legacy State (10 lines)

Defines `GlyphState(TypedDict)` with fields like `image_path`, `tech_stack`, `retrieved_snippets`, `is_validated`, `iteration_count`.

> [!NOTE]
> This file is **completely unused**. The project was originally called "Glyph" and had a different state schema. `main.py` defines its own `TraceState` (L37–L45). This file is a fossil.

---

### [requirements.txt](file:///home/shaurya/Trace/requirements.txt) — Python Deps (11 lines)

All packages unpinned (no version specifiers). See STEP 3 for details.

---

### [.env](file:///home/shaurya/Trace/.env) — Environment (3 lines)

```
GEMINI_API_KEY="AIzaSy..."
PORT=8000
```

> [!CAUTION]
> The `.env` file contains a **real API key**. While `.env` is in `.gitignore`, if this was ever committed, the key should be rotated immediately. (The key `AIzaSyBUqO919RZXvoSUVgb-ANPJDuP4viMpPXg` appears to be a Google AI Studio key.)

---

### [.gitignore](file:///home/shaurya/Trace/.gitignore) — Git Ignore (19 lines)

Ignores `.venv/`, `venv/`, `.env`, `__pycache__/`, `faiss_index/`, `uploads/`, `*.pyc`, `*.sh`, and frontend build artifacts.

> [!NOTE]
> `*.sh` is in `.gitignore`, which means `push_helper.sh` will never be committed. This seems intentional.

---

### [Procfile](file:///home/shaurya/Trace/Procfile) — Heroku Deploy (2 lines)

```
web: uvicorn main:app --host 0.0.0.0 --port $PORT
```

Standard Heroku web process declaration.

---

### [push_helper.sh](file:///home/shaurya/Trace/push_helper.sh) — Git Script (13 lines)

A simple bash script that `cd`s to the project, runs `git add README.md`, commits with message `"Add professional README.md"`, and pushes. One-off utility.

---

### [README.md](file:///home/shaurya/Trace/README.md) — Project README (106 lines)

Describes the "Multimodal Agentic RAG" workflow with 4 steps: Vision, RAG Retrieval, Coder, Agentic Validation. Mentions FAISS, Gemini 1.5 Pro, LangGraph. Setup instructions. The usage section shows a CLI interface (`python main.py --image ...`) that **does not exist** in the actual code — the project is HTTP-only.

---

### [DESIGN.md](file:///home/shaurya/Trace/DESIGN.md) — Design System (231 lines)

Comprehensive design spec for the "Trace Cosmic Noir" theme, extracted from a Stitch design tool. Defines:
- Full color palette (achromatic, 28+ tokens)
- Typography system (Sora for headlines, Geist for body, JetBrains Mono for code)
- Spacing scale (4px base unit)
- Border radius system
- Glass panel, mirror effect, light leak CSS specifications
- Component specifications (nav, buttons, cards, inputs, chips, starfield)
- Animation catalog (twinkle, pulse, inner-glow, mirror-effect, scroll-fade)
- Responsive breakpoints

---

### [package-lock.json](file:///home/shaurya/Trace/package-lock.json) (root) — Empty (7 lines)

A placeholder lockfile with no packages. Appears to be an artifact from running `npm` at root level.

---

### [learn/langgraph.ipynb](file:///home/shaurya/Trace/learn/langgraph.ipynb) — Notebook (11 KB)

A Jupyter notebook for learning LangGraph concepts. Not part of the production codebase.

---

### Frontend Files

---

#### [frontend/app/layout.tsx](file:///home/shaurya/Trace/frontend/app/layout.tsx) — Root Layout (56 lines)

- Loads **Sora** (weights 400/600/700), **Geist** (400/600), **JetBrains Mono** (400/600) from Google Fonts via `next/font/google`.
- Sets CSS variables `--font-sora`, `--font-geist`, `--font-jetbrains` on `<html>`.
- SEO metadata: title `"Trace | Into the Void — Diagrams to Reality"`, description, keywords, OpenGraph.
- `suppressHydrationWarning` on `<html>` to prevent SSR/client mismatch warnings.
- Body background: `#000`, color: `#e2e2e2`.

#### [frontend/app/page.tsx](file:///home/shaurya/Trace/frontend/app/page.tsx) — Landing Page (30 lines)

Assembles the landing page sections in order:
1. `StarField` (fixed background)
2. `CosmicNav` (fixed top)
3. `<main>`: `HeroSection` → `BentoPreview` → `FeaturesSection` → `CtaSection`
4. `CosmicFooter`

#### [frontend/app/globals.css](file:///home/shaurya/Trace/frontend/app/globals.css) — Global Styles (288 lines)

Implements the DESIGN.md spec as CSS:
- **L1**: Imports Google Fonts via CSS `@import url(...)`.
- **L2**: Imports Tailwind (`@import "tailwindcss"`).
- **L10–63**: `:root` variables for surfaces, primary/secondary colors, spacing, radii.
- **L66–70**: Universal box-sizing reset.
- **L73–87**: Base `html`/`body` styles.
- **L90–123**: Typography utility classes: `.font-display`, `.font-headline`, `.font-body`, `.font-label`, `.font-code`.
- **L126–148**: `.glass-panel` — glassmorphism effect with specular `::before` highlight and hover glow.
- **L151–154**: `.mirror-effect` — gradient mask.
- **L157–164**: `.light-leak` — radial gradient decorative orb.
- **L167–210**: `.btn-primary` / `.btn-secondary` — button styles with hover shadows and active scale.
- **L213–227**: `.chip` — JetBrains Mono pill tags.
- **L230–252**: `.pulse-dot` — 8px pulsing white circle with `@keyframes pulse-indicator`.
- **L255–258**: Custom scrollbar (4px wide, near-invisible).
- **L261–264**: `.section-rule` — horizontal gradient divider.
- **L267–282**: `.cosmic-input` — bottom-border-only input field.
- **L285–288**: `::selection` — white selection highlight.

#### [frontend/app/chat/page.tsx](file:///home/shaurya/Trace/frontend/app/chat/page.tsx) — Chat Workspace (1080 lines)

The largest and most complex file. Contains **4 component definitions** in one file:

##### Types (L14–27)

`Entity`, `Edge`, `TraceResponse`, `ChatMessage`, `CanvasNode`, `CanvasEdge`.

##### `escapeHtml(s)` (L29–31)

Basic XSS-safe HTML escaping for `&`, `<`, `>`.

##### `inlineMd(t)` (L33–37)

Simple inline markdown: `**bold**` → `<strong>`, `` `code` `` → `<code>`.

##### `renderReply(text)` (L38–99)

Splits text by fenced code blocks (` ```lang ... ``` `), renders code blocks with a language label + copy button, renders bullet lists with `◆` markers, and passes inline markdown through `inlineMd()`.

> [!WARNING]
> This uses `dangerouslySetInnerHTML` at L49, L90, L94 with content from the Gemini API. While `escapeHtml` is used for code blocks (L77), the `inlineMd()` function at L90/L94 passes Gemini's text through regex replacement and then sets it as HTML. This is a potential **XSS vector** if the LLM output contains malicious HTML.

##### `NodeTypeIcon({ type })` (L102–L110)

Returns inline SVGs based on node type: `ENTRY_POINT` (layers icon), `CORE_PROCESS` (square+cross), `STORAGE` (database cylinder), default (sun/settings gear).

##### `NebulaCanvas` (L113–L417)

The interactive node canvas. Features:
- **Drag-and-drop** node repositioning (L131–L152): `handleMouseDown` captures offset, `handleMouseMove` updates positions, `handleMouseUp` clears drag state. Uses `window` event listeners.
- **Floating toolbar** (L170–L206): Select, Add Node, Connect tools (visual only — Add Node and Connect don't actually do anything).
- **Zoom controls** (L209–L231): +/- 15% per click, range 40%–200%.
- **Bottom action buttons** (L234–L267): "Export Code" and "Initialize" buttons.
- **Empty state** (L270–L294): Shown when `nodes.length === 0`.
- **SVG edge layer** (L306–L336): Draws Bézier curves between nodes with dashed stroke and arrow markers. Animated via `stroke-dashoffset`.
- **Node rendering** (L339–L409): Each node is a glassmorphism card with specular corner highlight, type icon, label, and either a loading pulse bar (active) or subtitle text.

##### `ChatSidebar` (L420–L848)

The right-panel chat interface:
- **Header** (L466–L503): "Trace Chat" title, status indicator, reset button.
- **Messages** (L506–L678): AnimatePresence-wrapped messages with AI/User avatars. AI messages show: rendered reply, generated code block with copy button, entity/edge chips.
- **Input area** (L682–L837): File upload zone (drag-and-drop), multiline textarea (auto-resizes up to 140px), send button with loading spinner. Keyboard shortcut: Ctrl+Enter to submit.

##### `ChatPage` (L851–L1079)

The page-level orchestrator. State:
- `nodes`, `edges` — canvas state
- `messages`, `query`, `file`, `loading`, `error` — chat state
- `latestCodeRef` — stores most recent generated code for export

Key functions:
- **`handleNodeClick(id)`** (L863): Sets the clicked node as active, pre-fills query with `"Tell me about the {label} node"`.
- **`handleReset()`** (L870): Clears all state.
- **`handleExportCode()`** (L881): Downloads `latestCodeRef.current` as `.sql` or `.py` file (determined by whether code starts with `--`).
- **`handleInitialize()`** (L900): If file + query are ready, dispatches form submit; otherwise focuses the textarea or shows an error.
- **`handleSubmit(e)`** (L918): The main submission handler. POSTs to backend, updates messages, maps entities to canvas nodes (grid layout with `cols = ceil(sqrt(count))`), maps edges by label→id lookup, auto-wires nodes sequentially if no edges returned.

Layout: Full viewport, `StarField` background, top nav bar, split pane (`NebulaCanvas` flex-grows, `ChatSidebar` fixed 420px wide).

---

#### [frontend/components/StarField.tsx](file:///home/shaurya/Trace/frontend/components/StarField.tsx) — Animated Stars (58 lines)

`'use client'` component. On mount, creates **180 stars** as absolutely-positioned `<div>` elements via direct DOM manipulation (`document.createElement`). Each star has:
- Random size: 0.2–2.0px
- Random position: 0–100% x/y
- Random opacity: 0.1–0.6
- Random animation duration: 2–5s with random delay: 0–5s
- 20% chance of `filter: blur(1px)` for depth simulation

Defines `@keyframes twinkle` inline that oscillates opacity and scale.

> [!NOTE]
> Uses `container.innerHTML = ''` for cleanup (L12), which is fine since it's empty initially but would destroy any children if re-rendered.

---

#### [frontend/components/CosmicNav.tsx](file:///home/shaurya/Trace/frontend/components/CosmicNav.tsx) — Navigation (120 lines)

Fixed top nav with:
- **Scroll detection** (L14–18): Adds more opacity/shadow when `scrollY > 20`.
- **Logo** (L31–L37): Sora font, uppercase "Trace", clicks to `/`.
- **Desktop nav links** (L40–L56): `['Nebula', 'Mirror', 'Void', 'Pulse']`. First link is always active-styled. If on `/chat`, links point to `/` instead of `#anchors`.
- **Search icon** (L61–L69): Non-functional, desktop-only.
- **CTA button** (L72–L79): "Initialize" → navigates to `/chat`.
- **Mobile hamburger** (L82–L94): Toggles `mobileOpen` state, shows X or hamburger icon.
- **Mobile menu** (L99–L116): Dropdown with nav links.

---

#### [frontend/components/HeroSection.tsx](file:///home/shaurya/Trace/frontend/components/HeroSection.tsx) — Hero (150 lines)

Full-viewport hero section with staggered entrance animation:
- **Entrance animation** (L13–L25): Each element fades in + slides up with 200ms stagger via `setTimeout` + style mutations.
- **Light leak orb** (L34–L43): 800×500px radial gradient, blurred 60px.
- **Status chip** (L46–L61): Pulsing dot + "System Active: V.2.0.4" in JetBrains Mono.
- **Giant wordmark** (L64–L77): "Trace" in Sora, clamp(96px, 18vw, 200px).
- **Main headline** (L80–L93): `<h1>` "Diagrams to Reality".
- **Sub-headline** (L96–L109): Body text in Geist.
- **CTAs** (L112–L129): "Start Mapping" → `/chat`, "View Documentation" → scrolls to `#void`.
- **Scroll hint line** (L132–L134): Animated gradient line at bottom.
- **Inline keyframes** (L136–L146): `cosmicPulse` and `scrollPulse`.

---

#### [frontend/components/BentoPreview.tsx](file:///home/shaurya/Trace/frontend/components/BentoPreview.tsx) — Product Preview (139 lines)

Two sub-components:

**`CanvasMockup()`** (L11–L52): An SVG diagram preview showing 4 nodes (`auth.service`, `api.gateway`, `data.pipeline`, `render.core`) connected by dashed lines. `api.gateway` is highlighted with a double border. Grid background via `<pattern>`.

**`InspectorMockup()`** (L54–L77): A key-value table showing mock data (NODE, TYPE, DEPS, STATUS, LATENCY, REQUESTS).

**`BentoPreview()`** (L79–L138): 12-column grid: 8-col canvas card + 4-col inspector card. Both are glass panels with hover effects (inline `onMouseEnter`/`onMouseLeave` style mutations). The canvas card applies `.mirror-effect` mask.

---

#### [frontend/components/FeaturesSection.tsx](file:///home/shaurya/Trace/frontend/components/FeaturesSection.tsx) — Features (143 lines)

**`FEATURES` array** (L4–L42): 3 features: "Neural Mapping", "Glass Sync", "Void Mode". Each has an inline SVG icon, number (`01`, `02`, `03`), title, and description.

**`FeatureCard({ feature, index })`** (L44–L109): Uses `IntersectionObserver` for scroll-triggered entrance animation. Has:
- Specular highlight (L81)
- Icon with hover scale (L84–L89)
- Title + description
- Number + divider line
- Mirror-effect mask
- Staggered animation delay based on `index`

**`FeaturesSection()`** (L112–L142): Section header ("Designed for the Focused") + 3-col grid of feature cards. Background: `rgba(0,0,0,0.45)`.

---

#### [frontend/components/CtaSection.tsx](file:///home/shaurya/Trace/frontend/components/CtaSection.tsx) — CTA (119 lines)

**`METRICS` array** (L5–L9): 3 stats: "10× Faster Iteration", "99.9% Uptime SLA", "<12ms Avg Latency".

- **Metrics row** (L32–L43): 3-col grid of large stats.
- **CTA glass panel** (L46–L106): IntersectionObserver-triggered entrance. Contains specular highlight, glow orb, "Now in Beta" badge, "Ready to enter the void?" headline, description, two CTAs ("Request Access" → `/chat`, "Learn More" → scrolls to `#void`).

---

#### [frontend/components/CosmicFooter.tsx](file:///home/shaurya/Trace/frontend/components/CosmicFooter.tsx) — Footer (104 lines)

- **`NAV_COL`** (L4–L8): 3 nav columns (Product, Company, Developers) with link lists.
- **`handleFooterLink(heading, link)`** (L13–L17): Routes "Nebula" to `/`, "Docs" and "SDK" to `/chat`. Other links are no-ops.
- **Brand column** (L27–L43): Logo, tagline, status chip.
- **Nav columns** (L47–L68): Rendered from `NAV_COL` with hover color transitions.
- **Bottom bar** (L72–L91): Copyright "© 2026 Trace Systems Inc." + Privacy/Terms/Security links.

---

#### Unused Components

**[FeatureCards.tsx](file:///home/shaurya/Trace/frontend/components/FeatureCards.tsx)** (204 lines): An alternate feature section using `framer-motion` + `lucide-react` icons (Zap, GitBranch, Layers, Code2, Cpu, Globe). Has 6 cards + a stats row. Uses CSS variables like `--accent`, `--border`, `--surface` that aren't defined in the current `globals.css`. This appears to be from a previous design iteration with a different color scheme.

**[Footer.tsx](file:///home/shaurya/Trace/frontend/components/Footer.tsx)** (63 lines): An alternate footer with GitHub/Twitter icons. Uses `framer-motion`. References `--bg-section`, `--text`, `--text-subtle` variables.

**[MeshBackground.tsx](file:///home/shaurya/Trace/frontend/components/MeshBackground.tsx)** (54 lines): Animated gradient orbs (purple, blue, violet) with `framer-motion`. Has a grid overlay. This was the background for a previous colorful design before the monochrome "Cosmic Noir" redesign.

**[ThemeToggle.tsx](file:///home/shaurya/Trace/frontend/components/ThemeToggle.tsx)** (87 lines): A dark/light theme toggle using `localStorage` and HTML class toggling. References `--border`, `--surface`, `--text` variables.

**[TraceChat.tsx](file:///home/shaurya/Trace/frontend/components/TraceChat.tsx)** (617 lines): An earlier version of the chat component. Uses a purple accent scheme (`--accent`, `--accent-light`, etc.) and includes `TraceResultPanel` with tabbed views (Nodes, Connections, Code). This was replaced by the inline `ChatSidebar` in `chat/page.tsx`.

---

## STEP 7 — CONFIGURATION

### Environment Variables

| Variable | File | Default | What it does | What happens if changed |
|---|---|---|---|---|
| `GEMINI_API_KEY` | `.env` | None (required) | API key for Google Gemini | App crashes on startup if missing. Using a different key changes quota/billing. |
| `PORT` | `.env` | `8000` | Backend server port | Backend listens on a different port. Frontend `.env.local` must match. |
| `ALLOWED_ORIGINS` | Not in `.env` (code-level) | `"http://localhost:3000"` | CORS allowed origins (comma-separated) | Set to your frontend's production URL for deployment. |
| `NEXT_PUBLIC_API_URL` | `frontend/.env.local` | `http://localhost:8000` | Backend URL the frontend calls | Must match the backend's host:port. The `NEXT_PUBLIC_` prefix makes it available in browser code. |

### Hardcoded Constants

| Constant | Location | Value | Purpose |
|---|---|---|---|
| Model name | [main.py:303](file:///home/shaurya/Trace/main.py#L303), [L428](file:///home/shaurya/Trace/main.py#L428) | `"gemini-flash-latest"` | Which Gemini model to use. Changing to `"gemini-2.5-pro"` would give better results but cost more. |
| `max_px` | [main.py:160](file:///home/shaurya/Trace/main.py#L160) | `1024` | Maximum image dimension. Larger = better quality but more API cost/latency. |
| `max_attempts` | [main.py:183](file:///home/shaurya/Trace/main.py#L183) | `3` | Retry attempts for Gemini. More attempts = longer waits but higher success rate under load. |
| Star count | [StarField.tsx:14](file:///home/shaurya/Trace/frontend/components/StarField.tsx#L14) | `180` | Number of animated stars. Higher = more visual density but more DOM elements. |
| Sidebar width | [chat/page.tsx:452](file:///home/shaurya/Trace/frontend/app/chat/page.tsx#L452) | `420px` | Chat sidebar width. Not responsive on mobile. |
| `NODE_W` / `NODE_H` | [chat/page.tsx:154–155](file:///home/shaurya/Trace/frontend/app/chat/page.tsx#L154-L155) | `180px` / `90px` | Canvas node dimensions. |
| Zoom range | [chat/page.tsx:219, L227](file:///home/shaurya/Trace/frontend/app/chat/page.tsx#L219) | 40%–200%, step 15% | Canvas zoom limits. |

---

## STEP 8 — WHAT IS HARDCODED / WHAT NEEDS IMPROVEMENT

### Hardcoded Values That Should Be Configurable

1. **Gemini model** (`"gemini-flash-latest"` at L303, L428): Should be an env var like `GEMINI_MODEL` so you can switch models without code changes.

2. **`max_px = 1024`** (L160): Should be configurable. For detailed diagrams, 2048px would preserve more text readability.

3. **CORS origins** (L681): Defaults to `http://localhost:3000`. For production, this must be changed. It reads from `ALLOWED_ORIGINS` env var, but there's no `.env.example` documenting this.

4. **Node types** (L283–L284): Only 4 types: `Process | Decision | Actor | Database`. This is hardcoded in the prompt. Should be extensible.

5. **Sidebar width** (420px, L452): Not responsive. Will break on tablets.

6. **Version strings**: "V.2.0.4" and "SESSION: V_ALPHA_9" appear in at least 4 places. Should be a single constant.

### Code Smells & Potential Bugs

1. **Dead code in `_gemini_generate_with_retry`** (L194–L196, L197): The `_call()` function and `attempt` variable are defined but never used. Only `_call_with_log()` is called.

2. **`state.py` is completely orphaned**: It defines `GlyphState` which is never imported anywhere. Delete it.

3. **5 unused frontend components**: `FeatureCards.tsx`, `Footer.tsx`, `MeshBackground.tsx`, `ThemeToggle.tsx`, `TraceChat.tsx` are dead code. They reference CSS variables (`--accent`, `--border`, `--surface`, `--bg-section`, etc.) that don't exist in the current `globals.css`.

4. **XSS risk in `renderReply`** ([chat/page.tsx:90, 94](file:///home/shaurya/Trace/frontend/app/chat/page.tsx#L90-L94)): Uses `dangerouslySetInnerHTML` with text from the Gemini API passed through `inlineMd()`. If Gemini's response contains `<script>` or event handlers, they'll be injected into the DOM.

5. **No input validation on image size**: The backend accepts arbitrarily large uploads. There's no `max_upload_size` limit.

6. **Synchronous `trace_brain.invoke()`** in an async endpoint (L720): LangGraph's `invoke()` is synchronous and blocks the event loop. Under load, this will freeze the server. Should use `ainvoke()` or run in a thread pool.

7. **File re-uploaded on every follow-up message**: The frontend sends the full image file with every message in the conversation, even though the backend re-parses it every time. The vision parsing results should be cached per-session.

8. **No FAISS usage**: `faiss-cpu` is in `requirements.txt` and mentioned in the README, but there's no FAISS code anywhere. The `library/` directory is empty. The RAG retrieval step described in the README doesn't exist.

9. **Unpinned dependencies**: `requirements.txt` has no version pins. A `pip install` today might install different versions than what was developed against, potentially breaking the app.

10. **`package-lock.json` at root** is empty and serves no purpose.

11. **README usage section is wrong**: It describes `python main.py --image ./uploads/my_system_design.png --output ./my-new-project` which is not how the app works (it's a web server, not a CLI tool).

12. **Fonts loaded twice**: Google Fonts are loaded both via CSS `@import url(...)` in [globals.css:1](file:///home/shaurya/Trace/frontend/app/globals.css#L1) AND via `next/font/google` in [layout.tsx:5–24](file:///home/shaurya/Trace/frontend/app/layout.tsx#L5-L24). This causes redundant network requests and potential FOIT/FOUT issues. Should use only one method (preferably `next/font/google` which handles optimization).

13. **Inline styles everywhere**: The frontend uses extensive inline `style={{}}` objects instead of CSS classes. This makes the code harder to maintain, prevents caching of styles, and increases bundle size.

14. **No error boundary**: The chat page has no React error boundary. An uncaught render error will white-screen the entire page.

---

## STEP 9 — THINGS THE DEVELOPER MIGHT NOT KNOW ABOUT THEIR OWN CODE

### 1. The code generator uses `state` from the module scope — not the function argument

In [code_gen_node](file:///home/shaurya/Trace/main.py#L449), look at line 547:
```python
next_id, next_label = get_next_step(proc["id"], state)
```

The variable `state` here refers to the function parameter. But `get_next_step(node_id, state)` at L154 reads `state.get('edges', [])`. This works correctly because `state` is the `TraceState` dict, but if you ever refactored `code_gen_node` to use a different variable name for the state, this would silently break because `edges` are read from the function's local `edges` variable (L462) *as well as* from the state dict (via `get_next_step`). These could theoretically be out of sync.

### 2. The parallel execution hides exceptions

In [analysis_node](file:///home/shaurya/Trace/main.py#L638), `future_rag.result()` and `future_code.result()` will re-raise any exception from the thread. But if `rag_node` fails and `code_gen_node` succeeds, you'll lose the code generation result because the exception propagates before `code_result` is read. The order matters: rag is read first (L651), so a rag failure masks any code-gen result.

### 3. The canvas zoom doesn't affect edge SVG paths

The SVG connector layer ([chat/page.tsx:306](file:///home/shaurya/Trace/frontend/app/chat/page.tsx#L306)) is rendered at `position: absolute; inset: 0` with `width: 100%; height: 100%`, but the nodes layer ([chat/page.tsx:339](file:///home/shaurya/Trace/frontend/app/chat/page.tsx#L339)) has `transform: scale(${zoom / 100})`. The edge SVG paths use the un-zoomed node positions (`getPos`), so **at any zoom level other than 100%, the edges will be misaligned with the nodes**. The SVG layer doesn't scale with the zoom.

### 4. `handleInitialize` uses `dispatchEvent` which may not trigger React's synthetic event system

At [chat/page.tsx:903](file:///home/shaurya/Trace/frontend/app/chat/page.tsx#L903):
```typescript
chatInputRef.current?.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
```

But `chatInputRef` is never actually assigned — it's declared at L899 but no `<form ref={chatInputRef}>` exists in the JSX. This means the "Initialize" button's "auto-submit" feature **silently does nothing**. It will always fall through to the `else` branch and just focus the textarea.

### 5. Your edge auto-wiring creates a sequential chain regardless of actual topology

At [chat/page.tsx:972–976](file:///home/shaurya/Trace/frontend/app/chat/page.tsx#L972-L976), if the backend returns no edges, the frontend auto-wires nodes sequentially: `n1→n2→n3→n4→...`. This creates a visually misleading linear chain even if the diagram was a star topology, a DAG, or a disconnected graph.

### 6. The star animation doesn't use the CSS variable it defines

The `@keyframes twinkle` at [StarField.tsx:43](file:///home/shaurya/Trace/frontend/components/StarField.tsx#L43) references `var(--star-opacity, 0.3)`, but no star element ever sets `--star-opacity`. So every star always starts and ends at opacity `0.3`, regardless of its initial opacity. The initial opacity set at L31 (`opacity: ${opacity}`) is overridden by the animation. The stars all pulse between 0.3 and 1.0, ignoring their assigned random opacity.

### 7. The CORS configuration silently splits on comma without trimming whitespace

At [main.py:683](file:///home/shaurya/Trace/main.py#L683):
```python
).split(",")
```

If someone sets `ALLOWED_ORIGINS="http://localhost:3000, https://trace.app"`, the second origin will be `" https://trace.app"` (with a leading space), which won't match any incoming `Origin` header. The CORS middleware will silently reject the request.

### 8. The `_reindex_nodes` function can silently lose edges

At L343–L355, edges are remapped using `id_map`. But if Gemini returned an edge referencing a node ID that doesn't exist in the nodes list (e.g., a typo like `"n10"` when only `n1`–`n5` exist), `id_map.get(ed["from"])` returns `None`, and the edge is silently dropped. The print at L354 logs this, but it's easy to miss in production.

### 9. You're sending the raw image bytes on every message — even follow-ups

At [chat/page.tsx:931](file:///home/shaurya/Trace/frontend/app/chat/page.tsx#L931), every `handleSubmit` appends the full `file` to the FormData. The backend then re-runs the entire LangGraph pipeline including `vision_parser_node`, re-parsing the same image from scratch. For a multi-turn conversation about the same diagram, you're:
- Re-uploading the same image (wasting bandwidth)
- Re-calling Gemini Vision (wasting API quota)
- Getting potentially different parse results each time (non-deterministic)

### 10. The `cosmicPulse` keyframe is defined in 3 separate files

`@keyframes cosmicPulse` is defined inline in:
- [HeroSection.tsx:137](file:///home/shaurya/Trace/frontend/components/HeroSection.tsx#L137)
- [CtaSection.tsx:110](file:///home/shaurya/Trace/frontend/components/CtaSection.tsx#L110)
- And a similar `pulse-indicator` in [globals.css:239](file:///home/shaurya/Trace/frontend/app/globals.css#L239)

If you update the animation in one place, the others will be inconsistent. These should be a single definition in `globals.css`.

### 11. The Tailwind v4 import may not be doing what you think

At [globals.css:2](file:///home/shaurya/Trace/frontend/app/globals.css#L2): `@import "tailwindcss"`. Tailwind v4 uses this syntax, but the vast majority of your styling is vanilla CSS and inline styles. The only Tailwind classes actively used are layout utilities like `flex`, `grid`, `gap-*`, `px-*`, `py-*`, `items-center`, `justify-between`, `max-w-*`, `mx-auto`, etc. You have a full Tailwind installation (148 KB+ of CSS utilities) for what amounts to ~20 utility classes. You could replace these with a few lines of vanilla CSS and drop Tailwind entirely.
