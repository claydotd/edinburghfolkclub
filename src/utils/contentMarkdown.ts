const pageMarkdownModules = import.meta.glob('../../content/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

export function getContentMarkdown(relativePath: string): string | null {
  const normalised = relativePath.replace(/^\//, '');
  const entry = Object.entries(pageMarkdownModules).find(([path]) =>
    path.endsWith(`/content/${normalised}`),
  );
  return entry?.[1] ?? null;
}
