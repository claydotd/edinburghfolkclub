const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(normalizeEmail(email))
}

/** Split one CSV line, honouring double-quoted fields. */
function splitCsvLine(line: string): string[] {
  const cells: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"'
          i += 1
        } else {
          inQuotes = false
        }
      } else {
        current += char
      }
      continue
    }
    if (char === '"') {
      inQuotes = true
      continue
    }
    if (char === ',' || char === ';' || char === '\t') {
      cells.push(current.trim())
      current = ''
      continue
    }
    current += char
  }
  cells.push(current.trim())
  return cells
}

function parseRows(text: string): string[][] {
  const normalised = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  return normalised
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map(splitCsvLine)
}

function headerLooksLikeEmail(value: string): boolean {
  const key = value.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
  return (
    key === 'email' ||
    key === 'emailaddress' ||
    key === 'e-mail' ||
    key === 'mail' ||
    key === 'subscriber' ||
    key === 'subscriberemail'
  )
}

/**
 * Extract unique valid emails from CSV text.
 * Prefers a header column named email / email address / etc.
 * Otherwise collects any cell that looks like an email.
 */
export function extractEmailsFromCsv(text: string): {
  emails: string[]
  rowCount: number
} {
  const rows = parseRows(text)
  if (!rows.length) return { emails: [], rowCount: 0 }

  const header = rows[0]
  const emailCol = header.findIndex(headerLooksLikeEmail)
  const hasHeader = emailCol >= 0
  const dataRows = hasHeader ? rows.slice(1) : rows
  const found: string[] = []
  const seen = new Set<string>()

  for (const row of dataRows) {
    const candidates = hasHeader
      ? [row[emailCol] ?? '']
      : row
    for (const cell of candidates) {
      const email = normalizeEmail(cell.replace(/^mailto:/i, ''))
      if (!email || !isValidEmail(email) || seen.has(email)) continue
      seen.add(email)
      found.push(email)
    }
  }

  return { emails: found, rowCount: dataRows.length }
}
