const gigMarkdownModules = import.meta.glob('../../gigs/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

export function getGigMarkdown(date: string): string | null {
  const entry = Object.entries(gigMarkdownModules).find(([path]) =>
    path.endsWith(`/${date}.md`),
  );
  return entry?.[1] ?? null;
}

export function hasGigMarkdown(date: string): boolean {
  return getGigMarkdown(date) !== null;
}
