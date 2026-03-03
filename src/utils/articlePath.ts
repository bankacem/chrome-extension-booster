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
 * Resolves an image path to the local optimized storage.
 * Handles legacy WordPress paths and ensures absolute root references.
 */
export function resolveImagePath(src: string): string {
  if (!src) return src;

  const trimmedSrc = src.trim();
  if (trimmedSrc.startsWith('data:') || trimmedSrc.startsWith('blob:')) return trimmedSrc;

  // Immediately return for external URLs or protocol-relative URLs
  if (trimmedSrc.startsWith('http://') || trimmedSrc.startsWith('https://') || trimmedSrc.startsWith('//')) {
    return trimmedSrc;
  }

  let resolved = trimmedSrc;

  // Handle absolute URLs to same domain
  if (resolved.startsWith('https://extensionto.com/')) {
    resolved = resolved.replace('https://extensionto.com', '');
  }

  // Double check it's not external after domain stripping
  if (resolved.startsWith('http')) return resolved;

  // Handle legacy WordPress upload paths
  if (resolved.includes('wp-content/uploads/')) {
    const parts = resolved.split('/');
    const filename = parts[parts.length - 1];
    resolved = `/images/blog/${filename}`;
  }

  // Ensure it starts with /images/blog/ if it's a blog image but missing the prefix
  if (!resolved.startsWith('/') && !resolved.startsWith('images/')) {
    resolved = `/images/blog/${resolved}`;
  }

  // Force absolute root
  if (resolved.startsWith('images/')) {
    resolved = `/${resolved}`;
  }

  // Final safeguard: if it starts with images/ it must be /images/
  if (resolved.startsWith('images/')) {
    resolved = '/' + resolved;
  }

  return resolved;
}
