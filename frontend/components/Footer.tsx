"use client";

import { motion } from "framer-motion";
import { Github, Twitter, ArrowRight, Sparkles } from "lucide-react";

export default function Footer() {
    return (
        <footer className="relative px-6 pt-16 pb-10 border-t border-slate-800/60">
            {/* CTA banner */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="max-w-3xl mx-auto text-center mb-20"
            >
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-100 mb-4">
                    Ready to build{" "}
                    <span className="text-gradient">10x faster?</span>
                </h2>
                <p className="text-slate-400 text-lg mb-8">
                    Join thousands of developers who ship faster with Trace.
                </p>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.97 }}
                    className="btn-glow inline-flex items-center gap-3 px-10 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 text-white text-lg font-semibold cursor-pointer border border-purple-400/30"
                >
                    <Sparkles className="w-5 h-5 text-purple-200" />
                    Get started free
                    <ArrowRight className="w-5 h-5 text-purple-200" />
                </motion.button>
                <p className="text-slate-600 text-sm mt-4">No credit card required · Free tier available</p>
            </motion.div>

            {/* Footer row */}
            <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-600 text-sm">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                        <span className="text-white text-xs font-black">T</span>
                    </div>
                    <span className="font-medium text-slate-400">Trace</span>
                    <span>© 2026. All rights reserved.</span>
                </div>

                <div className="flex items-center gap-6">
                    <a href="#" className="hover:text-slate-300 transition-colors duration-200">Privacy</a>
                    <a href="#" className="hover:text-slate-300 transition-colors duration-200">Terms</a>
                    <a href="#" className="hover:text-slate-300 transition-colors duration-200">Docs</a>
                    <div className="flex items-center gap-3 ml-2">
                        <motion.a
                            href="#"
                            whileHover={{ scale: 1.1, color: "#f1f5f9" }}
                            className="text-slate-500 hover:text-slate-300 transition-colors"
                        >
                            <Github className="w-4 h-4" />
                        </motion.a>
                        <motion.a
                            href="#"
                            whileHover={{ scale: 1.1 }}
                            className="text-slate-500 hover:text-slate-300 transition-colors"
                        >
                            <Twitter className="w-4 h-4" />
                        </motion.a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
