import type { ImgHTMLAttributes } from "react";

interface ResponsiveArticleImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "srcSet" | "width" | "height"> {
  src: string;
  width?: number;
  height?: number;
  fetchPriority?: "high" | "low" | "auto";
}

/**
 * Article imagery is committed and served as optimized WebP directly from
 * /content/images (plus a small number of PNG/JPG originals), and every
 * referenced src is verified to exist in production. We therefore render
 * src as-is instead of advertising AVIF/WebP format variants through
 * <picture> sources: whenever a variant was missing on disk (e.g. there
 * is no featured.avif for most articles, no og-image.webp), browsers that
 * selected the missing source did not fall back and rendered a permanently
 * broken image — the hero and blog-card breakage reported in Sep 2026.
 */
export default function ResponsiveArticleImage({
  src,
  alt,
  width = 1200,
  height = 675,
  loading = "lazy",
  decoding = "async",
  fetchPriority = "auto",
  ...props
}: ResponsiveArticleImageProps) {
  return (
    <img
      {...props}
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading={loading}
      decoding={decoding}
      fetchPriority={fetchPriority}
    />
  );
}
