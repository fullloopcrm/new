/**
 * Bulk suggest categorization for all pending bank transactions.
 */
import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { suggestPending } from '@/lib/categorize-ai'
import { rateLimitDb } from '@/lib/rate-limit-db'

export async function POST() {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('finance.expenses')
    if (_authError) return _authError
    const { tenantId } = _authTenant

    // suggestPending fans out to up to 500 pending bank transactions, each a
    // potential paid Anthropic call for unseen descriptions (categorize-ai.ts).
    // Same "any authenticated tenant member, no cost control" gap as
    // finance/ai-ask and finance/receipts, but with a much larger per-call
    // multiplier — cap per-tenant invocation volume, not per-LLM-call.
    const rl = await rateLimitDb(`finance-bank-suggest:${tenantId}`, 10, 10 * 60 * 1000)
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many categorization requests. Try again shortly.' }, { status: 429 })
    }

    const result = await suggestPending(tenantId)
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/finance/bank-transactions/suggest', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}
