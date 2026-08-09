import { Helmet } from "react-helmet-async";

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonicalPath?: string;
  ogImage?: string;
  ogType?: "website" | "article";
  articlePublishedTime?: string;
  articleAuthor?: string;
  noindex?: boolean;
  /** Pass the current page lang ('en' | 'fr' | 'es'). Defaults to 'en'. */
  lang?: "en" | "fr" | "es";
}

const SITE_NAME = "ExtensionTo";
const SITE_URL = "https://extensionto.com";
const DEFAULT_IMAGE = "https://extensionto.com/og-image.png";

/** Maps a canonical EN path to its equivalent per-language path prefix. */
function buildHreflangPath(canonicalPath: string, lang: "en" | "fr" | "es"): string {
  if (lang === "en") return canonicalPath;
  // e.g. /blog/some-slug  →  /fr/blog/some-slug
  return `/${lang}${canonicalPath.startsWith("/") ? canonicalPath : `/${canonicalPath}`}`;
}

const SEO = ({
  title,
  description = "Discover powerful Chrome extensions built to boost your productivity, enhance security, and transform how you browse the web. Trusted by 50,000+ users.",
  keywords,
  canonicalPath = "",
  ogImage = DEFAULT_IMAGE,
  ogType = "website",
  articlePublishedTime,
  articleAuthor,
  noindex,
  lang = "en",
}: SEOProps) => {
  const fullTitle = title
    ? `${title} | ${SITE_NAME}`
    : `${SITE_NAME} - Powerful Chrome Extensions for Productivity`;

  const safePath = canonicalPath
    ? canonicalPath.startsWith("/") ? canonicalPath : `/${canonicalPath}`
    : "";

  // The canonical URL always points to the language-prefixed version of this page.
  const canonicalUrl = `${SITE_URL}${lang === "en" ? safePath : buildHreflangPath(safePath, lang)}`;

  // hreflang alternate URLs (x-default = English)
  const hreflangUrls = {
    en: `${SITE_URL}${safePath}`,
    fr: `${SITE_URL}${buildHreflangPath(safePath, "fr")}`,
    es: `${SITE_URL}${buildHreflangPath(safePath, "es")}`,
  };

  return (
    <Helmet>
      <html lang={lang} />
      <meta charSet="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>{fullTitle}</title>
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      <link rel="canonical" href={canonicalUrl} />

      {/* hreflang — tells Google which language version to show per user */}
      <link rel="alternate" hrefLang="en" href={hreflangUrls.en} />
      <link rel="alternate" hrefLang="fr" href={hreflangUrls.fr} />
      <link rel="alternate" hrefLang="es" href={hreflangUrls.es} />
      <link rel="alternate" hrefLang="x-default" href={hreflangUrls.en} />

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content={ogType} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content={lang === "fr" ? "fr_FR" : lang === "es" ? "es_ES" : "en_US"} />

      {/* Article-specific meta */}
      {ogType === "article" && articlePublishedTime && (
        <meta property="article:published_time" content={articlePublishedTime} />
      )}
      {ogType === "article" && articleAuthor && (
        <meta property="article:author" content={articleAuthor} />
      )}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
};

export default SEO;
