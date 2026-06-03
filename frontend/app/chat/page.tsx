"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Upload, X, ImageIcon, Code2,
  RotateCcw, Bot, User, ZoomIn, ZoomOut,
  MousePointer, PlusSquare,
  Terminal, Rocket,
} from "lucide-react";
import { useRouter } from "next/navigation";
import StarField from "@/components/StarField";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Entity   { label: string; type: string; }
interface Edge     { from: string; to: string; label?: string; action?: string; }
interface TraceResponse { reply: string; entities: Entity[]; edges: Edge[]; generated_code?: string; }
interface ChatMessage   { role: "user" | "assistant"; content: string; traceResult?: TraceResponse; }
interface CanvasNode    { id: string; label: string; type: string; sub: string; x: number; y: number; active?: boolean; }

// ── Canvas types ──────────────────────────────────────────────────────────────
type CanvasEdge = { from: string; to: string; label?: string };

// Default nodes/edges only used internally — canvas starts empty
const DEFAULT_NODES: CanvasNode[] = [];
const DEFAULT_EDGES: CanvasEdge[] = [];

// ── Helpers ───────────────────────────────────────────────────────────────────
function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function inlineMd(t: string) {
  return t
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#fff">$1</strong>')
    .replace(/`([^`]+)`/g, '<code style="font-family:JetBrains Mono,monospace;font-size:0.8em;background:rgba(255,255,255,0.07);padding:1px 6px;border-radius:3px">$1</code>');
}
function renderReply(text: string): React.ReactNode[] {
  const els: React.ReactNode[] = [];
  const parts = text.split(/(```[\w]*\n[\s\S]*?```)/g);
  parts.forEach((part, idx) => {
    const fence = part.match(/^```([\w]*)\n([\s\S]*?)```$/);
    if (fence) {
      const lang = fence[1] || "code";
      const code = fence[2];
      els.push(
        <div key={idx} style={{ margin: "10px 0" }}>
          <div style={{
            display: "flex", justifyContent: "space-between",
            padding: "5px 12px",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderBottom: "none",
            borderRadius: "4px 4px 0 0",
            fontSize: "10px",
            color: "rgba(255,255,255,0.3)",
            fontFamily: "JetBrains Mono,monospace",
          }}>
            <span>{lang}</span>
            <button
              onClick={() => navigator.clipboard.writeText(code)}
              style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: "9px", cursor: "pointer", letterSpacing: "0.1em" }}
            >
              COPY
            </button>
          </div>
          <pre style={{
            margin: 0, padding: "14px",
            background: "rgba(0,0,0,0.6)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "0 0 4px 4px",
            overflow: "auto", fontSize: "12px",
            fontFamily: "JetBrains Mono,monospace",
            color: "rgba(196,199,200,0.9)",
            whiteSpace: "pre-wrap", lineHeight: 1.6,
          }}>
            <code dangerouslySetInnerHTML={{ __html: escapeHtml(code) }} />
          </pre>
        </div>
      );
      return;
    }
    part.split("\n").forEach((line, li) => {
      const tr = line.trim();
      if (!tr) { els.push(<div key={`${idx}-${li}`} style={{ height: "6px" }} />); return; }
      if (/^[*\-]\s/.test(tr)) {
        els.push(
          <div key={`${idx}-${li}`} style={{ display: "flex", gap: "8px", marginBottom: "4px" }}>
            <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "8px", flexShrink: 0, marginTop: "5px" }}>◆</span>
            <span style={{ fontSize: "13px" }} dangerouslySetInnerHTML={{ __html: inlineMd(tr.slice(2)) }} />
          </div>
        );
      } else {
        els.push(<p key={`${idx}-${li}`} style={{ margin: "0 0 4px", fontSize: "13px" }} dangerouslySetInnerHTML={{ __html: inlineMd(tr) }} />);
      }
    });
  });
  return els;
}

// ── Node-type icon (inline SVG) ───────────────────────────────────────────────
function NodeTypeIcon({ type }: { type: string }) {
  if (type === "ENTRY_POINT")
    return <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>;
  if (type === "CORE_PROCESS")
    return <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="2" /><path d="M7 12h10M12 7v10" /></svg>;
  if (type === "STORAGE")
    return <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5v5c0 1.657 4.03 3 9 3s9-1.343 9-3V5" /><path d="M3 10v5c0 1.657 4.03 3 9 3s9-1.343 9-3v-5" /></svg>;
  return <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" /></svg>;
}

// ── Nebula Canvas ─────────────────────────────────────────────────────────────
function NebulaCanvas({
  nodes, edges, onNodeClick, onExportCode, onInitialize,
}: {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  onNodeClick: (id: string) => void;
  onExportCode: () => void;
  onInitialize: () => void;
}) {
  const [zoom, setZoom]       = useState(100);
  const [dragging, setDragging] = useState<string | null>(null);
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [activeTool, setActiveTool] = useState(0);
  const canvasRef = useRef<HTMLDivElement>(null);

  const getPos = (n: CanvasNode) => positions[n.id] ?? { x: n.x, y: n.y };

  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    const pos = positions[id] ?? nodes.find(n => n.id === id)!;
    setDragging(id);
    setDragOffset({ x: e.clientX - pos.x, y: e.clientY - pos.y });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging) return;
    setPositions(p => ({ ...p, [dragging]: { x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y } }));
  }, [dragging, dragOffset]);

  const handleMouseUp = useCallback(() => setDragging(null), []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup",   handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup",   handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const NODE_W = 180;
  const NODE_H = 90;

  return (
    <section
      ref={canvasRef}
      className="relative overflow-hidden"
      style={{
        flex: 1,
        background: "#0e0e0e",
        backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.045) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
        cursor: dragging ? "grabbing" : "crosshair",
      }}
    >
      {/* ── Floating toolbar (top centre) ── */}
      <div style={{ position: "absolute", top: 24, left: "50%", transform: "translateX(-50%)", zIndex: 20 }}>
        <div style={{
          display: "flex", gap: "2px",
          background: "rgba(255,255,255,0.03)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderTop:  "1px solid rgba(255,255,255,0.28)",
          borderLeft: "1px solid rgba(255,255,255,0.28)",
          borderRadius: "8px",
          padding: "4px",
        }}>
          {[
            { icon: <MousePointer size={16} />, title: "Select"   },
            { icon: <PlusSquare   size={16} />, title: "Add Node" },
            { icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M3 6h18M3 12h18M3 18h18"/></svg>, title: "Connect" },
          ].map((btn, i) => (
            <button
              key={i} title={btn.title}
              onClick={() => setActiveTool(i)}
              style={{
                padding: "8px", borderRadius: "6px",
                background: activeTool === i ? "rgba(255,255,255,0.1)" : "none",
                color: activeTool === i ? "#fff" : "rgba(196,199,200,0.45)",
                border: "none", cursor: "pointer", transition: "all 0.15s", display: "flex",
              }}
              onMouseEnter={e => { if (activeTool !== i) (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.07)"; }}
              onMouseLeave={e => { if (activeTool !== i) (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
            >
              {btn.icon}
            </button>
          ))}
          <div style={{ width: "1px", background: "rgba(255,255,255,0.1)", margin: "4px 2px" }} />
          <button title="Text" style={{ padding: "8px", borderRadius: "6px", background: "none", color: "rgba(196,199,200,0.45)", border: "none", cursor: "pointer", display: "flex" }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg>
          </button>
        </div>
      </div>

      {/* ── Zoom controls (bottom left) ── */}
      <div style={{ position: "absolute", bottom: 24, left: 24, zIndex: 20 }}>
        <div style={{
          display: "flex", flexDirection: "column", gap: "2px",
          background: "rgba(255,255,255,0.03)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderTop:  "1px solid rgba(255,255,255,0.28)",
          borderLeft: "1px solid rgba(255,255,255,0.28)",
          borderRadius: "8px", padding: "4px",
        }}>
          <button onClick={() => setZoom(z => Math.min(z + 15, 200))} style={{ padding: "8px", background: "none", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer", display: "flex", justifyContent: "center" }}>
            <ZoomIn size={14} />
          </button>
          <div style={{ height: "1px", background: "rgba(255,255,255,0.08)", margin: "0 6px" }} />
          <div style={{ padding: "6px 10px", fontFamily: "JetBrains Mono,monospace", fontSize: "9px", color: "rgba(255,255,255,0.35)", textAlign: "center", letterSpacing: "0.06em" }}>
            {zoom}%
          </div>
          <div style={{ height: "1px", background: "rgba(255,255,255,0.08)", margin: "0 6px" }} />
          <button onClick={() => setZoom(z => Math.max(z - 15, 40))} style={{ padding: "8px", background: "none", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer", display: "flex", justifyContent: "center" }}>
            <ZoomOut size={14} />
          </button>
        </div>
      </div>

      {/* ── Bottom action buttons ── */}
      <div style={{ position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 20, display: "flex", gap: "12px" }}>
        <button
          onClick={onExportCode}
          style={{
            display: "flex", alignItems: "center", gap: "8px",
            padding: "10px 20px",
            background: "rgba(42,42,42,0.9)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(226,226,226,0.7)",
            fontSize: "11px", fontFamily: "Geist,sans-serif", fontWeight: 600,
            letterSpacing: "0.1em", textTransform: "uppercase",
            cursor: "pointer", backdropFilter: "blur(10px)", transition: "all 0.2s",
          }}
          onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = "rgba(60,60,60,0.9)"}
          onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = "rgba(42,42,42,0.9)"}
        >
          <Terminal size={13} /> Export Code
        </button>
        <button
          onClick={onInitialize}
          style={{
            display: "flex", alignItems: "center", gap: "8px",
            padding: "10px 20px",
            background: "#fff", border: "none", color: "#1a1a1a",
            fontSize: "11px", fontFamily: "Geist,sans-serif", fontWeight: 600,
            letterSpacing: "0.1em", textTransform: "uppercase",
            cursor: "pointer", transition: "all 0.2s",
          }}
          onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 24px rgba(255,255,255,0.35)"}
          onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.boxShadow = "none"}
        >
          <Rocket size={13} /> Initialize
        </button>
      </div>

      {/* ── Empty state placeholder ── */}
      {nodes.length === 0 && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 8,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          pointerEvents: "none",
          gap: "20px",
        }}>
          <svg width="64" height="64" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" viewBox="0 0 64 64">
            <rect x="8" y="8" width="20" height="14" rx="2" />
            <rect x="36" y="8" width="20" height="14" rx="2" />
            <rect x="8" y="42" width="20" height="14" rx="2" />
            <rect x="36" y="42" width="20" height="14" rx="2" />
            <path d="M18 22v8M46 22v8M18 42V30M46 42V30M18 30h28" strokeDasharray="3 3" />
          </svg>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "Sora,sans-serif", fontSize: "15px", color: "rgba(255,255,255,0.2)", fontWeight: 600, marginBottom: "8px" }}>
              Canvas Empty
            </div>
            <div style={{ fontFamily: "JetBrains Mono,monospace", fontSize: "10px", color: "rgba(255,255,255,0.1)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
              Upload a diagram and send a message
            </div>
          </div>
        </div>
      )}

      <div style={{
        position: "absolute", top: 28, left: 28,
        fontFamily: "JetBrains Mono,monospace", fontSize: "9px",
        color: "rgba(255,255,255,0.15)", letterSpacing: "0.2em",
        textTransform: "uppercase", zIndex: 2,
      }}>
        nebula://canvas · session:v_alpha_9
      </div>

      {/* ── SVG connector layer ── */}
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 5 }}>
        <defs>
          <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M 0 0 L 6 3 L 0 6 z" fill="rgba(255,255,255,0.2)" />
          </marker>
        </defs>
        {edges.map((edge, i) => {
          const from = nodes.find(n => n.id === edge.from)!;
          const to   = nodes.find(n => n.id === edge.to)!;
          const fp   = getPos(from);
          const tp   = getPos(to);
          // connect right-centre of source → left-centre of target
          const x1 = fp.x + NODE_W;
          const y1 = fp.y + NODE_H / 2;
          const x2 = tp.x;
          const y2 = tp.y + NODE_H / 2;
          const mx = (x1 + x2) / 2;
          return (
            <path
              key={i}
              d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
              fill="none"
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="1"
              strokeDasharray="5 4"
              style={{ animation: `flow ${18 + i * 3}s linear infinite` }}
              markerEnd="url(#arrowhead)"
            />
          );
        })}
      </svg>

      {/* ── Nodes layer ── */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 10,
        transform: `scale(${zoom / 100})`, transformOrigin: "center center",
      }}>
        {nodes.map(node => {
          const pos = getPos(node);
          return (
            <div
              key={node.id}
              onMouseDown={e => handleMouseDown(e, node.id)}
              onClick={() => onNodeClick(node.id)}
              style={{
                position: "absolute",
                left: pos.x, top: pos.y,
                width: `${NODE_W}px`,
                background: node.active ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.025)",
                backdropFilter: "blur(20px)",
                border:     node.active ? "1px solid rgba(255,255,255,0.4)" : "1px solid rgba(255,255,255,0.1)",
                borderTop:  node.active ? "1px solid rgba(255,255,255,0.6)" : "1px solid rgba(255,255,255,0.25)",
                borderLeft: node.active ? "1px solid rgba(255,255,255,0.6)" : "1px solid rgba(255,255,255,0.25)",
                padding: "20px",
                borderRadius: "4px",
                cursor: "grab",
                userSelect: "none",
                transition: "box-shadow 0.2s, border-color 0.2s, transform 0.15s",
                boxShadow: node.active
                  ? "0 0 20px rgba(255,255,255,0.1), 0 8px 32px rgba(0,0,0,0.5)"
                  : "0 4px 16px rgba(0,0,0,0.4)",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.35)";
                (e.currentTarget as HTMLDivElement).style.transform = "scale(1.02)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor = node.active ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.1)";
                (e.currentTarget as HTMLDivElement).style.transform = "scale(1)";
              }}
            >
              {/* Specular corner */}
              <div style={{ position: "absolute", top: 0, left: 0, width: "28px", height: "1px", background: "rgba(255,255,255,0.55)", borderTopLeftRadius: "4px" }} />

              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
                <span style={{ color: node.active ? "#fff" : "rgba(255,255,255,0.4)" }}>
                  <NodeTypeIcon type={node.type} />
                </span>
                <span style={{
                  fontFamily: "JetBrains Mono,monospace", fontSize: "8px",
                  color: node.active ? "rgba(255,255,255,0.85)" : "rgba(196,199,200,0.3)",
                  letterSpacing: "0.12em", textTransform: "uppercase",
                }}>
                  {node.type}
                </span>
              </div>

              <div style={{ fontFamily: "Sora,sans-serif", fontSize: "14px", fontWeight: 600, color: "#fff", marginBottom: "12px" }}>
                {node.label}
              </div>

              {node.active ? (
                <div style={{ height: "3px", background: "rgba(255,255,255,0.08)", borderRadius: "2px", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: "33%", background: "rgba(255,255,255,0.75)", borderRadius: "2px", animation: "loadPulse 2s ease-in-out infinite" }} />
                </div>
              ) : (
                <div style={{ fontFamily: "JetBrains Mono,monospace", fontSize: "9px", color: "rgba(196,199,200,0.4)", letterSpacing: "0.08em" }}>
                  {node.sub}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes flow { from { stroke-dashoffset: 40; } to { stroke-dashoffset: 0; } }
        @keyframes loadPulse { 0%,100% { opacity:0.5; width:20%; } 50% { opacity:1; width:50%; } }
      `}</style>
    </section>
  );
}

// ── Chat Sidebar ──────────────────────────────────────────────────────────────
function ChatSidebar({
  messages, loading, error, file,
  onSubmit, onFileChange, onFileRemove, onReset,
  query, setQuery,
}: {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  file: File | null;
  onSubmit: (e: React.FormEvent) => void;
  onFileChange: (f: File) => void;
  onFileRemove: () => void;
  onReset: () => void;
  query: string;
  setQuery: (v: string) => void;
}) {
  const bottomRef   = useRef<HTMLDivElement>(null);
  const fileRef     = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [dropHover, setDropHover] = useState(false);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const autoResize = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 140)}px`;
  };

  return (
    <aside style={{
      width: "420px", flexShrink: 0,
      display: "flex", flexDirection: "column",
      background: "rgba(255,255,255,0.02)",
      backdropFilter: "blur(20px)",
      borderLeft: "1px solid rgba(255,255,255,0.1)",
      position: "relative", zIndex: 30,
    }}>
      {/* Top specular line */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: "1px",
        background: "linear-gradient(to right, rgba(255,255,255,0.35), rgba(255,255,255,0.05))",
      }} />

      {/* ── Header ── */}
      <div style={{
        padding: "24px",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexShrink: 0,
      }}>
        <div>
          <h2 style={{ fontFamily: "Sora,sans-serif", fontSize: "18px", fontWeight: 600, color: "#fff", marginBottom: "6px" }}>
            Trace Chat
          </h2>
          <p style={{ fontFamily: "JetBrains Mono,monospace", fontSize: "9px", color: "rgba(196,199,200,0.35)", letterSpacing: "0.2em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#fff", opacity: 0.6, animation: "pulseStatus 2s infinite" }} />
            NEURAL_SYNC_STABLE
          </p>
        </div>
        <button
          onClick={onReset}
          style={{
            padding: "8px", background: "none",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "4px", cursor: "pointer",
            color: "rgba(196,199,200,0.45)", display: "flex", transition: "all 0.2s",
          }}
          onMouseEnter={e => {
            const b = e.currentTarget as HTMLButtonElement;
            b.style.background = "rgba(255,255,255,0.06)";
            b.style.color = "#fff";
          }}
          onMouseLeave={e => {
            const b = e.currentTarget as HTMLButtonElement;
            b.style.background = "none";
            b.style.color = "rgba(196,199,200,0.45)";
          }}
          title="Clear chat"
        >
          <RotateCcw size={14} />
        </button>
      </div>

      {/* ── Messages ── */}
      <div
        className="custom-scrollbar"
        style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: "28px" }}
      >
        {/* Empty state */}
        {messages.length === 0 && !loading && (
          <div style={{
            color: "rgba(196,199,200,0.3)",
            fontFamily: "JetBrains Mono,monospace", fontSize: "11px",
            letterSpacing: "0.08em", textAlign: "center", marginTop: "40px",
          }}>
            <div style={{
              width: "44px", height: "44px",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderTop: "1px solid rgba(255,255,255,0.3)",
              borderLeft: "1px solid rgba(255,255,255,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 16px",
            }}>
              <Terminal size={18} style={{ color: "rgba(255,255,255,0.4)" }} />
            </div>
            UPLOAD A DIAGRAM TO BEGIN<br />
            <span style={{ opacity: 0.5 }}>or type a command below</span>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
            >
              {msg.role === "assistant" ? (
                <div style={{ display: "flex", gap: "14px" }}>
                  {/* AI avatar */}
                  <div style={{
                    width: "32px", height: "32px", flexShrink: 0,
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderTop: "1px solid rgba(255,255,255,0.3)",
                    borderLeft: "1px solid rgba(255,255,255,0.3)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Bot size={13} style={{ color: "rgba(255,255,255,0.6)" }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: "rgba(196,199,200,0.85)", lineHeight: 1.75, marginBottom: msg.traceResult ? "12px" : 0 }}>
                      {renderReply(msg.content)}
                    </div>
                    {/* Generated code block */}
                    {msg.traceResult?.generated_code && (
                      <div style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.07)",
                        borderRadius: "4px", padding: "12px", marginTop: "10px",
                      }}>
                        <div style={{
                          display: "flex", justifyContent: "space-between",
                          marginBottom: "8px", opacity: 0.3,
                          fontFamily: "JetBrains Mono,monospace", fontSize: "10px",
                        }}>
                          <span>generated.sh</span>
                          <button
                            onClick={() => navigator.clipboard.writeText(msg.traceResult?.generated_code || "")}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", display: "flex" }}
                          >
                            <Code2 size={12} />
                          </button>
                        </div>
                        <code style={{ fontFamily: "JetBrains Mono,monospace", fontSize: "12px", color: "rgba(196,199,200,0.85)", lineHeight: 1.6 }}>
                          {msg.traceResult.generated_code}
                        </code>
                      </div>
                    )}
                    {/* Entity + edge chips */}
                    {msg.traceResult && (msg.traceResult.entities.length > 0 || (msg.traceResult.edges?.length ?? 0) > 0) && (
                      <div style={{ marginTop: "12px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
                        {msg.traceResult.entities.slice(0, 6).map((e, i) => (
                          <span key={i} style={{
                            padding: "3px 10px",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: "9999px",
                            fontFamily: "JetBrains Mono,monospace", fontSize: "10px",
                            color: "rgba(196,199,200,0.5)",
                            background: "rgba(255,255,255,0.03)",
                          }}>
                            {e.label}
                          </span>
                        ))}
                        {msg.traceResult.edges?.slice(0, 3).map((e, i) => (
                          <span key={`e${i}`} style={{
                            padding: "3px 10px",
                            border: "1px solid rgba(255,255,255,0.07)",
                            borderRadius: "9999px",
                            fontFamily: "JetBrains Mono,monospace", fontSize: "10px",
                            color: "rgba(196,199,200,0.3)",
                          }}>
                            {e.from} → {e.to}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "row-reverse", gap: "14px" }}>
                  {/* User avatar */}
                  <div style={{
                    width: "32px", height: "32px", flexShrink: 0,
                    background: "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <User size={13} style={{ color: "#1a1a1a" }} />
                  </div>
                  <div style={{ textAlign: "right", flex: 1 }}>
                    <div style={{
                      display: "inline-block",
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderTop: "1px solid rgba(255,255,255,0.25)",
                      borderLeft: "1px solid rgba(255,255,255,0.25)",
                      padding: "12px 16px",
                      color: "#fff", fontSize: "13px", fontFamily: "Geist,sans-serif",
                      lineHeight: 1.65, borderRadius: "2px", textAlign: "left",
                    }}>
                      {msg.content}
                    </div>
                    <div style={{
                      marginTop: "5px",
                      fontFamily: "JetBrains Mono,monospace", fontSize: "8px",
                      color: "rgba(196,199,200,0.2)", letterSpacing: "0.12em", textTransform: "uppercase",
                    }}>
                      Delivered
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Loading dots */}
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", gap: "14px" }}>
            <div style={{
              width: "32px", height: "32px", flexShrink: 0,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderTop: "1px solid rgba(255,255,255,0.3)",
              borderLeft: "1px solid rgba(255,255,255,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <div style={{ display: "flex", gap: "5px", alignItems: "center", height: "32px" }}>
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  style={{ width: "5px", height: "5px", background: "rgba(255,255,255,0.3)", borderRadius: "1px" }}
                  animate={{ opacity: [0.2, 0.8, 0.2], scaleY: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.3, repeat: Infinity, delay: i * 0.22 }}
                />
              ))}
            </div>
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input area ── */}
      <div style={{
        borderTop: "1px solid rgba(255,255,255,0.08)",
        padding: "20px",
        background: "rgba(0,0,0,0.2)",
        flexShrink: 0,
      }}>
        {/* File zone */}
        {file ? (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: "6px",
              padding: "4px 12px",
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.03)",
              fontFamily: "JetBrains Mono,monospace", fontSize: "10px",
              color: "rgba(196,199,200,0.6)", letterSpacing: "0.04em", borderRadius: "2px",
            }}>
              <ImageIcon size={10} />
              {file.name.slice(0, 32)}{file.name.length > 32 ? "…" : ""}
              <button
                type="button" onClick={onFileRemove}
                style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.3)", display: "flex", marginLeft: "4px" }}
              >
                <X size={10} />
              </button>
            </span>
          </div>
        ) : (
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDropHover(true); }}
            onDragLeave={() => setDropHover(false)}
            onDrop={e => {
              e.preventDefault(); setDropHover(false);
              if (e.dataTransfer.files[0]) onFileChange(e.dataTransfer.files[0]);
            }}
            style={{
              display: "flex", alignItems: "center", gap: "8px",
              padding: "10px 14px",
              border: `1px dashed ${dropHover ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.12)"}`,
              background: dropHover ? "rgba(255,255,255,0.04)" : "transparent",
              cursor: "pointer", marginBottom: "12px",
              fontSize: "11px", color: "rgba(196,199,200,0.4)",
              fontFamily: "Geist,sans-serif", borderRadius: "2px", transition: "all 0.2s",
            }}
          >
            <Upload size={12} />
            Drop diagram or <span style={{ color: "rgba(255,255,255,0.55)" }}>browse</span>
          </div>
        )}
        <input
          ref={fileRef} type="file" accept="image/*"
          style={{ display: "none" }}
          onChange={e => { if (e.target.files?.[0]) onFileChange(e.target.files[0]); }}
        />

        {/* Input box */}
        <form onSubmit={onSubmit}>
          <div
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderTop:  "1px solid rgba(255,255,255,0.22)",
              borderLeft: "1px solid rgba(255,255,255,0.22)",
              borderRadius: "4px", overflow: "hidden", transition: "box-shadow 0.2s",
            }}
            onFocusCapture={e => (e.currentTarget as HTMLDivElement).style.boxShadow = "0 0 0 1px rgba(255,255,255,0.18), 0 0 14px rgba(255,255,255,0.05)"}
            onBlurCapture={e => (e.currentTarget as HTMLDivElement).style.boxShadow = "none"}
          >
            <textarea
              ref={textareaRef}
              value={query}
              onChange={e => { setQuery(e.target.value); autoResize(); }}
              onKeyDown={e => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  onSubmit(e as unknown as React.FormEvent);
                }
              }}
              placeholder="Trace your command..."
              rows={2}
              className="chat-textarea"
              style={{
                width: "100%", background: "transparent", border: "none",
                color: "#e2e2e2", fontSize: "13px", fontFamily: "Geist,sans-serif",
                lineHeight: 1.65, padding: "14px", outline: "none",
                resize: "none", display: "block",
              }}
            />
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "8px 12px", borderTop: "1px solid rgba(255,255,255,0.06)",
            }}>
              <div style={{ display: "flex", gap: "4px" }}>
                {[
                  { icon: <Upload size={15} />, title: "Attach", onClick: () => fileRef.current?.click() },
                  { icon: <Code2  size={15} />, title: "Code",   onClick: () => {} },
                ].map((btn, i) => (
                  <button
                    key={i} type="button" title={btn.title} onClick={btn.onClick}
                    style={{
                      padding: "6px", background: "none", border: "none",
                      color: "rgba(196,199,200,0.3)", cursor: "pointer",
                      display: "flex", borderRadius: "4px", transition: "all 0.15s",
                    }}
                    onMouseEnter={e => {
                      const b = e.currentTarget as HTMLButtonElement;
                      b.style.color = "#fff"; b.style.background = "rgba(255,255,255,0.06)";
                    }}
                    onMouseLeave={e => {
                      const b = e.currentTarget as HTMLButtonElement;
                      b.style.color = "rgba(196,199,200,0.3)"; b.style.background = "none";
                    }}
                  >
                    {btn.icon}
                  </button>
                ))}
              </div>
              <motion.button
                type="submit" disabled={loading}
                whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
                style={{
                  width: "32px", height: "32px",
                  background: loading ? "rgba(255,255,255,0.15)" : "#fff",
                  border: "none", cursor: loading ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  borderRadius: "2px", flexShrink: 0, transition: "box-shadow 0.2s",
                }}
                onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 16px rgba(255,255,255,0.4)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = "none"; }}
              >
                {loading
                  ? <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      style={{ width: "12px", height: "12px", borderRadius: "50%", border: "2px solid rgba(0,0,0,0.2)", borderTopColor: "#1a1a1a" }}
                    />
                  : <Send size={13} style={{ color: "#1a1a1a" }} />}
              </motion.button>
            </div>
          </div>
        </form>

        <div style={{ textAlign: "center", marginTop: "10px", fontFamily: "JetBrains Mono,monospace", fontSize: "8px", color: "rgba(196,199,200,0.15)", letterSpacing: "0.2em", textTransform: "uppercase" }}>
          TRANSMIT: CTRL + ENTER
        </div>

        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ marginTop: "8px", fontSize: "10px", color: "rgba(255,80,80,0.85)", fontFamily: "JetBrains Mono,monospace", letterSpacing: "0.04em" }}
          >
            ✗ {error}
          </motion.p>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
        @keyframes pulseStatus { 0%,100%{opacity:0.4;transform:scale(0.95);} 50%{opacity:1;transform:scale(1.1);} }
      `}</style>
    </aside>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ChatPage() {
  const router = useRouter();
  const [nodes,    setNodes]    = useState<CanvasNode[]>([]);
  const [edges,    setEdges]    = useState<CanvasEdge[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [query,    setQuery]    = useState("");
  const [file,     setFile]     = useState<File | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  // stores latest generated code so Export Code button can access it
  const latestCodeRef = useRef<string>("");

  const handleNodeClick = (id: string) => {
    setNodes(prev => prev.map(n => ({ ...n, active: n.id === id })));
    const node = nodes.find(n => n.id === id);
    if (node) setQuery(`Tell me about the ${node.label} node`);
  };

  // Reset all state to defaults
  const handleReset = () => {
    setMessages([]);
    setNodes([]);
    setEdges([]);
    setFile(null);
    setQuery("");
    setError(null);
    latestCodeRef.current = "";
  };

  // Download generated code as a file
  const handleExportCode = () => {
    const code = latestCodeRef.current;
    if (!code) {
      setError("No generated code yet — send a diagram first.");
      return;
    }
    const isSQL = code.trimStart().startsWith("--");
    const ext   = isSQL ? ".sql" : ".py";
    const blob  = new Blob([code], { type: "text/plain" });
    const url   = URL.createObjectURL(blob);
    const a     = document.createElement("a");
    a.href     = url;
    a.download = `trace_generated${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // "Initialize" — trigger submit if ready, else focus input
  const chatInputRef = useRef<HTMLFormElement | null>(null);
  const handleInitialize = () => {
    if (file && query.trim()) {
      // Simulate form submit
      chatInputRef.current?.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    } else {
      // Focus the chat textarea via querySelector
      const ta = document.querySelector<HTMLTextAreaElement>(".chat-textarea");
      ta?.focus();
      if (!file) setError("Upload a diagram image first.");
    }
  };


  const handleFileChange = (f: File) => {
    if (!f.type.startsWith("image/")) { setError("Please upload an image file."); return; }
    setFile(f); setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file)        { setError("Upload a diagram image first."); return; }
    if (!query.trim()) { setError("Ask something about your diagram."); return; }

    const userMsg: ChatMessage = { role: "user", content: query.trim() };
    const historyForBackend = messages.map(m => ({ role: m.role, content: m.content }));
    setMessages(prev => [...prev, userMsg]);
    setQuery(""); setLoading(true); setError(null);

    try {
      const form = new FormData();
      form.append("query",   userMsg.content);
      form.append("file",    file);
      form.append("history", JSON.stringify(historyForBackend));
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/chat`,
        { method: "POST", body: form }
      );
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail ?? "Backend error"); }
      const data: TraceResponse = await res.json();
      // Cache generated code for the Export button
      if (data.generated_code) latestCodeRef.current = data.generated_code;
      setMessages(prev => [...prev, { role: "assistant", content: data.reply, traceResult: data }]);


      if (data.entities.length > 0) {
        // Layout nodes in a smart multi-column grid
        const cols = Math.ceil(Math.sqrt(data.entities.length));
        const newNodes: CanvasNode[] = data.entities.map((e, i) => ({
          id:     `n${i + 1}`,
          label:  e.label,
          type:   e.type.toUpperCase(),
          sub:    `${e.type} · node:${String(i + 1).padStart(3, "0")}`,
          x:      80  + (i % cols)           * 260,
          y:      80  + Math.floor(i / cols) * 180,
          active: i === 0,
        }));
        setNodes(newNodes);

        // Map backend edges (which use label-based from/to) to canvas node IDs
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
          // Auto-wire nodes in sequence if no edges returned
          const autoEdges: CanvasEdge[] = newNodes.slice(0, -1).map((n, i) => ({
            from: n.id,
            to:   newNodes[i + 1].id,
          }));
          setEdges(autoEdges);
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      height: "100vh", width: "100vw",
      overflow: "hidden", background: "#0e0e0e", position: "relative",
    }}>
      <StarField />

      {/* ── Navigation ── */}
      <nav style={{
        position: "relative", zIndex: 50, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 48px",
        borderBottom: "1px solid rgba(255,255,255,0.1)",
        background: "rgba(255,255,255,0.04)",
        backdropFilter: "blur(20px)",
      }}>
        <div
          onClick={() => router.push('/')}
          style={{
            fontFamily: "Sora,sans-serif", fontSize: "18px", fontWeight: 700,
            color: "#fff", letterSpacing: "-0.02em", textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          Trace
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "32px" }}>
          {(["Nebula", "Mirror", "Void", "Pulse"] as const).map((item, i) => (
            <a
              key={item}
              href={i === 0 ? "/" : "#"}
              onClick={i === 0 ? (e) => { e.preventDefault(); router.push("/"); } : undefined}
              style={{
                fontFamily: "Geist,sans-serif", fontSize: "14px",
                color: i === 0 ? "#fff" : "rgba(196,199,200,0.45)",
                textDecoration: "none",
                borderBottom: i === 0 ? "1px solid #fff" : "none",
                paddingBottom: i === 0 ? "2px" : 0,
                transition: "color 0.2s",
              }}
              onMouseEnter={e => { if (i !== 0) (e.target as HTMLAnchorElement).style.color = "#fff"; }}
              onMouseLeave={e => { if (i !== 0) (e.target as HTMLAnchorElement).style.color = "rgba(196,199,200,0.45)"; }}
            >
              {item}
            </a>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <span style={{
            fontFamily: "JetBrains Mono,monospace", fontSize: "9px",
            color: "rgba(196,199,200,0.3)", letterSpacing: "0.2em",
          }}>
            SESSION: V_ALPHA_9
          </span>
          <button
            onClick={handleReset}
            style={{
              padding: "10px 24px", background: "#fff", border: "none",
              color: "#1a1a1a", fontFamily: "Geist,sans-serif", fontSize: "11px",
              fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase",
              cursor: "pointer", transition: "box-shadow 0.2s",
            }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 20px rgba(255,255,255,0.35)"}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.boxShadow = "none"}
          >
            Sync Mirror
          </button>
        </div>
      </nav>

      {/* ── Split pane ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <NebulaCanvas
          nodes={nodes}
          edges={edges}
          onNodeClick={handleNodeClick}
          onExportCode={handleExportCode}
          onInitialize={handleInitialize}
        />
        <ChatSidebar
          messages={messages} loading={loading} error={error} file={file}
          onSubmit={handleSubmit} onFileChange={handleFileChange}
          onFileRemove={() => setFile(null)}
          onReset={handleReset}
          query={query} setQuery={setQuery}
        />
      </div>
    </div>
  );
}
