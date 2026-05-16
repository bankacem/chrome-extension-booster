import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import PartnersSection from "@/components/PartnersSection";
import StatsBar from "@/components/StatsBar";
import ExtensionsSection from "@/components/ExtensionsSection";
import FeaturesSection from "@/components/FeaturesSection";
import ComparisonSection from "@/components/ComparisonSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import FAQSection from "@/components/FAQSection";
import BlogSection from "@/components/BlogSection";
import ContactSection from "@/components/ContactSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";

const Index = () => {
  return (
    <main className="min-h-screen bg-background">
      <SEO
        title="ExtensionTo - Powerful Chrome Extensions for Productivity"
        canonicalPath="/"
      />
      <Navbar />
      <HeroSection />
      <PartnersSection />
      <StatsBar />
      <ExtensionsSection />
      <FeaturesSection />
      <ComparisonSection />
      <TestimonialsSection />
      <FAQSection />
      <BlogSection />
      <ContactSection />
      <CTASection />
      <Footer />
    </main>
  );
};

export default Index;
