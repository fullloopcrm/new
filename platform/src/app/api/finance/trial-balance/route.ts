/**
 * Trial balance from the ledger. GET /api/finance/trial-balance?from=&to=
 * Every account's debit/credit totals + a proof the books balance.
 */
import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/require-permission'
import { entityIdFromUrl } from '@/lib/entity'
import { ledgerTrialBalance } from '@/lib/finance/ledger-reports'
import { nowNaiveET } from '@/lib/recurring'

// journal_entries.entry_date is naive-ET -- defaulting "from"/"to" off the
// server's UTC calendar shifted both by the ET/UTC gap during the ~4-5h
// ET-evening window, and on Dec 31 evening ET (real UTC already Jan 1)
// yearStart() jumped a full year ahead of "to", producing an empty/
// backwards range on the one evening finance most needs a real YTD number.
export function yearStart(): string { return `${nowNaiveET().slice(0, 4)}-01-01` }

export async function GET(request: Request) {
  const { tenant, error } = await requirePermission('finance.view')
  if (error) return error
  try {
    const url = new URL(request.url)
    const from = url.searchParams.get('from') || yearStart()
    const to = url.searchParams.get('to') || nowNaiveET().slice(0, 10)
    const tb = await ledgerTrialBalance(tenant.tenantId, from, to, entityIdFromUrl(url))
    return NextResponse.json(tb)
  } catch (err) {
    console.error('GET /api/finance/trial-balance', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}
