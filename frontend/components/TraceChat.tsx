"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, Send, Terminal, X, ImageIcon, Code2, GitBranch,
  RotateCcw, User, Bot,
} from "lucide-react";

interface Entity {
  label: string;
  type: string;
  bbox?: number[];
}

interface Edge {
  from: string;
  to: string;
  from_type?: string;
  to_type?: string;
  label?: string;
  action?: string;
}

interface TraceResponse {
  reply: string;
  entities: Entity[];
  edges: Edge[];
  generated_code?: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  /** Full trace result attached to assistant turns */
  traceResult?: TraceResponse;
}

const typeColors: Record<string, string> = {
  Actor:     "bg-blue-500/20 text-blue-300 border-blue-500/30",
  Process:   "bg-violet-500/20 text-violet-300 border-violet-500/30",
  Database:  "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  Interface: "bg-amber-500/20 text-amber-300 border-amber-500/30",
};
const defaultColor = "bg-slate-500/20 text-slate-300 border-slate-500/30";

type Tab = "entities" | "connections" | "code";

// ── Markdown-ish renderer ───────────────────────────────────────────────────
function renderReply(text: string) {
  return text.split("\n").map((line, i) => {
    let rendered = line.replace(/\*\*(.+?)\*\*/g, '<strong class="text-emerald-300">$1</strong>');
    rendered = rendered.replace(/(?:^|\s)_(.+?)_(?:\s|$)/g, ' <em class="text-slate-400 italic">$1</em> ');
    const isBullet = /^\s*[\u2022\-\*]\s/.test(line);
    if (line.trim() === "") return <br key={i} />;
    return (
      <span key={i} className={`block ${isBullet ? "pl-2" : ""}`}>
        <span dangerouslySetInnerHTML={{ __html: rendered }} />
      </span>
    );
  });
}

// ── Trace-result tabs (entities / connections / code) ──────────────────────
function TraceResultPanel({ result }: { result: TraceResponse }) {
  const [activeTab, setActiveTab] = useState<Tab>("entities");
  const [hoveredEdge, setHoveredEdge] = useState<number | null>(null);

  useEffect(() => {
    if (result.edges?.length > 0) setActiveTab("connections");
    else setActiveTab("entities");
  }, [result]);

  const highlightedLabels: Set<string> = new Set(
    hoveredEdge !== null && result.edges[hoveredEdge]
      ? [result.edges[hoveredEdge].from, result.edges[hoveredEdge].to]
      : []
  );

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "entities",    label: "Nodes",       count: result.entities.length },
    { id: "connections", label: "Connections",  count: result.edges?.length },
    { id: "code",        label: "Code",         count: result.generated_code ? 1 : 0 },
  ];

  return (
    <div className="mt-3 rounded-xl border border-white/[0.07] bg-black/30 overflow-hidden">
      {/* Tab bar */}
      <div className="flex gap-1 px-4 border-b border-white/[0.05]">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-mono transition-colors border-b-2 -mb-px
              ${activeTab === tab.id
                ? "border-purple-500 text-purple-300"
                : "border-transparent text-slate-600 hover:text-slate-400"}`}>
            {tab.id === "entities"    && <ImageIcon  className="w-3 h-3" />}
            {tab.id === "connections" && <GitBranch  className="w-3 h-3" />}
            {tab.id === "code"        && <Code2      className="w-3 h-3" />}
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="px-1 py-0.5 rounded text-[10px] bg-white/[0.06] text-slate-500">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="p-4 pt-3">
        {/* Nodes */}
        {activeTab === "entities" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
            {result.entities.length === 0 ? (
              <p className="text-xs text-slate-600 font-mono">No nodes detected.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {result.entities.map((e, i) => {
                  const isHighlighted = highlightedLabels.size > 0 && highlightedLabels.has(e.label);
                  return (
                    <motion.span key={i}
                      initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.04 }}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono cursor-default transition-all duration-150
                        ${typeColors[e.type] ?? defaultColor}
                        ${isHighlighted ? "ring-2 ring-white/30 scale-105 brightness-125" : ""}`}>
                      <span className="px-1 py-0.5 rounded text-[10px] font-bold bg-black/30 opacity-80 tracking-wide uppercase">
                        {e.type}
                      </span>
                      <span className="opacity-40">·</span>
                      <span>{e.label}</span>
                    </motion.span>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* Connections */}
        {activeTab === "connections" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}
            className="space-y-2">
            {(!result.edges || result.edges.length === 0) ? (
              <p className="text-xs text-slate-600 font-mono">No directed edges detected.</p>
            ) : (
              result.edges.map((ed, i) => {
                const isHovered = hoveredEdge === i;
                return (
                  <motion.div key={i}
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onMouseEnter={() => setHoveredEdge(i)}
                    onMouseLeave={() => setHoveredEdge(null)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border font-mono text-xs transition-all duration-150 cursor-default
                      ${isHovered
                        ? "border-violet-500/40 bg-violet-500/10"
                        : "border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.04]"}`}>
                    <span className={`px-2 py-1 rounded-lg border text-xs font-mono ${typeColors[ed.from_type ?? ""] ?? defaultColor}`}>
                      {ed.from}
                    </span>
                    <span className="flex items-center gap-1 text-slate-500 shrink-0">
                      <span className="w-4 h-px bg-slate-600 inline-block" />
                      <span className={`px-1.5 py-0.5 rounded text-[10px] transition-colors
                        ${isHovered ? "bg-violet-500/20 text-violet-300" : "bg-white/[0.04] text-slate-500"}`}>
                        {ed.label || ed.action || "connects"}
                      </span>
                      <span className="text-slate-500">➚</span>
                    </span>
                    <span className={`px-2 py-1 rounded-lg border text-xs font-mono ${typeColors[ed.to_type ?? ""] ?? defaultColor}`}>
                      {ed.to}
                    </span>
                  </motion.div>
                );
              })
            )}
          </motion.div>
        )}

        {/* Code */}
        {activeTab === "code" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
            {result.generated_code ? (
              <pre className="rounded-xl bg-[#0d0d14] border border-white/[0.06] p-4 text-xs text-violet-200 font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap">
                {result.generated_code}
              </pre>
            ) : (
              <p className="text-xs text-slate-600 font-mono">No code generated.</p>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function TraceChat() {
  const [query, setQuery]       = useState("");
  const [file, setFile]         = useState<File | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const fileRef    = useRef<HTMLInputElement>(null);
  const bottomRef  = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleFile = (f: File) => {
    if (!f.type.startsWith("image/")) { setError("Please upload an image file."); return; }
    setFile(f);
    setError(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  };

  const resetSession = () => {
    setMessages([]);
    setFile(null);
    setQuery("");
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file)         { setError("Please upload a diagram image first."); return; }
    if (!query.trim()) { setError("Please enter a question."); return; }

    const userMsg: ChatMessage = { role: "user", content: query.trim() };

    // History = all previous turns (not including the new user message yet)
    const historyForBackend = messages.map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, userMsg]);
    setQuery("");
    setLoading(true);
    setError(null);

    try {
      const form = new FormData();
      form.append("query",   userMsg.content);
      form.append("file",    file);
      form.append("history", JSON.stringify(historyForBackend));

      const res = await fetch("http://localhost:8000/chat", { method: "POST", body: form });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail ?? "Backend error");
      }
      const data: TraceResponse = await res.json();

      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: data.reply,
        traceResult: data,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      // Remove the optimistically-added user message on failure
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const hasConversation = messages.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="w-full mt-8"
    >
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl overflow-hidden shadow-2xl flex flex-col">

        {/* Terminal header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-white/[0.02] shrink-0">
          <Terminal className="w-4 h-4 text-purple-400" />
          <span className="text-xs font-mono text-slate-400 tracking-wider">trace://chat</span>
          {hasConversation && (
            <span className="ml-2 text-[10px] font-mono text-slate-600">
              {messages.length} message{messages.length !== 1 ? "s" : ""}
            </span>
          )}
          <div className="ml-auto flex items-center gap-3">
            {hasConversation && (
              <button onClick={resetSession}
                title="New session"
                className="flex items-center gap-1 text-[10px] font-mono text-slate-600 hover:text-slate-400 transition-colors">
                <RotateCcw className="w-3 h-3" />
                New session
              </button>
            )}
            <div className="flex gap-1.5">
              {["bg-red-500", "bg-yellow-500", "bg-green-500"].map((c, i) => (
                <div key={i} className={`w-2.5 h-2.5 rounded-full ${c} opacity-60`} />
              ))}
            </div>
          </div>
        </div>

        {/* Chat history */}
        {hasConversation && (
          <div className="flex-1 overflow-y-auto max-h-[60vh] px-5 py-4 space-y-5">
            <AnimatePresence initial={false}>
              {messages.map((msg, idx) => (
                <motion.div key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>

                  {msg.role === "assistant" && (
                    <div className="w-7 h-7 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-3.5 h-3.5 text-purple-400" />
                    </div>
                  )}

                  <div className={`max-w-[85%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-1`}>
                    <span className="text-[10px] font-mono text-slate-600">
                      {msg.role === "user" ? "you" : "trace ai"}
                    </span>

                    {msg.role === "user" ? (
                      <div className="px-4 py-2.5 rounded-2xl rounded-tr-sm bg-indigo-600/30 border border-indigo-500/30 text-sm text-slate-200 font-mono">
                        {msg.content}
                      </div>
                    ) : (
                      <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-white/[0.04] border border-white/[0.07] text-sm text-green-400 font-mono leading-relaxed">
                        {renderReply(msg.content)}
                      </div>
                    )}

                    {/* Trace result panel attached to assistant messages */}
                    {msg.role === "assistant" && msg.traceResult && (
                      <div className="w-full">
                        <TraceResultPanel result={msg.traceResult} />
                      </div>
                    )}
                  </div>

                  {msg.role === "user" && (
                    <div className="w-7 h-7 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0 mt-0.5">
                      <User className="w-3.5 h-3.5 text-indigo-400" />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Loading indicator */}
            {loading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3 justify-start">
                <div className="w-7 h-7 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5 text-purple-400" />
                </div>
                <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-white/[0.04] border border-white/[0.07]">
                  <div className="flex gap-1.5 items-center">
                    {[0, 1, 2].map((i) => (
                      <motion.div key={i}
                        className="w-1.5 h-1.5 rounded-full bg-purple-400"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }} />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={bottomRef} />
          </div>
        )}

        {/* Input form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 shrink-0 border-t border-white/[0.05]">
          {/* Drop Zone — shown collapsed once a conversation is going */}
          {!hasConversation ? (
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200
                ${dragging
                  ? "border-purple-500/70 bg-purple-500/10"
                  : file
                    ? "border-violet-500/50 bg-violet-500/05"
                    : "border-white/10 hover:border-white/20 bg-white/[0.02] hover:bg-white/[0.04]"
                }`}
              style={{ height: "10rem" }}
            >
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
              {file ? (
                <>
                  <ImageIcon className="w-6 h-6 text-violet-400" />
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-violet-300 font-mono truncate max-w-[240px]">{file.name}</span>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null); }}
                      className="text-slate-500 hover:text-red-400 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="text-xs text-slate-600">{(file.size / 1024).toFixed(1)} KB</span>
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5 text-slate-500" />
                  <span className="text-sm text-slate-500">Drop your diagram here or <span className="text-purple-400">browse</span></span>
                  <span className="text-xs text-slate-700">PNG, JPG, WebP accepted</span>
                </>
              )}
            </div>
          ) : (
            /* Compact file badge once conversation started */
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-3.5 h-3.5 text-violet-400" />
                <span className="text-xs font-mono text-slate-500 truncate max-w-[200px]">{file?.name}</span>
              </div>
              <button type="button"
                onClick={() => fileRef.current?.click()}
                className="text-[10px] font-mono text-slate-600 hover:text-slate-400 transition-colors">
                change
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
            </div>
          )}

          {/* Query */}
          <div className="flex gap-3">
            <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder={hasConversation ? "Ask a follow-up question…" : "Ask about your diagram…"}
              className="flex-1 h-11 px-4 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-200 text-sm placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50 focus:bg-white/[0.06] transition-all duration-200 font-mono" />
            <motion.button type="submit" disabled={loading}
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity shrink-0"
              style={{ height: "2.75rem", padding: "0 1.25rem", minWidth: "max-content" }}>
              {loading
                ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                : <Send className="w-4 h-4 shrink-0" />}
              <span className="whitespace-nowrap">{loading ? "Tracing…" : "Send"}</span>
            </motion.button>
          </div>

          <AnimatePresence>
            {error && (
              <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                className="text-xs text-red-400 font-mono px-1">✗ {error}</motion.p>
            )}
          </AnimatePresence>
        </form>
      </div>
    </motion.div>
  );
}
