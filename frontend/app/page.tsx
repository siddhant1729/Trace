import StarField from '@/components/StarField';
import CosmicNav from '@/components/CosmicNav';
import HeroSection from '@/components/HeroSection';
import BentoPreview from '@/components/BentoPreview';
import FeaturesSection from '@/components/FeaturesSection';
import CtaSection from '@/components/CtaSection';
import CosmicFooter from '@/components/CosmicFooter';
import CursorGlow from '@/components/CursorGlow';

export default function Home() {
  return (
    <>
      {/* Fixed starfield — Base Layer */}
      <StarField />

      {/* Global cursor glow — follows mouse */}
      <CursorGlow />

      {/* Navigation — Fixed top */}
      <CosmicNav />

      {/* Main content — stacked above starfield */}
      <main className="relative">
        <HeroSection />
        <BentoPreview />
        <FeaturesSection />
        <CtaSection />
      </main>

      <CosmicFooter />
    </>
  );
}
