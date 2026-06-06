import { NextResponse } from 'next/server'
import { scoreCleanersForBooking } from '@/lib/nycmaid/smart-schedule'
import { supabaseAdmin } from '@/lib/supabase'

const rl = new Map<string, { count: number; resetAt: number }>()
const RL_WINDOW_MS = 5 * 60 * 1000
const RL_MAX = 30
function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const e = rl.get(ip)
  if (!e || now > e.resetAt) {
    rl.set(ip, { count: 1, resetAt: now + RL_WINDOW_MS })
    return false
  }
  e.count++
  return e.count > RL_MAX
}

// Public-safe wrapper around scoreCleanersForBooking. Strips fields that
// could leak other clients' info before returning. NO admin auth — public
// + portal-authenticated callers both use this.
export async function GET(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')
  const startTime = searchParams.get('start_time')
  const duration = searchParams.get('duration')
  let clientAddress = searchParams.get('address')
  const clientId = searchParams.get('client_id')
  const hourlyRate = searchParams.get('hourly_rate')
  let tenantId: string | null = null
  let preferredCleanerId: string | null = null

  if (clientId) {
    const { data: client } = await supabaseAdmin
      .from('clients')
      .select('address, tenant_id, preferred_team_member_id')
      .eq('id', clientId)
      .maybeSingle()
    if (client) {
      tenantId = client.tenant_id
      preferredCleanerId = client.preferred_team_member_id || null
      if (!clientAddress) clientAddress = client.address || null
    }
  }

  // Fall back to an unscored list of active team members when slot info isn't
  // complete. Lets the booking form show the picker upfront.
  if (!date || !startTime || !clientAddress || !tenantId) {
    if (!tenantId) {
      return NextResponse.json({ cleaners: [] })
    }
    const { data: all } = await supabaseAdmin
      .from('team_members')
      .select('id, name')
      .eq('tenant_id', tenantId)
      .eq('active', true)
      .order('name')
    const cleaners = (all || []).map(c => ({
      id: c.id,
      name: c.name,
      is_preferred: c.id === preferredCleanerId,
      zone_match: false,
      reason: c.id === preferredCleanerId ? 'Your preferred cleaner' : 'Pick date + time to check availability',
    }))
    return NextResponse.json({ cleaners })
  }

  const scores = await scoreCleanersForBooking({
    date,
    startTime,
    durationHours: duration ? parseFloat(duration) : 2,
    clientAddress,
    clientId: clientId || undefined,
    hourlyRate: hourlyRate ? parseFloat(hourlyRate) : undefined,
  })

  const sanitized = scores
    .filter(s => s.available)
    .map(s => ({
      id: s.id,
      name: s.name,
      is_preferred: s.is_preferred,
      zone_match: s.zone_match,
      reason: s.is_preferred ? 'Your preferred cleaner' : s.zone_match ? 'Works in your area' : 'Available',
    }))

  return NextResponse.json({ cleaners: sanitized })
}
