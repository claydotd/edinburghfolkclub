/**
 * Newsletter copy is stored as a small markdown subset from the visual editor:
 * **bold**, _italic_ / *italic*, and [label](url). Everything else is escaped.
 */

export type NewsletterInlineMode = 'html' | 'text'

type RenderOptions = {
  mode: NewsletterInlineMode
  resolveHref: (href: string) => string
  linkStyle?: string
}

const ESCAPES = new Set(['\\', '*', '_', '[', ']', '(', ')', '`'])

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function isWordChar(char: string | undefined): boolean {
  if (!char) return false
  return /[\p{L}\p{N}]/u.test(char)
}

export function isSafeNewsletterHref(href: string): boolean {
  const value = href.trim()
  if (!value || /\s/.test(value)) return false
  if (value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\')) {
    return true
  }
  if (/^https?:\/\//i.test(value)) return true
  if (/^mailto:[^\s]+$/i.test(value)) return true
  return false
}

function canOpenEmphasis(source: string, index: number, marker: string): boolean {
  const prev = source[index - 1]
  const next = source[index + marker.length]
  if (!next || /\s/.test(next) || next === marker) return false
  if (prev && isWordChar(prev)) return false
  return true
}

function canCloseEmphasis(source: string, index: number, marker: string): boolean {
  const prev = source[index - 1]
  const next = source[index + marker.length]
  if (!prev || /\s/.test(prev)) return false
  if (next && isWordChar(next)) return false
  return true
}

function readDelimited(
  source: string,
  start: number,
  marker: string,
  canClose: (index: number) => boolean,
): { inner: string; end: number } | null {
  const from = start + marker.length
  for (let index = from; index <= source.length - marker.length; index += 1) {
    if (source[index] === '\\') {
      index += 1
      continue
    }
    if (!source.startsWith(marker, index)) continue
    if (!canClose(index)) continue
    const inner = source.slice(from, index)
    if (!inner.trim()) return null
    return { inner, end: index + marker.length }
  }
  return null
}

function readLink(
  source: string,
  start: number,
  options: RenderOptions,
): { html: string; end: number } | null {
  let index = start + 1
  while (index < source.length) {
    if (source[index] === '\\' && index + 1 < source.length) {
      index += 2
      continue
    }
    if (source[index] === '[') return null
    if (source[index] === ']') break
    index += 1
  }
  if (source[index] !== ']' || source[index + 1] !== '(') return null

  const label = source.slice(start + 1, index)
  const urlStart = index + 2
  let urlEnd = urlStart
  while (urlEnd < source.length && source[urlEnd] !== ')') {
    if (source[urlEnd] === '\\' && urlEnd + 1 < source.length) {
      urlEnd += 2
      continue
    }
    if (/\s/.test(source[urlEnd])) return null
    urlEnd += 1
  }
  if (source[urlEnd] !== ')') return null

  const url = source.slice(urlStart, urlEnd).trim()
  if (!label.trim() || !isSafeNewsletterHref(url)) return null

  const href = options.resolveHref(url)
  const inner = renderNewsletterInline(label, options)
  if (options.mode === 'text') {
    const text = inner.trim()
    const shownHref = href.replace(/^mailto:/i, '')
    const shown = !text || text === href || text === shownHref ? shownHref : `${text} (${shownHref})`
    return { html: shown, end: urlEnd + 1 }
  }

  const style = options.linkStyle ?? 'text-decoration:underline;'
  return {
    html: `<a href="${escapeHtml(href)}" style="${style}">${inner}</a>`,
    end: urlEnd + 1,
  }
}

function wrapFormatting(
  tag: 'strong' | 'em',
  inner: string,
  mode: NewsletterInlineMode,
): string {
  if (mode === 'text') return inner
  if (tag === 'strong') {
    return `<strong style="font-weight:bold;">${inner}</strong>`
  }
  return `<em style="font-style:italic;">${inner}</em>`
}

export function renderNewsletterInline(source: string, options: RenderOptions): string {
  let html = ''
  let index = 0

  while (index < source.length) {
    const char = source[index]

    if (char === '\\' && index + 1 < source.length && ESCAPES.has(source[index + 1])) {
      const escaped = source[index + 1]
      html += options.mode === 'html' ? escapeHtml(escaped) : escaped
      index += 2
      continue
    }

    if (char === '[') {
      const link = readLink(source, index, options)
      if (link) {
        html += link.html
        index = link.end
        continue
      }
    }

    if ((char === '*' || char === '_') && source[index + 1] === char) {
      const marker = char + char
      const strong = readDelimited(source, index, marker, () => true)
      if (strong) {
        html += wrapFormatting(
          'strong',
          renderNewsletterInline(strong.inner, options),
          options.mode,
        )
        index = strong.end
        continue
      }
    }

    if (
      (char === '*' || char === '_') &&
      canOpenEmphasis(source, index, char)
    ) {
      const emphasis = readDelimited(source, index, char, (at) =>
        canCloseEmphasis(source, at, char),
      )
      if (emphasis) {
        html += wrapFormatting(
          'em',
          renderNewsletterInline(emphasis.inner, options),
          options.mode,
        )
        index = emphasis.end
        continue
      }
    }

    html += options.mode === 'html' ? escapeHtml(char) : char
    index += 1
  }

  return html
}
