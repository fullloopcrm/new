/**
 * Quote core — totals, numbering, state transitions, signature capture.
 *
 * Line item shape:
 *   { id, name, description?, quantity, unit_price_cents, optional?, selected? }
 *
 * Tiered quote shape (optional, overrides line_items if present at accept):
 *   { good: { label, subtotal_cents, line_items }, better: {...}, best: {...} }
 */
import { supabaseAdmin } from './supabase'
import { randomBytes } from 'crypto'

export interface QuoteLineItem {
  id: string
  name: string
  description?: string
  quantity: number
  unit_price_cents: number
  subtotal_cents: number
  optional?: boolean
  selected?: boolean
}

export interface QuoteTier {
  label: string
  line_items: QuoteLineItem[]
  subtotal_cents: number
  note?: string
}

export interface QuoteTotals {
  subtotal_cents: number
  tax_cents: number
  discount_cents: number
  total_cents: number
}

export function computeLineItemSubtotal(li: Omit<QuoteLineItem, 'subtotal_cents'>): number {
  const qty = Math.max(0, li.quantity || 0)
  const price = Math.max(0, li.unit_price_cents || 0)
  return Math.round(qty * price)
}

// Caller-supplied array/strings with no other size guard at any of this
// helper's 4 call sites (quotes + invoices create/update) — each line item's
// name/description also flows into the generated PDF and public accept
// page. Truncate rather than reject, matching this codebase's existing
// pattern for internal/semi-trusted free-text fields (prospects' cap()).
const MAX_LINE_ITEMS = 500
const MAX_NAME_LENGTH = 500
const MAX_DESCRIPTION_LENGTH = 5000

export function normalizeLineItems(items: Partial<QuoteLineItem>[]): QuoteLineItem[] {
  return (items || [])
    .filter(li => li && (li.name || li.quantity))
    .slice(0, MAX_LINE_ITEMS)
    .map((li, i) => {
      const quantity = Number(li.quantity) || 0
      const unit_price_cents = Number(li.unit_price_cents) || 0
      const subtotal_cents = Math.round(quantity * unit_price_cents)
      return {
        id: li.id || `li_${i}_${Date.now()}`,
        name: String(li.name || 'Item').slice(0, MAX_NAME_LENGTH),
        description: li.description ? String(li.description).slice(0, MAX_DESCRIPTION_LENGTH) : undefined,
        quantity,
        unit_price_cents,
        subtotal_cents,
        optional: !!li.optional,
        selected: li.optional ? !!li.selected : true,
      }
    })
}

// Same unbounded-caller-input class as normalizeLineItems above, on the
// tiers sibling field: quotes/route.ts, quotes/[id]/route.ts, and
// quote-templates/route.ts all stored body.tiers raw with no cap, and
// quotes/public/[token]/route.ts serves it straight to the public
// (unauthenticated) quote page. Each tier's line_items reuses
// normalizeLineItems so the same per-item caps apply there too.
const MAX_TIER_LABEL_LENGTH = 200
const MAX_TIER_NOTE_LENGTH = 2000
const TIER_KEYS = ['good', 'better', 'best'] as const

export function normalizeTiers(tiers: unknown): Record<string, QuoteTier> | null {
  if (!tiers || typeof tiers !== 'object') return null
  const result: Record<string, QuoteTier> = {}
  for (const key of TIER_KEYS) {
    const tier = (tiers as Record<string, unknown>)[key]
    if (!tier || typeof tier !== 'object') continue
    const t = tier as Partial<QuoteTier> & { line_items?: Partial<QuoteLineItem>[] }
    result[key] = {
      label: String(t.label || key).slice(0, MAX_TIER_LABEL_LENGTH),
      line_items: normalizeLineItems(t.line_items || []),
      subtotal_cents: Math.round(Number(t.subtotal_cents) || 0),
      ...(t.note ? { note: String(t.note).slice(0, MAX_TIER_NOTE_LENGTH) } : {}),
    }
  }
  return Object.keys(result).length ? result : null
}

export function computeTotals(
  lineItems: QuoteLineItem[],
  tax_rate_bps: number,
  discount_cents: number,
): QuoteTotals {
  const subtotal = lineItems
    .filter(li => li.selected !== false)
    .reduce((acc, li) => acc + (li.subtotal_cents || 0), 0)
  const discount = Math.max(0, Math.min(subtotal, discount_cents || 0))
  const taxable = subtotal - discount
  const tax = Math.round((taxable * (tax_rate_bps || 0)) / 10000)
  const total = taxable + tax
  return { subtotal_cents: subtotal, tax_cents: tax, discount_cents: discount, total_cents: total }
}

export function generatePublicToken(): string {
  return randomBytes(24).toString('base64url')
}

/**
 * Per-tenant quote number: Q-YYYYMM-NNNN
 * NNNN is an atomic per-tenant-per-month sequence
 * (migrations/2026_07_13_document_number_atomic.sql) — a count-then-append
 * here let two concurrent creates land on the same number.
 */
export async function generateQuoteNumber(tenantId: string): Promise<string> {
  const now = new Date()
  const yyyy = now.getUTCFullYear()
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0')

  const { data: seq, error } = await supabaseAdmin.rpc('next_document_number', {
    p_tenant_id: tenantId,
    p_doc_type: 'quote',
    p_period: `${yyyy}${mm}`,
  })
  if (error) throw error

  const nnnn = String(seq).padStart(4, '0')
  return `Q-${yyyy}${mm}-${nnnn}`
}

export interface LogQuoteEventOpts {
  quote_id: string
  tenant_id: string
  event_type:
    | 'created'
    | 'edited'
    | 'sent'
    | 'viewed'
    | 'accepted'
    | 'declined'
    | 'converted'
    | 'reminder_sent'
    | 'expired'
    | 'voided'
  detail?: Record<string, unknown>
  ip_address?: string | null
  user_agent?: string | null
}

export async function logQuoteEvent(opts: LogQuoteEventOpts) {
  await supabaseAdmin.from('quote_activity').insert({
    quote_id: opts.quote_id,
    tenant_id: opts.tenant_id,
    event_type: opts.event_type,
    detail: opts.detail || null,
    ip_address: opts.ip_address || null,
    user_agent: opts.user_agent || null,
  })
}

export function formatCents(cents: number): string {
  const dollars = (cents || 0) / 100
  return dollars.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

export function formatBpsAsPct(bps: number): string {
  const pct = (bps || 0) / 100
  return `${pct.toFixed(pct % 1 === 0 ? 0 : 3)}%`
}
