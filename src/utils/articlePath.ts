export function normalizeSlug(slug: string): string {
  // Normalize slug: lowercase and replace non-alphanumeric with hyphens
  return slug.toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function getPartitionedPath(slug: string): string {
  const s = normalizeSlug(slug);

  const c1 = s[0] || '_';
  const c2 = s[1] || '_';
  const c3 = s[2] || '_';

  return `/content/articles/${c1}/${c2}/${c3}/${s}.md`;
}

/**
 * Same partitioning scheme, but for a translated content tree under
 * /content/i18n/{lang}/articles/... . Translations use the SAME slug as
 * their English original (so /fr/blog/{slug} and /blog/{slug} refer to the
 * same article), just stored in a parallel directory.
 */
export function getLocalizedPartitionedPath(slug: string, lang: string): string {
  const s = normalizeSlug(slug);

  const c1 = s[0] || '_';
  const c2 = s[1] || '_';
  const c3 = s[2] || '_';

  return `/content/i18n/${lang}/articles/${c1}/${c2}/${c3}/${s}.md`;
}

export function getLocalizedIndexPath(lang: string): string {
  return `/content/i18n/${lang}/articles-index.json`;
}

export const SUPPORTED_LOCALES = ["fr", "es", "pt", "ar"] as const;
export type SupportedLocale = typeof SUPPORTED_LOCALES[number];

export function isSupportedLocale(lang: string | undefined): lang is SupportedLocale {
  return !!lang && (SUPPORTED_LOCALES as readonly string[]).includes(lang);
}

/**
 * Resolves an image path. Returns the trimmed source exactly as provided.
 */
export function resolveImagePath(src: string): string {
  if (!src) return src;
  return src.trim();
}
