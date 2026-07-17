/**
 * Balance sheet from the ledger. GET /api/finance/balance-sheet?as_of=YYYY-MM-DD
 * Ledger-only — requires double-entry, which raw tables can't provide.
 */
import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/require-permission'
import { entityIdFromUrl } from '@/lib/entity'
import { ledgerBalanceSheet } from '@/lib/finance/ledger-reports'
import { nowNaiveET } from '@/lib/recurring'

export async function GET(request: Request) {
  const { tenant, error } = await requirePermission('finance.view')
  if (error) return error
  try {
    const url = new URL(request.url)
    // journal_entries.entry_date (queried below) is naive-ET -- defaulting
    // as_of off the server's UTC calendar shifted it by the ET/UTC gap
    // during the ~4-5h ET-evening window, same class as this session's other
    // entry_date-boundary fixes.
    const asOf = url.searchParams.get('as_of') || nowNaiveET().slice(0, 10)
    const sheet = await ledgerBalanceSheet(tenant.tenantId, asOf, entityIdFromUrl(url))
    return NextResponse.json(sheet)
  } catch (err) {
    console.error('GET /api/finance/balance-sheet', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}
