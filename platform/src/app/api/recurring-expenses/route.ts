/**
 * Recurring expenses (rent, insurance, software subs, etc.)
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'

// label/category/notes had no length cap (same DoS-bloat class fixed on
// import-clients/quote-templates/booking-notes). frequency/amount_cents feed
// cron/recurring-expenses' advance() switch and postJournalEntry() directly
// -- an invalid frequency silently falls into the cron's +30-day default
// instead of erroring, and a negative amount_cents balances against itself
// (debit === credit) so ledger.ts's imbalance check never catches it, posting
// a sign-flipped journal entry that corrupts the tenant's own books.
const MAX_LABEL = 200
const MAX_CATEGORY = 100
const MAX_NOTES = 2000
const FREQUENCIES = new Set(['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'])

function validExpenseBody(body: Record<string, unknown>): string | null {
  if (typeof body.label !== 'string' || !body.label.trim() || body.label.length > MAX_LABEL) {
    return `label is required (max ${MAX_LABEL} chars)`
  }
  if (typeof body.category === 'string' && body.category.length > MAX_CATEGORY) {
    return `category max ${MAX_CATEGORY} chars`
  }
  if (typeof body.notes === 'string' && body.notes.length > MAX_NOTES) {
    return `notes max ${MAX_NOTES} chars`
  }
  const amount = Number(body.amount_cents)
  if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount <= 0) {
    return 'amount_cents must be a positive integer'
  }
  if (typeof body.frequency !== 'string' || !FREQUENCIES.has(body.frequency)) {
    return `frequency must be one of ${[...FREQUENCIES].join(', ')}`
  }
  return null
}

export async function GET() {
  try {
    const { tenant, error: authError } = await requirePermission('finance.view')
    if (authError) return authError
    const { tenantId } = tenant
    const { data, error } = await supabaseAdmin
      .from('recurring_expenses')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('active', true)
      .order('next_due_date', { ascending: true, nullsFirst: false })
    if (error) throw error
    return NextResponse.json({ recurring_expenses: data || [] })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('GET /api/recurring-expenses', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { tenant, error: authError } = await requirePermission('finance.expenses')
    if (authError) return authError
    const { tenantId } = tenant
    const body = await request.json()
    const validationError = validExpenseBody(body)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }
    const { data, error } = await supabaseAdmin
      .from('recurring_expenses')
      .insert({
        tenant_id: tenantId,
        label: body.label,
        category: body.category || null,
        amount_cents: Number(body.amount_cents),
        frequency: body.frequency,
        start_date: body.start_date || new Date().toISOString().slice(0, 10),
        end_date: body.end_date || null,
        next_due_date: body.next_due_date || body.start_date || new Date().toISOString().slice(0, 10),
        notes: body.notes || null,
        active: body.active !== false,
      })
      .select('*')
      .single()
    if (error) throw error
    return NextResponse.json({ recurring_expense: data })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/recurring-expenses', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
