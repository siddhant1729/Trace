"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  // Sync initial state from what the inline script set on <html>
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("trace-theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("trace-theme", "light");
    }
  };

  return (
    <motion.button
      onClick={toggle}
      aria-label="Toggle theme"
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.94 }}
      style={{
        position: "fixed",
        top: "1.25rem",
        right: "1.5rem",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.45rem 1rem",
        borderRadius: "9999px",
        border: "1px solid var(--border)",
        background: "var(--surface)",
        color: "var(--text)",
        boxShadow: "var(--card-shadow)",
        cursor: "pointer",
        fontSize: "0.75rem",
        fontFamily: "var(--font-inter)",
        fontWeight: 500,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        userSelect: "none",
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
          <motion.span
            key="sun"
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0,   opacity: 1 }}
            exit={{   rotate:  90, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            style={{ display: "flex" }}
          >
            <Sun className="w-3.5 h-3.5 text-amber-400" />
          </motion.span>
        ) : (
          <motion.span
            key="moon"
            initial={{ rotate: 90,  opacity: 0 }}
            animate={{ rotate: 0,   opacity: 1 }}
            exit={{   rotate: -90, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            style={{ display: "flex" }}
          >
            <Moon className="w-3.5 h-3.5 text-indigo-500" />
          </motion.span>
        )}
      </AnimatePresence>
      <span style={{ color: "var(--text-muted)" }}>
        {isDark ? "Light" : "Dark"}
      </span>
    </motion.button>
  );
}
