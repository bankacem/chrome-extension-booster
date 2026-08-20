import type { ImgHTMLAttributes } from "react";

interface ResponsiveArticleImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "srcSet" | "width" | "height"> {
  src: string;
  width?: number;
  height?: number;
  fetchPriority?: "high" | "low" | "auto";
}

function replaceExtension(src: string, extension: string): string {
  return src.replace(/\.(png|jpe?g|webp|avif)(\?.*)?$/i, `${extension}$2`);
}

/**
 * Serves modern formats generated during the production build while keeping
 * the original source as a browser-safe fallback.
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
  const avifSrc = replaceExtension(src, ".avif");
  const webpSrc = replaceExtension(src, ".webp");

  return (
    <picture>
      <source type="image/avif" srcSet={avifSrc} />
      <source type="image/webp" srcSet={webpSrc} />
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
    </picture>
  );
}
