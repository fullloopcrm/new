/**
 * Minimal RFC-4180-ish CSV/TSV parser for client-side import uploads. Handles
 * quoted fields, escaped quotes (""), commas/tabs inside quotes, and CRLF/LF.
 * Returns a header row + string rows. Empty lines are skipped.
 *
 * Kept dependency-free and synchronous so it can run in the browser on an
 * uploaded File's text without pulling a parser bundle into the import route.
 */

export interface ParsedTable {
  headers: string[]
  rows: string[][]
}

/** Detect the delimiter from the header line: tab if present, else comma. */
function detectDelimiter(text: string): ',' | '\t' {
  const firstLine = text.slice(0, text.indexOf('\n') === -1 ? text.length : text.indexOf('\n'))
  return firstLine.includes('\t') ? '\t' : ','
}

/** Parse CSV/TSV text into headers + rows. Blank rows are dropped. */
export function parseDelimited(text: string): ParsedTable {
  const delim = detectDelimiter(text)
  const all: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ }
        else inQuotes = false
      } else field += c
    } else if (c === '"') {
      inQuotes = true
    } else if (c === delim) {
      row.push(field); field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field); field = ''
      if (row.some((v) => v.trim() !== '')) all.push(row)
      row = []
    } else {
      field += c
    }
  }
  if (field !== '' || row.length) {
    row.push(field)
    if (row.some((v) => v.trim() !== '')) all.push(row)
  }

  if (all.length === 0) return { headers: [], rows: [] }
  const [headers, ...rows] = all
  return { headers: headers.map((h) => h.trim()), rows }
}
