import Navigation from "@/components/navigation";
import HeroSection from "@/components/hero-section";
import FeaturesSection from "@/components/features-section";
import TestimonialSection from "@/components/testimonial-section";
import FAQSection from "@/components/faq-section";
import Footer from "@/components/footer";
import PricingSection from "@/components/pricing-section";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <HeroSection />
      <FeaturesSection />
      <PricingSection />
      <TestimonialSection />
      <FAQSection />
      <Footer />
    </div>
  );
}
