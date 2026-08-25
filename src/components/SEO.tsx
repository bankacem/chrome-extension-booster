import { Helmet } from "react-helmet-async";
import { LOCALE_CODES, RTL_LANGUAGES } from "@/i18n";

type LangCode = "en" | "fr" | "es" | "pt" | "ar";

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonicalPath?: string;
  ogImage?: string;
  ogType?: "website" | "article";
  articlePublishedTime?: string;
  articleModifiedTime?: string;
  articleAuthor?: string;
  noindex?: boolean;
  lang?: LangCode;
  hreflangLanguages?: LangCode[];
}

const SITE_NAME = "ExtensionTo";
const SITE_URL = "https://extensionto.com";
const DEFAULT_IMAGE = "https://extensionto.com/og-image.png";

function buildHreflangPath(canonicalPath: string, lang: LangCode): string {
  if (lang === "en") return canonicalPath;
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
  articleModifiedTime,
  articleAuthor,
  noindex,
  lang = "en",
  hreflangLanguages = ["en"],
}: SEOProps) => {
  const isRtl = RTL_LANGUAGES.has(lang);
  const fullTitle = title
    ? `${title} | ${SITE_NAME}`
    : `${SITE_NAME} - Powerful Chrome Extensions for Productivity`;

  const safePath = canonicalPath
    ? canonicalPath.startsWith("/") ? canonicalPath : `/${canonicalPath}`
    : "";

  const canonicalUrl = `${SITE_URL}${lang === "en" ? safePath : buildHreflangPath(safePath, lang)}`;

  const allLangs: LangCode[] = ["en", "fr", "es", "pt", "ar"];
  const hreflangUrls: Record<LangCode, string> = {} as Record<LangCode, string>;
  for (const l of allLangs) {
    hreflangUrls[l] = `${SITE_URL}${l === "en" ? safePath : buildHreflangPath(safePath, l)}`;
  }

  const localeCode = LOCALE_CODES[lang] || "en_US";
  const alternateLocales = allLangs.filter((l) => l !== lang).map((l) => LOCALE_CODES[l]);

  return (
    <Helmet>
      <html lang={lang} dir={isRtl ? "rtl" : "ltr"} />
      <meta charSet="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>{fullTitle}</title>
      <meta name="robots" content={noindex ? "noindex,follow" : "index,follow,max-image-preview:large"} />
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      <link rel="canonical" href={canonicalUrl} />

      {/* hreflang */}
      {hreflangLanguages.map((alternateLang) => (
        <link key={alternateLang} rel="alternate" hrefLang={alternateLang} href={hreflangUrls[alternateLang]} />
      ))}
      {hreflangLanguages.includes("en") && (
        <link rel="alternate" hrefLang="x-default" href={hreflangUrls.en} />
      )}

      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content={ogType} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content={localeCode} />
      {alternateLocales.map((loc) => (
        <meta key={loc} property="og:locale:alternate" content={loc} />
      ))}

      {ogType === "article" && articlePublishedTime && (
        <meta property="article:published_time" content={articlePublishedTime} />
      )}
      {ogType === "article" && articleModifiedTime && (
        <meta property="article:modified_time" content={articleModifiedTime} />
      )}
      {ogType === "article" && articleAuthor && (
        <meta property="article:author" content={articleAuthor} />
      )}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
};

export default SEO;
