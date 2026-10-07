import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import StatsBar from "@/components/StatsBar";
import ExtensionsSection from "@/components/ExtensionsSection";
import FeaturesSection from "@/components/FeaturesSection";
import ComparisonSection from "@/components/ComparisonSection";
import FAQSection from "@/components/FAQSection";
import BlogSection from "@/components/BlogSection";
import ContactSection from "@/components/ContactSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { useLang } from "@/hooks/useLang";
import { useTranslation } from "react-i18next";

const HOME_TITLES = {
  en: "ExtensionTo - Powerful Chrome Extensions for Productivity",
  fr: "ExtensionTo - Extensions Chrome puissantes pour la productivité",
  es: "ExtensionTo - Extensiones de Chrome potentes para la productividad",
  pt: "ExtensionTo - Extensões poderosas do Chrome para produtividade",
  ar: "ExtensionTo - إضافات كروم قوية لتعزيز الإنتاجية",
} as const;

const Index = () => {
  const activeLang = useLang();
  const { t } = useTranslation();
  return (
    <main className="min-h-screen bg-background">
      <SEO
        title={HOME_TITLES[activeLang]}
        description={t("seo.default_description")}
        canonicalPath="/"
        lang={activeLang}
        hreflangLanguages={["en", "fr", "es", "pt", "ar"]}
      />
      <Navbar />
      <HeroSection />
      <StatsBar />
      <ExtensionsSection />
      <FeaturesSection />
      <ComparisonSection />
      <FAQSection />
      <BlogSection />
      <ContactSection />
      <CTASection />
      <Footer />
    </main>
  );
};

export default Index;
