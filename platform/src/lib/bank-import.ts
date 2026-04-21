/**
 * CSV + OFX bank statement parsing.
 * Target: produce { txn_date, description, amount_cents, check_number?, external_id? } rows.
 */

export interface ParsedTransaction {
  txn_date: string           // YYYY-MM-DD
  posted_date?: string
  description: string
  counterparty?: string
  amount_cents: number       // negative = outflow (debit), positive = inflow (credit)
  check_number?: string
  external_id?: string       // FITID (OFX) or row index
}

// ─── CSV parsing ──────────────────────────────────────────────────

/**
 * Auto-detect column mapping from header row. Supports most US banks'
 * default CSV exports (Chase, Wells, BofA, Capital One, Citi, Amex, etc.)
 */
export function parseCSV(text: string): ParsedTransaction[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0)
  if (lines.length < 2) return []

  const rows = lines.map(parseCSVRow)
  const header = rows[0].map(h => h.trim().toLowerCase())
  const idx = {
    date: findHeaderIdx(header, ['date', 'transaction date', 'posted date', 'trans date', 'posting date']),
    desc: findHeaderIdx(header, ['description', 'details', 'memo', 'transaction', 'payee', 'narrative']),
    amount: findHeaderIdx(header, ['amount', 'transaction amount']),
    debit: findHeaderIdx(header, ['debit', 'withdrawal', 'withdrawals', 'spent', 'money out']),
    credit: findHeaderIdx(header, ['credit', 'deposit', 'deposits', 'received', 'money in']),
    check: findHeaderIdx(header, ['check number', 'check #', 'check', 'check_number']),
    category: findHeaderIdx(header, ['category', 'type']),
  }

  if (idx.date < 0 || idx.desc < 0) {
    throw new Error('CSV missing required columns (date, description). Headers seen: ' + header.join(','))
  }
  if (idx.amount < 0 && (idx.debit < 0 || idx.credit < 0)) {
    throw new Error('CSV needs either an Amount column or separate Debit/Credit columns.')
  }

  const txns: ParsedTransaction[] = []
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    const dateRaw = row[idx.date]
    const desc = row[idx.desc]
    if (!dateRaw || !desc) continue

    const iso = parseDateLoose(dateRaw)
    if (!iso) continue

    let amountCents: number | null = null
    if (idx.amount >= 0 && row[idx.amount]) {
      amountCents = parseAmountToCents(row[idx.amount])
    } else {
      const d = idx.debit >= 0 ? parseAmountToCents(row[idx.debit]) : 0
      const c = idx.credit >= 0 ? parseAmountToCents(row[idx.credit]) : 0
      if (d < 0) amountCents = d       // some banks put negatives in debit col
      else amountCents = c - d         // credit inflow positive, debit outflow negative
    }
    if (amountCents == null || amountCents === 0) continue

    txns.push({
      txn_date: iso,
      description: (desc || '').trim(),
      amount_cents: amountCents,
      check_number: idx.check >= 0 ? (row[idx.check] || '').trim() || undefined : undefined,
      external_id: `row_${i}`,
    })
  }
  return txns
}

/** Minimal CSV row parser that handles quoted fields + escaped quotes. */
function parseCSVRow(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuote = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuote) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++ }
      else if (ch === '"') { inQuote = false }
      else cur += ch
    } else {
      if (ch === '"') inQuote = true
      else if (ch === ',') { out.push(cur); cur = '' }
      else cur += ch
    }
  }
  out.push(cur)
  return out
}

function findHeaderIdx(header: string[], candidates: string[]): number {
  for (const c of candidates) {
    const i = header.indexOf(c)
    if (i >= 0) return i
  }
  return -1
}

function parseDateLoose(raw: string): string | null {
  const s = raw.trim()
  // YYYY-MM-DD
  const m1 = /^(\d{4})-(\d{2})-(\d{2})/.exec(s)
  if (m1) return `${m1[1]}-${m1[2]}-${m1[3]}`
  // MM/DD/YYYY or MM-DD-YYYY
  const m2 = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/.exec(s)
  if (m2) {
    const mo = m2[1].padStart(2, '0')
    const d = m2[2].padStart(2, '0')
    let y = m2[3]
    if (y.length === 2) y = parseInt(y) > 70 ? `19${y}` : `20${y}`
    return `${y}-${mo}-${d}`
  }
  // Try Date parse fallback
  const d = new Date(s)
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  return null
}

function parseAmountToCents(raw: string): number {
  const s = (raw || '').trim().replace(/[$,\s]/g, '').replace(/[()]/g, '')
  if (!s) return 0
  const neg = /^\(.*\)$/.test((raw || '').trim()) || s.startsWith('-')
  const num = parseFloat(s.replace(/^-/, ''))
  if (!Number.isFinite(num)) return 0
  const cents = Math.round(num * 100)
  return neg ? -cents : cents
}

// ─── OFX / QFX parsing ─────────────────────────────────────────────
// OFX is SGML-ish; QFX is Quicken's branded OFX. Same parse.

export function parseOFX(text: string): ParsedTransaction[] {
  // Strip the OFX header (before <OFX>)
  const ofxStart = text.indexOf('<OFX')
  if (ofxStart < 0) throw new Error('Not an OFX file (no <OFX> tag)')
  const body = text.slice(ofxStart)

  // Extract every <STMTTRN>...</STMTTRN> block
  const txnRe = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/g
  const out: ParsedTransaction[] = []
  let m: RegExpExecArray | null
  while ((m = txnRe.exec(body)) !== null) {
    const block = m[1]
    const dateRaw = tag(block, 'DTPOSTED')
    const amtRaw = tag(block, 'TRNAMT')
    const desc = tag(block, 'NAME') || tag(block, 'MEMO') || tag(block, 'PAYEE') || ''
    const fitid = tag(block, 'FITID')
    const checkNum = tag(block, 'CHECKNUM')

    if (!dateRaw || !amtRaw) continue
    const iso = parseOfxDate(dateRaw)
    if (!iso) continue

    const amountCents = Math.round(parseFloat(amtRaw) * 100)
    if (!Number.isFinite(amountCents) || amountCents === 0) continue

    out.push({
      txn_date: iso,
      posted_date: iso,
      description: desc.trim(),
      amount_cents: amountCents,
      check_number: checkNum || undefined,
      external_id: fitid || undefined,
    })
  }
  return out
}

function tag(block: string, name: string): string {
  // OFX tags may or may not be closed in SGML form; handle both
  const closedRe = new RegExp(`<${name}>([^<]*)</${name}>`)
  const openRe = new RegExp(`<${name}>([^<\\n]*)`)
  const m1 = closedRe.exec(block)
  if (m1) return m1[1].trim()
  const m2 = openRe.exec(block)
  if (m2) return m2[1].trim()
  return ''
}

function parseOfxDate(raw: string): string | null {
  // Typical: YYYYMMDDhhmmss[.xxx][timezone]
  const m = /^(\d{4})(\d{2})(\d{2})/.exec(raw)
  if (!m) return null
  return `${m[1]}-${m[2]}-${m[3]}`
}

// ─── Dispatch ───────────────────────────────────────────────────────

export function detectAndParse(filename: string, text: string): { source: 'csv' | 'ofx'; txns: ParsedTransaction[] } {
  const lower = filename.toLowerCase()
  if (lower.endsWith('.ofx') || lower.endsWith('.qfx') || text.includes('<STMTTRN>')) {
    return { source: 'ofx', txns: parseOFX(text) }
  }
  return { source: 'csv', txns: parseCSV(text) }
}
