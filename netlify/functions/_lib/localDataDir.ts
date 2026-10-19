import path from 'node:path'

/**
 * File store for `npm run dev`. Resolved from the project directory so the
 * Netlify function bundle never touches `import.meta.url` (that value is
 * missing in the CommonJS build and crashes the function on load).
 */
export function localDataDir(): string {
  return path.join(process.cwd(), '.data')
}

/**
 * Production functions run on Lambda, where `NETLIFY` is not set and the
 * filesystem is read-only. Use the file store only for Vite, or when
 * `NEWS_USE_LOCAL=1` outside Lambda (for example `netlify dev`).
 */
export function shouldUseLocalStore(): boolean {
  const onLambda = Boolean(
    process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT,
  )
  if (onLambda && process.env.NETLIFY_DEV !== 'true') return false
  if (process.env.NEWS_USE_LOCAL === '1') return true
  return !process.env.NETLIFY
}
