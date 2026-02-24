"use client";

import { motion } from "framer-motion";
import { Github, Twitter } from "lucide-react";

export default function Footer() {
    return (
        <footer className="relative px-6 pt-16 pb-10 border-t border-slate-800/60">
            {/* CTA banner */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                style={{ maxWidth: "48rem", margin: "0 auto 5rem", textAlign: "center" }}
            >
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-100 mb-4"
                    style={{ textAlign: "center" }}
                >
                    Ready to build{" "}
                    <span className="text-gradient">10x faster?</span>
                </h2>
                <p className="text-slate-400 text-lg" style={{ textAlign: "center" }}>
                    Join thousands of developers who ship faster with Trace.
                </p>
            </motion.div>

            {/* Footer row */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
                <motion.a
                    href="#"
                    whileHover={{ scale: 1.1 }}
                    className="text-slate-500 hover:text-slate-300 transition-colors"
                >
                    <Github className="w-5 h-5" />
                </motion.a>
                <motion.a
                    href="#"
                    whileHover={{ scale: 1.1 }}
                    className="text-slate-500 hover:text-slate-300 transition-colors"
                >
                    <Twitter className="w-5 h-5" />
                </motion.a>
            </div>
        </footer>
    );
}
