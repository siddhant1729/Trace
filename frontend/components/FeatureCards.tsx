"use client";

import { motion } from "framer-motion";
import { Zap, GitBranch, Layers, Code2, Cpu, Globe } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Instant Code Generation",
    description: "From flowchart to fully-typed, production-ready code in under 3 seconds.",
    color: "from-yellow-500/20 to-orange-500/10",
    iconColor: "text-yellow-400",
    borderColor: "hover:border-yellow-500/30",
  },
  {
    icon: GitBranch,
    title: "Smart Architecture",
    description: "Trace understands context and generates code that follows your project's patterns.",
    color: "from-indigo-500/20 to-blue-500/10",
    iconColor: "text-indigo-400",
    borderColor: "hover:border-indigo-500/30",
  },
  {
    icon: Layers,
    title: "Any Diagram Format",
    description: "Supports Mermaid, draw.io, Figma exports, hand-drawn sketches, and more.",
    color: "from-purple-500/20 to-violet-500/10",
    iconColor: "text-purple-400",
    borderColor: "hover:border-purple-500/30",
  },
  {
    icon: Code2,
    title: "Multi-Language Output",
    description: "Python, TypeScript, Go, Rust — output in any language with idiomatic code.",
    color: "from-emerald-500/20 to-teal-500/10",
    iconColor: "text-emerald-400",
    borderColor: "hover:border-emerald-500/30",
  },
  {
    icon: Cpu,
    title: "AI-Powered Reasoning",
    description: "Backed by a frontier reasoning model that deeply understands system design.",
    color: "from-rose-500/20 to-pink-500/10",
    iconColor: "text-rose-400",
    borderColor: "hover:border-rose-500/30",
  },
  {
    icon: Globe,
    title: "Deploy Anywhere",
    description: "Output code ready for Vercel, AWS, GCP, or any custom infrastructure.",
    color: "from-cyan-500/20 to-sky-500/10",
    iconColor: "text-cyan-400",
    borderColor: "hover:border-cyan-500/30",
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.6,
      ease: [0.21, 0.47, 0.32, 0.98],
    },
  }),
};

export default function FeatureCards() {
  return (
    <section className="relative px-6 py-24 md:py-32">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-sm font-semibold uppercase tracking-widest text-purple-400 mb-4">
            Everything you need
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-100 leading-tight">
            Built for the way{" "}
            <span className="text-gradient">developers think</span>
          </h2>
          <p className="mt-4 text-slate-400 text-lg max-w-xl mx-auto">
            Trace bridges the gap between your mental model and working software.
          </p>
        </motion.div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                custom={i}
                variants={cardVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className={`relative group p-6 rounded-2xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-sm transition-all duration-300 ${feature.borderColor} cursor-default`}
              >
                {/* Inner gradient bg */}
                <div
                  className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
                />

                {/* Icon */}
                <div className="relative z-10 inline-flex items-center justify-center w-11 h-11 rounded-xl bg-slate-800/80 border border-slate-700/50 mb-4 group-hover:border-slate-600/50 transition-colors duration-200">
                  <Icon className={`w-5 h-5 ${feature.iconColor}`} />
                </div>

                <h3 className="relative z-10 text-slate-100 font-semibold text-lg mb-2">
                  {feature.title}
                </h3>
                <p className="relative z-10 text-slate-400 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-px bg-slate-800/50 rounded-2xl overflow-hidden border border-slate-800/50"
        >
          {[
            { value: "< 3s", label: "Avg. generation time" },
            { value: "12+", label: "Languages supported" },
            { value: "99.9%", label: "Uptime SLA" },
            { value: "2K+", label: "Active builders" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center justify-center py-8 px-4 bg-slate-900/60 hover:bg-slate-800/50 transition-colors duration-200"
            >
              <span className="text-3xl font-black text-gradient">{stat.value}</span>
              <span className="text-slate-500 text-sm mt-1 text-center">{stat.label}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
