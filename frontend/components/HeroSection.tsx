"use client";

import { useRef, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, type Variants } from "framer-motion";
import { Sparkles, Zap } from "lucide-react";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.14, delayChildren: 0.15 } as never,
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: "easeOut" } as never,
  },
};

// ── 3D Tilt + Cursor Sheen Heading ─────────────────────────────────────────
function TraceTiltHeading() {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 });
  const [sheen, setSheen] = useState({ x: 50, y: 50, opacity: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const dx = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    const dy = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
    setTilt({ rotateX: -dy * 15, rotateY: dx * 15 });
    setSheen({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
      opacity: 1,
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setTilt({ rotateX: 0, rotateY: 0 });
    setSheen((s) => ({ ...s, opacity: 0 }));
  }, []);

  return (
    <div
      style={{ perspective: "800px", display: "inline-block" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={() => setIsHovered(true)}
    >
      <div
        ref={ref}
        style={{
          display: "inline-block",
          position: "relative",
          transform: `rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg)`,
          transition: isHovered
            ? "transform 0.08s linear"
            : "transform 0.6s cubic-bezier(0.23, 1, 0.32, 1)",
          willChange: "transform",
        }}
      >
        <span
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "0.25rem",
            pointerEvents: "none",
            opacity: sheen.opacity,
            transition: "opacity 0.3s ease",
            background: `radial-gradient(circle at ${sheen.x}% ${sheen.y}%, rgba(167,139,250,0.55) 0%, rgba(167,139,250,0.18) 40%, transparent 70%)`,
            mixBlendMode: "screen",
            zIndex: 2,
          }}
        />
        <span
          style={{
            fontSize: "clamp(4.5rem, 13vw, 7rem)",
            letterSpacing: "-3px",
            fontWeight: 800,
            lineHeight: 1.0,
            color: "var(--text)",
            display: "inline-block",
            position: "relative",
            zIndex: 1,
          }}
        >
          Trace
        </span>
      </div>
    </div>
  );
}

export default function HeroSection() {
  const router = useRouter();

  return (
    <section
      className="relative flex flex-col items-center justify-center px-6 text-center"
      style={{ paddingTop: "140px", paddingBottom: "140px", minHeight: "100vh" }}
    >
      <div className="hero-glow" style={{ top: "40%", width: "900px", height: "600px" }} />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 max-w-4xl mx-auto flex flex-col items-center"
      >
        {/* Badge */}
        <motion.div
          variants={itemVariants}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium backdrop-blur-sm mb-10"
          style={{
            border: "1px solid var(--accent-mid)",
            background: "var(--accent-light)",
            color: "var(--accent)",
          }}
        >
          <Sparkles className="w-3.5 h-3.5" />
          AI-Powered Diagram Intelligence
          <Zap className="w-3.5 h-3.5 text-yellow-500" />
        </motion.div>

        {/* 3D Tilt Heading */}
        <motion.div variants={itemVariants} className="mb-6">
          <TraceTiltHeading />
        </motion.div>

        {/* Headline */}
        <motion.h1
          variants={itemVariants}
          className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight leading-snug"
          style={{ color: "var(--text)", marginBottom: "2rem" }}
        >
          Turn <span className="text-gradient">Diagrams</span> into Reality
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          variants={itemVariants}
          className="max-w-xl mx-auto"
          style={{
            fontSize: "1.2rem",
            lineHeight: 1.9,
            opacity: 0.6,
            color: "var(--text)",
            marginBottom: "3.5rem",
          }}
        >
          Sketch your vision. Trace generates{" "}
          <strong style={{ opacity: 1, fontWeight: 600 }}>production-ready code</strong>{" "}
          from your diagrams in seconds — no boilerplate, no barriers.
        </motion.p>

        {/* CTA Button → navigates to /chat */}
        <motion.div variants={itemVariants} className="flex items-center justify-center">
          <motion.button
            id="cta-primary"
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push("/chat")}
            className="group relative inline-flex items-center justify-center gap-2.5 text-white text-sm font-semibold cursor-pointer border border-purple-400/20"
            style={{
              borderRadius: "9999px",
              height: "3.25rem",
              padding: "0 2.75rem",
              minWidth: "max-content",
              background: "var(--accent)",
              boxShadow: "0 4px 20px rgba(124, 58, 237, 0.35)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow =
                "0 8px 32px rgba(124, 58, 237, 0.55), 0 0 0 1px rgba(124,58,237,0.3)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow =
                "0 4px 20px rgba(124, 58, 237, 0.35)";
            }}
          >
            <Sparkles className="w-4 h-4 shrink-0 opacity-80" />
            <span className="whitespace-nowrap tracking-wide">Chat with Trace</span>
          </motion.button>
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8, duration: 0.8 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        style={{ color: "var(--text-subtle)" }}
      >
        <span className="text-[10px] uppercase tracking-widest">Scroll</span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="w-0.5 h-8 rounded-full"
          style={{ background: "linear-gradient(to bottom, var(--text-subtle), transparent)" }}
        />
      </motion.div>
    </section>
  );
}
