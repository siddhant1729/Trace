"use client";

import { motion } from "framer-motion";
import { Github, Twitter } from "lucide-react";

export default function Footer() {
  return (
    <footer
      style={{
        position: "relative",
        padding: "6rem 1.5rem 3.5rem",
        borderTop: "1px solid var(--border)",
        background: "var(--bg-section)",
      }}
    >
      {/* CTA banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        style={{ maxWidth: "48rem", margin: "0 auto 5rem", textAlign: "center" }}
      >
        <h2
          style={{
            fontSize: "clamp(2rem, 5vw, 3rem)",
            fontWeight: 700,
            color: "var(--text)",
            marginBottom: "1.25rem",
            textAlign: "center",
          }}
        >
          Ready to build{" "}
          <span className="text-gradient">10x faster?</span>
        </h2>

      </motion.div>

      {/* Footer row */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
        <motion.a
          href="#"
          whileHover={{ scale: 1.1 }}
          style={{ color: "var(--text-subtle)", transition: "color 0.2s" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-subtle)")}
        >
          <Github className="w-5 h-5" />
        </motion.a>
        <motion.a
          href="#"
          whileHover={{ scale: 1.1 }}
          style={{ color: "var(--text-subtle)", transition: "color 0.2s" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-subtle)")}
        >
          <Twitter className="w-5 h-5" />
        </motion.a>
      </div>
    </footer>
  );
}
