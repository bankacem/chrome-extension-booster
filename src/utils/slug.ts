// Slug utilities — strict lowercase kebab-case, SEO-friendly.

/** Strip the legacy `-mmXXXXXXXX` suffix added by older batch runs. */
export function stripLegacySuffix(slug: string): string {
  return slug.replace(/-mm[a-z0-9]{6,12}$/i, "");
}

/** Build a clean, SEO-friendly slug from any title/keyword. */
export function cleanSlug(input: string, maxLen = 80): string {
  return stripLegacySuffix(
    input
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
  ).slice(0, maxLen).replace(/-+$/g, "");
}

/** Append a tiny disambiguator only when caller signals a real collision. */
export function withCollisionSuffix(slug: string): string {
  const tag = Math.random().toString(36).slice(2, 6);
  return `${slug}-${tag}`;
}
