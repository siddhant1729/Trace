"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Send, Upload, X, ImageIcon, Code2, GitBranch,
  Plus, Terminal, Bot, User, RotateCcw,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

// ── Types ──────────────────────────────────────────────────────────────────
interface Entity { label: string; type: string; bbox?: number[]; }
interface Edge {
  from: string; to: string;
  from_type?: string; to_type?: string;
  label?: string; action?: string;
}
interface TraceResponse {
  reply: string; entities: Entity[]; edges: Edge[]; generated_code?: string;
}
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  traceResult?: TraceResponse;
}
interface Session {
  id: string;
  title: string;
  messages: ChatMessage[];
  file: File | null;
}

// ── Markdown renderer — Notion-style ─────────────────────────────────────
function renderReply(text: string) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Empty line → spacer
    if (trimmed === "") {
      elements.push(<div key={i} style={{ height: "0.5rem" }} />);
      i++;
      continue;
    }

    // Bullet line: starts with * or - followed by space
    if (/^[\*\-]\s/.test(trimmed)) {
      const bulletContent = trimmed.slice(2);
      elements.push(
        <div key={i} style={{ display: "flex", alignItems: "baseline", gap: "0.625rem", marginBottom: "0.25rem" }}>
          <span style={{ color: "var(--accent)", fontSize: "0.6rem", flexShrink: 0, marginTop: "0.3rem" }}>●</span>
          <span style={{ flex: 1 }} dangerouslySetInnerHTML={{ __html: inlineMarkdown(bulletContent) }} />
        </div>
      );
      i++;
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={i} style={{ marginBottom: "0.25rem" }}
        dangerouslySetInnerHTML={{ __html: inlineMarkdown(trimmed) }} />
    );
    i++;
  }
  return elements;
}

function inlineMarkdown(text: string): string {
  // **bold** → <strong>
  let out = text.replace(/\*\*(.+?)\*\*/g, '<strong style="font-weight:600;color:var(--text)">$1</strong>');
  // `code` → <code>
  out = out.replace(/`([^`]+)`/g, '<code style="font-family:monospace;font-size:0.8em;background:var(--surface-raised);padding:1px 5px;border-radius:4px;border:1px solid var(--border)">$1</code>');
  // _italic_
  out = out.replace(/(?:^|\s)_(.+?)_(?:\s|$)/g, ' <em style="opacity:0.75">$1</em> ');
  return out;
}

// ── Collapsible Diagram Stats ──────────────────────────────────────────────
type Tab = "entities" | "connections" | "code";
function TraceResultPanel({ result }: { result: TraceResponse }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>(result.edges?.length > 0 ? "connections" : "entities");
  const [hovered, setHovered] = useState<number | null>(null);

  const nodeCount = result.entities.length;
  const edgeCount = result.edges?.length ?? 0;
  const hasCode   = !!result.generated_code;

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "entities",    label: "Nodes",       count: nodeCount },
    { id: "connections", label: "Connections", count: edgeCount },
    { id: "code",        label: "Code",        count: hasCode ? 1 : 0 },
  ];

  return (
    <div style={{ marginTop: "0.875rem" }}>
      {/* Pill toggle */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "inline-flex", alignItems: "center", gap: "0.5rem",
          padding: "4px 14px", borderRadius: "9999px",
          border: "1px solid var(--accent-mid)",
          background: open ? "var(--accent-light)" : "var(--surface-raised)",
          color: "var(--accent)",
          fontSize: "0.7rem", fontWeight: 600,
          cursor: "pointer", transition: "all 0.2s",
        }}
      >
        <GitBranch className="w-3 h-3" />
        Diagram Stats
        <span style={{ opacity: 0.6, fontSize: "0.6rem" }}>
          {nodeCount}N · {edgeCount}E{hasCode ? " · Code" : ""}
        </span>
        <span style={{ fontSize: "0.55rem", opacity: 0.5, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▼</span>
      </button>

      {/* Expanded panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22 }}
            style={{ overflow: "hidden" }}
          >
            <div style={{
              marginTop: "0.5rem",
              borderRadius: "14px",
              border: "1px solid var(--border)",
              background: "var(--surface-raised)",
              overflow: "hidden",
            }}>
              {/* Tab bar */}
              <div style={{ display: "flex", gap: "0.25rem", padding: "0 0.75rem", borderBottom: "1px solid var(--border)" }}>
                {tabs.map((t) => (
                  <button key={t.id} onClick={() => setTab(t.id)} style={{
                    background: "none", border: "none", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: "0.375rem",
                    padding: "0.5rem 0.625rem",
                    fontSize: "0.68rem",
                    borderBottom: `2px solid ${tab === t.id ? "var(--accent)" : "transparent"}`,
                    color: tab === t.id ? "var(--accent)" : "var(--text-subtle)",
                    marginBottom: "-1px",
                  }}>
                    {t.id === "entities" && <ImageIcon className="w-2.5 h-2.5" />}
                    {t.id === "connections" && <GitBranch className="w-2.5 h-2.5" />}
                    {t.id === "code" && <Code2 className="w-2.5 h-2.5" />}
                    {t.label}
                    {t.count > 0 && (
                      <span style={{ padding: "1px 5px", borderRadius: "999px", background: "var(--accent-light)", color: "var(--accent)", fontSize: "0.58rem" }}>
                        {t.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div style={{ padding: "0.875rem" }}>
                {tab === "entities" && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
                    {nodeCount === 0
                      ? <span style={{ fontSize: "0.72rem", color: "var(--text-subtle)" }}>No nodes.</span>
                      : result.entities.map((e, i) => (
                        <span key={i} style={{
                          display: "inline-flex", alignItems: "center", gap: "0.3rem",
                          padding: "3px 10px", borderRadius: "9999px",
                          border: "1px solid var(--accent-mid)",
                          background: "var(--accent-light)", color: "var(--accent)",
                          fontSize: "0.68rem",
                        }}>
                          <span style={{ fontSize: "0.52rem", fontWeight: 700, textTransform: "uppercase", opacity: 0.65 }}>{e.type}</span>
                          <span style={{ opacity: 0.35 }}>·</span>
                          {e.label}
                        </span>
                      ))
                    }
                  </div>
                )}

                {tab === "connections" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                    {edgeCount === 0
                      ? <span style={{ fontSize: "0.72rem", color: "var(--text-subtle)" }}>No edges.</span>
                      : result.edges.map((ed, i) => (
                        <div key={i}
                          onMouseEnter={() => setHovered(i)}
                          onMouseLeave={() => setHovered(null)}
                          style={{
                            display: "flex", alignItems: "center", gap: "0.375rem",
                            padding: "0.375rem 0.625rem", borderRadius: "8px",
                            border: `1px solid ${hovered === i ? "var(--accent-mid)" : "var(--border)"}`,
                            background: hovered === i ? "var(--accent-light)" : "transparent",
                            fontSize: "0.68rem", transition: "all 0.15s",
                          }}>
                          <span style={{ padding: "1px 8px", borderRadius: "9999px", border: "1px solid var(--accent-mid)", background: "var(--accent-light)", color: "var(--accent)" }}>{ed.from}</span>
                          <span style={{ display: "flex", alignItems: "center", gap: "0.2rem", color: "var(--text-subtle)" }}>
                            <span style={{ width: "0.5rem", height: "1px", background: "currentColor", display: "inline-block" }} />
                            <span style={{ padding: "1px 6px", borderRadius: "9999px", border: "1px solid var(--accent-mid)", background: "var(--accent-light)", color: "var(--accent)", fontSize: "0.58rem" }}>{ed.label || "connects"}</span>
                            <span>➚</span>
                          </span>
                          <span style={{ padding: "1px 8px", borderRadius: "9999px", border: "1px solid var(--accent-mid)", background: "var(--accent-light)", color: "var(--accent)" }}>{ed.to}</span>
                        </div>
                      ))
                    }
                  </div>
                )}

                {tab === "code" && (
                  hasCode
                    ? <pre style={{ padding: "0.875rem", borderRadius: "8px", background: "#0d0d14", border: "1px solid rgba(255,255,255,0.07)", color: "#c4b5fd", fontSize: "0.68rem", fontFamily: "monospace", overflowX: "auto", whiteSpace: "pre-wrap" }}>
                        {result.generated_code}
                      </pre>
                    : <span style={{ fontSize: "0.72rem", color: "var(--text-subtle)" }}>No code generated.</span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main chat page ─────────────────────────────────────────────────────────
export default function ChatPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const newSession = useCallback((): Session => ({
    id: crypto.randomUUID(),
    title: "New session",
    messages: [],
    file: null,
  }), []);

  const [sessions, setSessions] = useState<Session[]>(() => []);
  const [activeId, setActiveId] = useState<string>("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  // Init first session
  useEffect(() => {
    const s = newSession();
    setSessions([s]);
    setActiveId(s.id);
  }, [newSession]);

  const active = sessions.find((s) => s.id === activeId);

  const updateSession = useCallback((id: string, patch: Partial<Session>) => {
    setSessions((prev) => prev.map((s) => s.id === id ? { ...s, ...patch } : s));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [active?.messages, loading]);

  const handleFile = (f: File) => {
    if (!f.type.startsWith("image/")) { setError("Please upload an image file."); return; }
    if (active) updateSession(active.id, { file: f });
    setError(null);
  };

  const createNewSession = () => {
    const s = newSession();
    setSessions((prev) => [...prev, s]);
    setActiveId(s.id);
    setQuery("");
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!active) return;
    if (!active.file) { setError("Upload a diagram image first."); return; }
    if (!query.trim()) { setError("Ask something about your diagram."); return; }

    const userMsg: ChatMessage = { role: "user", content: query.trim() };
    const prevMessages = [...active.messages, userMsg];
    const historyForBackend = active.messages.map((m) => ({ role: m.role, content: m.content }));

    // Update title on first message
    const isFirst = active.messages.length === 0;
    updateSession(active.id, {
      messages: prevMessages,
      ...(isFirst ? { title: query.trim().slice(0, 40) } : {}),
    });
    setQuery("");
    setLoading(true);
    setError(null);

    try {
      const form = new FormData();
      form.append("query", userMsg.content);
      form.append("file", active.file);
      form.append("history", JSON.stringify(historyForBackend));

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/chat`, { method: "POST", body: form });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail ?? "Backend error"); }
      const data: TraceResponse = await res.json();

      updateSession(active.id, {
        messages: [...prevMessages, { role: "assistant", content: data.reply, traceResult: data }],
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      updateSession(active.id, { messages: active.messages });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      style={{
        display: "flex",
        height: "100vh",
        width: "100vw",
        overflow: "hidden",
        background: "var(--bg)",
      }}
    >
      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <aside style={{
        width: "260px",
        flexShrink: 0,
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid var(--border)",
        background: "var(--surface)",
      }}>
        {/* Sidebar header */}
        <div style={{
          padding: "1rem 1rem 0.75rem",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
        }}>
          {/* Back + title */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
            <button
              onClick={() => router.push("/")}
              style={{
                background: "none", border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                width: "1.75rem", height: "1.75rem", borderRadius: "8px",
                color: "var(--text-muted)",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--accent-light)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--accent)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)"; }}
              title="Back to home"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
              <Terminal className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
              <span style={{ fontSize: "0.7rem", fontFamily: "monospace", color: "var(--text-muted)", letterSpacing: "0.06em" }}>
                trace://chat
              </span>
            </div>
          </div>

          {/* New session button */}
          <button
            onClick={createNewSession}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
              padding: "0.5rem 0.75rem",
              borderRadius: "10px",
              border: "1px solid var(--accent-mid)",
              background: "var(--accent-light)",
              color: "var(--accent)",
              fontSize: "0.75rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--accent)"; (e.currentTarget as HTMLButtonElement).style.color = "#fff"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--accent-light)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--accent)"; }}
          >
            <Plus className="w-3.5 h-3.5" />
            New session
          </button>
        </div>

        {/* Session list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0.5rem" }}>
          {sessions.length === 0 && (
            <p style={{ fontSize: "0.7rem", color: "var(--text-subtle)", padding: "0.75rem 0.5rem", fontFamily: "monospace" }}>
              No sessions yet.
            </p>
          )}
          {[...sessions].reverse().map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveId(s.id)}
              style={{
                display: "flex", alignItems: "center", gap: "0.5rem",
                width: "100%", padding: "0.6rem 0.75rem",
                borderRadius: "10px", border: "none", cursor: "pointer",
                background: s.id === activeId ? "var(--accent-light)" : "none",
                color: s.id === activeId ? "var(--accent)" : "var(--text-muted)",
                fontSize: "0.75rem", textAlign: "left",
                transition: "all 0.15s",
                borderLeft: `2px solid ${s.id === activeId ? "var(--accent)" : "transparent"}`,
              }}
            >
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                {s.title}
              </span>
              {s.messages.length > 0 && (
                <span style={{ fontSize: "0.6rem", opacity: 0.5, flexShrink: 0 }}>
                  {s.messages.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Sidebar footer */}
        <div style={{ padding: "0.75rem 1rem", borderTop: "1px solid var(--border)" }}>
          <p style={{ fontSize: "0.65rem", color: "var(--text-subtle)", fontFamily: "monospace" }}>
            Trace AI · v1.0
          </p>
        </div>
      </aside>

      {/* ── Main area ────────────────────────────────────────────────── */}
      <main style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
        background: "var(--bg)",
      }}>
        {/* Top bar */}
        <div style={{
          padding: "0.875rem 1.5rem",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          background: "var(--surface)",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: 1 }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text)" }}>
              {active?.title ?? "New session"}
            </span>
            {active?.file && (
              <span style={{
                display: "inline-flex", alignItems: "center", gap: "0.3rem",
                padding: "2px 10px", borderRadius: "9999px",
                border: "1px solid var(--accent-mid)",
                background: "var(--accent-light)", color: "var(--accent)",
                fontSize: "0.65rem", fontFamily: "monospace",
              }}>
                <ImageIcon className="w-2.5 h-2.5" />
                {active.file.name.slice(0, 28)}{active.file.name.length > 28 ? "…" : ""}
              </span>
            )}
          </div>
          {active && active.messages.length > 0 && (
            <button
              onClick={() => { updateSession(active.id, { messages: [], title: "New session", file: null }); setError(null); }}
              style={{ display: "flex", alignItems: "center", gap: "0.25rem", background: "none", border: "none", cursor: "pointer", color: "var(--text-subtle)", fontSize: "0.7rem" }}
            >
              <RotateCcw className="w-3 h-3" /> Clear
            </button>
          )}
          <ThemeToggle />
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "2rem 2.5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {(!active || active.messages.length === 0) && (
            <div style={{ margin: "auto", textAlign: "center", maxWidth: "28rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
              <div style={{ width: "3rem", height: "3rem", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--accent-light)", border: "1px solid var(--accent-mid)" }}>
                <Terminal className="w-5 h-5" style={{ color: "var(--accent)" }} />
              </div>
              <p style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--text)" }}>Start a conversation</p>
              <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", lineHeight: 1.7 }}>
                Upload a diagram and ask Trace anything about it — architecture questions, code generation, relationship mapping.
              </p>
            </div>
          )}

          <AnimatePresence initial={false}>
            {active?.messages.map((msg, idx) => (
              <motion.div key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                style={{
                  display: "flex",
                  gap: "0.625rem",
                  justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                  marginBottom: "0.5rem",
                }}
              >
                {/* ── AI message ── */}
                {msg.role === "assistant" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", maxWidth: "80%" }}>
                    {/* Avatar chip label */}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", marginBottom: "0.25rem" }}>
                      <div style={{
                        width: "1.25rem", height: "1.25rem", borderRadius: "50%", flexShrink: 0,
                        background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <Bot className="w-2.5 h-2.5" style={{ color: "#fff" }} />
                      </div>
                      <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--text-muted)", opacity: 0.6, fontFamily: "'Inter', sans-serif" }}>
                        Trace AI
                      </span>
                    </div>

                    {/* Left-border text — no bubble */}
                    <div style={{
                      paddingLeft: "1rem",
                      borderLeft: "2px solid #7c3aed",
                      color: "var(--text)",
                      fontSize: "0.9rem",
                      lineHeight: 1.8,
                      fontFamily: "'Inter', sans-serif",
                    }}>
                      {renderReply(msg.content)}
                    </div>

                    {msg.traceResult && (
                      <div style={{ paddingLeft: "1rem" }}>
                        <TraceResultPanel result={msg.traceResult} />
                      </div>
                    )}
                  </div>
                )}

                {/* ── User message ── */}
                {msg.role === "user" && (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.25rem", maxWidth: "70%" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", marginBottom: "0.125rem" }}>
                      <span style={{ fontSize: "0.72rem", fontWeight: 500, color: "var(--text-muted)", opacity: 0.55, fontFamily: "'Inter', sans-serif" }}>
                        You
                      </span>
                      <div style={{
                        width: "1.25rem", height: "1.25rem", borderRadius: "50%", flexShrink: 0,
                        background: "var(--accent-light)", border: "1px solid var(--accent-mid)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <User className="w-2.5 h-2.5" style={{ color: "var(--accent)" }} />
                      </div>
                    </div>
                    {/* Pill bubble */}
                    <div style={{
                      padding: "0.625rem 1.125rem",
                      borderTopLeftRadius: "18px",
                      borderBottomLeftRadius: "18px",
                      borderBottomRightRadius: "18px",
                      borderTopRightRadius: "4px",
                      background: "var(--bubble-user)",
                      border: "1px solid var(--bubble-user-border)",
                      color: "var(--text)",
                      fontSize: "0.9rem",
                      fontFamily: "'Inter', sans-serif",
                      lineHeight: 1.6,
                    }}>
                      {msg.content}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              {/* Avatar chip */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", marginBottom: "0.25rem" }}>
                <div style={{
                  width: "1.25rem", height: "1.25rem", borderRadius: "50%",
                  background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <Bot className="w-2.5 h-2.5" style={{ color: "#fff" }} />
                </div>
                <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--text-muted)", opacity: 0.6, fontFamily: "'Inter', sans-serif" }}>Trace AI</span>
              </div>
              {/* Thinking dots */}
              <div style={{ paddingLeft: "1rem", borderLeft: "2px solid #7c3aed", display: "flex", gap: "0.375rem", alignItems: "center", height: "1.5rem" }}>
                {[0, 1, 2].map((i) => (
                  <motion.div key={i}
                    style={{ width: "0.375rem", height: "0.375rem", borderRadius: "50%", background: "var(--accent)" }}
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                  />
                ))}
              </div>
            </motion.div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* ── Input bar ─────────────────────────────────────────────── */}
        <div style={{ flexShrink: 0, borderTop: "1px solid var(--border)", padding: "1rem 2rem 1.5rem", background: "var(--surface)" }}>
          {/* File badge */}
          {active?.file ? (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", padding: "3px 12px", borderRadius: "9999px", border: "1px solid var(--accent-mid)", background: "var(--accent-light)", color: "var(--accent)", fontSize: "0.7rem", fontFamily: "monospace" }}>
                <ImageIcon className="w-3 h-3" />
                {active.file.name.slice(0, 40)}
                <button type="button" onClick={() => updateSession(active.id, { file: null })}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--accent)", display: "flex", marginLeft: "0.25rem" }}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            </div>
          ) : (
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                padding: "0.625rem 1rem", borderRadius: "10px", cursor: "pointer", marginBottom: "0.75rem",
                border: `2px dashed ${dragging ? "var(--accent)" : "var(--border)"}`,
                background: dragging ? "var(--accent-light)" : "var(--surface-raised)",
                fontSize: "0.8rem", color: "var(--text-muted)",
                transition: "all 0.2s",
              }}
            >
              <Upload className="w-4 h-4" style={{ color: "var(--text-subtle)" }} />
              <span>Drop a diagram or <span style={{ color: "var(--accent)" }}>browse</span></span>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
            onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />

          {/* Query form */}
          <form onSubmit={handleSubmit} style={{ display: "flex", gap: "0.75rem" }}>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask about your diagram…"
              style={{
                flex: 1, height: "3rem", padding: "0 1.25rem",
                borderRadius: "14px",
                border: "1.5px solid var(--border)",
                background: "var(--surface-raised)",
                color: "var(--text)",
                fontSize: "0.9rem",
                fontFamily: "'Inter', sans-serif",
                outline: "none",
                transition: "border-color 0.2s, box-shadow 0.2s",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--accent)";
                e.currentTarget.style.boxShadow = "0 0 0 3px var(--accent-light)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              style={{
                height: "3rem", padding: "0 1.5rem", borderRadius: "14px",
                background: "var(--accent)", color: "#fff", border: "none", cursor: "pointer",
                display: "inline-flex", alignItems: "center", gap: "0.5rem",
                fontWeight: 600, fontSize: "0.875rem", flexShrink: 0,
                boxShadow: "0 4px 14px rgba(124,58,237,0.3)",
                opacity: loading ? 0.6 : 1,
              }}>
              {loading
                ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    style={{ width: "1rem", height: "1rem", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff" }} />
                : <Send className="w-4 h-4" />}
              <span style={{ whiteSpace: "nowrap" }}>{loading ? "Tracing…" : "Send"}</span>
            </motion.button>
          </form>

          {error && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "#ef4444", fontFamily: "monospace" }}>
              ✗ {error}
            </motion.p>
          )}
        </div>
      </main>
    </motion.div>
  );
}
