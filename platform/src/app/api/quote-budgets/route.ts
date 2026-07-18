/**
 * Master Budget — list quotes with their budget (if set), tenant-scoped.
 * Backs the Master Budget page under Sales. Per-quote budget CRUD lives at
 * /api/quote-budgets/[quoteId].
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'

export async function GET(request: Request) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('sales.view')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const limit = Math.min(500, Number(url.searchParams.get('limit')) || 200)

    let q = supabaseAdmin
      .from('quotes')
      .select('id, quote_number, title, status, total_cents, line_items, client_id, created_at, clients(id, name)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (status) q = q.eq('status', status)

    const { data: quotes, error: quotesErr } = await q
    if (quotesErr) throw quotesErr

    const quoteIds = (quotes || []).map((qt) => qt.id)
    const { data: budgets, error: budgetsErr } = quoteIds.length
      ? await supabaseAdmin
          .from('quote_budgets')
          .select('*')
          .eq('tenant_id', tenantId)
          .in('quote_id', quoteIds)
      : { data: [], error: null }
    if (budgetsErr) throw budgetsErr

    const budgetByQuote = new Map((budgets || []).map((b) => [b.quote_id, b]))
    const rows = (quotes || []).map((qt) => ({ ...qt, budget: budgetByQuote.get(qt.id) || null }))

    return NextResponse.json({ quotes: rows })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('GET /api/quote-budgets', err)
    return NextResponse.json({ error: 'Failed to load budgets' }, { status: 500 })
  }
}
