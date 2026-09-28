/** Resolve a public/ path against Vite's `base` (e.g. `/` or `/edinburghfolkclub/`). */
export function publicUrl(path: string): string {
  if (!path || /^([a-z]+:)?\/\//i.test(path) || path.startsWith('data:')) {
    return path
  }

  const base = import.meta.env.BASE_URL || '/'
  const normalized = path.startsWith('/') ? path.slice(1) : path
  return `${base}${normalized}`
}
