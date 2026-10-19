import path from 'node:path'

/**
 * File store for `npm run dev`. Resolved from the project directory so the
 * Netlify function bundle never touches `import.meta.url` (that value is
 * missing in the CommonJS build and crashes the function on load).
 */
export function localDataDir(): string {
  return path.join(process.cwd(), '.data')
}
