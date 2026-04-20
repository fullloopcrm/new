/**
 * Admin-only endpoint to seed tenant defaults after creation.
 * POST /api/admin/businesses/:id/provision
 * Body: { industry?: 'cleaning'|'landscaping'|... , overrides?: {...} }
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/require-admin'
import { provisionTenant } from '@/lib/provision-tenant'

type IndustryKey = 'cleaning' | 'landscaping' | 'hvac' | 'plumbing' | 'handyman' | 'electrical' | 'pest' | 'general'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin()
  if (authError) return authError

  const { id } = await params
  const body = await request.json().catch(() => ({}))

  try {
    const result = await provisionTenant({
      tenantId: id,
      industry: (body.industry as IndustryKey) || undefined,
      overrides: body.overrides || undefined,
    })
    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    console.error('[provision] error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Provision failed' }, { status: 500 })
  }
}
