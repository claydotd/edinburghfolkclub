import { createHmac, timingSafeEqual } from 'node:crypto'
import type {
  NewsletterGigItem,
  NewsletterNewsItem,
} from './newsletterTypes.ts'

/** Brand tokens — keep in sync with src/index.css :root */
const THISTLE = '#642297'
const INK = '#1f1435'
const YELLOW = '#fff0aa'
const GOLD = '#ffdc2f'
const WHITE = '#ffffff'
/** color-mix(in srgb, ink 72%, thistle) */
const TEXT = '#321850'
const HEATHER = '#b07dce'
/** color-mix(in srgb, ink 38%, white) — matches .header-tagline */
const TAGLINE = '#aaa6b2'
/** color-mix(in srgb, yellow 25%, white) — matches --cream */
const CREAM = '#fffbea'
/** Match src/index.css --sans / --heading (fallbacks for clients without Typekit). */
const FONT_SANS = '"avenir-lt-pro", Arial, Helvetica, sans-serif'
const FONT_HEADING = '"nueva-std", Georgia, "Times New Roman", serif'
const TYPEKIT_CSS = 'https://use.typekit.net/vjn8ihu.css'
const SITE_DOMAIN = 'efc1973.com'
const SITE_HOME = `https://${SITE_DOMAIN}`

function getSecret(): string {
  return process.env.NEWS_ADMIN_SECRET ?? 'local-dev-secret-change-me'
}

export function siteBaseUrl(): string {
  const raw =
    process.env.SITE_URL ||
    process.env.URL ||
    process.env.DEPLOY_PRIME_URL ||
    'https://efc1973.com'
  return raw.replace(/\/$/, '')
}

export function absoluteUrl(pathOrUrl: string, base = siteBaseUrl()): string {
  if (!pathOrUrl) return base
  if (/^([a-z]+:)?\/\//i.test(pathOrUrl) || pathOrUrl.startsWith('data:')) {
    return pathOrUrl
  }
  if (pathOrUrl.startsWith('/')) return `${base}${pathOrUrl}`
  return `${base}/${pathOrUrl}`
}

export function createUnsubscribeToken(subscriberId: string): string {
  const payload = `unsub:${subscriberId}`
  const signature = createHmac('sha256', getSecret())
    .update(payload)
    .digest('base64url')
  return `${payload}.${signature}`
}

export function verifyUnsubscribeToken(token: string): string | null {
  if (!token) return null
  const dot = token.lastIndexOf('.')
  if (dot < 0) return null
  const payload = token.slice(0, dot)
  const signature = token.slice(dot + 1)
  const expected = createHmac('sha256', getSecret())
    .update(payload)
    .digest('base64url')
  try {
    const a = Buffer.from(signature)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  } catch {
    return null
  }
  const match = /^unsub:([^:]+)$/.exec(payload)
  return match?.[1] ?? null
}

export function unsubscribeUrl(subscriberId: string, base = siteBaseUrl()): string {
  const token = encodeURIComponent(createUnsubscribeToken(subscriberId))
  return `${base}/.netlify/functions/newsletter?action=unsubscribe&token=${token}`
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function formatGigDate(dateStr: string): string {
  const date = new Date(`${dateStr}T12:00:00`)
  if (Number.isNaN(date.getTime())) return dateStr
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatNewsDate(iso: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

type ParagraphStyle = {
  fontSize: string
  lineHeight: string
  margin: string
}

/** Plain text → HTML paragraphs; keep single newlines as <br /> within a block. */
function paragraphsToHtml(message: string, style: ParagraphStyle): string {
  const blocks = message
    .replace(/\r\n/g, '\n')
    .trim()
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
  if (!blocks.length) return ''
  return blocks
    .map((block) => {
      const html = escapeHtml(block).replaceAll('\n', '<br />')
      return `<p style="margin:${style.margin};font-family:${FONT_SANS};font-size:${style.fontSize};line-height:${style.lineHeight};color:${TEXT};">${html}</p>`
    })
    .join('')
}

/** Intro / written message body. */
export function messageToHtml(message: string): string {
  return paragraphsToHtml(message, {
    fontSize: '16px',
    lineHeight: '1.55',
    margin: '0 0 16px',
  })
}

function buttonHtml(href: string, label: string): string {
  return `<a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 20px;background:${THISTLE};color:${WHITE};text-decoration:none;font-family:${FONT_SANS};font-size:14px;font-weight:bold;border-radius:4px;">${escapeHtml(label)}</a>`
}

/** Shared body markup for custom notes and inserted news posts. */
function newsBodyToHtml(body: string): string {
  return paragraphsToHtml(body, {
    fontSize: '15px',
    lineHeight: '1.5',
    margin: '8px 0 12px',
  })
}

const HEADER_TAGLINE_STYLE = `margin:0;font-family:${FONT_HEADING};font-size:13px;font-weight:700;line-height:1.25;letter-spacing:-0.02em;color:${TAGLINE};`

function emailHeaderHtml(homeUrl: string, logoUrl: string): string {
  return `
    <tr>
      <td style="padding:0;background:${WHITE};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;background:${WHITE};">
          <tr>
            <td valign="middle" width="28%" align="right" style="padding:16px 10px 14px 18px;text-align:right;font-family:${FONT_HEADING};color:${TAGLINE};">
              <p class="efc-heading" style="${HEADER_TAGLINE_STYLE}text-align:right;">
                The home of traditional music in the capital since 1973
              </p>
            </td>
            <td valign="middle" width="44%" align="center" style="padding:16px 8px 14px;">
              <a href="${escapeHtml(homeUrl)}" style="text-decoration:none;">
                <img src="${escapeHtml(logoUrl)}" alt="Edinburgh Folk Club" width="200" style="display:block;width:200px;max-width:100%;height:auto;border:0;margin:0 auto;" />
              </a>
            </td>
            <td valign="middle" width="28%" align="left" style="padding:16px 18px 14px 10px;text-align:left;font-family:${FONT_HEADING};color:${TAGLINE};">
              <p class="efc-heading" style="${HEADER_TAGLINE_STYLE}text-align:left;">
                Meetings at UCC<br />14 Royal Terrace EH7&nbsp;5AB
              </p>
            </td>
          </tr>
          <tr>
            <td colspan="3" style="height:8px;line-height:8px;font-size:0;background:${GOLD};">&nbsp;</td>
          </tr>
        </table>
      </td>
    </tr>`
}

/** Heading text lives on a span so linked + unlinked titles share the same font (clients often restyle <a>). */
function newsTitleHtml(title: string, href: string | null): string {
  const label = `<span style="font-family:${FONT_HEADING};font-size:20px;line-height:1.3;font-weight:700;color:${THISTLE};">${escapeHtml(title)}</span>`
  const inner = href
    ? `<a href="${escapeHtml(href)}" style="color:${THISTLE};text-decoration:none;">${label}</a>`
    : label
  return `<h3 class="efc-heading" style="margin:0 0 6px;font-family:${FONT_HEADING};font-size:20px;line-height:1.3;font-weight:700;color:${THISTLE};">${inner}</h3>`
}

function newsItemHtml(item: NewsletterNewsItem, base: string): string {
  const href = item.href ? absoluteUrl(item.href, base) : null
  const date = formatNewsDate(item.publishedAt)
  const dateHtml = date
    ? `<p style="margin:0 0 8px;font-family:${FONT_SANS};font-size:13px;line-height:1.4;color:${TEXT};font-style:italic;">${escapeHtml(date)}</p>`
    : ''
  const button =
    href && item.buttonLabel
      ? `<p style="margin:0;">${buttonHtml(href, item.buttonLabel)}</p>`
      : ''

  return `
        <tr>
          <td style="padding:0 0 24px;border-bottom:1px solid ${HEATHER};">
            ${newsTitleHtml(item.title, href)}
            ${dateHtml}
            ${newsBodyToHtml(item.body)}
            ${button}
          </td>
        </tr>`
}

function newsSectionHtml(
  items: NewsletterNewsItem[],
  base: string,
): string {
  if (!items.length) return ''
  const rows = items.map((item) => newsItemHtml(item, base)).join('')

  return `
    <tr>
      <td style="padding:32px 28px 8px;font-family:${FONT_SANS};">
        <h2 class="efc-heading" style="margin:0 0 18px;font-family:${FONT_HEADING};font-size:24px;line-height:1.25;font-weight:700;color:${INK};border-bottom:2px solid ${THISTLE};padding-bottom:8px;">
          Other news
        </h2>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
      </td>
    </tr>`
}

function gigSectionHtml(gigs: NewsletterGigItem[], base: string): string {
  if (!gigs.length) return ''
  const items = gigs
    .map((gig) => {
      const imageSrc = gig.imagepath ? absoluteUrl(gig.imagepath, base) : ''
      const image = imageSrc
        ? `<img src="${escapeHtml(imageSrc)}" alt="${escapeHtml(gig.name)}" width="160" style="display:block;width:160px;max-width:100%;height:auto;border:0;border-radius:4px;" />`
        : ''
      const metaBits = [
        gig.venue ? escapeHtml(gig.venue) : '',
        gig.doors ? `Doors ${escapeHtml(gig.doors)}` : '',
        gig.music ? `Music ${escapeHtml(gig.music)}` : '',
      ].filter(Boolean)
      const meta = metaBits.length
        ? `<p style="margin:6px 0 0;font-family:${FONT_SANS};font-size:13px;color:${TEXT};">${metaBits.join(' · ')}</p>`
        : ''
      const blurb = gig.description.trim()
        ? `<p style="margin:10px 0 0;font-family:${FONT_SANS};font-size:15px;line-height:1.5;color:${TEXT};">${escapeHtml(gig.description.trim())}</p>`
        : ''
      const ticket =
        gig.ticketsAvailable && gig.tickets
          ? `<p style="margin:14px 0 0;">${buttonHtml(gig.tickets, 'Tickets')}</p>`
          : ''

      return `
        <tr>
          <td style="padding:0 0 24px;border-bottom:1px solid ${HEATHER};">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                ${
                  image
                    ? `<td valign="top" width="172" style="padding:0 16px 0 0;">${image}</td>`
                    : ''
                }
                <td valign="top" style="padding:0;">
                  <p style="margin:0 0 4px;font-family:${FONT_SANS};font-size:13px;font-weight:bold;letter-spacing:0.04em;text-transform:uppercase;color:${THISTLE};">
                    ${escapeHtml(formatGigDate(gig.date))}
                  </p>
                  <h3 class="efc-heading" style="margin:0;font-family:${FONT_HEADING};font-size:20px;line-height:1.3;font-weight:700;color:${INK};">
                    ${escapeHtml(gig.name)}
                  </h3>
                  ${meta}
                  ${blurb}
                  ${ticket}
                </td>
              </tr>
            </table>
          </td>
        </tr>`
    })
    .join('')

  return `
    <tr>
      <td style="padding:32px 28px 8px;font-family:${FONT_SANS};">
        <h2 class="efc-heading" style="margin:0 0 18px;font-family:${FONT_HEADING};font-size:24px;line-height:1.25;font-weight:700;color:${INK};border-bottom:2px solid ${THISTLE};padding-bottom:8px;">
          Upcoming gigs
        </h2>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${items}</table>
      </td>
    </tr>`
}

export type BuildNewsletterEmailArgs = {
  subject: string
  message: string
  newsPosts: NewsletterNewsItem[]
  gigs: NewsletterGigItem[]
  unsubscribeHref?: string
}

export function buildNewsletterEmailHtml(args: BuildNewsletterEmailArgs): string {
  const base = siteBaseUrl()
  // PNG — many clients (Outlook, older Gmail/Apple Mail) still skip WebP.
  // Always load from production so deploy-preview SITE_URL does not break images.
  const logoUrl = `${SITE_HOME}/images/efc-logo.png`
  const homeUrl = SITE_HOME
  const messageHtml = messageToHtml(args.message)
  const unsub = args.unsubscribeHref
    ? `<p style="margin:0 0 8px;font-family:${FONT_SANS};font-size:12px;line-height:1.45;color:${WHITE};text-align:center;">
         <a href="${escapeHtml(args.unsubscribeHref)}" style="color:${YELLOW};text-decoration:underline;">Unsubscribe</a>
         from these emails.
       </p>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(args.subject)}</title>
  <link rel="preconnect" href="https://use.typekit.net" crossorigin />
  <link rel="preconnect" href="https://p.typekit.net" crossorigin />
  <link rel="stylesheet" href="${TYPEKIT_CSS}" />
  <style type="text/css">
    @import url("${TYPEKIT_CSS}");
    body, table, td, p {
      font-family: ${FONT_SANS};
    }
    h1, h2, h3, .efc-heading {
      font-family: ${FONT_HEADING} !important;
    }
  </style>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <style type="text/css">
    body, table, td, p { font-family: Arial, Helvetica, sans-serif !important; }
    h1, h2, h3 { font-family: Georgia, "Times New Roman", serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background:${YELLOW};font-family:${FONT_SANS};color:${TEXT};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(165deg,${YELLOW} 0%,${CREAM} 42%,${WHITE} 78%);background-color:${YELLOW};">
    <tr>
      <td align="center" style="padding:28px 12px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${WHITE};border:1px solid ${INK};">
          ${emailHeaderHtml(homeUrl, logoUrl)}
          <tr>
            <td style="padding:28px 28px 8px;font-family:${FONT_SANS};color:${TEXT};">
              ${messageHtml}
            </td>
          </tr>
          ${newsSectionHtml(args.newsPosts, base)}
          ${gigSectionHtml(args.gigs, base)}
          <tr>
            <td align="center" style="padding:28px;background:${INK};color:${WHITE};font-family:${FONT_SANS};text-align:center;">
              <p style="margin:0 0 8px;font-family:${FONT_SANS};font-size:14px;line-height:1.45;color:${WHITE};text-align:center;">
                Edinburgh Folk Club · Ukrainian Community Centre, 14 Royal Terrace, EH7&nbsp;5AB
              </p>
              ${unsub}
              <p style="margin:0;font-family:${FONT_SANS};font-size:12px;line-height:1.45;color:${WHITE};text-align:center;">
                <a href="${escapeHtml(SITE_HOME)}" style="color:${YELLOW};text-decoration:underline;">${SITE_DOMAIN}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function buildNewsletterText(args: BuildNewsletterEmailArgs): string {
  const base = siteBaseUrl()
  const lines = [
    'Edinburgh Folk Club',
    '',
    args.message.trim(),
  ]

  if (args.newsPosts.length) {
    lines.push('', 'Other news', '----------')
    for (const item of args.newsPosts) {
      lines.push(item.title, item.body.trim())
      if (item.href) {
        lines.push(absoluteUrl(item.href, base))
      }
      lines.push('')
    }
  }

  if (args.gigs.length) {
    lines.push('', 'Upcoming gigs', '-------------')
    for (const gig of args.gigs) {
      lines.push(
        `${formatGigDate(gig.date)} — ${gig.name}`,
        [gig.venue, gig.doors && `Doors ${gig.doors}`, gig.music && `Music ${gig.music}`]
          .filter(Boolean)
          .join(' · '),
        gig.description.trim(),
        gig.ticketsAvailable && gig.tickets ? `Tickets: ${gig.tickets}` : '',
        '',
      )
    }
  }

  lines.push(
    '',
    'Edinburgh Folk Club · Ukrainian Community Centre, 14 Royal Terrace, EH7 5AB',
    SITE_HOME,
  )
  if (args.unsubscribeHref) {
    lines.push(`Unsubscribe: ${args.unsubscribeHref}`)
  }

  return lines.filter((line) => line !== undefined).join('\n').trim()
}
