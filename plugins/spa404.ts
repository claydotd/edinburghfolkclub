import fs from 'node:fs'
import path from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Connect, Plugin, ResolvedConfig } from 'vite'

/**
 * Paths the SPA actually renders. Anything else should be a real HTTP 404.
 * Wildcards cover records created after deploy (news posts, member documents,
 * admin edits). Fixed pages are listed exactly so typos do not soft-404.
 */
export const spaPaths = [
  '/',
  '/past-gigs',
  '/about',
  '/contact',
  '/contact/play-at-efc',
  '/gallery',
  '/news',
  '/news/*',
  '/terms',
  '/members',
  '/members/account',
  '/members/documents',
  '/members/documents/*',
  '/members/tickets',
  '/admin',
  '/admin/list',
  '/admin/banner',
  '/admin/gigs',
  '/admin/gigs/archive',
  '/admin/gigs/new',
  '/admin/gigs/:id',
  '/admin/members',
  '/admin/newsletter',
  '/admin/newsletter/subscribers',
  '/admin/reservations',
  '/admin/new',
  '/admin/:id',
]

export function redirectsFile(): string {
  const rules = spaPaths.map((from) => `${from}  /index.html  200`)
  return [
    '# Live sitemap and robots, including news published after the last build.',
    '/sitemap.xml  /.netlify/functions/sitemap  200!',
    '/robots.txt  /.netlify/functions/robots  200!',
    '# App routes. Requests that match none of these fall through to 404.html.',
    ...rules,
    '',
  ].join('\n')
}

export function isSpaPath(pathname: string): boolean {
  const normalized = normalizePath(pathname)
  return spaPaths.some((pattern) => matches(pattern, normalized))
}

function normalizePath(pathname: string): string {
  let value = pathname || '/'
  try {
    value = decodeURIComponent(value)
  } catch {
    // Keep the raw path when it is not valid encoding.
  }
  if (value.length > 1 && value.endsWith('/')) value = value.slice(0, -1)
  return value || '/'
}

function matches(pattern: string, pathname: string): boolean {
  if (pattern.endsWith('/*')) {
    const prefix = pattern.slice(0, -2)
    return pathname === prefix || pathname.startsWith(`${prefix}/`)
  }
  const patternParts = pattern.split('/').filter(Boolean)
  const pathParts = pathname.split('/').filter(Boolean)
  if (patternParts.length !== pathParts.length) return false
  return patternParts.every(
    (part, index) => part.startsWith(':') || part === pathParts[index],
  )
}

function stripBase(pathname: string, base: string): string {
  if (!base || base === '/') return pathname
  const prefix = base.endsWith('/') ? base.slice(0, -1) : base
  if (pathname === prefix) return '/'
  if (pathname.startsWith(`${prefix}/`)) return pathname.slice(prefix.length) || '/'
  return pathname
}

function isUnknownDocument(req: IncomingMessage, base: string): boolean {
  if (req.method !== 'GET' && req.method !== 'HEAD') return false
  const raw = req.url ?? '/'
  const pathname = stripBase(normalizePath(raw.split('?')[0] || '/'), base)
  if (
    pathname.startsWith('/@') ||
    pathname.startsWith('/__') ||
    pathname.startsWith('/src/') ||
    pathname.startsWith('/node_modules/') ||
    pathname.startsWith('/.netlify/')
  ) {
    return false
  }
  if (path.posix.extname(pathname)) return false
  const accept = req.headers.accept ?? ''
  const asksForHtml =
    accept === '' || accept.includes('text/html') || accept.includes('*/*')
  if (!asksForHtml) return false
  return !isSpaPath(pathname)
}

function forceStatus(res: ServerResponse, status: number) {
  res.statusCode = status
  const writeHead = res.writeHead.bind(res) as typeof res.writeHead
  res.writeHead = ((...args: Parameters<ServerResponse['writeHead']>) => {
    if (typeof args[0] === 'number') args[0] = status
    return writeHead(...args)
  }) as ServerResponse['writeHead']
}

function notFoundMiddleware(base: string): Connect.NextHandleFunction {
  return (req, res, next) => {
    if (!isUnknownDocument(req, base)) {
      next()
      return
    }
    forceStatus(res, 404)
    const raw = req.url ?? '/'
    const queryAt = raw.indexOf('?')
    const search = queryAt === -1 ? '' : raw.slice(queryAt)
    req.url = `/index.html${search}`
    next()
  }
}

export function spa404Plugin(): Plugin {
  let config: ResolvedConfig
  return {
    name: 'spa-404',
    configResolved(resolved) {
      config = resolved
    },
    configureServer(server) {
      server.middlewares.use(notFoundMiddleware(server.config.base))
    },
    configurePreviewServer(server) {
      server.middlewares.use(notFoundMiddleware(server.config.base))
    },
    closeBundle() {
      if (config.command !== 'build') return
      const outDir = path.resolve(config.root, config.build.outDir)
      fs.mkdirSync(outDir, { recursive: true })
      fs.writeFileSync(path.join(outDir, '_redirects'), redirectsFile())
    },
  }
}
