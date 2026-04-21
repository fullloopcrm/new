/**
 * Reconciliation candidates — returns pending bank txns alongside
 * matchable invoices / bookings / expenses with precomputed
 * suggested matches (amount + date proximity).
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'

interface BankTxn { id: string; txn_date: string; description: string; amount_cents: number; bank_account_id: string }
interface Invoice { id: string; invoice_number: string; total_cents: number; amount_paid_cents: number; due_date: string | null; contact_name: string | null; clients: { name: string } | null }
interface Booking { id: string; start_time: string; price: number | null; payment_status: string | null; clients: { name: string } | null }
interface Expense { id: string; date: string; category: string; amount: number; description: string | null; vendor_name: string | null }

function dateDeltaDays(a: string, b: string): number {
  return Math.abs((new Date(a).getTime() - new Date(b).getTime()) / 86400000)
}

function scoreMatch(target_amount_cents: number, target_date: string, bank_amount_cents: number, bank_date: string): number {
  const amtDiff = Math.abs(Math.abs(bank_amount_cents) - target_amount_cents)
  if (amtDiff > 200) return 0           // >$2 off = not a match
  const days = dateDeltaDays(target_date, bank_date)
  if (days > 14) return 0
  return Math.max(0, 0.98 - (amtDiff / 100) * 0.02 - days * 0.02)
}

export async function GET() {
  try {
    const { tenantId } = await getTenantForRequest()

    const [txnsRes, invRes, bookRes, expRes] = await Promise.all([
      supabaseAdmin
        .from('bank_transactions')
        .select('id, txn_date, description, amount_cents, bank_account_id')
        .eq('tenant_id', tenantId)
        .eq('status', 'pending')
        .order('txn_date', { ascending: false })
        .limit(300),
      supabaseAdmin
        .from('invoices')
        .select('id, invoice_number, total_cents, amount_paid_cents, due_date, contact_name, clients(name)')
        .eq('tenant_id', tenantId)
        .not('status', 'in', '(paid,void,refunded,draft)')
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(200),
      supabaseAdmin
        .from('bookings')
        .select('id, start_time, price, payment_status, clients(name)')
        .eq('tenant_id', tenantId)
        .eq('status', 'completed')
        .not('payment_status', 'in', '(paid,refunded)')
        .is('route_id', null)
        .order('start_time', { ascending: false })
        .limit(200),
      supabaseAdmin
        .from('expenses')
        .select('id, date, category, amount, description, vendor_name')
        .eq('tenant_id', tenantId)
        .is('matched_bank_transaction_id', null)
        .order('date', { ascending: false })
        .limit(200),
    ])

    const txns = (txnsRes.data || []) as BankTxn[]
    const invoices = (invRes.data || []) as unknown as Invoice[]
    const bookings = (bookRes.data || []) as unknown as Booking[]
    const expenses = (expRes.data || []) as Expense[]

    // Precompute best match per bank txn
    const suggestions: Record<string, { target_type: string; target_id: string; confidence: number; label: string } | null> = {}
    for (const t of txns) {
      let best: { target_type: string; target_id: string; confidence: number; label: string } | null = null
      if (t.amount_cents > 0) {
        // inflow → invoice or booking
        for (const inv of invoices) {
          const balance = inv.total_cents - (inv.amount_paid_cents || 0)
          if (balance <= 0) continue
          const sc = scoreMatch(balance, inv.due_date || t.txn_date, t.amount_cents, t.txn_date)
          if (sc > 0 && (!best || sc > best.confidence)) {
            best = { target_type: 'invoice', target_id: inv.id, confidence: sc, label: `${inv.invoice_number} · ${inv.clients?.name || inv.contact_name || ''}` }
          }
        }
        for (const b of bookings) {
          const priceCents = Math.round((Number(b.price) || 0) * 100)
          if (priceCents <= 0) continue
          const sc = scoreMatch(priceCents, b.start_time, t.amount_cents, t.txn_date)
          if (sc > 0 && (!best || sc > best.confidence)) {
            best = { target_type: 'booking', target_id: b.id, confidence: sc, label: `Booking · ${b.clients?.name || ''}` }
          }
        }
      } else {
        // outflow → expense
        for (const e of expenses) {
          const sc = scoreMatch(Math.abs(Number(e.amount) || 0), e.date, t.amount_cents, t.txn_date)
          if (sc > 0 && (!best || sc > best.confidence)) {
            best = { target_type: 'expense', target_id: e.id, confidence: sc, label: `${e.vendor_name || e.description || e.category}` }
          }
        }
      }
      suggestions[t.id] = best
    }

    return NextResponse.json({ bank_transactions: txns, invoices, bookings, expenses, suggestions })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('GET /api/finance/reconcile-candidates', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
