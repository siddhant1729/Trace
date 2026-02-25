"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Send, Terminal, X, ImageIcon, Code2 } from "lucide-react";

interface Entity {
  label: string;
  type: string;
  bbox?: number[];
}

interface TraceResponse {
  reply: string;
  entities: Entity[];
  generated_code?: string;
}

const typeColors: Record<string, string> = {
  Actor:     "bg-blue-500/20 text-blue-300 border-blue-500/30",
  Process:   "bg-violet-500/20 text-violet-300 border-violet-500/30",
  Database:  "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  Interface: "bg-amber-500/20 text-amber-300 border-amber-500/30",
};
const defaultColor = "bg-slate-500/20 text-slate-300 border-slate-500/30";

export default function TraceChat() {
  const [query, setQuery]     = useState("");
  const [file, setFile]       = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<TraceResponse | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    if (!f.type.startsWith("image/")) {
      setError("Please upload an image file.");
      return;
    }
    setFile(f);
    setError(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file)        { setError("Please upload a diagram image first."); return; }
    if (!query.trim()) { setError("Please enter a query."); return; }

    setLoading(true);
    setError(null);
    setResult(null);
    setShowCode(false);

    try {
      const form = new FormData();
      form.append("query", query.trim());
      form.append("file", file);

      const res = await fetch("http://localhost:8000/chat", {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail ?? "Backend error");
      }

      const data: TraceResponse = await res.json();
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="w-full mt-8"
    >
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl overflow-hidden shadow-2xl">
        {/* Terminal header bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
          <Terminal className="w-4 h-4 text-purple-400" />
          <span className="text-xs font-mono text-slate-400 tracking-wider">trace://chat</span>
          <div className="ml-auto flex gap-1.5">
            {["bg-red-500", "bg-yellow-500", "bg-green-500"].map((c, i) => (
              <div key={i} className={`w-2.5 h-2.5 rounded-full ${c} opacity-60`} />
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* File Drop Zone */}
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`relative flex flex-col items-center justify-center gap-2 h-28 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200
              ${dragging
                ? "border-purple-500/70 bg-purple-500/10"
                : file
                  ? "border-violet-500/50 bg-violet-500/05"
                  : "border-white/10 hover:border-white/20 bg-white/[0.02] hover:bg-white/[0.04]"
              }`}
            style={{ height: "10rem" }}
          >
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
            />
            {file ? (
              <>
                <ImageIcon className="w-6 h-6 text-violet-400" />
                <div className="flex items-center gap-2">
                  <span className="text-sm text-violet-300 font-mono truncate max-w-[240px]">{file.name}</span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                    className="text-slate-500 hover:text-red-400 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <span className="text-xs text-slate-600">{(file.size / 1024).toFixed(1)} KB</span>
              </>
            ) : (
              <>
                <Upload className="w-5 h-5 text-slate-500" />
                <span className="text-sm text-slate-500">
                  Drop your diagram here or <span className="text-purple-400">browse</span>
                </span>
                <span className="text-xs text-slate-700">PNG, JPG, WebP accepted</span>
              </>
            )}
          </div>

          {/* Query Input */}
          <div className="flex gap-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask about your diagram… e.g. 'how does this flow work?'"
              className="flex-1 h-11 px-4 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-200 text-sm placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50 focus:bg-white/[0.06] transition-all duration-200 font-mono"
            />
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity shrink-0"
              style={{ height: "2.75rem", padding: "0 1.25rem", minWidth: "max-content" }}
            >
              {loading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                />
              ) : (
                <Send className="w-4 h-4 shrink-0" />
              )}
              <span className="whitespace-nowrap">{loading ? "Tracing…" : "Send"}</span>
            </motion.button>
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="text-xs text-red-400 font-mono px-1"
              >
                ✗ {error}
              </motion.p>
            )}
          </AnimatePresence>
        </form>

        {/* Terminal Output */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.35 }}
              className="border-t border-white/[0.06]"
            >
              <div className="p-5 space-y-4 bg-black/40">

                {/* Reply */}
                <div className="font-mono text-sm space-y-2">
                  <div className="flex items-center gap-2 text-slate-600 text-xs mb-3">
                    <span className="text-green-500">●</span>
                    <span>trace output</span>
                  </div>
                  <p className="text-green-400 leading-relaxed">
                    <span className="text-slate-600 select-none">{">"} </span>
                    {result.reply}
                  </p>
                  <span className="inline-block w-2 h-4 bg-green-400 opacity-70 animate-pulse" />
                </div>

                {/* Detected Entities with Type badges */}
                {result.entities.length > 0 && (
                  <div className="pt-3 border-t border-white/[0.04]">
                    <p className="text-xs text-slate-600 font-mono mb-2">
                      detected entities — {result.entities.length} node{result.entities.length !== 1 ? "s" : ""} found
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {result.entities.map((e, i) => (
                        <motion.span
                          key={i}
                          initial={{ opacity: 0, scale: 0.85 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.04 }}
                          title={e.bbox && e.bbox.length === 4
                            ? `bbox: [${e.bbox.join(", ")}]`
                            : undefined}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono cursor-default ${typeColors[e.type] ?? defaultColor}`}
                        >
                          {/* Type badge */}
                          <span className="px-1 py-0.5 rounded text-[10px] font-bold bg-black/30 opacity-80 tracking-wide uppercase">
                            {e.type}
                          </span>
                          <span className="opacity-40">·</span>
                          <span>{e.label}</span>
                        </motion.span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Generated Code */}
                {result.generated_code && (
                  <div className="pt-3 border-t border-white/[0.04]">
                    <button
                      onClick={() => setShowCode((v) => !v)}
                      className="flex items-center gap-2 text-xs text-slate-500 font-mono hover:text-violet-400 transition-colors mb-2 group"
                    >
                      <Code2 className="w-3.5 h-3.5 group-hover:text-violet-400" />
                      <span>trace-to-code</span>
                      <span className="text-slate-700 ml-1">{showCode ? "▲ hide" : "▼ show"}</span>
                    </button>
                    <AnimatePresence>
                      {showCode && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden"
                        >
                          <pre className="rounded-xl bg-[#0d0d14] border border-white/[0.06] p-4 text-xs text-violet-200 font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap">
                            {result.generated_code}
                          </pre>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
