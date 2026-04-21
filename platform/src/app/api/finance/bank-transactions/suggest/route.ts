/**
 * Bulk suggest categorization for all pending bank transactions.
 */
import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { suggestPending } from '@/lib/categorize-ai'

export async function POST() {
  try {
    const { tenantId } = await getTenantForRequest()
    const result = await suggestPending(tenantId)
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/finance/bank-transactions/suggest', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}
