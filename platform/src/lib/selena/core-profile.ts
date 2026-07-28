import { supabaseAdmin } from '@/lib/supabase'
import { yinezError, NYCMAID_TENANT_ID } from './core-types'

// ─── Client Profile ─────────────────────────────────────────────────────────

export async function getClientProfile(phone: string, tenantId?: string): Promise<string> {
  try {
    const tid = tenantId || NYCMAID_TENANT_ID
    const lookupPhone = phone.replace(/\D/g, '').slice(-10)
    const { data: client } = await supabaseAdmin.from('clients')
      .select('id, name, email, phone, address, notes, active, do_not_service, created_at')
      .eq('tenant_id', tid)
      .ilike('phone', `%${lookupPhone}%`).limit(1).single()
    if (!client) return JSON.stringify({ error: 'Client not found' })

    const { data: recentBookings } = await supabaseAdmin.from('bookings')
      .select('id, start_time, service_type, price, hourly_rate, status, payment_status, team_members(name)')
      .eq('tenant_id', tid).eq('client_id', client.id).in('status', ['completed', 'scheduled', 'in_progress', 'pending'])
      .order('start_time', { ascending: false }).limit(5)

    const { count: totalBookings } = await supabaseAdmin.from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tid).eq('client_id', client.id).in('status', ['completed', 'scheduled', 'in_progress'])

    let preferredCleaner: string | null = null
    const { data: completedBookings } = await supabaseAdmin.from('bookings')
      .select('team_members(name)').eq('tenant_id', tid).eq('client_id', client.id).eq('status', 'completed')
    if (completedBookings && completedBookings.length > 0) {
      const counts: Record<string, number> = {}
      for (const b of completedBookings) {
        const n = (b.team_members as unknown as { name: string })?.name
        if (n) counts[n] = (counts[n] || 0) + 1
      }
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
      if (sorted.length > 0) preferredCleaner = sorted[0][0]
    }

    const { data: memories } = await supabaseAdmin.from('yinez_memory')
      .select('type, content, created_at').eq('tenant_id', tid).eq('client_id', client.id)
      .order('created_at', { ascending: false }).limit(20)

    const upcoming = (recentBookings || [])
      .filter(b => ['scheduled', 'pending', 'in_progress'].includes(b.status))
      .map(b => ({
        booking_id: b.id, date: b.start_time?.split('T')[0],
        time: b.start_time ? new Date(b.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/New_York' }) : null,
        service_type: b.service_type, cleaner: (b.team_members as unknown as { name: string })?.name || 'unassigned',
        hourly_rate: b.hourly_rate, status: b.status, payment_status: b.payment_status,
      }))

    return JSON.stringify({
      name: client.name, address: client.address, email: client.email,
      notes: client.notes, active: client.active, do_not_service: client.do_not_service,
      total_bookings: totalBookings || 0, preferred_cleaner: preferredCleaner,
      last_rate: recentBookings?.[0]?.hourly_rate || null,
      upcoming,
      recent_bookings: (recentBookings || []).map(b => ({
        date: b.start_time?.split('T')[0], service_type: b.service_type,
        cleaner: (b.team_members as unknown as { name: string })?.name || 'unassigned',
        hourly_rate: b.hourly_rate, status: b.status, payment_status: b.payment_status,
      })),
      memories: (memories || []).map(m => ({ type: m.type, content: m.content })),
    })
  } catch (err) {
    await yinezError('getClientProfile', err)
    return JSON.stringify({ error: 'Failed to fetch profile' })
  }
}

// ─── Context Builders ───────────────────────────────────────────────────────

export function buildCalendarContext(): string {
  const now = new Date()
  const fullDate = now.toLocaleDateString('en-US', { timeZone: 'America/New_York', weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  const currentTime = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/New_York' })
  const currentHour = parseInt(now.toLocaleTimeString('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/New_York' }))
  const afterHours = currentHour >= 21 || currentHour < 7
  const timeNote = afterHours ? '\nAfter hours. Be brief.' : ''

  const days: string[] = []
  for (let i = 0; i < 14; i++) {
    const d = new Date(now.getTime() + i * 24 * 60 * 60 * 1000)
    days.push(`${d.toLocaleDateString('en-US', { timeZone: 'America/New_York', weekday: 'long', month: 'short', day: 'numeric' })} = ${d.toLocaleDateString('en-CA', { timeZone: 'America/New_York' })}`)
  }

  return `\n\nToday: ${fullDate}. Time: ${currentTime} ET.${timeNote}\nCALENDAR:\n${days.join('\n')}`
}

