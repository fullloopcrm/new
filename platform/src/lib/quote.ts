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

export function normalizeLineItems(items: Partial<QuoteLineItem>[]): QuoteLineItem[] {
  return (items || [])
    .filter(li => li && (li.name || li.quantity))
    .map((li, i) => {
      const quantity = Number(li.quantity) || 0
      const unit_price_cents = Number(li.unit_price_cents) || 0
      const subtotal_cents = Math.round(quantity * unit_price_cents)
      return {
        id: li.id || `li_${i}_${Date.now()}`,
        name: String(li.name || 'Item'),
        description: li.description ? String(li.description) : undefined,
        quantity,
        unit_price_cents,
        subtotal_cents,
        optional: !!li.optional,
        selected: li.optional ? !!li.selected : true,
      }
    })
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
 * NNNN is the count of tenant's quotes this calendar month + 1.
 */
export async function generateQuoteNumber(tenantId: string): Promise<string> {
  const now = new Date()
  const yyyy = now.getUTCFullYear()
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0')
  const monthStart = new Date(Date.UTC(yyyy, now.getUTCMonth(), 1))
  const nextMonth = new Date(Date.UTC(yyyy, now.getUTCMonth() + 1, 1))

  const { count } = await supabaseAdmin
    .from('quotes')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .gte('created_at', monthStart.toISOString())
    .lt('created_at', nextMonth.toISOString())

  const nnnn = String((count || 0) + 1).padStart(4, '0')
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
