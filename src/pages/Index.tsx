import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import StatsBar from "@/components/StatsBar";
import ExtensionsSection from "@/components/ExtensionsSection";
import FeaturesSection from "@/components/FeaturesSection";
import FAQSection from "@/components/FAQSection";
import BlogSection from "@/components/BlogSection";
import ContactSection from "@/components/ContactSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import SchemaMarkup from "@/components/SchemaMarkup";
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

  const organizationData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "ExtensionTo",
    url: "https://extensionto.com",
    logo: "https://extensionto.com/og-image.png",
    description:
      "ExtensionTo is a Chrome extensions review and recommendation hub with practical guides for productivity, security, and faster browsing.",
  };

  return (
    <main className="min-h-screen bg-background">
      <SEO
        title={HOME_TITLES[activeLang]}
        description={t("seo.default_description")}
        canonicalPath="/"
        lang={activeLang}
        hreflangLanguages={["en", "fr", "es", "pt", "ar"]}
      />
      <SchemaMarkup data={organizationData} />
      <Navbar />
      <HeroSection />
      <StatsBar />
      <ExtensionsSection />
      <FeaturesSection />
      <FAQSection />
      <BlogSection />
      <ContactSection />
      <CTASection />
      <Footer />
    </main>
  );
};

export default Index;
