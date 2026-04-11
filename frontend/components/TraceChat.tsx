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
  traceResult?: TraceResponse;
}

type Tab = "entities" | "connections" | "code";

// ── Markdown-ish renderer ──────────────────────────────────────────────────
function renderReply(text: string) {
  return text.split("\n").map((line, i) => {
    let rendered = line.replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--accent)">$1</strong>');
    rendered = rendered.replace(/(?:^|\s)_(.+?)_(?:\s|$)/g, ' <em style="opacity:0.7">$1</em> ');
    const isBullet = /^\s*[\u2022\-\*]\s/.test(line);
    if (line.trim() === "") return <br key={i} />;
    return (
      <span key={i} className={`block ${isBullet ? "pl-2" : ""}`}>
        <span dangerouslySetInnerHTML={{ __html: rendered }} />
      </span>
    );
  });
}

// ── Trace result tabs ──────────────────────────────────────────────────────
function TraceResultPanel({ result }: { result: TraceResponse }) {
  const [activeTab, setActiveTab] = useState<Tab>("entities");
  const [hoveredEdge, setHoveredEdge] = useState<number | null>(null);

  useEffect(() => {
    setActiveTab(result.edges?.length > 0 ? "connections" : "entities");
  }, [result]);

  const highlightedLabels: Set<string> = new Set(
    hoveredEdge !== null && result.edges[hoveredEdge]
      ? [result.edges[hoveredEdge].from, result.edges[hoveredEdge].to]
      : []
  );

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "entities",    label: "Nodes",       count: result.entities.length },
    { id: "connections", label: "Connections", count: result.edges?.length },
    { id: "code",        label: "Code",        count: result.generated_code ? 1 : 0 },
  ];

  return (
    <div
      className="mt-4 overflow-hidden"
      style={{
        borderRadius: "16px",
        border: "1px solid var(--border)",
        background: "var(--surface-raised)",
        boxShadow: "var(--card-shadow)",
      }}
    >
      {/* Tab bar */}
      <div className="flex gap-1 px-4" style={{ borderBottom: "1px solid var(--border)" }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-mono border-b-2 -mb-px"
            style={{
              borderBottomColor: activeTab === tab.id ? "var(--accent)" : "transparent",
              color: activeTab === tab.id ? "var(--accent)" : "var(--text-subtle)",
              transition: "color 0.2s, border-color 0.2s",
              background: "none",
              cursor: "pointer",
            }}
          >
            {tab.id === "entities"    && <ImageIcon className="w-3 h-3" />}
            {tab.id === "connections" && <GitBranch className="w-3 h-3" />}
            {tab.id === "code"        && <Code2     className="w-3 h-3" />}
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span
                className="px-1.5 py-0.5 rounded-full text-[10px]"
                style={{ background: "var(--accent-light)", color: "var(--accent)" }}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="p-5 pt-4">
        {/* Nodes */}
        {activeTab === "entities" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
            {result.entities.length === 0 ? (
              <p className="text-xs font-mono" style={{ color: "var(--text-subtle)" }}>No nodes detected.</p>
            ) : (
              <div className="flex flex-wrap gap-2.5">
                {result.entities.map((e, i) => {
                  const isHighlighted = highlightedLabels.has(e.label);
                  return (
                    <motion.span key={i}
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.04 }}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.375rem",
                        padding: "4px 12px",
                        borderRadius: "9999px",
                        border: "1px solid var(--accent-mid)",
                        background: isHighlighted ? "var(--accent-mid)" : "var(--accent-light)",
                        color: "var(--accent)",
                        fontSize: "0.75rem",
                        fontFamily: "monospace",
                        transform: isHighlighted ? "scale(1.05)" : "scale(1)",
                        transition: "all 0.15s",
                        cursor: "default",
                      }}
                    >
                      <span style={{ fontSize: "0.625rem", fontWeight: 700, opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        {e.type}
                      </span>
                      <span style={{ opacity: 0.4 }}>·</span>
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
            className="space-y-2.5">
            {(!result.edges || result.edges.length === 0) ? (
              <p className="text-xs font-mono" style={{ color: "var(--text-subtle)" }}>No directed edges detected.</p>
            ) : (
              result.edges.map((ed, i) => {
                const isHovered = hoveredEdge === i;
                return (
                  <motion.div key={i}
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onMouseEnter={() => setHoveredEdge(i)}
                    onMouseLeave={() => setHoveredEdge(null)}
                    className="flex items-center gap-2.5 font-mono text-xs cursor-default"
                    style={{
                      padding: "0.75rem 1rem",
                      borderRadius: "12px",
                      border: `1px solid ${isHovered ? "var(--accent-mid)" : "var(--border)"}`,
                      background: isHovered ? "var(--accent-light)" : "var(--surface)",
                      transition: "all 0.15s",
                    }}
                  >
                    <span style={{
                      padding: "4px 12px",
                      borderRadius: "9999px",
                      border: "1px solid var(--accent-mid)",
                      background: "var(--accent-light)",
                      color: "var(--accent)",
                    }}>
                      {ed.from}
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: "0.375rem", color: "var(--text-subtle)" }}>
                      <span style={{ width: "1rem", height: "1px", background: "var(--border)", display: "inline-block" }} />
                      <span style={{
                        padding: "2px 10px",
                        borderRadius: "9999px",
                        border: "1px solid var(--accent-mid)",
                        background: isHovered ? "var(--accent-mid)" : "var(--accent-light)",
                        color: "var(--accent)",
                        fontSize: "0.625rem",
                      }}>
                        {ed.label || ed.action || "connects"}
                      </span>
                      <span style={{ color: "var(--text-subtle)" }}>➚</span>
                    </span>
                    <span style={{
                      padding: "4px 12px",
                      borderRadius: "9999px",
                      border: "1px solid var(--accent-mid)",
                      background: "var(--accent-light)",
                      color: "var(--accent)",
                    }}>
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
              <pre
                className="text-xs font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap"
                style={{
                  padding: "1.25rem",
                  borderRadius: "12px",
                  background: "#0d0d14",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "#c4b5fd",
                }}
              >
                {result.generated_code}
              </pre>
            ) : (
              <p className="text-xs font-mono" style={{ color: "var(--text-subtle)" }}>No code generated.</p>
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

  const fileRef   = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

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

  const resetSession = () => { setMessages([]); setFile(null); setQuery(""); setError(null); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file)         { setError("Please upload a diagram image first."); return; }
    if (!query.trim()) { setError("Please enter a question."); return; }

    const userMsg: ChatMessage = { role: "user", content: query.trim() };
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
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail ?? "Backend error"); }
      const data: TraceResponse = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply, traceResult: data }]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
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
      style={{ width: "100%", marginTop: "2rem" }}
    >
      <div
        style={{
          borderRadius: "20px",
          border: "1px solid var(--border)",
          background: "var(--surface)",
          boxShadow: "var(--panel-shadow)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.875rem 1.25rem",
            borderBottom: "1px solid var(--border)",
            background: "var(--surface-raised)",
          }}
        >
          <Terminal className="w-4 h-4" style={{ color: "var(--accent)" }} />
          <span className="text-xs font-mono tracking-wider" style={{ color: "var(--text-muted)" }}>
            trace://chat
          </span>
          {hasConversation && (
            <span className="ml-2 text-[10px] font-mono" style={{ color: "var(--text-subtle)" }}>
              {messages.length} message{messages.length !== 1 ? "s" : ""}
            </span>
          )}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            {hasConversation && (
              <button onClick={resetSession}
                className="flex items-center gap-1 text-[10px] font-mono"
                style={{ color: "var(--text-subtle)", cursor: "pointer", background: "none", border: "none" }}>
                <RotateCcw className="w-3 h-3" />
                New session
              </button>
            )}
            <div className="flex gap-1.5">
              {["#ef4444", "#f59e0b", "#22c55e"].map((c, i) => (
                <div key={i} className="w-2.5 h-2.5 rounded-full opacity-60" style={{ background: c }} />
              ))}
            </div>
          </div>
        </div>

        {/* Chat messages */}
        {hasConversation && (
          <div className="flex-1 overflow-y-auto space-y-6" style={{ maxHeight: "60vh", padding: "1.5rem" }}>
            <AnimatePresence initial={false}>
              {messages.map((msg, idx) => (
                <motion.div key={idx}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  style={{
                    display: "flex",
                    gap: "0.75rem",
                    justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                  }}
                >
                  {msg.role === "assistant" && (
                    <div style={{
                      width: "2rem", height: "2rem", borderRadius: "50%",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: "var(--accent-light)", border: "1px solid var(--accent-mid)",
                      flexShrink: 0, marginTop: "0.125rem",
                    }}>
                      <Bot className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
                    </div>
                  )}

                  <div style={{ maxWidth: "85%", display: "flex", flexDirection: "column", gap: "0.25rem",
                    alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}>
                    <span className="text-[10px] font-mono px-1" style={{ color: "var(--text-subtle)" }}>
                      {msg.role === "user" ? "you" : "trace ai"}
                    </span>

                    {msg.role === "user" ? (
                      <div className="text-sm font-mono" style={{
                        padding: "0.875rem 1.25rem",
                        borderRadius: "16px",
                        borderTopRightRadius: "4px",
                        background: "var(--bubble-user)",
                        border: "1px solid var(--bubble-user-border)",
                        color: "var(--text)",
                      }}>
                        {msg.content}
                      </div>
                    ) : (
                      <div className="text-sm font-mono leading-relaxed" style={{
                        padding: "0.875rem 1.25rem",
                        borderRadius: "16px",
                        borderTopLeftRadius: "4px",
                        background: "var(--bubble-ai)",
                        border: "1px solid var(--bubble-ai-border)",
                        color: "var(--text)",
                      }}>
                        {renderReply(msg.content)}
                      </div>
                    )}

                    {msg.role === "assistant" && msg.traceResult && (
                      <div style={{ width: "100%" }}>
                        <TraceResultPanel result={msg.traceResult} />
                      </div>
                    )}
                  </div>

                  {msg.role === "user" && (
                    <div style={{
                      width: "2rem", height: "2rem", borderRadius: "50%",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: "var(--accent-light)", border: "1px solid var(--accent-mid)",
                      flexShrink: 0, marginTop: "0.125rem",
                    }}>
                      <User className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Loading dots */}
            {loading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-start" }}>
                <div style={{
                  width: "2rem", height: "2rem", borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: "var(--accent-light)", border: "1px solid var(--accent-mid)",
                  flexShrink: 0,
                }}>
                  <Bot className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
                </div>
                <div style={{
                  padding: "0.875rem 1.25rem",
                  borderRadius: "16px",
                  borderTopLeftRadius: "4px",
                  background: "var(--bubble-ai)",
                  border: "1px solid var(--bubble-ai-border)",
                }}>
                  <div style={{ display: "flex", gap: "0.375rem", alignItems: "center" }}>
                    {[0, 1, 2].map((i) => (
                      <motion.div key={i}
                        style={{ width: "0.375rem", height: "0.375rem", borderRadius: "50%", background: "var(--accent)" }}
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={bottomRef} />
          </div>
        )}

        {/* Input form */}
        <form
          onSubmit={handleSubmit}
          style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem",
            borderTop: hasConversation ? "1px solid var(--border)" : "none" }}
        >
          {/* Drop zone */}
          {!hasConversation ? (
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                justifyContent: "center", gap: "0.75rem",
                height: "11rem",
                borderRadius: "16px",
                cursor: "pointer",
                border: dragging
                  ? "2px dashed var(--accent)"
                  : file
                  ? "2px dashed var(--accent-mid)"
                  : "2px dashed var(--border)",
                background: dragging ? "var(--accent-light)" : file ? "var(--accent-light)" : "var(--surface-raised)",
                transition: "all 0.2s",
              }}
            >
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
                onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
              {file ? (
                <>
                  <ImageIcon className="w-6 h-6" style={{ color: "var(--accent)" }} />
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span className="text-sm font-mono" style={{ color: "var(--accent)", maxWidth: "240px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</span>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null); }}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-subtle)" }}>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="text-xs" style={{ color: "var(--text-subtle)" }}>{(file.size / 1024).toFixed(1)} KB</span>
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" style={{ color: "var(--text-subtle)" }} />
                  <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                    Drop your diagram here or <span style={{ color: "var(--accent)" }}>browse</span>
                  </span>
                  <span className="text-xs" style={{ color: "var(--text-subtle)" }}>PNG, JPG, WebP accepted</span>
                </>
              )}
            </div>
          ) : (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "0.625rem 1rem",
              borderRadius: "12px",
              border: "1px solid var(--border)",
              background: "var(--surface-raised)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <ImageIcon className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
                <span className="text-xs font-mono" style={{ color: "var(--text-muted)", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {file?.name}
                </span>
              </div>
              <button type="button" onClick={() => fileRef.current?.click()}
                className="text-[10px] font-mono"
                style={{ color: "var(--text-subtle)", cursor: "pointer", background: "none", border: "none" }}>
                change
              </button>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
                onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
            </div>
          )}

          {/* Query + send */}
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <input
              type="text" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder={hasConversation ? "Ask a follow-up question…" : "Ask about your diagram…"}
              className="flex-1 text-sm font-mono"
              style={{
                height: "2.875rem",
                padding: "0 1rem",
                borderRadius: "12px",
                border: "1px solid var(--border)",
                background: "var(--surface-raised)",
                color: "var(--text)",
                outline: "none",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
            />
            <motion.button type="submit" disabled={loading}
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              style={{
                height: "2.875rem",
                padding: "0 1.5rem",
                borderRadius: "12px",
                background: "var(--accent)",
                color: "#fff",
                border: "none",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                fontWeight: 600,
                fontSize: "0.875rem",
                flexShrink: 0,
                boxShadow: "0 4px 14px rgba(124,58,237,0.3)",
                opacity: loading ? 0.6 : 1,
              }}>
              {loading
                ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    style={{ width: "1rem", height: "1rem", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff" }} />
                : <Send className="w-4 h-4" />}
              <span style={{ whiteSpace: "nowrap" }}>{loading ? "Tracing…" : "Send"}</span>
            </motion.button>
          </div>

          <AnimatePresence>
            {error && (
              <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                className="text-xs font-mono px-1" style={{ color: "#ef4444" }}>
                ✗ {error}
              </motion.p>
            )}
          </AnimatePresence>
        </form>
      </div>
    </motion.div>
  );
}
