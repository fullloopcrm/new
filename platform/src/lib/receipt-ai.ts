/**
 * Receipt OCR via Claude vision. Handles PNG/JPG/PDF (PDF first page).
 */
import Anthropic from '@anthropic-ai/sdk'

let _client: Anthropic | null = null
function getClient(apiKey?: string | null): Anthropic {
  if (apiKey) return new Anthropic({ apiKey })
  if (!_client) _client = new Anthropic()
  return _client
}

export interface ExtractedReceipt {
  vendor: string | null
  amount_cents: number | null
  date: string | null            // YYYY-MM-DD
  tax_cents: number | null
  subtotal_cents: number | null
  line_items: Array<{ description: string; amount_cents: number }>
  category_hint: string | null    // e.g., "fuel", "meals", "supplies"
  raw_text: string | null
  confidence: number              // 0..1
}

const EMPTY: ExtractedReceipt = {
  vendor: null, amount_cents: null, date: null, tax_cents: null,
  subtotal_cents: null, line_items: [], category_hint: null,
  raw_text: null, confidence: 0,
}

/**
 * Extract structured fields from a receipt image (base64).
 * mediaType is one of: image/jpeg, image/png, image/webp, image/gif
 */
export async function extractReceipt(
  base64: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
  anthropicKey?: string | null,
): Promise<ExtractedReceipt> {
  const client = getClient(anthropicKey || null)

  const resp = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 800,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: mediaType, data: base64 },
        },
        {
          type: 'text',
          text: `Extract structured data from this receipt. Return ONLY a JSON object, no prose.

Schema:
{
  "vendor": "Merchant name, cleaned up",
  "amount_cents": <integer, total paid, in cents>,
  "date": "YYYY-MM-DD or null if unreadable",
  "tax_cents": <integer or null>,
  "subtotal_cents": <integer or null>,
  "line_items": [ { "description": "item", "amount_cents": <int> } ],
  "category_hint": "One of: fuel, meals, supplies, software, utilities, insurance, rent, marketing, travel, office, equipment, vehicle, professional_fees, other",
  "confidence": <0.0 - 1.0>
}

Rules:
- All money values in CENTS, not dollars
- Date in YYYY-MM-DD format only (convert MM/DD/YYYY etc.)
- If the receipt is illegible or not actually a receipt, set confidence < 0.2 and null most fields
- Do not invent data — if a field isn't visible, use null`,
        },
      ],
    }],
  })

  const text = resp.content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('')
  const match = /\{[\s\S]*\}/.exec(text)
  if (!match) return EMPTY
  try {
    const parsed = JSON.parse(match[0]) as Partial<ExtractedReceipt>
    return {
      vendor: parsed.vendor || null,
      amount_cents: typeof parsed.amount_cents === 'number' ? Math.round(parsed.amount_cents) : null,
      date: parsed.date || null,
      tax_cents: typeof parsed.tax_cents === 'number' ? Math.round(parsed.tax_cents) : null,
      subtotal_cents: typeof parsed.subtotal_cents === 'number' ? Math.round(parsed.subtotal_cents) : null,
      line_items: Array.isArray(parsed.line_items) ? parsed.line_items.filter(li => li && typeof li.amount_cents === 'number') : [],
      category_hint: parsed.category_hint || null,
      raw_text: null,
      confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0.5)),
    }
  } catch {
    return EMPTY
  }
}

/**
 * Find the best-matching pending bank transaction by amount + date window.
 * Returns null if no confident match.
 */
export interface BankTxnLite {
  id: string
  txn_date: string
  amount_cents: number
  description: string
}

export function matchReceiptToTransaction(
  extracted: ExtractedReceipt,
  pending: BankTxnLite[],
): { txn: BankTxnLite; confidence: number } | null {
  if (!extracted.amount_cents) return null
  const target = -Math.abs(extracted.amount_cents)    // receipts are expenses (outflows)
  const receiptDate = extracted.date ? new Date(extracted.date) : null

  type Candidate = { txn: BankTxnLite; amountDelta: number; daysDelta: number }
  const candidates: Candidate[] = []

  for (const t of pending) {
    if (t.amount_cents > 0) continue          // only outflows match a paper receipt
    const amountDelta = Math.abs(t.amount_cents - target)
    if (amountDelta > 50) continue            // >50¢ off = not same txn
    const daysDelta = receiptDate ? Math.abs((new Date(t.txn_date).getTime() - receiptDate.getTime()) / 86400000) : 0
    if (daysDelta > 5) continue               // too far apart
    candidates.push({ txn: t, amountDelta, daysDelta })
  }

  if (candidates.length === 0) return null

  // Sort: closest amount first, then closest date
  candidates.sort((a, b) => a.amountDelta - b.amountDelta || a.daysDelta - b.daysDelta)
  const best = candidates[0]

  // Confidence heuristic: exact amount + 0 days = 0.98; each cent off drops 0.02; each day off drops 0.05
  const conf = Math.max(0, 0.98 - best.amountDelta * 0.02 - best.daysDelta * 0.05)
  return { txn: best.txn, confidence: conf }
}
