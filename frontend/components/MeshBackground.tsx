"use client";

import { motion } from "framer-motion";

export default function MeshBackground() {
    return (
        <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
            {/* Pure black base */}
            <div className="absolute inset-0 bg-black" />

            {/* Orb 1 – very faint purple, top left */}
            <motion.div
                className="absolute -top-60 -left-60 w-[700px] h-[700px] rounded-full"
                style={{
                    background: "radial-gradient(circle, rgba(88,28,135,0.18) 0%, transparent 65%)",
                    filter: "blur(100px)",
                }}
                animate={{ x: [0, 30, -15, 0], y: [0, 20, -10, 0], scale: [1, 1.08, 0.96, 1] }}
                transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Orb 2 – very faint blue, top right */}
            <motion.div
                className="absolute -top-40 -right-60 w-[600px] h-[600px] rounded-full"
                style={{
                    background: "radial-gradient(circle, rgba(37,99,235,0.12) 0%, transparent 65%)",
                    filter: "blur(110px)",
                }}
                animate={{ x: [0, -25, 15, 0], y: [0, 30, -20, 0], scale: [1, 0.94, 1.06, 1] }}
                transition={{ duration: 24, repeat: Infinity, ease: "easeInOut", delay: 3 }}
            />

            {/* Orb 3 – barely visible violet, bottom right */}
            <motion.div
                className="absolute -bottom-60 -right-40 w-[500px] h-[500px] rounded-full"
                style={{
                    background: "radial-gradient(circle, rgba(124,58,237,0.1) 0%, transparent 65%)",
                    filter: "blur(90px)",
                }}
                animate={{ x: [0, -20, 10, 0], y: [0, -25, 15, 0], scale: [1, 1.1, 0.92, 1] }}
                transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 6 }}
            />

            {/* Subtle grid overlay */}
            <div
                className="absolute inset-0 opacity-[0.025]"
                style={{
                    backgroundImage: `linear-gradient(rgba(148,163,184,1) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,1) 1px, transparent 1px)`,
                    backgroundSize: "64px 64px",
                }}
            />
        </div>
    );
}
