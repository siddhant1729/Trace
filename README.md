# 🖊️ Trace

### Turn Whiteboard Chaos into Engineering Reality.

**Trace** is an AI-powered "Diagram-to-Code" engine that transforms hand-drawn system architectures and flowcharts into production-ready boilerplate code. Stop rewriting what you've already designed—Trace it.

---

## 🚀 The Vision

Development shouldn't start with a blank text editor; it starts on a whiteboard. However, the friction of translating those visual ideas into a structured codebase is where velocity is lost.

**Trace** eliminates this bottleneck. By combining multimodal understanding with agentic reasoning, Trace doesn't just "see" your diagram—it understands your intent, retrieves your preferred architectural patterns, and scaffolds your project so you can focus on the logic, not the setup.
```markdown
Whether you're sketching a complex microservices mesh or a simple state machine, Trace bridges the gap between high-level design and low-level implementation. No more manual mapping of boxes to classes or arrows to API endpoints—Trace handles the structural heavy lifting, turning your visual artifacts into a living, breathing codebase.
```

---

## 🛠️ How It Works

Trace employs a **Multimodal RAG** workflow, orchestrated with **LangGraph**, to ensure accuracy and code quality. The pipeline consists of these nodes:

1.  **📸 Vision Node**: **Gemini** analyzes your uploaded diagram, identifying components, relationships, and data flow direction as structured nodes + edges.
2.  **📚 RAG Retrieval**: The parsed diagram is embedded with **Gemini embeddings** and used to query a **ChromaDB** vector store seeded with a curated library of production-shaped code patterns (FastAPI routes, SQLAlchemy models, Redis caching, message-queue consumers, Dockerfiles, and more). The closest patterns are injected into the analysis prompt so the answer is grounded in real, idiomatic implementations.
3.  **💻 Code-Gen Node**: A rule-based generator inspects node types and scaffolds SQL DDL (Database nodes) and FastAPI skeletons (Actor/Process/Decision nodes).

---

## ✨ Key Features

*   **Multimodal RAG**: Context-aware answers that "see" your diagram and retrieve matching architectural patterns from a **ChromaDB** vector library.
*   **LangGraph Orchestration**: A typed state graph runs vision parsing, then RAG analysis and code generation in parallel.
*   **Opinionated Patterns**: A curated, extensible corpus of production-shaped snippets (`trace/library/corpus.py`) grounds generated code in real idioms — add your own to make output look like *you* wrote it.
*   **Boilerplate Scaffolding**: Emits SQL DDL and FastAPI skeletons directly from the parsed diagram.

---

## 📦 Setup

### Prerequisites

*   Python 3.10+
*   Node.js 18+
*   Google Gemini API Key

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/siddhant1729/Trace.git
    cd Trace
    ```

2.  **Create a virtual environment and install backend dependencies**
    ```bash
    python3 -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt
    ```

3.  **Configure environment variables**
    ```bash
    cp .env.example .env
    # Open .env and set GEMINI_API_KEY to your Google AI Studio key
    ```

    `.env` reference:
    ```
    GEMINI_API_KEY=your-gemini-api-key-here
    GEMINI_MODEL=gemini-flash-latest              # optional
    EMBEDDING_MODEL=models/gemini-embedding-001   # optional (RAG embeddings)
    CHROMA_PATH=./chroma_db                       # optional (vector store location)
    PORT=8000                                     # optional
    ALLOWED_ORIGINS=http://localhost:3000         # optional
    ```

4.  **Seed the RAG vector store** (one-time; embeds the code-pattern corpus into ChromaDB)
    ```bash
    python scripts/ingest_corpus.py
    # Inspect what was ingested:
    python scripts/inspect_chroma.py
    ```
    Retrieval degrades gracefully if the store is empty, but seeding it is what makes
    RAG actually augment the generated answers.

5.  **Install frontend dependencies**
    ```bash
    cd frontend
    npm install
    cd ..
    ```

---

## 💻 Running Locally

Open two terminals from the repo root.

**Terminal 1 — Backend**
```bash
source .venv/bin/activate
uvicorn trace.api.main:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2 — Frontend**
```bash
cd frontend
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

### Project structure

```
trace/
├── config.py           # pydantic-settings (reads .env)
├── api/main.py         # FastAPI app + /chat endpoint
├── graph/
│   ├── nodes.py        # Vision parser, RAG, code-gen node functions
│   └── pipeline.py     # LangGraph graph assembly
├── library/            # RAG code-pattern library
│   ├── corpus.py       # Curated code-pattern snippets + metadata
│   └── vector_store.py # ChromaDB ingestion + retrieval (get_relevant_patterns)
└── nodes/              # Reserved for future node modules
scripts/
├── ingest_corpus.py    # Seed the ChromaDB pattern store
└── inspect_chroma.py   # Print collection count + sample entries
frontend/               # Next.js UI
tests/                  # pytest test suite
```

---

## 🎥 Demo

*(Coming Soon)*

> *Watch Trace convert a napkin sketch into a working Flask API.*

---

## 🏗️ Tech Stack

*   **Orchestration**: [LangGraph](https://github.com/langchain-ai/langgraph)
*   **Intelligence**: [Gemini](https://deepmind.google/technologies/gemini/) (via `google-genai`)
*   **Vector Store / RAG**: [ChromaDB](https://www.trychroma.com/) with Gemini embeddings
*   **Backend**: [FastAPI](https://fastapi.tiangolo.com/) + [uvicorn](https://www.uvicorn.org/)
*   **Frontend**: [Next.js](https://nextjs.org/) (App Router, Tailwind CSS)
*   **Config**: [pydantic-settings](https://docs.pydantic.dev/latest/concepts/pydantic_settings/)
