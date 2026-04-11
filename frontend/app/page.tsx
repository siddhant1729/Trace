"use client";

import MeshBackground from "@/components/MeshBackground";
import HeroSection from "@/components/HeroSection";
import FeatureCards from "@/components/FeatureCards";
import Footer from "@/components/Footer";
import ThemeToggle from "@/components/ThemeToggle";

export default function Home() {
  return (
    <main
      className="relative min-h-screen overflow-hidden"
      style={{ background: "var(--bg)" }}
    >
      {/* Theme toggle — fixed top-right */}
      <ThemeToggle />

      {/* Animated mesh gradient background (dark mode only — transparent in light) */}
      <MeshBackground />

      {/* Main content */}
      <div className="relative z-10">
        <HeroSection />
        <FeatureCards />
        <Footer />
      </div>
    </main>
  );
}
