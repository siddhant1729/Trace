"use client";

import { motion } from "framer-motion";
import { Zap, GitBranch, Layers, Code2, Cpu, Globe } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Instant Code Generation",
    description: "Flowchart to production-ready code in under 3 seconds.",
    accentClass: "text-yellow-500",
  },
  {
    icon: GitBranch,
    title: "Smart Architecture",
    description: "Generates code that matches your project's existing patterns.",
    accentClass: "text-indigo-500",
  },
  {
    icon: Layers,
    title: "Any Diagram Format",
    description: "Mermaid, draw.io, Figma exports, or hand-drawn sketches.",
    accentClass: "text-purple-500",
  },
  {
    icon: Code2,
    title: "Multi-Language Output",
    description: "Python, TypeScript, Go, Rust — idiomatic code, your language.",
    accentClass: "text-emerald-500",
  },
  {
    icon: Cpu,
    title: "AI-Powered Reasoning",
    description: "A frontier model that truly understands system design.",
    accentClass: "text-rose-500",
  },
  {
    icon: Globe,
    title: "Deploy Anywhere",
    description: "Ready for Vercel, AWS, GCP, or any custom infrastructure.",
    accentClass: "text-cyan-500",
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
      ease: [0.21, 0.47, 0.32, 0.98] as [number, number, number, number],
    },
  }),
};

export default function FeatureCards() {
  return (
    <section style={{ padding: "8rem 1.5rem", background: "var(--bg-section)" }}>
      <div style={{ maxWidth: "80rem", marginLeft: "auto", marginRight: "auto" }}>
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          style={{ textAlign: "center", marginBottom: "6rem" }}
        >
          <p style={{ fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent)", marginBottom: "1.25rem" }}>
            Everything you need
          </p>
          <h2 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 700, color: "var(--text)", lineHeight: 1.2, textAlign: "center" }}>
            Built for the way{" "}
            <span className="text-gradient">developers think</span>
          </h2>
          <p style={{
            maxWidth: "38rem",
            margin: "1.5rem auto 0",
            textAlign: "center",
            fontSize: "1.1rem",
            lineHeight: 1.8,
            opacity: 0.6,
            color: "var(--text)",
          }}>
            Trace bridges the gap between your mental model and working software.
          </p>
        </motion.div>

        {/* Card grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
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
                style={{
                  position: "relative",
                  padding: "2.5rem",
                  borderRadius: "20px",
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  boxShadow: "var(--card-shadow)",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  cursor: "default",
                  transition: "box-shadow 0.3s, border-color 0.3s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = "var(--accent-mid)";
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 32px rgba(124,58,237,0.12)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)";
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--card-shadow)";
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: "1.5rem" }}>
                  {/* Icon */}
                  <div style={{
                    flexShrink: 0,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "2.75rem",
                    height: "2.75rem",
                    borderRadius: "12px",
                    border: "1px solid var(--border)",
                    background: "var(--surface-raised)",
                  }}>
                    <Icon className={`w-5 h-5 ${feature.accentClass}`} />
                  </div>

                  {/* Text */}
                  <div>
                    <h3 style={{ fontWeight: 600, fontSize: "1.05rem", marginBottom: "0.625rem", color: "var(--text)" }}>
                      {feature.title}
                    </h3>
                    <p style={{ fontSize: "0.9rem", lineHeight: 1.7, opacity: 0.65, color: "var(--text)" }}>
                      {feature.description}
                    </p>
                  </div>
                </div>
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
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "1px",
            marginTop: "6rem",
            maxWidth: "52rem",
            marginLeft: "auto",
            marginRight: "auto",
            borderRadius: "20px",
            overflow: "hidden",
            border: "1px solid var(--border)",
            background: "var(--border)",
          }}
        >
          {[
            { value: "< 3s",  label: "Avg. generation time" },
            { value: "12+",   label: "Languages supported" },
            { value: "99.9%", label: "Uptime SLA" },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "2.5rem 1rem",
                background: "var(--surface)",
              }}
            >
              <span className="text-gradient" style={{ fontSize: "2rem", fontWeight: 900 }}>
                {stat.value}
              </span>
              <span style={{ fontSize: "0.8rem", marginTop: "0.5rem", textAlign: "center", color: "var(--text-muted)", opacity: 0.7 }}>
                {stat.label}
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
