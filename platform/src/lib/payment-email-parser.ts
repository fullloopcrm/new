/**
 * Parse Zelle/Venmo payment confirmation emails.
 * Ported from nycmaid (2026-04-19) — pure parser, no DB.
 */

export type PaymentMethod = 'zelle' | 'venmo'

export interface EmailPayment {
  method: PaymentMethod
  amount: number       // dollars
  amountCents: number
  senderName: string
  senderEmail: string
  date: Date
  referenceId: string  // email messageId — dedup key
}

const ZELLE_SENDERS = [
  'zellepay.com', 'zelle',
  'alerts@notify.wellsfargo.com',
  'alerts@chase.com', 'onlinebanking@chase.com',
  'bank of america', 'bankofamerica', 'ealerts.bankofamerica.com',
  'citi', 'capitalone', 'pnc', 'usbank', 'td bank', 'truist',
]

const ZELLE_BANK_SUBJECT_PATTERNS = [
  /sent you \$/i,
  /sent you a payment/i,
  /deposited \$/i,
]

const ZELLE_SUBJECT_PATTERNS = [
  /zelle.*payment/i,
  /you.*received.*\$/i,
  /payment.*received/i,
  /money.*sent.*zelle/i,
  /zelle.*transfer/i,
  /received.*zelle/i,
]

const VENMO_SENDERS = ['venmo@venmo.com', 'venmo.com']

const VENMO_SUBJECT_PATTERNS = [
  /paid you/i,
  /sent you/i,
  /venmo.*payment/i,
  /you.*received/i,
]

const AMOUNT_PATTERNS = [
  /\$\s?([\d,]+\.?\d{0,2})/,
  /received\s+\$?([\d,]+\.?\d{0,2})/i,
  /amount[:\s]+\$?([\d,]+\.?\d{0,2})/i,
  /payment\s+of\s+\$?([\d,]+\.?\d{0,2})/i,
  /sent\s+you\s+\$?([\d,]+\.?\d{0,2})/i,
  /paid\s+you\s+\$?([\d,]+\.?\d{0,2})/i,
]

const SENDER_PATTERNS = [
  /from\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/,
  /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s+sent/,
  /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s+paid/,
]

export function detectPaymentEmail(from: string, subject: string, text: string): PaymentMethod | null {
  const fromLower = from.toLowerCase()
  const textLower = text.toLowerCase()

  const venmoSender = VENMO_SENDERS.some(s => fromLower.includes(s))
  const venmoSubject = VENMO_SUBJECT_PATTERNS.some(p => p.test(subject))
  const bodyHasVenmo = textLower.includes('venmo')
  const bodyHasAmount = /\$[\d,]+\.?\d{0,2}/.test(text)

  const venmoSignals = [venmoSender, venmoSubject, bodyHasVenmo && bodyHasAmount].filter(Boolean).length
  if (venmoSignals >= 2) return 'venmo'

  const zelleSender = ZELLE_SENDERS.some(s => fromLower.includes(s))
  const zelleSubject = ZELLE_SUBJECT_PATTERNS.some(p => p.test(subject))
  const zelleBankSubject = ZELLE_BANK_SUBJECT_PATTERNS.some(p => p.test(subject))
  const bodyHasZelle = textLower.includes('zelle')

  if (zelleSender && zelleBankSubject && bodyHasAmount) return 'zelle'

  const zelleSignals = [zelleSender, zelleSubject, bodyHasZelle && bodyHasAmount].filter(Boolean).length
  if (zelleSignals >= 2) return 'zelle'

  return null
}

export function parsePaymentEmail(
  method: PaymentMethod,
  from: string,
  fromName: string,
  subject: string,
  text: string,
  date: Date,
  messageId: string,
): EmailPayment | null {
  let amount = 0
  const searchText = subject + ' ' + text

  for (const pattern of AMOUNT_PATTERNS) {
    const match = searchText.match(pattern)
    if (match) {
      amount = parseFloat(match[1].replace(/,/g, ''))
      if (amount > 0) break
    }
  }
  if (amount <= 0) return null

  let senderName = fromName || ''
  for (const pattern of SENDER_PATTERNS) {
    const match = text.match(pattern)
    if (match) { senderName = match[1].trim(); break }
  }
  if (method === 'venmo' && !senderName) {
    const m = subject.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s+(?:paid|sent)/i)
    if (m) senderName = m[1].trim()
  }

  return {
    method, amount,
    amountCents: Math.round(amount * 100),
    senderName, senderEmail: from, date, referenceId: messageId,
  }
}
