"use client";

import { useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Sparkles, Zap } from "lucide-react";
import TraceChat from "./TraceChat";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.14, delayChildren: 0.15 } as never,
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: "easeOut" } as never,
  },
};

export default function HeroSection() {
  const [chatOpen, setChatOpen] = useState(false);
  return (
    <section className="relative flex flex-col items-center justify-center min-h-screen px-6 text-center">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-4xl mx-auto flex flex-col items-center"
      >
        {/* Badge */}
        <motion.div
          variants={itemVariants}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-sm font-medium backdrop-blur-sm mb-6"
        >
          <Sparkles className="w-3.5 h-3.5" />
          AI-Powered Diagram Intelligence
          <Zap className="w-3.5 h-3.5 text-yellow-400" />
        </motion.div>

        {/* Brand name */}
        <motion.div
          variants={itemVariants}
          className="mb-3"
        >
          <span
            className="text-7xl sm:text-8xl md:text-9xl font-black tracking-tight text-white"
            style={{ fontFamily: "var(--font-geist)", letterSpacing: "-0.05em" }}
          >
            Trace
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          variants={itemVariants}
          className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight leading-snug mb-16 text-slate-300"
        >
          Turn{" "}
          <span className="text-gradient">Diagrams</span>{" "}
          into Reality
        </motion.h1>

        {/* Subheadline — 24px (mb-6) below headline */}
        <motion.p
          variants={itemVariants}
          className="text-slate-400 text-lg sm:text-xl max-w-xl mx-auto leading-relaxed"
          style={{ marginBottom: "7rem" }}
        >
          Sketch your vision. Trace generates{" "}
          <span className="text-slate-200 font-medium">production-ready code</span>{" "}
          from your diagrams in seconds — no boilerplate, no barriers.
        </motion.p>

        {/* CTA Button */}
        <motion.div
          variants={itemVariants}
          className="flex items-center justify-center"
        >
          <motion.button
            id="cta-primary"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setChatOpen((o) => !o)}
            className="btn-glow group relative inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 text-white text-sm font-semibold cursor-pointer border border-purple-400/20 transition-all duration-300"
            style={{ height: "3rem", padding: "0 2.5rem", minWidth: "max-content" }}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-200 shrink-0" />
            <span className="whitespace-nowrap">
              {chatOpen ? "Close Chat" : "Chat with Trace"}
            </span>
          </motion.button>
        </motion.div>


      </motion.div>

      {/* TraceChat panel — slides in below CTAs */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            key="trace-chat"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="relative z-10 w-full max-w-6xl px-6 pb-16"
          >
            <TraceChat />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.8 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-slate-700"
      >
        <span className="text-[10px] uppercase tracking-widest">Scroll</span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="w-0.5 h-8 bg-gradient-to-b from-slate-700 to-transparent rounded-full"
        />
      </motion.div>
    </section>
  );
}
