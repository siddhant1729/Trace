# Trace — Corrections Plan

> Concrete fixes for every flaw identified in the [walkthrough](file:///home/shaurya/.gemini/antigravity-ide/brain/b5fa6329-3998-49f0-9083-f350ae49275c/walkthrough.md).
> Organized by severity: **Critical → High → Medium → Low → Cleanup**.

---

## 🔴 CRITICAL

---

### Fix 1 — XSS Vulnerability in `renderReply`

**File**: [frontend/app/chat/page.tsx](file:///home/shaurya/Trace/frontend/app/chat/page.tsx)
**Lines**: 33–37, 83–96
**Problem**: `inlineMd()` passes Gemini API output through regex and injects it via `dangerouslySetInnerHTML`. If Gemini returns `<img onerror=alert(1)>`, it executes.

**Fix**: Escape HTML *before* applying markdown formatting.

```diff
 function inlineMd(t: string) {
-  return t
+  return escapeHtml(t)
     .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#fff">$1</strong>')
     .replace(/`([^`]+)`/g, '<code style="font-family:JetBrains Mono,monospace;font-size:0.8em;background:rgba(255,255,255,0.07);padding:1px 6px;border-radius:3px">$1</code>');
 }
```

This ensures all HTML entities are escaped first, then only the safe `<strong>` and `<code>` tags are introduced by the regex. The `escapeHtml()` function already exists at L29–31.

---

### Fix 2 — Synchronous `trace_brain.invoke()` Blocks the Event Loop

**File**: [main.py](file:///home/shaurya/Trace/main.py)
**Lines**: 720
**Problem**: `trace_brain.invoke(initial_state)` is synchronous. Under concurrent requests, it blocks uvicorn's async event loop and serializes all requests.

**Fix**: Use `ainvoke()` for async execution.

```diff
-        result = trace_brain.invoke(initial_state)
+        result = await trace_brain.ainvoke(initial_state)
```

> [!NOTE]
> LangGraph's `ainvoke()` runs the graph nodes in a thread pool internally, so `vision_parser_node` and `analysis_node` (which are sync functions) will still work without modification. If you encounter issues, the fallback approach is:
> ```python
> import asyncio
> result = await asyncio.to_thread(trace_brain.invoke, initial_state)
> ```

---

### Fix 3 — No Upload Size Limit

**File**: [main.py](file:///home/shaurya/Trace/main.py)
**Lines**: 697
**Problem**: The endpoint accepts arbitrarily large file uploads with no limit, enabling denial-of-service via memory exhaustion.

**Fix**: Add a size check after reading the file.

```diff
+MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB

 @app.post("/chat")
 async def chat_with_trace(
     query: str = Form(...),
     file: UploadFile = File(...),
     history: str = Form(default="[]"),
 ):
     """Accepts image file, text query, and optional JSON chat history."""
     try:
         image_data = await file.read()
+
+        if len(image_data) > MAX_UPLOAD_BYTES:
+            raise HTTPException(
+                status_code=413,
+                detail=f"Image too large ({len(image_data) // 1024 // 1024} MB). Maximum is {MAX_UPLOAD_BYTES // 1024 // 1024} MB.",
+            )
```

---

## 🟠 HIGH

---

### Fix 4 — Image Re-uploaded and Re-parsed on Every Follow-up Message

**File**: [main.py](file:///home/shaurya/Trace/main.py) + [frontend/app/chat/page.tsx](file:///home/shaurya/Trace/frontend/app/chat/page.tsx)
**Problem**: Every chat message re-sends the full image and re-runs `vision_parser_node`, wasting bandwidth, API quota, and producing potentially inconsistent parses.

**Fix (Backend)**: Add a `/chat` endpoint that accepts an optional `session_id`. Cache vision results by session. Skip vision parsing on follow-ups.

```diff
+import hashlib
+from typing import Optional
+
+# Simple in-memory session cache (replace with Redis for production)
+_vision_cache: dict[str, dict] = {}
+
+def _image_hash(data: bytes) -> str:
+    return hashlib.sha256(data).hexdigest()[:16]

 @app.post("/chat")
 async def chat_with_trace(
     query: str = Form(...),
     file: UploadFile = File(...),
     history: str = Form(default="[]"),
+    session_id: str = Form(default=""),
 ):
     try:
         image_data = await file.read()
+        img_hash = _image_hash(image_data)
+        cache_key = session_id or img_hash

         # Parse history
         try:
             parsed_history: List[dict] = json.loads(history)
         except (json.JSONDecodeError, TypeError):
             parsed_history = []

-        initial_state: TraceState = { ... }
-        result = trace_brain.invoke(initial_state)
+        # Reuse cached vision results for follow-up messages
+        cached = _vision_cache.get(cache_key)
+        if cached and parsed_history:
+            # Follow-up: skip vision, run only analysis
+            analysis_state: TraceState = {
+                "user_query":     query,
+                "image_bytes":    b"",
+                "rectangles":     cached["rectangles"],
+                "edges":          cached["edges"],
+                "gemini_raw":     cached["gemini_raw"],
+                "response":       "",
+                "generated_code": "",
+                "chat_history":   parsed_history,
+            }
+            result_update = analysis_node(analysis_state)
+            result = {**analysis_state, **result_update}
+        else:
+            # First message: run full pipeline
+            initial_state: TraceState = {
+                "user_query":     query,
+                "image_bytes":    image_data,
+                "rectangles":     [],
+                "edges":          [],
+                "gemini_raw":     "",
+                "response":       "",
+                "generated_code": "",
+                "chat_history":   parsed_history,
+            }
+            result = await trace_brain.ainvoke(initial_state)
+            # Cache vision results
+            _vision_cache[cache_key] = {
+                "rectangles": result["rectangles"],
+                "edges":      result["edges"],
+                "gemini_raw": result["gemini_raw"],
+            }
```

**Fix (Frontend)**: Store and send a `session_id` with follow-up messages.

```diff
+ const [sessionId] = useState(() => crypto.randomUUID());

  const handleSubmit = async (e: React.FormEvent) => {
    // ...
    const form = new FormData();
    form.append("query",   userMsg.content);
    form.append("file",    file);
    form.append("history", JSON.stringify(historyForBackend));
+   form.append("session_id", sessionId);
```

---

### Fix 5 — Canvas Zoom Breaks Edge Alignment

**File**: [frontend/app/chat/page.tsx](file:///home/shaurya/Trace/frontend/app/chat/page.tsx)
**Lines**: 296–336 (SVG layer) vs 339–342 (nodes layer)
**Problem**: The nodes layer scales with `transform: scale(zoom/100)` but the SVG edge layer does not. At any zoom ≠ 100%, edges are visually disconnected from nodes.

**Fix**: Apply the same zoom transform to the SVG layer.

```diff
       {/* ── SVG connector layer ── */}
-      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 5 }}>
+      <svg style={{
+        position: "absolute", inset: 0, width: "100%", height: "100%",
+        pointerEvents: "none", zIndex: 5,
+        transform: `scale(${zoom / 100})`, transformOrigin: "center center",
+      }}>
```

---

### Fix 6 — Broken `handleInitialize` (Dead `chatInputRef`)

**File**: [frontend/app/chat/page.tsx](file:///home/shaurya/Trace/frontend/app/chat/page.tsx)
**Lines**: 899–910
**Problem**: `chatInputRef` is declared but never assigned to a `<form>`. The `dispatchEvent` call at L903 always fails silently.

**Fix**: Either wire up the ref or call `handleSubmit` directly.

```diff
- const chatInputRef = useRef<HTMLFormElement | null>(null);
  const handleInitialize = () => {
    if (file && query.trim()) {
-     chatInputRef.current?.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
+     handleSubmit(new Event("submit") as unknown as React.FormEvent);
    } else {
      const ta = document.querySelector<HTMLTextAreaElement>(".chat-textarea");
      ta?.focus();
      if (!file) setError("Upload a diagram image first.");
    }
  };
```

---

### Fix 7 — CORS Whitespace Bug

**File**: [main.py](file:///home/shaurya/Trace/main.py)
**Line**: 683
**Problem**: `"http://localhost:3000, https://trace.app".split(",")` produces `[" https://trace.app"]` with a leading space, which silently breaks CORS.

**Fix**: Strip whitespace from each origin.

```diff
 ALLOWED_ORIGINS = os.getenv(
     "ALLOWED_ORIGINS",
     "http://localhost:3000"
-).split(",")
+).split(",")
+ALLOWED_ORIGINS = [origin.strip() for origin in ALLOWED_ORIGINS]
```

---

## 🟡 MEDIUM

---

### Fix 8 — Fonts Loaded Twice (CSS `@import` + `next/font`)

**File**: [frontend/app/globals.css](file:///home/shaurya/Trace/frontend/app/globals.css)
**Line**: 1
**Problem**: Google Fonts are loaded via CSS `@import url(...)` AND via `next/font/google` in `layout.tsx`. This causes double downloads, FOIT, and race conditions.

**Fix**: Remove the CSS import. `next/font/google` already handles font loading with optimization (self-hosting, preloading, `font-display: swap`).

```diff
-@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=Geist:wght@400;600&family=JetBrains+Mono:wght@400;600&display=swap');
 @import "tailwindcss";
```

Then update font-family references throughout `globals.css` to use the CSS variables set by `layout.tsx`:

```diff
 .font-display {
-  font-family: 'Sora', sans-serif;
+  font-family: var(--font-sora), sans-serif;
```

```diff
 .font-body {
-  font-family: 'Geist', sans-serif;
+  font-family: var(--font-geist), sans-serif;
```

```diff
 .font-code {
-  font-family: 'JetBrains Mono', monospace;
+  font-family: var(--font-jetbrains), monospace;
```

Apply this pattern to `.font-headline`, `.font-label`, `.btn-primary`, `.btn-secondary`, `.chip`, `.cosmic-input`, and `body`.

---

### Fix 9 — Hardcoded Gemini Model Name

**File**: [main.py](file:///home/shaurya/Trace/main.py)
**Lines**: 303, 428
**Problem**: `"gemini-flash-latest"` is hardcoded in two places. Can't switch models without code changes.

**Fix**: Read from environment variable.

```diff
+GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

 # In vision_parser_node (L302):
-        resp = _gemini_generate_with_retry(
-            model="gemini-flash-latest",
+        resp = _gemini_generate_with_retry(
+            model=GEMINI_MODEL,

 # In rag_node (L427):
-        resp = _gemini_generate_with_retry(
-            model="gemini-flash-latest",
+        resp = _gemini_generate_with_retry(
+            model=GEMINI_MODEL,
```

---

### Fix 10 — Unpinned Python Dependencies

**File**: [requirements.txt](file:///home/shaurya/Trace/requirements.txt)
**Problem**: All dependencies are unpinned. Future installs may pull breaking changes.

**Fix**: Pin to current working versions. Run `pip freeze` to get exact versions, then update:

```diff
-langchain
-langgraph
-langchain-google-genai
-google-genai
-faiss-cpu
-python-dotenv
-pillow
-tenacity
-fastapi
-uvicorn
-python-multipart
+langchain>=0.3,<0.4
+langgraph>=0.2,<0.3
+langchain-google-genai>=2.0,<3.0
+google-genai>=1.0,<2.0
+python-dotenv>=1.0,<2.0
+pillow>=10.0,<12.0
+tenacity>=8.0,<10.0
+fastapi>=0.115,<1.0
+uvicorn[standard]>=0.30,<1.0
+python-multipart>=0.0.9,<1.0
```

> [!NOTE]
> Removed `faiss-cpu` — it's unused (see Fix 18). Use `>=X,<Y` version ranges to allow patch updates while preventing breaking majors.

---

### Fix 11 — Parallel Execution Hides Code-Gen Results on RAG Failure

**File**: [main.py](file:///home/shaurya/Trace/main.py)
**Lines**: 648–658
**Problem**: If `rag_node` throws, `future_rag.result()` raises before `future_code.result()` is read. The code generation is lost even though it might have succeeded.

**Fix**: Catch exceptions independently.

```diff
 def analysis_node(state: TraceState) -> dict:
     print("--- TRACE ANALYSIS: RUNNING RAG + CODE-GEN IN PARALLEL ---")
     t_start = time.perf_counter()

     with ThreadPoolExecutor(max_workers=2) as pool:
         future_rag  = pool.submit(rag_node,      state)
         future_code = pool.submit(code_gen_node, state)
-        rag_result  = future_rag.result()
-        code_result = future_code.result()
+
+        try:
+            rag_result = future_rag.result()
+        except Exception as e:
+            print(f"[Analysis] RAG node failed: {e}")
+            rag_result = {"response": f"_(Analysis unavailable: {str(e)[:200]})_"}
+
+        try:
+            code_result = future_code.result()
+        except Exception as e:
+            print(f"[Analysis] Code-gen node failed: {e}")
+            code_result = {"generated_code": f"# Code generation failed: {str(e)[:100]}"}

     elapsed = time.perf_counter() - t_start
     print(f"[Analysis] Both nodes finished in {elapsed:.2f}s (parallel)")
```

---

### Fix 12 — Star Twinkle Animation Ignores Random Opacity

**File**: [frontend/components/StarField.tsx](file:///home/shaurya/Trace/frontend/components/StarField.tsx)
**Lines**: 23, 41–45
**Problem**: Each star gets a random `opacity` (0.1–0.6), but the `@keyframes twinkle` animation overrides it to `0.3→1.0→0.3` because `var(--star-opacity, 0.3)` is never set.

**Fix**: Set `--star-opacity` as a CSS custom property on each star.

```diff
       star.style.cssText = `
         position: absolute;
         width: ${size}px;
         height: ${size}px;
         left: ${Math.random() * 100}%;
         top: ${Math.random() * 100}%;
         background: white;
         border-radius: 50%;
         opacity: ${opacity};
+        --star-opacity: ${opacity};
         animation: twinkle ${duration}s ${delay}s infinite ease-in-out;
         ${blurred ? 'filter: blur(1px);' : ''}
       `;
```

---

### Fix 13 — Add Missing `.env.example`

**File**: NEW — [.env.example](file:///home/shaurya/Trace/.env.example)
**Problem**: No documentation of required environment variables. New developers must read the code to figure out what's needed.

**Fix**: Create `.env.example`:

```env
# Required — Google AI Studio API key
GEMINI_API_KEY=your_api_key_here

# Optional — server port (default: 8000)
PORT=8000

# Optional — Gemini model name (default: gemini-2.0-flash)
GEMINI_MODEL=gemini-2.0-flash

# Optional — comma-separated CORS origins (default: http://localhost:3000)
ALLOWED_ORIGINS=http://localhost:3000

# Optional — max image upload size in bytes (default: 10485760 = 10 MB)
MAX_UPLOAD_BYTES=10485760
```

Also create `frontend/.env.example`:

```env
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

### Fix 14 — No React Error Boundary

**File**: NEW — [frontend/components/ErrorBoundary.tsx](file:///home/shaurya/Trace/frontend/components/ErrorBoundary.tsx)
**Problem**: Any uncaught render error in the chat page white-screens the entire app.

**Fix**: Add an error boundary component and wrap the chat page.

```tsx
"use client";

import { Component, type ReactNode } from "react";

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", height: "100vh", gap: "16px",
          fontFamily: "JetBrains Mono, monospace", color: "rgba(255,255,255,0.5)",
          background: "#0e0e0e",
        }}>
          <div style={{ fontSize: "14px", color: "rgba(255,80,80,0.85)" }}>
            ✗ RENDER_FAULT_DETECTED
          </div>
          <div style={{ fontSize: "11px", maxWidth: "400px", textAlign: "center", opacity: 0.4 }}>
            {this.state.error?.message}
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              padding: "10px 24px", background: "#fff", border: "none",
              color: "#1a1a1a", fontSize: "11px", fontWeight: 600,
              letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

Then wrap the chat page layout:

```diff
// In frontend/app/chat/page.tsx — wrap the return of ChatPage
+import ErrorBoundary from "@/components/ErrorBoundary";

 export default function ChatPage() {
   // ...
   return (
+    <ErrorBoundary>
       <div style={{ display: "flex", flexDirection: "column", height: "100vh", ... }}>
         {/* ... */}
       </div>
+    </ErrorBoundary>
   );
 }
```

---

## 🟢 LOW

---

### Fix 15 — Dead Code in `_gemini_generate_with_retry`

**File**: [main.py](file:///home/shaurya/Trace/main.py)
**Lines**: 188–212
**Problem**: `_call()` (L194–L195) and `attempt` (L197) are defined but never used. Only `_call_with_log()` is called.

**Fix**: Remove the dead code.

```diff
 def _gemini_generate_with_retry(model: str, contents, max_attempts: int = 3):
     """
     Calls client.models.generate_content with exponential backoff on quota errors.
     """
-    @retry(
-        retry=retry_if_exception(_is_quota_error),
-        wait=wait_random_exponential(multiplier=1, min=4, max=30),
-        stop=stop_after_attempt(max_attempts),
-        reraise=True,
-    )
-    def _call():
-        return client.models.generate_content(model=model, contents=contents)
-
-    attempt = 0
-
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
-    def _call_with_log():
+    def _call():
         return client.models.generate_content(model=model, contents=contents)

-    return _call_with_log()
+    return _call()
```

---

### Fix 16 — Duplicate `cosmicPulse` Keyframes

**Files**: [HeroSection.tsx:137](file:///home/shaurya/Trace/frontend/components/HeroSection.tsx#L137), [CtaSection.tsx:110](file:///home/shaurya/Trace/frontend/components/CtaSection.tsx#L110)
**Problem**: `@keyframes cosmicPulse` is defined inline in two separate components and `pulse-indicator` in `globals.css`. They're identical but defined in three places.

**Fix**: Define once in `globals.css` and remove the inline `<style>` blocks.

Add to [globals.css](file:///home/shaurya/Trace/frontend/app/globals.css) (after `.pulse-dot`):

```diff
+/* ─── Cosmic Pulse (shared) ─────────────────────────────────── */
+@keyframes cosmicPulse {
+  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255,255,255,0.7); }
+  70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(255,255,255,0); }
+  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255,255,255,0); }
+}
+
+@keyframes scrollPulse {
+  0%, 100% { opacity: 0; }
+  50% { opacity: 1; }
+}
```

Then remove from `HeroSection.tsx`:

```diff
-      <style>{`
-        @keyframes cosmicPulse {
-          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255,255,255,0.7); }
-          70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(255,255,255,0); }
-          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255,255,255,0); }
-        }
-        @keyframes scrollPulse {
-          0%, 100% { opacity: 0; }
-          50% { opacity: 1; }
-        }
-      `}</style>
```

And from `CtaSection.tsx`:

```diff
-      <style>{`
-        @keyframes cosmicPulse {
-          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255,255,255,0.7); }
-          70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(255,255,255,0); }
-          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255,255,255,0); }
-        }
-      `}</style>
```

---

### Fix 17 — Misleading Auto-wiring of Edges

**File**: [frontend/app/chat/page.tsx](file:///home/shaurya/Trace/frontend/app/chat/page.tsx)
**Lines**: 971–977
**Problem**: If the backend returns no edges, the frontend auto-wires nodes in a sequential chain (`n1→n2→n3→...`), even if the diagram was a star topology or disconnected. This misleads the user.

**Fix**: Don't auto-wire. Show nodes without edges and let the user know.

```diff
         if (data.edges && data.edges.length > 0) {
           const labelToId: Record<string, string> = {};
           newNodes.forEach(n => { labelToId[n.label] = n.id; });
           const newEdges: CanvasEdge[] = data.edges
             .map(ed => ({
               from:  labelToId[ed.from] ?? "",
               to:    labelToId[ed.to]   ?? "",
               label: ed.label,
             }))
             .filter(ed => ed.from && ed.to && ed.from !== ed.to);
           setEdges(newEdges);
         } else {
-          // Auto-wire nodes in sequence if no edges returned
-          const autoEdges: CanvasEdge[] = newNodes.slice(0, -1).map((n, i) => ({
-            from: n.id,
-            to:   newNodes[i + 1].id,
-          }));
-          setEdges(autoEdges);
+          // No edges detected — show nodes without connections
+          setEdges([]);
         }
```

---

### Fix 18 — README Usage Section Is Wrong

**File**: [README.md](file:///home/shaurya/Trace/README.md)
**Lines**: 77–89
**Problem**: Describes a CLI interface (`python main.py --image ...`) that doesn't exist. The project is a web server.

**Fix**: Update to reflect the actual usage.

```diff
 ## 💻 Usage

-Run Trace by pointing it to your architecture diagram.
+### Start the Backend
 
 ```bash
-# Example
-python main.py --image ./uploads/my_system_design.png --output ./my-new-project
+cd Trace
+source .venv/bin/activate
+python main.py  # Starts FastAPI on http://localhost:8000
 ```

-Trace will:
-1.  Parse `my_system_design.png`.
-2.  Retrieve relevant patterns from `library/`.
-3.  Generate a verified project scaffold in `./my-new-project`.
+### Start the Frontend
+
+```bash
+cd frontend
+npm install
+npm run dev  # Starts Next.js on http://localhost:3000
+```
+
+### Use
+
+1. Open `http://localhost:3000` in your browser.
+2. Click **Start Mapping** (or navigate to `/chat`).
+3. Upload a flowchart / architecture diagram image.
+4. Ask a question about your diagram.
+5. Trace will parse the diagram, answer your question, and generate boilerplate code.
```

---

## 🧹 CLEANUP

---

### Fix 19 — Delete Orphaned `state.py`

**File**: [state.py](file:///home/shaurya/Trace/state.py)
**Problem**: Defines `GlyphState` — never imported anywhere. Fossil from a project rename.

**Fix**: Delete the file.

```bash
rm state.py
```

---

### Fix 20 — Delete 5 Unused Frontend Components

**Files**:
- [frontend/components/FeatureCards.tsx](file:///home/shaurya/Trace/frontend/components/FeatureCards.tsx) (204 lines)
- [frontend/components/Footer.tsx](file:///home/shaurya/Trace/frontend/components/Footer.tsx) (63 lines)
- [frontend/components/MeshBackground.tsx](file:///home/shaurya/Trace/frontend/components/MeshBackground.tsx) (54 lines)
- [frontend/components/ThemeToggle.tsx](file:///home/shaurya/Trace/frontend/components/ThemeToggle.tsx) (87 lines)
- [frontend/components/TraceChat.tsx](file:///home/shaurya/Trace/frontend/components/TraceChat.tsx) (617 lines)

**Problem**: None of these are imported in any active route. They reference CSS variables (`--accent`, `--border`, `--surface`, `--bg-section`) that don't exist in the current design system. Combined: 1,025 lines of dead code.

**Fix**: Delete all five files.

```bash
rm frontend/components/FeatureCards.tsx
rm frontend/components/Footer.tsx
rm frontend/components/MeshBackground.tsx
rm frontend/components/ThemeToggle.tsx
rm frontend/components/TraceChat.tsx
```

---

### Fix 21 — Remove Unused `faiss-cpu` from Dependencies

**File**: [requirements.txt](file:///home/shaurya/Trace/requirements.txt)
**Problem**: `faiss-cpu` is installed but never imported. The FAISS-based RAG retrieval described in the README was never implemented.

**Fix**: Remove from `requirements.txt` (already done in Fix 10). Also update the README if you don't plan to implement FAISS:

```diff
 ## 🏗️ Tech Stack

 *   **Orchestration**: [LangGraph](https://github.com/langchain-ai/langgraph)
-*   **Intelligence**: [Gemini 1.5 Pro](https://deepmind.google/technologies/gemini/)
-*   **Vector Memory**: [FAISS](https://github.com/facebookresearch/faiss)
+*   **Intelligence**: [Gemini Flash](https://deepmind.google/technologies/gemini/)
 *   **Environment**: WSL/Ubuntu
```

---

### Fix 22 — Delete Empty Root `package-lock.json`

**File**: [package-lock.json](file:///home/shaurya/Trace/package-lock.json) (root)
**Problem**: An empty lockfile with no packages. It's an accidental artifact.

**Fix**:

```bash
rm package-lock.json
```

---

### Fix 23 — Delete Empty Placeholder Directories

**Directories**: `library/`, `nodes/`, `uploads/`
**Problem**: All three are empty and not used by the running code. `uploads/` is in `.gitignore` so it won't be committed anyway.

**Fix**: Either delete them or add `.gitkeep` files if you intend to use them later.

```bash
# Option A: Delete
rmdir library/ nodes/

# Option B: Keep with intent
touch library/.gitkeep nodes/.gitkeep
```

> [!NOTE]
> `uploads/` should stay — the `.gitignore` already excludes it, and users might create it manually.

---

### Fix 24 — Consolidate Hardcoded Version Strings

**Files**: Multiple frontend components
**Problem**: `"V.2.0.4"`, `"v2.0.4"`, `"SESSION: V_ALPHA_9"` appear in 4+ places. Updating the version requires a multi-file find-and-replace.

**Fix**: Create a shared constants file.

**New file**: `frontend/lib/constants.ts`
```ts
export const APP_VERSION = "2.0.4";
export const SESSION_ID = "V_ALPHA_9";
```

Then import where needed:

```diff
// In HeroSection.tsx
+import { APP_VERSION } from "@/lib/constants";
 // ...
-          System Active: V.2.0.4
+          System Active: V.{APP_VERSION}

// In CosmicFooter.tsx
+import { APP_VERSION } from "@/lib/constants";
 // ...
-            © 2026 Trace Systems Inc. — Build { v2.0.4 }
+            © 2026 Trace Systems Inc. — Build {'{'} v{APP_VERSION} {'}'}
```

---

## Summary Table

| # | Severity | Fix | File(s) | Effort |
|---|---|---|---|---|
| 1 | 🔴 Critical | XSS in `renderReply` | `chat/page.tsx` | 1 line |
| 2 | 🔴 Critical | Sync blocking endpoint | `main.py` | 1 line |
| 3 | 🔴 Critical | No upload size limit | `main.py` | 5 lines |
| 4 | 🟠 High | Image re-upload caching | `main.py` + `chat/page.tsx` | ~40 lines |
| 5 | 🟠 High | Canvas zoom vs edges | `chat/page.tsx` | 2 lines |
| 6 | 🟠 High | Dead `chatInputRef` | `chat/page.tsx` | 3 lines |
| 7 | 🟠 High | CORS whitespace trim | `main.py` | 1 line |
| 8 | 🟡 Medium | Double font loading | `globals.css` | ~15 lines |
| 9 | 🟡 Medium | Hardcoded model name | `main.py` | 3 lines |
| 10 | 🟡 Medium | Unpinned deps | `requirements.txt` | 11 lines |
| 11 | 🟡 Medium | Parallel error handling | `main.py` | 10 lines |
| 12 | 🟡 Medium | Star opacity animation | `StarField.tsx` | 1 line |
| 13 | 🟡 Medium | Missing `.env.example` | NEW files | 12 lines |
| 14 | 🟡 Medium | No error boundary | NEW component | ~50 lines |
| 15 | 🟢 Low | Dead `_call` / `attempt` | `main.py` | Delete 8 lines |
| 16 | 🟢 Low | Duplicate keyframes | `globals.css` + 2 components | Move + delete |
| 17 | 🟢 Low | Misleading auto-wiring | `chat/page.tsx` | Delete 5 lines |
| 18 | 🟢 Low | Wrong README usage | `README.md` | ~15 lines |
| 19 | 🧹 Cleanup | Delete `state.py` | `state.py` | `rm` |
| 20 | 🧹 Cleanup | Delete 5 unused components | 5 files (1025 lines) | `rm` |
| 21 | 🧹 Cleanup | Remove `faiss-cpu` | `requirements.txt` | 1 line |
| 22 | 🧹 Cleanup | Delete empty lockfile | `package-lock.json` | `rm` |
| 23 | 🧹 Cleanup | Empty dirs | `library/`, `nodes/` | `rm` or `.gitkeep` |
| 24 | 🧹 Cleanup | Version string constants | NEW `constants.ts` | ~10 lines |
