import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";

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
}

const SITE_NAME = "ExtensionTo";
// Use non-www version for URL consistency - matches Google indexed version
const SITE_URL = "https://extensionto.com";
const DEFAULT_IMAGE = "https://extensionto.com/og-image.png";

const SEO = ({
  title,
  description = "Discover powerful Chrome extensions built to boost your productivity, enhance security, and transform how you browse the web. Trusted by 50,000+ users.",
  keywords,
  canonicalPath,
  ogImage = DEFAULT_IMAGE,
  ogType = "website",
  articlePublishedTime,
  articleAuthor,
  noindex,
}: SEOProps) => {
  const location = useLocation();
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} - Powerful Chrome Extensions for Productivity`;

  // Determine the final path for the canonical URL
  // If canonicalPath is provided, use it. Otherwise, use the current location.pathname.
  const activePath = canonicalPath !== undefined ? canonicalPath : location.pathname;

  // Ensure path starts with / if it's not empty and doesn't already have one
  const safePath = activePath
    ? (activePath.startsWith("/") ? activePath : `/${activePath}`)
    : "";

  // Always use the non-www SITE_URL
  const canonicalUrl = `${SITE_URL}${safePath}`;

  return (
    <Helmet>
      <meta charSet="UTF-8" />
      <title>{fullTitle}</title>
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      <link rel="canonical" href={canonicalUrl} />

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
