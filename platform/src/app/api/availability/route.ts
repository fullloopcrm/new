import { NextRequest, NextResponse } from 'next/server'
import { checkAvailability } from '@/lib/availability'
import { supabaseAdmin } from '@/lib/supabase'
import { rateLimitDb } from '@/lib/rate-limit-db'

/**
 * Public availability endpoint — returns available time slots for a date.
 * Duration-aware: longer services filter out late slots.
 * GET /api/availability?date=2026-03-15&duration=4&tenant=slug-or-id
 *
 * Also supports portal token auth via Authorization header.
 *
 * Rate-limited per-IP (not per-tenant): the `tenant` param accepts a
 * free-form slug/UUID and resolves silently to a generic "tenant param
 * required" error either way, so a per-tenant key would let a caller
 * rotate slugs to keep enumerating tenants unthrottled.
 */
export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = await rateLimitDb(`availability:${ip}`, 30, 5 * 60 * 1000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

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
