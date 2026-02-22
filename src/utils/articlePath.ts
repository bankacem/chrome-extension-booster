export function getPartitionedPath(slug: string): string {
  // Normalize slug for pathing: lowercase and replace non-alphanumeric with hyphens
  const s = slug.toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const c1 = s[0] || '_';
  const c2 = s[1] || '_';
  const c3 = s[2] || '_';

  return `/content/articles/${c1}/${c2}/${c3}/${s}.md`;
}
