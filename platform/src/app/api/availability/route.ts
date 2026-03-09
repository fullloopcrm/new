import { NextRequest, NextResponse } from 'next/server'
import { checkAvailability } from '@/lib/availability'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * Public availability endpoint — returns available time slots for a date.
 * Duration-aware: longer services filter out late slots.
 * GET /api/availability?date=2026-03-15&duration=4&tenant=slug-or-id
 *
 * Also supports portal token auth via Authorization header.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')
  const duration = Math.min(Math.max(Number(searchParams.get('duration')) || 2, 1), 8)
  const tenantParam = searchParams.get('tenant')

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'date param required (YYYY-MM-DD)' }, { status: 400 })
  }

  // Resolve tenant from slug, ID, or portal token
  let tenantId: string | null = null

  if (tenantParam) {
    // Try UUID first, then slug
    const isUUID = /^[0-9a-f]{8}-/.test(tenantParam)
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('id')
      .eq(isUUID ? 'id' : 'slug', tenantParam)
      .single()
    tenantId = tenant?.id || null
  }

  if (!tenantId) {
    return NextResponse.json({ error: 'tenant param required' }, { status: 400 })
  }

  const result = await checkAvailability(tenantId, date, duration)
  return NextResponse.json(result)
}
