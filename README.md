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

Trace employs a sophisticated **Multimodal Agentic RAG** workflow to ensure accuracy and code quality. The core pipeline consists of three specialized nodes:

1.  **📸 Vision Node**: **Gemini 1.5 Pro** analyzes your uploaded diagram continuously, identifying components, relationships, and data flow direction.
2.  **📚 RAG Retrieval Node**: The system queries a **FAISS** vector database indexed with your personal library of high-quality C++ and Python snippets (e.g., `def hello_world():`), ensuring the output matches your engineering standards.
3.  **💻 Coder Node**: The LLM synthesizes the visual data and retrieved snippets to generate a complete, verified project structure.
4.  **✅ Agentic Validation**: A **LangGraph** orchestration layer validates the generated code against the original diagram, self-correcting any hallucinations or missing connections.

---

## ✨ Key Features

*   **Multimodal RAG**: Context-aware code generation that "sees" your diagram and "remembers" your best code snippets.
*   **Agentic Self-Correction**: Powered by LangGraph, Trace iterates on its own output to fix logical inconsistencies before you ever see the code.
*   **Opinionated Snippets**: Indexes *your* codebase (FAISS) to write code that looks like *you* wrote it.
*   **Production Ready**: Generates standard folder structures, Dockerfiles, and dependency lists—not just single script files.

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
    GEMINI_MODEL=gemini-flash-latest   # optional
    PORT=8000                          # optional
    ALLOWED_ORIGINS=http://localhost:3000  # optional
    ```

4.  **Install frontend dependencies**
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
├── config.py         # pydantic-settings (reads .env)
├── api/main.py       # FastAPI app + /chat endpoint
├── graph/
│   ├── nodes.py      # Vision parser, RAG, code-gen node functions
│   └── pipeline.py   # LangGraph graph assembly
├── nodes/            # Reserved for future node modules
└── library/          # Reserved for RAG code library
frontend/             # Next.js UI
tests/                # pytest test suite
```

---

## 🎥 Demo

*(Coming Soon)*

> *Watch Trace convert a napkin sketch into a working Flask API.*

---

## 🏗️ Tech Stack

*   **Orchestration**: [LangGraph](https://github.com/langchain-ai/langgraph)
*   **Intelligence**: [Gemini](https://deepmind.google/technologies/gemini/) (via `google-genai`)
*   **Backend**: [FastAPI](https://fastapi.tiangolo.com/) + [uvicorn](https://www.uvicorn.org/)
*   **Frontend**: [Next.js](https://nextjs.org/) (App Router, Tailwind CSS)
*   **Config**: [pydantic-settings](https://docs.pydantic.dev/latest/concepts/pydantic_settings/)
