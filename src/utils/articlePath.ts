export function getPartitionedPath(slug: string): string {
  const c1 = slug[0]?.toLowerCase() || '_';
  const c2 = slug[1]?.toLowerCase() || '_';
  const c3 = slug[2]?.toLowerCase() || '_';
  return `/content/articles/${c1}/${c2}/${c3}/${slug}.md`;
}
