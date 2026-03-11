import { NextRequest, NextResponse } from 'next/server'
import { checkTeamAvailability } from '@/lib/availability'
import { getCurrentTenant } from '@/lib/tenant'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * Admin endpoint — returns per-team-member availability for a specific time slot.
 * Now includes smart ranking: preferred → history → workload.
 *
 * GET /api/team-availability?date=2026-03-15&start_time=10:00&duration=3&exclude_booking=uuid&client_id=uuid
 */
export async function GET(request: NextRequest) {
  const tenant = await getCurrentTenant()
  if (!tenant) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')
  const startTime = searchParams.get('start_time') || '09:00'
  const duration = Math.min(Math.max(Number(searchParams.get('duration')) || 2, 1), 8)
  const excludeBooking = searchParams.get('exclude_booking') || undefined
  const clientId = searchParams.get('client_id') || undefined

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'date param required (YYYY-MM-DD)' }, { status: 400 })
  }

  // Get base availability
  const members = await checkTeamAvailability(tenant.id, date, startTime, duration, excludeBooking)

  // Smart ranking data
  let preferredMemberId: string | null = null
  let historyMap: Record<string, number> = {}
  let dayWorkload: Record<string, number> = {}
  let clientRequirements: string[] = []

  if (clientId) {
    // 1. Get client's preferred team member + requirements
    const { data: client } = await supabaseAdmin
      .from('clients')
      .select('preferred_team_member_id, requirements')
      .eq('id', clientId)
      .eq('tenant_id', tenant.id)
      .single()

    preferredMemberId = client?.preferred_team_member_id || null
    // requirements is a JSON array like ["has_car", "spanish"]
    try { clientRequirements = Array.isArray(client?.requirements) ? client.requirements : [] } catch { clientRequirements = [] }

    // 2. Get assignment history — how many times each member has serviced this client
    const { data: history } = await supabaseAdmin
      .from('bookings')
      .select('team_member_id')
      .eq('tenant_id', tenant.id)
      .eq('client_id', clientId)
      .not('team_member_id', 'is', null)
      .in('status', ['completed', 'paid', 'scheduled', 'confirmed', 'in_progress'])

    historyMap = {}
    for (const h of history || []) {
      if (h.team_member_id) {
        historyMap[h.team_member_id] = (historyMap[h.team_member_id] || 0) + 1
      }
    }
  }

  // Get team member skills/tags for matching
  const { data: memberDetails } = await supabaseAdmin
    .from('team_members')
    .select('id, skills')
    .eq('tenant_id', tenant.id)
    .eq('status', 'active')

  const memberSkills: Record<string, string[]> = {}
  for (const m of memberDetails || []) {
    try { memberSkills[m.id] = Array.isArray(m.skills) ? m.skills : [] } catch { memberSkills[m.id] = [] }
  }

  // 3. Get day workload — how many jobs each member has on this date
  const dayStart = date + 'T00:00:00'
  const dayEnd = date + 'T23:59:59'
  const { data: dayBookings } = await supabaseAdmin
    .from('bookings')
    .select('team_member_id')
    .eq('tenant_id', tenant.id)
    .gte('start_time', dayStart)
    .lte('start_time', dayEnd)
    .not('status', 'in', '("cancelled","no_show")')
    .not('team_member_id', 'is', null)

  dayWorkload = {}
  for (const b of dayBookings || []) {
    if (b.team_member_id) {
      dayWorkload[b.team_member_id] = (dayWorkload[b.team_member_id] || 0) + 1
    }
  }

  // Build ranked results
  const ranked = members.map(m => {
    const isPreferred = m.id === preferredMemberId
    const historyCount = historyMap[m.id] || 0
    const jobsToday = dayWorkload[m.id] || 0
    const skills = memberSkills[m.id] || []

    // Check if member meets client requirements
    const missingSkills = clientRequirements.filter(req => !skills.includes(req))
    const meetsRequirements = missingSkills.length === 0

    // Build tags
    const tags: string[] = []
    if (isPreferred) tags.push('preferred')
    if (historyCount > 0) tags.push(`${historyCount}x history`)
    if (jobsToday === 0) tags.push('light day')
    else if (jobsToday >= 3) tags.push(`${jobsToday} jobs today`)
    if (skills.length > 0) tags.push(...skills)
    if (missingSkills.length > 0) tags.push(`missing: ${missingSkills.join(', ')}`)

    // Score: higher = better suggestion
    let score = 0
    if (isPreferred) score += 1000
    if (m.available) score += 100
    if (meetsRequirements) score += 50
    else score -= 200 // penalize heavily if missing required skills
    score += historyCount * 10
    score -= jobsToday * 5

    return {
      ...m,
      preferred: isPreferred,
      history_count: historyCount,
      jobs_today: jobsToday,
      tags,
      score,
      meets_requirements: meetsRequirements,
      missing_skills: missingSkills,
    }
  })

  // Sort: available first, then by score descending
  ranked.sort((a, b) => {
    // Available members always above unavailable
    if (a.available && !b.available) return -1
    if (!a.available && b.available) return 1
    // Within same availability group, sort by score
    return b.score - a.score
  })

  // Check if any available member meets all requirements
  const qualifiedAvailable = ranked.filter(m => m.available && m.meets_requirements)
  const noQualifiedMatch = clientRequirements.length > 0 && qualifiedAvailable.length === 0

  return NextResponse.json({
    members: ranked,
    preferred_member_id: preferredMemberId,
    client_requirements: clientRequirements,
    no_qualified_match: noQualifiedMatch,
    qualified_count: qualifiedAvailable.length,
  })
}
