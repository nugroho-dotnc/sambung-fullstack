import HeroSection from "./_sections/hero";
import AboutSection from "./_sections/about";
import FeatureSection from "./_sections/feature";
import WorkspaceCtaSection from "./_sections/workspace-cta";

export default function HomePage() {
  return (
    <div className="w-full space-y-4 sm:space-y-6 mb-8">
      <HeroSection />

      <AboutSection />

      <FeatureSection />

      <WorkspaceCtaSection />
    </div>
  );
}
