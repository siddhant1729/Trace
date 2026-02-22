"use client";

import { motion, type Variants } from "framer-motion";
import { ArrowRight, Sparkles, Zap } from "lucide-react";

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

        {/* Headline — 24px (mb-6) below badge */}
        <motion.h1
          variants={itemVariants}
          className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[1.05] mb-6"
        >
          <span className="text-white">Trace: Turn</span>
          <br />
          <span className="text-gradient">Diagrams</span>
          <br />
          <span className="text-white">into Reality</span>
        </motion.h1>

        {/* Subheadline — 24px (mb-6) below headline */}
        <motion.p
          variants={itemVariants}
          className="text-slate-400 text-lg sm:text-xl max-w-xl mx-auto leading-relaxed mb-10"
        >
          Sketch your vision. Trace generates{" "}
          <span className="text-slate-200 font-medium">production-ready code</span>{" "}
          from your diagrams in seconds — no boilerplate, no barriers.
        </motion.p>

        {/* CTA Buttons — 40px (mb-10) below subheadline */}
        <motion.div
          variants={itemVariants}
          className="flex flex-row items-stretch justify-center gap-4 w-full max-w-sm"
        >
          {/* Primary — breathing glow */}
          <motion.button
            id="cta-primary"
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.97 }}
            className="btn-glow group relative flex-1 flex items-center justify-center gap-2.5 h-14 px-7 rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 text-white text-base font-semibold cursor-pointer border border-purple-400/25 transition-all duration-300"
          >
            <span className="absolute inset-0 rounded-2xl bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <Sparkles className="w-4 h-4 text-purple-200 relative z-10 shrink-0" />
            <span className="relative z-10 whitespace-nowrap">Chat with Trace</span>
          </motion.button>

          {/* Secondary — glassmorphism */}
          <motion.button
            id="cta-secondary"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="flex-1 flex items-center justify-center gap-2 h-14 px-7 rounded-2xl border border-white/[0.12] bg-white/[0.05] backdrop-blur-md text-slate-300 text-base font-medium hover:border-white/25 hover:bg-white/[0.09] hover:text-white transition-all duration-200 cursor-pointer whitespace-nowrap"
          >
            See it in action
            <ArrowRight className="w-4 h-4 opacity-60 shrink-0" />
          </motion.button>
        </motion.div>

        {/* Social proof — separated trust layer */}
        <motion.div
          variants={itemVariants}
          className="mt-16 pt-6 border-t border-white/[0.06] w-full max-w-sm flex flex-col sm:flex-row items-center justify-center gap-4 text-slate-500 text-sm"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex -space-x-2">
              {(["bg-indigo-400", "bg-purple-400", "bg-violet-400", "bg-blue-400", "bg-fuchsia-400"] as const).map((c, i) => (
                <div
                  key={i}
                  className={`w-7 h-7 rounded-full ${c} border-2 border-black flex items-center justify-center text-[10px] font-bold text-white`}
                >
                  {["A", "B", "C", "D", "E"][i]}
                </div>
              ))}
            </div>
            <span>2,000+ builders</span>
          </div>
          <div className="hidden sm:block w-px h-4 bg-white/10" />
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <svg key={s} className="w-3.5 h-3.5 fill-yellow-400" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
            <span className="ml-1 text-slate-500">4.9/5</span>
          </div>
        </motion.div>
      </motion.div>

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
