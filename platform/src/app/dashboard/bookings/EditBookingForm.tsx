'use client'

// Extracted from BookingsAdmin.tsx's edit-booking modal so any page that
// picks an existing booking (Bookings' own edit panel, Find a Team Member's
// "reopen and edit") can save changes back through the same single-vs-series
// logic: a plain PUT for a one-off booking, or the same regenerate/batch-
// update path BookingsAdmin uses for a recurring series.
//
// Deliberately excludes check-in/check-out time editing, payment_status/
// payment_method, and closeout -- those only make sense once a cleaner is
// assigned and the job is underway or complete. Every caller of this
// component today only ever hands it an unassigned, scheduled booking.
import './schedule.css'
import { useEffect, useState } from 'react'
import { useWorkerLabel } from '../worker-label-context'
import { buildMemberColors, colorForMember, type ColorableMember } from '../calendar/_colors'
import { RecurringOptions } from './_RecurringOptions'
import { useTenantTimezone } from '@/hooks/useTenantTimezone'
import { generateInitialBatchDates, getRecurringDisplayName, buildSeriesUpdateData, type RecurringType, type RepeatEnd } from '@/lib/recurring'
import { useServiceTypes } from '@/lib/useServiceTypes'
import { applyDiscount, applyCredit } from '@/lib/discount'
import {
  SuggestionStrip,
  getCleanerAvailability,
  type SmartScore,
  type SlotSuggestion,
  type AvailabilityBooking,
} from './_create-booking-shared'

// See BookingsAdmin.tsx's identical comment -- recurring_schedules.recurring_type
// needs the raw RecurringType key, not the display-name badge bookings.recurring_type stores.
function rawRecurringType(repeatType: string): string {
  return repeatType === 'monthly_day' ? 'monthly_weekday' : repeatType
}

function reverseRecurringType(displayName: string | null): string {
  if (!displayName) return 'weekly'
  const lower = displayName.toLowerCase()
  if (lower === 'daily') return 'daily'
  if (lower === 'weekly') return 'weekly'
  if (lower === 'bi-weekly') return 'biweekly'
  if (lower === 'tri-weekly') return 'triweekly'
  if (lower === 'monthly') return 'monthly_date'
  if (lower === 'custom') return 'custom'
  if (/^\d/.test(displayName)) return 'monthly_day'
  return 'weekly'
}

function parseNaive(s: string): { date: string; time: string } {
  const [datePart, timePart] = s.split('T')
  return { date: datePart, time: (timePart || '00:00').slice(0, 5) }
}

interface Cleaner { id: string; name: string; hourly_rate?: number; working_days?: string[]; unavailable_dates?: string[]; schedule?: Record<string, unknown>; active?: boolean; status?: string; max_jobs_per_day?: number }
interface Referrer { id: string; name: string; ref_code: string; active: boolean }
interface SalesPartner { id: string; name: string; referral_code: string; active: boolean }

export interface EditableBooking {
  id: string
  client_id: string
  start_time: string
  end_time: string
  service_type: string
  price: number
  status: string
  notes: string | null
  team_member_id: string | null
  hourly_rate: number | null
  pay_rate: number | null
  recurring_type: string | null
  schedule_id: string | null
  actual_hours: number | null
  discount_percent: number | null
  one_time_credit_cents: number | null
  one_time_credit_reason: string | null
  property_id?: string | null
  team_size?: number | null
  max_hours?: number | null
  referrer_id?: string | null
  sales_partner_id?: string | null
  clients: { name: string; phone?: string | null; address: string | null } | null
}

export interface EditBookingFormProps {
  booking: EditableBooking
  // Hides the team-member roster/rate/team-size block entirely -- same
  // reasoning as CreateBookingForm's identical prop: Find a Team Member
  // edits an UNASSIGNED booking specifically so it can be broadcast: who
  // covers it isn't decided here.
  hideCleanerPicker?: boolean
  onSaved: () => void
  onCancel: () => void
}

export default function EditBookingForm({ booking, hideCleanerPicker, onSaved, onCancel }: EditBookingFormProps) {
  const timezone = useTenantTimezone()
  const worker = useWorkerLabel()
  const serviceTypesData = useServiceTypes()
  const serviceTypes = serviceTypesData.map(s => s.name)

  const [cleaners, setCleaners] = useState<Cleaner[]>([])
  const [referrers, setReferrers] = useState<Referrer[]>([])
  const [salesPartners, setSalesPartners] = useState<SalesPartner[]>([])
  const [memberColors, setMemberColors] = useState<Record<string, string>>({})
  const [dayBookings, setDayBookings] = useState<AvailabilityBooking[]>([])
  const [clientProperties, setClientProperties] = useState<{ id: string; address: string; is_primary: boolean }[]>([])
  const [saving, setSaving] = useState(false)
  const [showUpdateChoice, setShowUpdateChoice] = useState(false)
  const [showOneTimeCredit, setShowOneTimeCredit] = useState(!!booking.one_time_credit_cents)

  const start = parseNaive(booking.start_time)
  const end = parseNaive(booking.end_time)
  const [sh, sm] = start.time.split(':').map(Number)
  const [eh, em] = end.time.split(':').map(Number)
  const initialHours = Math.round(((eh * 60 + em) - (sh * 60 + sm)) / 60) || 2
  const initialRate = booking.hourly_rate || (booking.price && initialHours ? Math.round(booking.price / 100 / initialHours) : 69)
  const hasDiscount = !!booking.discount_percent && booking.discount_percent > 0
  const endDate3 = new Date()
  endDate3.setMonth(endDate3.getMonth() + 3)

  const [form, setForm] = useState({
    status: booking.status,
    notes: booking.notes || '',
    team_member_id: booking.team_member_id || '',
    start_date: start.date,
    start_time: start.time,
    hours: initialHours,
    service_type: booking.service_type,
    hourly_rate: initialRate,
    discount_enabled: hasDiscount,
    discount_percent: hasDiscount ? (booking.discount_percent as number) : 10,
    one_time_credit_dollars: booking.one_time_credit_cents ? booking.one_time_credit_cents / 100 : 0,
    one_time_credit_reason: booking.one_time_credit_reason || '',
    repeat_enabled: !!booking.recurring_type,
    repeat_type: reverseRecurringType(booking.recurring_type),
    repeat_end: 'never' as string,
    repeat_end_count: 10,
    repeat_end_date: endDate3.toISOString().split('T')[0],
    custom_interval: 3,
    actual_hours: booking.actual_hours,
    pay_rate: booking.pay_rate ?? null as number | null,
    team_size: booking.team_size || 1,
    extra_team_member_ids: [] as string[],
    max_hours: booking.max_hours ?? null as number | null,
    property_id: booking.property_id || '',
    referrer_id: booking.referrer_id || '',
    sales_partner_id: booking.sales_partner_id || '',
    _originalPrice: booking.price,
  })

  const [smartScores, setSmartScores] = useState<Record<string, SmartScore>>({})
  const [smartScoresKey, setSmartScoresKey] = useState('')
  const [suggestions, setSuggestions] = useState<SlotSuggestion[]>([])

  useEffect(() => {
    fetch('/api/cleaners').then(r => r.ok ? r.json() : null).then(j => {
      if (!j) return
      setCleaners(Array.isArray(j) ? j : (j.cleaners ?? j.team ?? []))
    }).catch(() => {})
    fetch('/api/team').then(r => r.ok ? r.json() : null).then(d => {
      if (!d) return
      const members: ColorableMember[] = Array.isArray(d) ? d : (d.team || d.team_members || [])
      setMemberColors(buildMemberColors(members))
    }).catch(() => {})
    fetch('/api/referrers').then(r => r.ok ? r.json() : null).then(j => { if (j) setReferrers(Array.isArray(j) ? j : (j.referrers ?? [])) }).catch(() => {})
    fetch('/api/sales-partners').then(r => r.ok ? r.json() : null).then(j => { if (j) setSalesPartners(Array.isArray(j) ? j : (j.sales_partners ?? [])) }).catch(() => {})
  }, [])

  // Existing team extras for this booking -- mirrors BookingsAdmin's openEdit.
  useEffect(() => {
    if (!booking.team_size || booking.team_size <= 1) return
    fetch(`/api/bookings/${booking.id}/team`).then(r => r.ok ? r.json() : null).then((data: { extras?: string[] } | null) => {
      if (data?.extras) setForm(prev => ({ ...prev, extra_team_member_ids: data.extras || [] }))
    }).catch(() => {})
  }, [booking.id, booking.team_size])

  useEffect(() => {
    fetch(`/api/client/properties?client_id=${booking.client_id}`)
      .then(r => r.json())
      .then(d => setClientProperties(d.properties || []))
      .catch(() => {})
  }, [booking.client_id])

  useEffect(() => {
    const date = form.start_date
    if (hideCleanerPicker || !date) { setDayBookings([]); return }
    let cancelled = false
    fetch(`/api/bookings?from=${date}&to=${date}&limit=1000`)
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        if (cancelled || !json) return
        const rows: AvailabilityBooking[] = Array.isArray(json) ? json : (json.bookings ?? [])
        setDayBookings(rows)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [form.start_date, hideCleanerPicker])

  // Smart-schedule scores, excluding this booking itself from conflict math.
  useEffect(() => {
    const ctxAddress = booking.clients?.address || ''
    if (hideCleanerPicker || !ctxAddress || !form.start_date || !form.start_time) return
    const key = [booking.client_id, ctxAddress, form.start_date, form.start_time, form.hours, form.hourly_rate || '', booking.id, form.team_size].join('|')
    if (key === smartScoresKey) return

    const controller = new AbortController()
    const params = new URLSearchParams({
      date: form.start_date,
      start_time: form.start_time,
      duration: String(form.hours),
      address: ctxAddress,
      client_id: booking.client_id,
      team_size: String(form.team_size),
    })
    if (form.hourly_rate != null) params.set('hourly_rate', String(form.hourly_rate))
    params.set('exclude_booking', booking.id)
    params.set('suggest', '1')

    fetch(`/api/admin/smart-schedule?${params.toString()}`, { signal: controller.signal })
      .then(r => r.ok ? r.json() : null)
      .then((data: { cleaners?: SmartScore[]; suggestions?: SlotSuggestion[] | null } | null) => {
        if (!data?.cleaners) return
        const map: Record<string, SmartScore> = {}
        for (const c of data.cleaners) map[c.id] = c
        setSmartScores(map)
        setSmartScoresKey(key)
        setSuggestions(data.suggestions || [])
      })
      .catch(() => {})

    return () => controller.abort()
  }, [booking.id, booking.client_id, booking.clients?.address, form.start_date, form.start_time, form.hours, form.hourly_rate, form.team_size, smartScoresKey, hideCleanerPicker])

  const calculateEditPrice = () => {
    const teamSize = Math.max(1, form.team_size || 1)
    const discountPercent = form.discount_enabled ? form.discount_percent : null
    const creditCents = form.one_time_credit_dollars > 0 ? Math.round(form.one_time_credit_dollars * 100) : null
    if (form.actual_hours && form.actual_hours > 0) {
      const basePrice = Math.round(form.actual_hours * form.hourly_rate * teamSize * 100)
      return applyCredit(applyDiscount(basePrice, discountPercent), creditCents)
    }
    const basePrice = form.hours * form.hourly_rate * teamSize * 100
    return applyCredit(applyDiscount(basePrice, discountPercent), creditCents)
  }

  const pricingChanged = () => {
    const origRate = booking.hourly_rate || form.hourly_rate
    const recomputed = calculateEditPrice()
    const priceDelta = Math.abs(recomputed - booking.price)
    return form.hours !== initialHours || form.hourly_rate !== origRate || priceDelta > 100 || form.actual_hours !== booking.actual_hours
  }

  const getEstimatedHoursRange = (hours: number) => {
    const ranges: Record<number, string> = { 1: '1-2', 2: '2-3', 3: '3-4', 4: '4-6', 5: '5-7', 6: '6-8', 7: '7-9' }
    return ranges[hours] || hours + '-' + (hours + 2)
  }

  const editRecurringDates = generateInitialBatchDates({
    recurringType: rawRecurringType(form.repeat_type) as RecurringType,
    startDate: form.start_date,
    repeatEnabled: form.repeat_enabled,
    repeatEnd: form.repeat_end as RepeatEnd,
    repeatEndCount: form.repeat_end_count,
    repeatEndDate: form.repeat_end_date,
    customIntervalWeeks: form.custom_interval,
  })

  const buildNaiveTime = (date: string, time: string, addHours: number = 0) => {
    const [h, m] = time.split(':').map(Number)
    const totalMinutes = h * 60 + m + addHours * 60
    const newH = Math.floor(totalMinutes / 60) % 24
    const newM = totalMinutes % 60
    return `${date}T${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}:00`
  }

  const naiveMinuteDiff = (a: string, b: string) => {
    const [ad, at] = a.split('T'); const [bd, bt] = b.split('T')
    const [ay, am, aday] = ad.split('-').map(Number); const [by, bm, bday] = bd.split('-').map(Number)
    const [ah, amin] = at.split(':').map(Number); const [bh, bmin] = bt.split(':').map(Number)
    const aTotal = new Date(ay, am - 1, aday).getTime() / 60000 + ah * 60 + amin
    const bTotal = new Date(by, bm - 1, bday).getTime() / 60000 + bh * 60 + bmin
    return aTotal - bTotal
  }

  const shiftNaive = (s: string, minutes: number) => {
    const [datePart, timePart] = s.split('T')
    const [y, mo, d] = datePart.split('-').map(Number)
    const [h, m] = timePart.split(':').map(Number)
    const dt = new Date(y, mo - 1, d, h, m + minutes)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}:00`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // A pending booking left pending on save silently falls through the
    // cracks -- it never shows as confirmed work, so nothing downstream
    // (schedule, cleaner notification, reminders) ever fires for it. Force
    // the status to actually change before the save is allowed through.
    if (form.status === 'pending') {
      alert('This booking is still Pending. Change the status before saving.')
      return
    }
    if (booking.recurring_type || booking.schedule_id) {
      setShowUpdateChoice(true)
      return
    }
    await saveBooking('single')
  }

  const saveBooking = async (scope: 'single' | 'all') => {
    setSaving(true)
    setShowUpdateChoice(false)
    let convertedToRecurring = false

    const newStartStr = buildNaiveTime(form.start_date, form.start_time)
    const newEndStr = buildNaiveTime(form.start_date, form.start_time, form.hours)
    const recurringType = form.repeat_enabled ? getRecurringDisplayName(form.repeat_type, form.start_date) : null

    const updateData = {
      ...form,
      team_member_id: form.team_member_id || null,
      property_id: form.property_id || null,
      start_time: newStartStr,
      end_time: newEndStr,
      price: pricingChanged() ? calculateEditPrice() : form._originalPrice,
      recurring_type: recurringType,
      discount_percent: form.discount_enabled ? form.discount_percent : null,
      one_time_credit_cents: form.one_time_credit_dollars > 0 ? Math.round(form.one_time_credit_dollars * 100) : null,
      one_time_credit_reason: form.one_time_credit_dollars > 0 ? (form.one_time_credit_reason || null) : null,
      force: true,
    }

    if (scope === 'all' && (booking.schedule_id || booking.recurring_type)) {
      // booking.recurring_type is the RAW recurring_schedules key ('weekly',
      // 'biweekly', ...) for every schedule-linked booking -- it's written
      // straight from POST /api/admin/recurring-schedules's own recurring_type
      // param (see route.ts), never through getRecurringDisplayName. Comparing
      // it against the display-name `recurringType` computed above ('Weekly')
      // made patternChanged true on EVERY "all future bookings" save, even
      // pure time/cleaner edits with no pattern change -- routing every edit
      // through the destructive /regenerate rebuild (capped to a ~6-week
      // window, cron backfills the rest) instead of the lightweight in-place
      // /api/bookings/batch-update path meant for this case. Compare raw to
      // raw, same normalization already used to build the regenerate/create
      // payloads elsewhere in this file.
      const oldRecurringType = booking.recurring_type
      const patternChanged = rawRecurringType(form.repeat_type) !== oldRecurringType

      if (patternChanged && booking.schedule_id && form.repeat_enabled) {
        const startDateObj = new Date(form.start_date + 'T12:00:00')
        const allDates = generateInitialBatchDates({
          recurringType: rawRecurringType(form.repeat_type) as RecurringType,
          startDate: form.start_date,
          repeatEnabled: true,
          repeatEnd: form.repeat_end as RepeatEnd,
          repeatEndCount: form.repeat_end_count,
          repeatEndDate: form.repeat_end_date,
          customIntervalWeeks: form.custom_interval,
        })
        // Same 6-week initial-batch cutoff CreateBookingForm applies -- the
        // recurring cron backfills the rest. Without this, an unbounded
        // pattern (e.g. "never end") always exceeds /regenerate's 60-date cap.
        const sixWeeksOut = new Date(form.start_date + 'T12:00:00')
        sixWeeksOut.setDate(sixWeeksOut.getDate() + 42)
        const cutoffDate = sixWeeksOut.toISOString().split('T')[0]
        const newDates = allDates.filter(d => d <= cutoffDate)
        const res = await fetch('/api/admin/recurring-schedules/' + booking.schedule_id + '/regenerate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recurring_type: rawRecurringType(form.repeat_type),
            day_of_week: startDateObj.getDay(),
            preferred_time: form.start_time,
            duration_hours: form.hours,
            hourly_rate: form.hourly_rate,
            team_member_id: form.team_member_id,
            service_type: form.service_type,
            price: pricingChanged() ? calculateEditPrice() : form._originalPrice,
            status: 'scheduled',
            notes: form.notes || null,
            dates: newDates,
            from_date: booking.start_time,
            discount_percent: form.discount_enabled ? form.discount_percent : null,
            referrer_id: form.referrer_id || null,
            sales_partner_id: form.sales_partner_id || null,
          })
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Unknown error' }))
          alert(`Failed to update recurring series: ${err.error || res.statusText}`)
          setSaving(false)
          return
        }
        // Endpoint falls back to per-row insert and can succeed with some
        // dates skipped (collision) instead of failing outright -- surface that.
        const regenResult = await res.json().catch(() => null)
        if (regenResult?.skipped_dates?.length > 0) {
          alert(`Recurring series updated, but ${regenResult.skipped_dates.length} occurrence(s) were skipped (date/service conflict): ${regenResult.skipped_dates.join(', ')}. Check these dates manually.`)
        }
      } else {
        const deltaMinutes = naiveMinuteDiff(newStartStr, booking.start_time)
        const durationMinutes = form.hours * 60

        // Self-contained: fetch this client's own scheduled bookings rather
        // than requiring the caller's full preloaded list as a prop (same
        // reasoning as CreateBookingForm's per-day availability fetch).
        const futureRes = await fetch(`/api/bookings?client_id=${booking.client_id}&status=scheduled&limit=500`)
        const futureJson = await futureRes.json().catch(() => null)
        const allClientBookings: { id: string; start_time: string; schedule_id?: string | null; recurring_type?: string | null; status: string }[] =
          Array.isArray(futureJson) ? futureJson : (futureJson?.bookings ?? [])

        const futureBookings = booking.schedule_id
          ? allClientBookings.filter(b => b.schedule_id === booking.schedule_id && b.status === 'scheduled' && b.start_time >= booking.start_time)
          : allClientBookings.filter(b => b.recurring_type === booking.recurring_type && b.status === 'scheduled' && b.start_time >= booking.start_time)

        const batchUpdates = futureBookings.map(b => ({
          id: b.id,
          data: buildSeriesUpdateData({
            startTime: shiftNaive(b.start_time, deltaMinutes),
            endTime: shiftNaive(b.start_time, deltaMinutes + durationMinutes),
            teamMemberId: form.team_member_id || null,
            price: pricingChanged() ? calculateEditPrice() : form._originalPrice,
            hourlyRate: form.hourly_rate,
            serviceType: form.service_type,
            notes: form.notes || null,
            recurringType: recurringType,
            discountPercent: form.discount_enabled ? form.discount_percent : null,
            referrerId: form.referrer_id || null,
            salesPartnerId: form.sales_partner_id || null,
          })
        }))

        const res = await fetch('/api/bookings/batch-update', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updates: batchUpdates, notify_type: deltaMinutes !== 0 ? 'rescheduled' : 'booking_updated' })
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Unknown error' }))
          alert(`Failed to update series: ${err.error || res.statusText}`)
          setSaving(false)
          return
        }

        if (booking.schedule_id) {
          await fetch('/api/admin/recurring-schedules/' + booking.schedule_id, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              preferred_time: form.start_time,
              duration_hours: form.hours,
              hourly_rate: form.hourly_rate,
              team_member_id: form.team_member_id,
              notes: form.notes || null,
              discount_percent: form.discount_enabled ? form.discount_percent : null,
              referrer_id: form.referrer_id || null,
              sales_partner_id: form.sales_partner_id || null,
            })
          })
        }
      }
    } else if (form.repeat_enabled && !booking.recurring_type && editRecurringDates.length > 1) {
      convertedToRecurring = true
      // Converting an existing one-time booking into a recurring series.
      // Routed through the same canonical endpoint CreateBookingForm.tsx
      // uses to create a brand-new recurring booking (POST
      // /api/admin/recurring-schedules) instead of hand-rolling it here --
      // that's the only endpoint that both creates a real recurring_schedules
      // row AND stamps recurring_type + schedule_id on every booking it
      // generates. The old code PUT the original booking then looped
      // individual POST /api/bookings calls per future date; neither
      // endpoint's field allowlist included recurring_type, and POST
      // /api/bookings has no schedule_id parameter at all -- so every
      // "converted" booking silently stayed one-time in the DB with no
      // error shown anywhere (the save appeared to succeed).
      //
      // Same 6-week initial-batch cutoff CreateBookingForm.tsx applies
      // before sending -- editRecurringDates itself is uncapped (up to
      // ~500 dates for "never end"), and the endpoint now rejects anything
      // over its own server-side cap; slicing here keeps the normal case
      // from ever hitting that error.
      const fourWeeksOut = new Date(form.start_date + 'T12:00:00')
      fourWeeksOut.setDate(fourWeeksOut.getDate() + 42)
      const cutoff = fourWeeksOut.toISOString().split('T')[0]
      const initialDates = editRecurringDates.filter(d => d <= cutoff)
      const startDateObj = new Date(form.start_date + 'T12:00:00')

      const scheduleRes = await fetch('/api/admin/recurring-schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: booking.client_id,
          property_id: form.property_id || null,
          team_member_id: form.team_member_id || null,
          recurring_type: rawRecurringType(form.repeat_type),
          day_of_week: startDateObj.getDay(),
          preferred_time: form.start_time,
          duration_hours: form.hours,
          hourly_rate: form.hourly_rate,
          pay_rate: form.pay_rate,
          notes: form.notes || null,
          start_date: form.start_date,
          price: calculateEditPrice(),
          service_type: form.service_type,
          status: 'scheduled',
          dates: initialDates,
          discount_percent: form.discount_enabled ? form.discount_percent : null,
          referrer_id: form.referrer_id || null,
          sales_partner_id: form.sales_partner_id || null,
        })
      })
      if (!scheduleRes.ok) {
        const err = await scheduleRes.json().catch(() => ({ error: 'Unknown error' }))
        alert(`Failed to create recurring schedule: ${err.error || scheduleRes.statusText}`)
        setSaving(false)
        return
      }

      // The new schedule's own first generated booking now covers this
      // date -- retire the original one-time booking rather than leaving a
      // duplicate on the calendar for the same client/date. Plain status
      // update, no client notification (matches the schedule endpoint's own
      // no-client-comms admin-flow policy).
      await fetch('/api/bookings/' + booking.id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled', force: true })
      })
    } else {
      const res = await fetch('/api/bookings/' + booking.id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }))
        alert(`Failed to save booking: ${err.error || res.statusText}`)
        setSaving(false)
        return
      }
    }

    // Skipped when this save just retired `booking.id` in favor of a new
    // schedule's own bookings above -- setting a team on a now-cancelled
    // booking is pointless and would be operating on the wrong row.
    if (!convertedToRecurring) {
      await fetch(`/api/bookings/${booking.id}/team`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: form.team_member_id || null,
          extra_team_member_ids: form.extra_team_member_ids,
          team_size: form.team_size,
        })
      })
    }

    setSaving(false)
    onSaved()
  }

  return (
    <div className="sched-scope">
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--sched-ink)] mb-1">Client</label>
            <div className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[var(--sched-ink)] bg-gray-50">
              {booking.clients?.name || '…'}
            </div>
          </div>

          {clientProperties.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-[var(--sched-ink)] mb-1">Address{clientProperties.length > 1 ? ' *' : ''}</label>
              <div className="flex gap-2 items-center">
                <select
                  value={form.property_id}
                  onChange={(e) => setForm({ ...form, property_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[var(--sched-ink)]"
                >
                  {clientProperties.map(p => (
                    <option key={p.id} value={p.id}>{p.address}{p.is_primary ? ' (primary)' : ''}</option>
                  ))}
                </select>
                {clientProperties.length > 1 && (
                  <button
                    type="button"
                    title="Delete this address"
                    onClick={async () => {
                      const target = clientProperties.find(p => p.id === form.property_id)
                      if (!target) return
                      if (!confirm(`Delete this address?\n\n${target.address}\n\nThis won't change any past completed bookings.`)) return
                      const res = await fetch('/api/client/properties', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ client_id: booking.client_id, property_id: target.id, action: 'deactivate' }),
                      })
                      if (!res.ok) { alert('Failed to delete address.'); return }
                      const remaining = clientProperties.filter(p => p.id !== target.id)
                      setClientProperties(remaining)
                      const next = remaining.find(p => p.is_primary) || remaining[0]
                      setForm(prev => ({ ...prev, property_id: next?.id || '' }))
                    }}
                    className="shrink-0 px-3 py-2 border border-gray-300 rounded-lg text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[var(--sched-ink)] mb-1">Service</label>
            <select value={form.service_type} onChange={(e) => setForm({ ...form, service_type: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[var(--sched-ink)]">
              {serviceTypes.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--sched-ink)] mb-1">Date *</label>
              <input type="date" required value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[var(--sched-ink)]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--sched-ink)] mb-1">Time *</label>
              <input type="time" required min="07:00" max="19:00" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[var(--sched-ink)]" />
            </div>
          </div>

          {!hideCleanerPicker && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-[var(--sched-ink)]">{form.team_size > 1 ? worker.plural : worker.singular} *</label>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-600">Rate</label>
                <div className="flex items-center">
                  <span className="text-[var(--sched-ink)] text-xs mr-0.5">$</span>
                  <input
                    type="number" step="1" min="0"
                    value={form.pay_rate ?? ''}
                    onChange={(e) => setForm({ ...form, pay_rate: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder="auto"
                    className="w-14 px-1.5 py-0.5 border border-gray-300 rounded text-xs text-[var(--sched-ink)] bg-white"
                  />
                  <span className="text-[var(--sched-ink)] text-xs ml-0.5">/hr</span>
                </div>
                <label className="text-xs text-gray-600">Team size</label>
                <select
                  value={form.team_size}
                  onChange={(e) => {
                    const n = parseInt(e.target.value, 10) || 1
                    const maxExtras = Math.max(0, n - 1)
                    setForm({ ...form, team_size: n, extra_team_member_ids: form.extra_team_member_ids.slice(0, maxExtras) })
                  }}
                  className="px-2 py-1 border border-gray-300 rounded text-sm text-[var(--sched-ink)] bg-white"
                >
                  {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>
            {suggestions.length > 0 && (
              <SuggestionStrip
                suggestions={suggestions}
                variant={Object.values(smartScores).filter(s => s.available).length === 0 ? 'full' : 'better'}
                onPick={(t) => setForm({ ...form, start_time: t })}
              />
            )}
            <div className="space-y-1">
              {cleaners
                .filter(c => c.active !== false && (c.status || 'active') !== 'inactive')
                .slice()
                .sort((a, b) => {
                  const sa = smartScores[a.id]; const sb = smartScores[b.id]
                  if (sa && sb) {
                    if (sa.available && !sb.available) return -1
                    if (!sa.available && sb.available) return 1
                    return sb.score - sa.score
                  }
                  if (sa) return -1
                  if (sb) return 1
                  return a.name.localeCompare(b.name)
                })
                .map((c) => {
                  const avail = getCleanerAvailability(c, form.start_date, form.start_time, form.hours, dayBookings, timezone)
                  const isLead = form.team_member_id === c.id
                  const isExtra = form.extra_team_member_ids.includes(c.id)
                  const selected = isLead || isExtra
                  const smart = smartScores[c.id]
                  const onClickPick = () => {
                    if (form.team_size <= 1) {
                      setForm({ ...form, team_member_id: c.id, extra_team_member_ids: [] })
                      return
                    }
                    if (isLead) {
                      const [newLead, ...rest] = form.extra_team_member_ids
                      setForm({ ...form, team_member_id: newLead || '', extra_team_member_ids: rest })
                    } else if (isExtra) {
                      setForm({ ...form, extra_team_member_ids: form.extra_team_member_ids.filter(x => x !== c.id) })
                    } else if (!form.team_member_id) {
                      setForm({ ...form, team_member_id: c.id })
                    } else if (form.extra_team_member_ids.length < form.team_size - 1) {
                      setForm({ ...form, extra_team_member_ids: [...form.extra_team_member_ids, c.id] })
                    }
                  }
                  return (
                    <button
                      key={c.id} type="button" onClick={onClickPick}
                      className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                        selected ? 'border-indigo-500 bg-indigo-50 text-[var(--sched-ink)]' : 'border-gray-200 hover:border-gray-300 text-[var(--sched-ink)]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={selected ? 'font-medium' : ''}>
                          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '9999px', background: colorForMember(memberColors, c.id), marginRight: '6px', verticalAlign: 'middle' }} />
                          {c.name}
                          {isLead && form.team_size > 1 && <span className="ml-1.5 text-[10px] bg-indigo-600 text-white px-1.5 py-0.5 rounded font-semibold">LEAD</span>}
                          {isExtra && <span className="ml-1.5 text-[10px] bg-indigo-400 text-white px-1.5 py-0.5 rounded font-semibold">EXTRA</span>}
                        </span>
                        {form.start_date && (
                          avail.available
                            ? <span className="text-xs text-green-600 font-medium">{smart?.reason || 'Available'}</span>
                            : <span className="text-xs text-red-500">{avail.reason}</span>
                        )}
                      </div>
                    </button>
                  )
                })}
            </div>
          </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--sched-ink)] mb-1">Hours</label>
              <select value={form.hours} onChange={(e) => setForm({ ...form, hours: parseInt(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[var(--sched-ink)]">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(h => <option key={h} value={h}>{h}hr</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--sched-ink)] mb-1">Rate</label>
              <input type="number" min={1} step={1} value={form.hourly_rate} onChange={(e) => setForm({ ...form, hourly_rate: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[var(--sched-ink)]" placeholder="$/hr" />
            </div>
          </div>

          <RecurringOptions
            startDate={form.start_date}
            enabled={form.repeat_enabled}
            onEnabledChange={(v) => setForm({ ...form, repeat_enabled: v })}
            repeatType={form.repeat_type}
            onRepeatTypeChange={(v) => setForm({ ...form, repeat_type: v })}
            repeatEnd={form.repeat_end}
            onRepeatEndChange={(v) => setForm({ ...form, repeat_end: v })}
            repeatEndCount={form.repeat_end_count}
            onRepeatEndCountChange={(v) => setForm({ ...form, repeat_end_count: v })}
            repeatEndDate={form.repeat_end_date}
            onRepeatEndDateChange={(v) => setForm({ ...form, repeat_end_date: v })}
            customInterval={form.custom_interval}
            onCustomIntervalChange={(v) => setForm({ ...form, custom_interval: v })}
            previewDates={editRecurringDates}
          />

          <div className="py-3 border-t border-b border-gray-200 space-y-2">
            <div className="flex justify-between items-center">
              <h4 className="font-medium text-[var(--sched-ink)]">Discount</h4>
              <div onClick={() => setForm({ ...form, discount_enabled: !form.discount_enabled })} className={`w-10 h-6 rounded-full transition-colors ${form.discount_enabled ? 'bg-green-600' : 'bg-gray-300'} relative cursor-pointer`}>
                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${form.discount_enabled ? 'translate-x-5' : 'translate-x-1'}`} />
              </div>
            </div>
            {form.discount_enabled && (
              <div className="flex gap-2 items-center pt-1">
                <label className="text-xs text-gray-500 w-12">Percent:</label>
                <select
                  value={[5, 10, 20].includes(form.discount_percent) ? form.discount_percent : 'custom'}
                  onChange={(e) => {
                    const v = e.target.value
                    if (v === 'custom') {
                      const isPreset = [5, 10, 20].includes(form.discount_percent)
                      setForm({ ...form, discount_percent: isPreset ? 15 : form.discount_percent })
                    } else setForm({ ...form, discount_percent: parseInt(v) })
                  }}
                  className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm text-[var(--sched-ink)]"
                >
                  <option value={20}>20% ($69 weekly)</option>
                  <option value={10}>10% ($69 biweekly/monthly &middot; $59 weekly)</option>
                  <option value={5}>5% ($59 biweekly/monthly)</option>
                  <option value="custom">Custom %</option>
                </select>
                {![5, 10, 20].includes(form.discount_percent) && (
                  <input type="number" min="1" max="50" step="1" value={form.discount_percent} onChange={(e) => setForm({ ...form, discount_percent: parseInt(e.target.value) || 0 })} className="w-20 px-2 py-1.5 border border-gray-300 rounded text-sm text-[var(--sched-ink)]" placeholder="%" />
                )}
              </div>
            )}
          </div>

          {!showOneTimeCredit ? (
            <button type="button" onClick={() => setShowOneTimeCredit(true)} className="text-left text-xs text-amber-700 hover:text-amber-800 font-medium">
              + One-time credit (this visit only)
            </button>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-amber-700 uppercase font-semibold">One-time credit — this visit only</span>
                <button type="button" onClick={() => { setShowOneTimeCredit(false); setForm({ ...form, one_time_credit_dollars: 0, one_time_credit_reason: '' }) }} className="text-xs text-amber-600 hover:text-amber-800">Remove</button>
              </div>
              <div className="flex gap-2">
                <input type="number" min="0" step="1" value={form.one_time_credit_dollars || ''} onChange={(e) => setForm({ ...form, one_time_credit_dollars: parseFloat(e.target.value) || 0 })} className="w-24 px-2 py-1.5 border border-amber-300 rounded text-sm text-[var(--sched-ink)]" placeholder="$ off" />
                <input type="text" value={form.one_time_credit_reason} onChange={(e) => setForm({ ...form, one_time_credit_reason: e.target.value })} className="flex-1 px-2 py-1.5 border border-amber-300 rounded text-sm text-[var(--sched-ink)]" placeholder="Reason (optional)" />
              </div>
            </div>
          )}

          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-2">ESTIMATE{editRecurringDates.length > 1 ? ' (per visit)' : ''}</p>
            <div className="flex justify-between">
              <span>~{getEstimatedHoursRange(form.hours)}hrs × ${form.hourly_rate}/hr{form.team_size > 1 ? ` × ${form.team_size} cleaners` : ''}{form.discount_enabled && form.discount_percent > 0 ? ` − ${form.discount_percent}%` : ''}{form.one_time_credit_dollars > 0 ? ` − $${form.one_time_credit_dollars} credit` : ''}</span>
              <span className="font-semibold">~${(calculateEditPrice() / 100).toFixed(0)}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--sched-ink)] mb-1">Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[var(--sched-ink)]">
              <option value="pending">Pending</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Canceled</option>
            </select>
            {form.status === 'pending' && (
              <p className="text-xs text-red-600 mt-1">Change the status before saving — a booking can&apos;t be saved while still Pending.</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--sched-ink)] mb-1">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[var(--sched-ink)]" rows={2} placeholder="Access codes..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--sched-ink)] mb-1">Referred by</label>
            <select value={form.referrer_id} onChange={(e) => setForm({ ...form, referrer_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[var(--sched-ink)]">
              <option value="">None</option>
              {referrers.filter(r => r.active).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--sched-ink)] mb-1">Sales partner</label>
            <select value={form.sales_partner_id} onChange={(e) => setForm({ ...form, sales_partner_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[var(--sched-ink)]">
              <option value="">None</option>
              {salesPartners.filter(s => s.active).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button type="button" onClick={onCancel} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-[var(--sched-ink)]">Cancel</button>
          <button type="submit" disabled={saving || form.status === 'pending'} className="flex-1 px-4 py-2 bg-[var(--sched-ink)] text-white rounded-lg disabled:bg-gray-300">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>

      {showUpdateChoice && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-5 max-w-sm w-full space-y-3">
            <h3 className="font-semibold text-[var(--sched-ink)]">Update this booking, or the whole series?</h3>
            <button onClick={() => saveBooking('single')} className="w-full py-3 px-4 border border-gray-300 rounded-lg text-[var(--sched-ink)] hover:bg-gray-50 text-left">
              Just this occurrence
            </button>
            <button onClick={() => saveBooking('all')} className="w-full py-3 px-4 border border-gray-300 rounded-lg text-[var(--sched-ink)] hover:bg-gray-50 text-left">
              This and all future occurrences
            </button>
            <button onClick={() => setShowUpdateChoice(false)} className="w-full py-2 text-sm text-gray-500">Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
