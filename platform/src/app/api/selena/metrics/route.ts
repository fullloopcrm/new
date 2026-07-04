import { NextRequest, NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { getTenantMetrics } from '@/lib/selena/metrics'

// Read-only Selena scoreboard for the caller's tenant. ?days=30 (default).
export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await getTenantForRequest()
    const { searchParams } = new URL(req.url)
    const days = Math.min(Math.max(parseInt(searchParams.get('days') || '30', 10) || 30, 1), 365)
    const metrics = await getTenantMetrics(tenantId, days)
    return NextResponse.json({ metrics })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('Selena metrics error:', err)
    return NextResponse.json({ error: 'Failed to load metrics' }, { status: 500 })
  }
}
