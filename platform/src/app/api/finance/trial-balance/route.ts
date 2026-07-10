/**
 * Trial balance from the ledger. GET /api/finance/trial-balance?from=&to=
 * Every account's debit/credit totals + a proof the books balance.
 */
import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/require-permission'
import { entityIdFromUrl } from '@/lib/entity'
import { ledgerTrialBalance } from '@/lib/finance/ledger-reports'

function yearStart(): string { return `${new Date().getUTCFullYear()}-01-01` }

export async function GET(request: Request) {
  const { tenant, error } = await requirePermission('finance.view')
  if (error) return error
  try {
    const url = new URL(request.url)
    const from = url.searchParams.get('from') || yearStart()
    const to = url.searchParams.get('to') || new Date().toISOString().slice(0, 10)
    const tb = await ledgerTrialBalance(tenant.tenantId, from, to, entityIdFromUrl(url))
    return NextResponse.json(tb)
  } catch (err) {
    console.error('GET /api/finance/trial-balance', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}
