/**
 * Schedules import — bring a new tenant's existing appointments into Full Loop.
 *
 * Each row must resolve to an ALREADY-IMPORTED client (match by phone, then name).
 * A row with a recurring_type ('weekly' | 'biweekly' | 'monthly') becomes a
 * recurring_schedules row; otherwise a one-time booking. Unmatched rows are
 * reported, never guessed — putting an appointment on the wrong customer's live
 * calendar is worse than skipping it.
 */
import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/require-permission'
import { tenantDb } from '@/lib/tenant-db'
import { audit } from '@/lib/audit'

type Row = {
  client_name?: string
  client_phone?: string
  staff_name?: string
  service_type?: string
  start?: string
  duration_hours?: string
  price?: string
  recurring_type?: string
  day_of_week?: string
  preferred_time?: string
  notes?: string
}

const RECURRING = ['weekly', 'biweekly', 'monthly']
const DOW: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
}

const digits = (s?: string) => (s || '').replace(/\D/g, '')
const priceCents = (s?: string) => {
  const n = parseFloat((s || '').replace(/[^0-9.]/g, ''))
  return Number.isFinite(n) ? Math.round(n * 100) : null
}

export async function POST(request: Request) {
  const { tenant, error: authError } = await requirePermission('bookings.create')
  if (authError) return authError
  const { tenantId } = tenant
  const db = tenantDb(tenantId)

  try {
    const body = await request.json()
    const rows: Row[] = Array.isArray(body.rows) ? body.rows : []
    if (rows.length === 0) return NextResponse.json({ error: 'No rows to import' }, { status: 400 })
    if (rows.length > 5000) return NextResponse.json({ error: 'Maximum 5,000 rows per import.' }, { status: 400 })

    // Load the tenant's clients + staff once, build match maps.
    const [{ data: clients }, { data: staff }] = await Promise.all([
      db.from('clients').select('id, name, phone'),
      db.from('team_members').select('id, name'),
    ])
    const byPhone = new Map<string, string>()
    const byName = new Map<string, string>()
    for (const c of clients || []) {
      const p = digits(c.phone as string)
      if (p.length >= 10) byPhone.set(p.slice(-10), c.id as string)
      if (c.name) byName.set((c.name as string).trim().toLowerCase(), c.id as string)
    }
    const staffByName = new Map<string, string>()
    for (const s of staff || []) if (s.name) staffByName.set((s.name as string).trim().toLowerCase(), s.id as string)

    const bookings: Record<string, unknown>[] = []
    const recurring: Record<string, unknown>[] = []
    const unmatched: string[] = []
    const errors: string[] = []

    rows.forEach((r, i) => {
      const line = i + 1
      // 1. Resolve client — phone first, then name. Never guess.
      const phone = digits(r.client_phone)
      let clientId = phone.length >= 10 ? byPhone.get(phone.slice(-10)) : undefined
      if (!clientId && r.client_name) clientId = byName.get(r.client_name.trim().toLowerCase())
      if (!clientId) {
        unmatched.push(`Row ${line}: no client match for "${r.client_name || r.client_phone || '—'}"`)
        return
      }
      const staffId = r.staff_name ? staffByName.get(r.staff_name.trim().toLowerCase()) || null : null
      const dur = parseFloat(r.duration_hours || '') || 2

      const rt = (r.recurring_type || '').trim().toLowerCase()
      if (rt) {
        // Recurring schedule.
        if (!RECURRING.includes(rt)) { errors.push(`Row ${line}: recurring_type must be weekly/biweekly/monthly`); return }
        const dowRaw = (r.day_of_week || '').trim().toLowerCase()
        const dow = dowRaw in DOW ? DOW[dowRaw] : /^[0-6]$/.test(dowRaw) ? Number(dowRaw) : null
        recurring.push({
          client_id: clientId, team_member_id: staffId,
          recurring_type: rt, day_of_week: dow, preferred_time: r.preferred_time || null,
          duration_hours: dur, notes: r.notes || null, status: 'active',
        })
      } else {
        // One-time booking. start required.
        const d = r.start ? new Date(r.start) : null
        if (!d || isNaN(d.getTime())) { errors.push(`Row ${line}: invalid/missing start date "${r.start || ''}"`); return }
        const end = new Date(d.getTime() + dur * 3600_000)
        const fmt = (x: Date) => x.toISOString().slice(0, 19) // timestamp without tz
        bookings.push({
          client_id: clientId, team_member_id: staffId,
          service_type: r.service_type || null, start_time: fmt(d), end_time: fmt(end),
          status: 'scheduled', price: priceCents(r.price), team_size: 1,
          notes: r.notes || null,
        })
      }
    })

    let importedBookings = 0
    let importedRecurring = 0
    const insertBatched = async (table: string, list: Record<string, unknown>[]) => {
      let n = 0
      for (let i = 0; i < list.length; i += 200) {
        const { data, error } = await db.from(table).insert(list.slice(i, i + 200)).select('id')
        if (error) errors.push(`${table} batch ${Math.floor(i / 200) + 1}: ${error.message}`)
        else n += data?.length || 0
      }
      return n
    }
    if (bookings.length) importedBookings = await insertBatched('bookings', bookings)
    if (recurring.length) importedRecurring = await insertBatched('recurring_schedules', recurring)

    await audit({
      tenantId, action: 'booking.created', entityType: 'booking',
      details: { type: 'schedule_import', importedBookings, importedRecurring, unmatched: unmatched.length, errors: errors.length, totalRows: rows.length },
    })

    return NextResponse.json({
      importedBookings, importedRecurring,
      unmatched: unmatched.length, unmatchedDetails: unmatched.slice(0, 30),
      errors: errors.slice(0, 30),
    })
  } catch (e) {
    console.error('Schedule import error:', e)
    return NextResponse.json({ error: 'Import failed. Check your data and try again.' }, { status: 500 })
  }
}
