"use client";

import MeshBackground from "@/components/MeshBackground";
import HeroSection from "@/components/HeroSection";
import FeatureCards from "@/components/FeatureCards";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="relative min-h-screen bg-black overflow-hidden">
      {/* Animated mesh gradient background */}
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
