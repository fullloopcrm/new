/**
 * GET  /api/finance/ledger   — list recent journal entries (register) + period totals.
 *        ?from=YYYY-MM-DD&to=YYYY-MM-DD&limit=&offset=
 * POST /api/finance/ledger   — create a manual balanced journal entry, OR
 *        { backfill: true }  — post historical bookings into the ledger.
 *
 * The ledger is the single source of truth for the Bookkeeping surface. Reads
 * require finance.view; writes require finance.expenses. Tenant-scoped.
 */
import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { listLedgerEntries, ledgerTotals } from '@/lib/finance/ledger-list'
import { postJournalEntry, ensureChartAccounts } from '@/lib/ledger'
import { backfillRevenueFromBookings, backfillUnpostedRevenue } from '@/lib/finance/post-revenue'

export async function GET(request: Request) {
  try {
    const { tenant: _t, error: _e } = await requirePermission('finance.view')
    if (_e) return _e
    const { tenantId } = _t

    const url = new URL(request.url)
    const from = url.searchParams.get('from') || undefined
    const to = url.searchParams.get('to') || undefined
    const limit = url.searchParams.get('limit') ? Number(url.searchParams.get('limit')) : undefined
    const offset = url.searchParams.get('offset') ? Number(url.searchParams.get('offset')) : undefined

    const [list, totals] = await Promise.all([
      listLedgerEntries(tenantId, { from, to, limit, offset }),
      ledgerTotals(tenantId, { from, to }),
    ])

    return NextResponse.json({ entries: list.entries, total: list.total, totals })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('GET /api/finance/ledger', err)
    return NextResponse.json({ error: 'Failed to load ledger' }, { status: 500 })
  }
}

interface ManualLineInput {
  coa_id?: string
  debit_cents?: number | string
  credit_cents?: number | string
  memo?: string
}

export async function POST(request: Request) {
  try {
    const { tenant: _t, error: _e } = await requirePermission('finance.expenses')
    if (_e) return _e
    const { tenantId } = _t
    const body = await request.json().catch(() => ({}))

    // ── Historical backfill: post paid bookings + recorded payments to the ledger.
    if (body.backfill) {
      const [bookings, payments] = await Promise.all([
        backfillRevenueFromBookings(tenantId),
        backfillUnpostedRevenue(tenantId),
      ])
      return NextResponse.json({
        ok: true,
        backfilled: {
          bookings_scanned: bookings.scanned,
          revenue_posted: bookings.revenuePosted,
          labor_posted: bookings.cogsPosted,
          payments_posted: payments.posted,
        },
      })
    }

    // ── Manual journal entry.
    const entryDate = String(body.entry_date || '').slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entryDate)) {
      return NextResponse.json({ error: 'entry_date (YYYY-MM-DD) is required' }, { status: 400 })
    }
    const rawLines: ManualLineInput[] = Array.isArray(body.lines) ? body.lines : []
    const lines = rawLines
      .map((l) => ({
        coa_id: String(l.coa_id || ''),
        debit_cents: Math.max(0, Math.round(Number(l.debit_cents) || 0)),
        credit_cents: Math.max(0, Math.round(Number(l.credit_cents) || 0)),
        memo: l.memo ? String(l.memo) : undefined,
      }))
      .filter((l) => l.coa_id && (l.debit_cents > 0 || l.credit_cents > 0))

    if (lines.length < 2) {
      return NextResponse.json({ error: 'A journal entry needs at least two lines' }, { status: 400 })
    }
    for (const l of lines) {
      if (l.debit_cents > 0 && l.credit_cents > 0) {
        return NextResponse.json({ error: 'Each line is either a debit or a credit, not both' }, { status: 400 })
      }
    }
    const totalDebits = lines.reduce((s, l) => s + l.debit_cents, 0)
    const totalCredits = lines.reduce((s, l) => s + l.credit_cents, 0)
    if (totalDebits !== totalCredits) {
      return NextResponse.json({
        error: `Entry is not balanced — debits ${(totalDebits / 100).toFixed(2)} vs credits ${(totalCredits / 100).toFixed(2)}`,
      }, { status: 400 })
    }

    await ensureChartAccounts(tenantId)
    const entryId = await postJournalEntry({
      tenant_id: tenantId,
      entry_date: entryDate,
      memo: body.memo ? String(body.memo) : 'Manual entry',
      source: 'manual',
      lines,
    })

    return NextResponse.json({ ok: true, entry_id: entryId })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    const msg = err instanceof Error ? err.message : 'Failed to save entry'
    console.error('POST /api/finance/ledger', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
