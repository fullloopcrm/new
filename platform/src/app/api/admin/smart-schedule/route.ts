import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { scoreTeamForBooking, pickBestTeam, suggestBookingSlots } from '@/lib/smart-schedule'

export async function GET(request: Request) {
  let ctx
  try {
    ctx = await getTenantForRequest()
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    throw err
  }

  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')
  const startTime = searchParams.get('start_time')
  const duration = searchParams.get('duration')
  const clientAddress = searchParams.get('address')
  const clientId = searchParams.get('client_id')
  const excludeBookingId = searchParams.get('exclude_booking')
  const hourlyRate = searchParams.get('hourly_rate')
  const teamSizeRaw = searchParams.get('team_size')
  const teamSize = teamSizeRaw ? Math.max(1, Math.min(8, parseInt(teamSizeRaw, 10) || 1)) : 1

  if (!date || !startTime || !clientAddress) {
    return NextResponse.json({ error: 'date, start_time, and address required' }, { status: 400 })
  }

  const durationHours = duration ? parseFloat(duration) : 2
  const rate = hourlyRate ? parseFloat(hourlyRate) : undefined

  const scores = await scoreTeamForBooking({
    tenantId: ctx.tenantId,
    date,
    startTime,
    durationHours,
    clientAddress,
    clientId: clientId || undefined,
    excludeBookingId: excludeBookingId || undefined,
    hourlyRate: rate,
  })

  // For team_size > 1 also return the suggested team picks (lead + extras).
  const team = teamSize > 1 ? pickBestTeam(scores, teamSize) : null

  // Alternate-time suggestions: computed only when asked (suggest=1), since it
  // scans the whole day. Admin is "always-on" — it surfaces better-routed times
  // even when the requested slot IS fillable (optimal routing), so we don't gate
  // on availability the way the public form does.
  let suggestions = null
  if (searchParams.get('suggest') === '1') {
    const raw = await suggestBookingSlots({
      tenantId: ctx.tenantId,
      date,
      durationHours,
      clientAddress,
      clientId: clientId || undefined,
      hourlyRate: rate,
      teamSize,
      requestedTime: startTime,
      excludeBookingId: excludeBookingId || undefined,
    })
    // Always-on, but honest: when someone IS free at the requested time, only
    // surface alternatives that genuinely beat the current best pick (by a real
    // margin) — so "better-routed times" actually means better. When nobody's
    // free, surface everything (the "no one's free, try these" case).
    const availableScores = scores.filter((s) => s.available).map((s) => s.score)
    if (availableScores.length > 0) {
      const bestCurrent = Math.max(...availableScores)
      suggestions = raw.filter((s) => s.score > bestCurrent + 5)
    } else {
      suggestions = raw
    }
  }

  return NextResponse.json({ cleaners: scores, team, suggestions })
}
