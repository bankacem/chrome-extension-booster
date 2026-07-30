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
  translations?: { lang: string; slug: string }[];
  lang?: string;
}

const SITE_NAME = "ExtensionTo";
// Use non-www version for URL consistency - matches Google indexed version
const SITE_URL = "https://extensionto.com";
const DEFAULT_IMAGE = "https://extensionto.com/og-image.png";

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
  translations = [],
  lang = "en",
}: SEOProps) => {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} - Powerful Chrome Extensions for Productivity`;

  // Ensure canonicalPath starts with / if it's not empty and doesn't already have one
  const safePath = canonicalPath
    ? (canonicalPath.startsWith("/") ? canonicalPath : `/${canonicalPath}`)
    : "";
  const canonicalUrl = `${SITE_URL}${safePath}`;

  // Find the English slug to use as the x-default
  const englishTranslation = translations.find(t => t.lang === 'en');
  const defaultSlug = englishTranslation ? englishTranslation.slug : (lang === 'en' ? canonicalPath.split('/').pop() : '');

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

      {/* Multilingual Alternate hreflang links */}
      {translations.map((trans) => {
        const prefix = trans.lang === 'en' ? '' : `/${trans.lang}`;
        const href = `${SITE_URL}${prefix}/blog/${trans.slug}`;
        return (
          <link
            key={trans.lang}
            rel="alternate"
            hrefLang={trans.lang}
            href={href}
          />
        );
      })}

      {/* Self-referential hreflang for the current language */}
      {translations.length > 0 && (
        <link
          rel="alternate"
          hrefLang={lang}
          href={canonicalUrl}
        />
      )}

      {/* x-default alternate link for search engines */}
      {defaultSlug && (
        <link
          rel="alternate"
          hrefLang="x-default"
          href={`${SITE_URL}/blog/${defaultSlug}`}
        />
      )}

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content={ogType} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content={SITE_NAME} />

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
