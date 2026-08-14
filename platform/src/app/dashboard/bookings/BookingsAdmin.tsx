'use client'

// File-split status (2026-07-28): types (_booking-types.ts), ET/naive time
// helpers (_time-helpers.ts), and the row-level ContactChips component
// (ContactChips.tsx) have been extracted -- all zero-risk (pure functions /
// small presentational component with a 2-prop surface), verified via
// tsc --noEmit + the existing bookings/schedules/recurring test suites.
//
// The remaining ~2450 lines are BookingsPage(): one function component with
// 40+ useState hooks and dozens of inline handlers/JSX all closed over the
// same state (form/setForm alone is read-or-written at 100+ call sites).
// That density means splitting the JSX further (e.g. the ~580-line edit
// modal) isn't a mechanical "move this text" refactor -- it's 50+ props of
// tightly-coupled two-way-bound state threaded into a new component, on a
// live admin tool with a documented history of subtle production bugs from
// exactly this kind of logic (see the nycmaid-6ec48424/a8efe43f references
// throughout this file), with no existing component test and no way in this
// session to click-test the result in a browser. Attempting that blind was
// judged too risky to ship unverified; it's flagged as follow-up work that
// needs either Playwright coverage of the edit-booking flow first, or a
// state-consolidation pass (e.g. a useBookingEditForm hook) before the JSX
// can be safely lifted out.
import './schedule.css'
import SidePanel from '@/components/SidePanel'
import { useWorkerLabel } from '../worker-label-context'
import { Suspense, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { buildMemberColors, colorForMember, type ColorableMember } from '../calendar/_colors'
import { useSearchParams } from 'next/navigation'
import { RecurringOptions } from './_RecurringOptions'
import { CallTextCopy } from '../_components/CallTextCopy'
import { generateInitialBatchDates, getRecurringDisplayName, buildSeriesUpdateData, type RecurringType, type RepeatEnd } from '@/lib/recurring'
import { useUserPrefs } from '@/lib/use-user-prefs'
import BookingsSettings from './bookings-settings'
import { SettingsHint } from '@/components/page-settings'
import AddressAutocomplete from '@/components/AddressAutocomplete'
import { useServiceTypes } from '@/lib/useServiceTypes'
import BookingNotes from '@/components/BookingNotes'
import { formatPhone, formatJobNumber } from '@/lib/format'
import { stripPhone } from '@/lib/phone'
import { CloseoutDetail } from '@/components/closeout-detail'
import { bookingWallClockDate, nycmaidWallClockTime } from '@/lib/time-window'
import { applyDiscount, applyCredit } from '@/lib/discount'
import { applyTeamMinimum } from '@/lib/billing-hours'
import { useTenantTimezone } from '@/hooks/useTenantTimezone'
import { getTenantNaiveDayBoundaries } from '@/lib/tenant-time'
import { computeCheckoutPricing } from '@/lib/checkout-pricing'
import { crewNames } from '@/lib/crew'
import CreateBookingForm from './CreateBookingForm'
import NewClientModal from './NewClientModal'
import { SuggestionStrip, getCleanerAvailability, type SmartScore, type SlotSuggestion } from './_create-booking-shared'
import type { Booking, Client, Cleaner, Referrer, SalesPartner } from './_booking-types'
import { ContactChips } from './ContactChips'
import { toEST, toDateTimeLocalET, fromDateTimeLocalET } from './_time-helpers'
import { bookingPathForTenant } from '@/lib/booking-path'

// recurring_schedules.recurring_type drives real cron/generate-recurring date
// math (lib/recurring.ts's strict generateRecurringDates switch, no default
// case) -- unlike bookings.recurring_type, which this file stores as a
// display-name badge (getRecurringDisplayName's output: 'Weekly'/'Monthly'/
// '1st Mon') read verbatim by many badge call sites elsewhere in this file.
// The two schedule-writing calls (create + regenerate) need the RAW
// RecurringType key, not that display string -- form.repeat_type already IS
// the raw key except 'monthly_day', which _RecurringOptions.tsx uses for its
// own dropdown value but which the shared RecurringType (lib/recurring.ts)
// spells 'monthly_weekday'.
function rawRecurringType(repeatType: string): string {
  return repeatType === 'monthly_day' ? 'monthly_weekday' : repeatType
}

export default function BookingsPageWrapper() {
  return (
    <Suspense>
      <BookingsPage />
    </Suspense>
  )
}

// Booking/Client/Cleaner/Referrer/SalesPartner moved to _booking-types.ts;
// ContactChips moved to ContactChips.tsx; toEST/toDateTimeLocalET/
// fromDateTimeLocalET moved to _time-helpers.ts -- all re-imported above.

function BookingsPage() {
  const searchParams = useSearchParams()
  const worker = useWorkerLabel()
  const timezone = useTenantTimezone()
  useEffect(() => { document.title = 'Bookings' }, []);

  // Ledger-true YTD revenue, shown as the "Revenue" stat only when no filters
  // are active — same figure as the Finance Overview/dashboard homepage, so
  // the unfiltered view agrees with the rest of the app. When a filter IS
  // active, the stat should reflect that filtered slice instead (see
  // totalRevenue below), which the raw ledger can't do at this granularity.
  const [ledgerYtdRevenue, setLedgerYtdRevenue] = useState<number | null>(null)
  useEffect(() => {
    fetch('/api/finance/summary').then(r => r.ok ? r.json() : null).then(d => { if (d?.yearRevenue != null) setLedgerYtdRevenue(d.yearRevenue) }).catch(() => {})
  }, [])

  const [bookings, setBookings] = useState<Booking[]>([])
  const [tenantSlug, setTenantSlug] = useState('')
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [cleaners, setCleaners] = useState<Cleaner[]>([])
  // Team-member colors, built from /api/team in the SAME order the calendar uses
  // so a member reads as the same color in the picker and on the calendar.
  const [memberColors, setMemberColors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showNewClientModal, setShowNewClientModal] = useState(false)
  // Set once the new-client POST succeeds — switches the modal to an
  // "add more contacts/addresses?" step for that client before returning
  // to the booking form, so the admin never has to leave Bookings to do it.
  const [newClientContactsId, setNewClientContactsId] = useState<string | null>(null)
  const [showUpdateChoice, setShowUpdateChoice] = useState(false)
  const [showCancelMenu, setShowCancelMenu] = useState(false)
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null)
  const [showOneTimeCredit, setShowOneTimeCredit] = useState(false)
  const [form, setForm] = useState({
    status: '', payment_status: '', payment_method: '', notes: '', team_member_id: '',
    start_date: '', start_time: '', hours: 2, service_type: '', hourly_rate: 69,
    discount_enabled: false, discount_percent: 10,
    one_time_credit_dollars: 0, one_time_credit_reason: '',
    repeat_enabled: false, repeat_type: 'weekly', repeat_end: 'never',
    repeat_end_count: 10, repeat_end_date: '', custom_interval: 3,
    actual_hours: null as number | null, team_member_pay: null as number | null,
    pay_rate: null as number | null,
    team_member_paid: false,
    team_size: 1,
    extra_team_member_ids: [] as string[],
    max_hours: null as number | null,
    override_availability: false,
    property_id: '' as string,
    referrer_id: '' as string,
    sales_partner_id: '' as string,
    _originalPrice: 0
  })
  // Prefill + remount-key for the create form (CreateBookingForm.tsx), which
  // owns all of the create-side state itself now. openCreate() and the two
  // deep-link effects below set these instead of calling setCreateForm directly.
  const [createInitialValues, setCreateInitialValues] = useState<{ clientId?: string; startDate?: string; startTime?: string; serviceType?: string; notes?: string }>({})
  const [formInstanceKey, setFormInstanceKey] = useState(0)
  // Addresses for the selected client (the edit modal's address picker).
  const [clientProperties, setClientProperties] = useState<{ id: string; address: string; is_primary: boolean }[]>([])
  const [referrers, setReferrers] = useState<Referrer[]>([])
  const [salesPartners, setSalesPartners] = useState<SalesPartner[]>([])
  const [saving, setSaving] = useState(false)
  const [confirmCheckout, setConfirmCheckout] = useState(false)

  // Load the edit-modal client's addresses; default the picker to their
  // primary. (The create form's own copy of this effect now lives in
  // CreateBookingForm.tsx.)
  useEffect(() => {
    const cid = showModal && editingBooking ? editingBooking.client_id : null
    if (!cid) { setClientProperties([]); return }
    let cancelled = false
    fetch(`/api/client/properties?client_id=${cid}`)
      .then(r => r.json())
      .then(d => {
        if (cancelled) return
        const props = d.properties || []
        setClientProperties(props)
        setForm(prev => {
          if (prev.property_id && props.some((p: { id: string }) => p.id === prev.property_id)) return prev
          const primary = props.find((p: { is_primary: boolean }) => p.is_primary) || props[0]
          return primary ? { ...prev, property_id: primary.id } : prev
        })
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [showModal, editingBooking?.client_id])
  const [copied, setCopied] = useState(false)
  const [sendingOmw, setSendingOmw] = useState<number | null>(null)
  const [resendMenuId, setResendMenuId] = useState<string | null>(null)
  const [resendMenuPos, setResendMenuPos] = useState<{ top: number; left: number } | null>(null)
  const [editCheckInVal, setEditCheckInVal] = useState<string | null>(null)
  const [editCheckOutVal, setEditCheckOutVal] = useState<string | null>(null)
  const [showCloseOut, setShowCloseOut] = useState(false)
  const [closeOutSaving, setCloseOutSaving] = useState<string | null>(null)
  const [closeOutExpanded, setCloseOutExpanded] = useState<Set<string>>(new Set())
  const [closeOutSummaries, setCloseOutSummaries] = useState<Record<string, { customerOwesCents: number; customerOutstandingCents: number; laborDueCents: number; laborOutstandingCents: number }>>({})
  const [showWaitlist, setShowWaitlist] = useState(false)
  const [waitlistEntries, setWaitlistEntries] = useState<Array<{ id: string; name: string | null; phone: string; service_type: string | null; preferred_date: string | null; preferred_time: string | null; created_at: string; client_id: string | null }>>([])
  const [waitlistLoading, setWaitlistLoading] = useState(false)

  const [smartScores, setSmartScores] = useState<Record<string, SmartScore>>({})
  const [smartScoresKey, setSmartScoresKey] = useState<string>('')
  // Alternate-time picks shown when nobody is available at the requested time.
  const [suggestions, setSuggestions] = useState<SlotSuggestion[]>([])

  const [filters, setFilters] = useState({
    status: 'scheduled',
    service_type: '',
    team_member_id: '',
    client_id: '',
    date_from: '',
    date_to: ''
  })
  const [showFilters, setShowFilters] = useState(false)

  const bookingsPrefs = useUserPrefs('bookings', { default_status_filter: 'scheduled' })
  useEffect(() => {
    if (bookingsPrefs.loaded) setFilters((f) => ({ ...f, status: bookingsPrefs.prefs.default_status_filter as string }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingsPrefs.loaded])
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 25

  useEffect(() => {
    fetch('/api/team').then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (!d) return
      const members: ColorableMember[] = Array.isArray(d) ? d : (d.team || d.team_members || [])
      setMemberColors(buildMemberColors(members))
    }).catch(() => {})
  }, [])

  useEffect(() => {
    loadBookings(); loadClients(); loadCleaners(); loadReferrers(); loadSalesPartners()
    const interval = setInterval(loadBookings, 300000) // Auto-refresh bookings every 5min
    return () => clearInterval(interval)
  }, [])
  useEffect(() => { applyFilters() }, [bookings, filters, searchQuery])

  // Auto-open create modal when linked from clients page with ?new=1&client_id=xxx
  useEffect(() => {
    if (searchParams.get('new') === '1' && clients.length > 0) {
      const clientId = searchParams.get('client_id')
      const client = clientId ? clients.find(c => c.id === clientId) : null
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      setCreateInitialValues({ clientId: client ? client.id : undefined, startDate: tomorrow.toISOString().split('T')[0] })
      setFormInstanceKey(k => k + 1)
      setShowCreateModal(true)
    }
  }, [searchParams, clients])

  // Auto-open edit modal when linked from calendar with ?edit=BOOKING_ID
  useEffect(() => {
    const editId = searchParams.get('edit')
    if (editId && bookings.length > 0) {
      const booking = bookings.find(b => b.id === editId)
      if (booking) {
        setFilters({ status: '', service_type: '', team_member_id: '', client_id: '', date_from: '', date_to: '' })
        openEdit(booking)
        window.history.replaceState({}, '', '/dashboard/bookings')
      }
    }
  }, [searchParams, bookings])

  // Auto-open create modal when linked from calendar with ?date=...&time=...
  useEffect(() => {
    const date = searchParams.get('date')
    const time = searchParams.get('time')
    if (date && !searchParams.get('new') && !searchParams.get('edit')) {
      setCreateInitialValues({ startDate: date, startTime: time || '09:00' })
      setFormInstanceKey(k => k + 1)
      setShowCreateModal(true)
      window.history.replaceState({}, '', '/dashboard/bookings')
    }
  }, [searchParams])

  // Smart-schedule: fetch zone/proximity scores for the edit modal's cleaner
  // picker. (The create form's own copy of this effect now lives in
  // CreateBookingForm.tsx.)
  useEffect(() => {
    if (!(showModal && editingBooking && form.start_date && form.start_time)) {
      setSmartScores({})
      setSmartScoresKey('')
      setSuggestions([])
      return
    }
    const ctxClientId = editingBooking.client_id
    const ctxAddress = editingBooking.clients?.address || ''
    const ctxDate = form.start_date
    const ctxTime = form.start_time
    const ctxHours = form.hours
    const ctxRate = form.hourly_rate
    const ctxExclude = editingBooking.id

    if (!ctxAddress || !ctxDate || !ctxTime) return
    const teamSizeForKey = form.team_size
    const key = [ctxClientId, ctxAddress, ctxDate, ctxTime, ctxHours, ctxRate || '', ctxExclude, teamSizeForKey].join('|')
    if (key === smartScoresKey) return

    const controller = new AbortController()
    const params = new URLSearchParams({
      date: ctxDate,
      start_time: ctxTime,
      duration: String(ctxHours),
      address: ctxAddress,
      client_id: ctxClientId,
      team_size: String(teamSizeForKey),
    })
    if (ctxRate != null) params.set('hourly_rate', String(ctxRate))
    params.set('exclude_booking', ctxExclude)
    params.set('suggest', '1') // also fetch alternate times when nobody is free

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
  }, [showModal, editingBooking, form.start_date, form.start_time, form.hours, form.hourly_rate, form.team_size, smartScoresKey])

  const loadBookings = async () => {
    try {
      // API caps at 200/page unless a date range is present (then 1000/page).
      // This view needs every booking for accurate stat cards and status tabs,
      // so page through with a wide date range until the reported total is met.
      const all: Booking[] = []
      let page = 1
      let total = Infinity
      while (all.length < total) {
        const res = await fetch(`/api/bookings?limit=1000&page=${page}&from=2000-01-01&to=2100-01-01`)
        if (!res.ok) break
        const json = await res.json()
        const list: Booking[] = Array.isArray(json) ? json : (json.bookings ?? [])
        total = Array.isArray(json) ? list.length : (json.total ?? list.length)
        if (!Array.isArray(json) && json.tenant_slug) setTenantSlug(json.tenant_slug)
        if (list.length === 0) break
        all.push(...list)
        if (list.length < 1000) break
        page += 1
      }
      // Matches ind's ordering: upcoming first (soonest first), then past (most recent first).
      // start_time is naive tenant-local — compare the naive strings directly
      // rather than parsing through Date (which reads the browser's own zone).
      const { todayStartNaive } = getTenantNaiveDayBoundaries(timezone)
      const upcoming = all
        .filter(b => b.start_time >= todayStartNaive)
        .sort((a, b) => a.start_time.localeCompare(b.start_time))
      const past = all
        .filter(b => b.start_time < todayStartNaive)
        .sort((a, b) => b.start_time.localeCompare(a.start_time))
      setBookings([...upcoming, ...past])
    } catch (e) {
      console.error('loadBookings failed', e)
    } finally {
      setLoading(false)
    }
  }
  const loadClients = async () => {
    const res = await fetch('/api/clients?limit=2000')
    if (!res.ok) return
    const json = await res.json()
    // API returns { clients, total }; tolerate a bare array. Never store a non-array
    // or client-search .filter() throws and crashes the page.
    setClients(Array.isArray(json) ? json : (json.clients ?? []))
  }
  const loadCleaners = async () => { const res = await fetch('/api/cleaners'); if (!res.ok) return; const j = await res.json(); setCleaners(Array.isArray(j) ? j : (j.cleaners ?? j.team ?? [])) }
  const loadReferrers = async () => { const res = await fetch('/api/referrers'); if (!res.ok) return; const j = await res.json(); setReferrers(Array.isArray(j) ? j : (j.referrers ?? [])) }
  const loadSalesPartners = async () => { const res = await fetch('/api/sales-partners'); if (!res.ok) return; const j = await res.json(); setSalesPartners(Array.isArray(j) ? j : (j.sales_partners ?? [])) }

  const loadWaitlist = async () => {
    setWaitlistLoading(true)
    try {
      const res = await fetch('/api/waitlist')
      if (res.ok) setWaitlistEntries(await res.json())
    } catch {}
    setWaitlistLoading(false)
  }

  const applyFilters = () => {
    let result = [...bookings]
    // 'confirmed' is backend-equivalent to 'scheduled' (dashboard/route.ts and
    // every stats endpoint already treat them the same) -- a booking a client
    // SMS-confirms was invisible under the Scheduled tab/search otherwise
    // (Brian Prowse, 2026-08-06).
    if (filters.status === 'scheduled') result = result.filter(b => b.status === 'scheduled' || b.status === 'confirmed')
    else if (filters.status) result = result.filter(b => b.status === filters.status)
    if (filters.service_type) result = result.filter(b => b.service_type === filters.service_type)
    if (filters.team_member_id) result = result.filter(b => b.team_member_id === filters.team_member_id)
    if (filters.client_id) result = result.filter(b => b.client_id === filters.client_id)
    // 'T00:00:00' (local time), matching date_to's 'T23:59:59' below -- a
    // bare 'YYYY-MM-DD' parses as UTC midnight, which silently pulls the
    // "From" boundary several hours earlier than the admin picked in any
    // timezone west of UTC.
    if (filters.date_from) result = result.filter(b => new Date(b.start_time) >= new Date(filters.date_from + 'T00:00:00'))
    if (filters.date_to) result = result.filter(b => new Date(b.start_time) <= new Date(filters.date_to + 'T23:59:59'))
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const qDigits = stripPhone(searchQuery)
      result = result.filter(b =>
        (b.clients?.name || '').toLowerCase().includes(q) ||
        (b.clients?.address || '').toLowerCase().includes(q) ||
        crewNames(b).toLowerCase().includes(q) ||
        (qDigits.length > 0 && stripPhone(b.clients?.phone || '').includes(qDigits))
      )
    }
    setFilteredBookings(result)
  }

  // Close-out gating: payment_status and team_member_paid are just labels a
  // button can flip with no real payment or payout behind them (that's how a
  // $0-received booking landed in "Recently Closed" as fully paid — clicking
  // "Apple" alone satisfied this filter). They're only trustworthy as a
  // negative signal ("definitely not marked done yet"); a positive claim of
  // "paid" must be corroborated by the real payments/payouts totals below
  // before a job is allowed to actually close out. Never take the flags' word
  // for "done" on their own.
  const flagClaimsAttention = bookings.filter(b =>
    (b.status === 'in_progress' || b.status === 'completed') &&
    (b.payment_status !== 'paid' || !b.team_member_paid)
  )
  const flagClaimsClosedRecent = bookings.filter(b => {
    if (b.status !== 'completed' || b.payment_status !== 'paid' || !b.team_member_paid) return false
    const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    return new Date(b.start_time) >= sevenDaysAgo
  })

  // Fetch the authoritative closeout math (same source CloseoutDetail uses —
  // actual check-in/out hours, discounts, and per-cleaner pay, which can
  // differ from the stored booking.price once actual hours diverge from what
  // was scheduled) for every job whose closed status needs verifying: both
  // the ones already flagged as needing attention, and the ones claiming to
  // be closed that still have to prove it against real payment/payout data.
  const closeOutVerifyCandidates = [...flagClaimsAttention, ...flagClaimsClosedRecent]
  const closeOutIds = showCloseOut ? closeOutVerifyCandidates.map(b => b.id).join(',') : ''
  useEffect(() => {
    if (!closeOutIds) return
    const ids = closeOutIds.split(',').filter(id => !(id in closeOutSummaries))
    if (ids.length === 0) return
    let cancelled = false
    Promise.all(ids.map(async (id) => {
      const r = await fetch(`/api/admin/bookings/${id}/closeout-summary`)
      if (!r.ok) return null
      const j = await r.json()
      const laborDueCents = (j.cleaner_payouts || []).reduce((s: number, c: { total_due_cents: number }) => s + c.total_due_cents, 0)
      const laborOutstandingCents = (j.cleaner_payouts || []).reduce((s: number, c: { outstanding_cents: number }) => s + c.outstanding_cents, 0)
      // What the CUSTOMER still owes, not the full bill total -- j.bill.final_cents
      // is the gross price regardless of payment status, so a fully-paid booking
      // was showing e.g. "Customer owes $276" under the same red/brown styling as
      // the labor-still-owed line right below it, reading as unpaid client debt
      // when the client had already paid in full.
      const customerOutstandingCents = Math.max(0, (j.payment_totals?.expected_cents ?? j.bill.final_cents) - (j.payment_totals?.paid_cents ?? 0))
      return [id, { customerOwesCents: j.bill.final_cents as number, customerOutstandingCents, laborDueCents, laborOutstandingCents }] as const
    })).then((results) => {
      if (cancelled) return
      setCloseOutSummaries(prev => {
        const next = { ...prev }
        for (const r of results) { if (r) next[r[0]] = r[1] }
        return next
      })
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closeOutIds])

  // A job only closes out once all three are independently true against real
  // data: complete, cleaner actually paid (payouts table), client actually
  // paid (payments table). Not "someone flipped a label." Summary not loaded
  // yet defaults to false — never show a job as closed before it's verified.
  //
  // Grandfather cutoff (2026-08-10): this check went live retroactively and
  // surfaced a real gap — most of the team-member side never had a real
  // team_member_payouts row, only the flag (traced to the old "Mark Team
  // Paid" button on the booking detail page, now fixed to write the real
  // row like this panel's own close-out flow always has). Everyone was
  // actually paid before that fix landed; the missing row is a record-
  // keeping gap, not an unpaid cleaner. Anything from before today is
  // trusted on the flags alone rather than re-litigated against payout
  // records that were never going to exist for pre-fix bookings. Only
  // applies here — flagClaimsAttention (the flags themselves saying unpaid)
  // is untouched, so a booking that's actually flagged unpaid still shows.
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const isBookingReallyClosed = (b: Booking) => {
    if (new Date(b.start_time) < todayStart) return true
    const summary = closeOutSummaries[b.id]
    if (!summary) return false
    return b.status === 'completed' && summary.laborOutstandingCents === 0 && summary.customerOutstandingCents === 0
  }

  const closeOutJobs = [...flagClaimsAttention, ...flagClaimsClosedRecent.filter(b => !isBookingReallyClosed(b))]
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())

  const recentlyClosedJobs = flagClaimsClosedRecent.filter(isBookingReallyClosed)
    .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())

  const handleCloseOutUpdate = async (bookingId: string, updates: Record<string, unknown>) => {
    setCloseOutSaving(bookingId)
    try {
      const res = await fetch('/api/bookings/' + bookingId, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      if (res.ok) {
        // Update local state
        setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, ...updates } as Booking : b))
      }
    } catch (e) { console.error('Close out update failed:', e) }
    setCloseOutSaving(null)
  }

  // Records a REAL client payment (inserts into `payments`, same endpoint
  // the closeout math reads from) for the full amount still outstanding —
  // replaces the old Zelle/Apple buttons, which only PATCHed
  // bookings.payment_status with nothing behind it. Charges exactly what
  // closeOutSummaries (the real payments-table total) says is still owed,
  // never a guessed or stale amount.
  // Once client + cleaner are both actually paid in full (real payments/
  // payouts rows, not a flag), the booking closes out automatically instead
  // of needing a separate "Job Done" click. Re-checks against the live
  // closeout-summary rather than trusting the summary already in state, so
  // this never completes a booking on a stale/partial number.
  const maybeAutoComplete = async (b: Booking) => {
    if (b.status === 'completed') return
    try {
      const r = await fetch(`/api/admin/bookings/${b.id}/closeout-summary`)
      if (!r.ok) return
      const j = await r.json()
      const laborOutstandingCents = (j.cleaner_payouts || []).reduce((s: number, c: { outstanding_cents: number }) => s + c.outstanding_cents, 0)
      const customerOutstandingCents = Math.max(0, (j.payment_totals?.expected_cents ?? j.bill.final_cents) - (j.payment_totals?.paid_cents ?? 0))
      if (laborOutstandingCents <= 0 && customerOutstandingCents <= 0) {
        await handleCloseOutUpdate(b.id, { status: 'completed' })
      }
    } catch (e) {
      console.error('Auto-complete check failed:', e)
    }
  }

  const recordClientPayment = async (b: Booking, method: 'zelle' | 'apple_pay') => {
    const summary = closeOutSummaries[b.id]
    if (!summary || summary.customerOutstandingCents <= 0) return
    setCloseOutSaving(b.id)
    try {
      const res = await fetch(`/api/admin/bookings/${b.id}/record-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount_cents: summary.customerOutstandingCents, method }),
      })
      if (res.ok) {
        setCloseOutSummaries(prev => {
          const next = { ...prev }
          delete next[b.id]
          return next
        })
        await maybeAutoComplete(b)
        await loadBookings()
      } else {
        const j = await res.json().catch(() => ({}))
        alert(j.error || 'Recording payment failed')
      }
    } catch (e) {
      console.error('Record payment failed:', e)
      alert('Recording payment failed')
    }
    setCloseOutSaving(null)
  }

  // Pays every team member still owed money on the booking a REAL payout
  // (inserts into `team_member_payouts` via the same endpoint CloseoutDetail
  // uses) — replaces the old "Team Paid" button, which only flipped
  // bookings.team_member_paid with no payout ever recorded.
  const payAllCleaners = async (b: Booking) => {
    setCloseOutSaving(b.id)
    try {
      const r = await fetch(`/api/admin/bookings/${b.id}/closeout-summary`)
      if (!r.ok) throw new Error('Failed to load closeout summary')
      const j = await r.json()
      const owed: Array<{ cleaner_id: string; outstanding_cents: number }> = (j.cleaner_payouts || [])
        .filter((c: { outstanding_cents: number }) => c.outstanding_cents > 0)
        .map((c: { cleaner_id: string; outstanding_cents: number }) => ({ cleaner_id: c.cleaner_id, outstanding_cents: c.outstanding_cents }))
      for (const c of owed) {
        const res = await fetch(`/api/admin/bookings/${b.id}/cleaner-payout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cleaner_id: c.cleaner_id, amount_cents: c.outstanding_cents, method: 'other' }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          alert(err.error || 'Paying a team member failed')
          break
        }
      }
      setCloseOutSummaries(prev => {
        const next = { ...prev }
        delete next[b.id]
        return next
      })
      await maybeAutoComplete(b)
      await loadBookings()
    } catch (e) {
      console.error('Pay cleaners failed:', e)
      alert('Paying team members failed')
    }
    setCloseOutSaving(null)
  }

  // Manual, admin-clicked payment reminder (text + email) for whatever a
  // booking's real outstanding balance is. No cron, no auto-fire — only
  // sends when someone on the team clicks it for this specific booking.
  const sendPaymentReminder = async (b: Booking) => {
    setCloseOutSaving(b.id)
    try {
      const res = await fetch(`/api/admin/bookings/${b.id}/send-payment-reminder`, { method: 'POST' })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(j.error || 'Reminder failed')
      } else {
        alert(`Reminder sent — SMS: ${j.sms?.sent || 0}, Email: ${j.email?.sent || 0}`)
      }
    } catch (e) {
      console.error('Send reminder failed:', e)
      alert('Reminder failed')
    }
    setCloseOutSaving(null)
  }

  const clearFilters = () => {
    setFilters({ status: 'scheduled', service_type: '', team_member_id: '', client_id: '', date_from: '', date_to: '' })
  }

  // Parse naive datetime string (no timezone conversion)
  const parseNaive = (s: string) => {
    const [datePart, timePart] = s.split('T')
    return { date: datePart, time: (timePart || '00:00').slice(0, 5) }
  }

  const openEdit = (booking: Booking) => {
    setEditingBooking(booking)
    const start = parseNaive(booking.start_time)
    const end = parseNaive(booking.end_time)
    // Calculate hours from naive time strings
    const [sh, sm] = start.time.split(':').map(Number)
    const [eh, em] = end.time.split(':').map(Number)
    const hours = Math.round(((eh * 60 + em) - (sh * 60 + sm)) / 60) || 2

    // Derive rate: use stored hourly_rate, or calculate from price/hours, or default to 69
    const rate = booking.hourly_rate || (booking.price && hours ? Math.round(booking.price / 100 / hours) : 69)
    // For known rates, snap; otherwise keep the actual rate (custom)
    const knownRates = [49, 59, 65, 69, 75, 79, 89, 99, 100]
    const isKnownRate = knownRates.some(r => Math.abs(r - rate) <= 1)
    const snappedRate = isKnownRate
      ? knownRates.reduce((best, r) => Math.abs(r - rate) < Math.abs(best - rate) ? r : best, 69)
      : rate
    // Discount is read straight off the booking's own discount_percent column —
    // the source of truth applyDiscount() uses everywhere else — never
    // re-derived from a price ratio (that guess ignored team size, one-time
    // credits, and the separate automatic recurring discount, and could
    // corrupt the value on re-save). Existing bookings created before this
    // column existed will show no discount here even if one was originally
    // baked into price — there's no reliable way to back-derive the exact
    // percent from historical price alone (nycmaid 6ec48424 parity).
    const hasDiscount = !!booking.discount_percent && booking.discount_percent > 0

    const endDate3 = new Date()
    endDate3.setMonth(endDate3.getMonth() + 3)

    setShowOneTimeCredit(!!booking.one_time_credit_cents)
    setForm({
      status: booking.status,
      payment_status: booking.payment_status,
      payment_method: booking.payment_method || '',
      notes: booking.notes || '',
      team_member_id: booking.team_member_id || '',
      start_date: start.date,
      start_time: start.time,
      hours: hours || 2,
      service_type: booking.service_type,
      hourly_rate: snappedRate,
      discount_enabled: hasDiscount,
      discount_percent: hasDiscount ? (booking.discount_percent as number) : 10,
      one_time_credit_dollars: booking.one_time_credit_cents ? booking.one_time_credit_cents / 100 : 0,
      one_time_credit_reason: booking.one_time_credit_reason || '',
      repeat_enabled: !!booking.recurring_type,
      repeat_type: reverseRecurringType(booking.recurring_type),
      repeat_end: 'never',
      repeat_end_count: 10,
      repeat_end_date: endDate3.toISOString().split('T')[0],
      custom_interval: 3,
      actual_hours: booking.actual_hours,
      team_member_pay: booking.team_member_pay,
      pay_rate: booking.pay_rate ?? null,
      team_member_paid: !!(booking as any).team_member_paid,
      team_size: (booking as any).team_size || 1,
      extra_team_member_ids: [],
      max_hours: (booking as any).max_hours ?? null,
      override_availability: false,
      property_id: (booking as any).property_id || '',
      referrer_id: booking.referrer_id || '',
      sales_partner_id: booking.sales_partner_id || '',
      _originalPrice: booking.price
    })
    setShowModal(true)
    setCopied(false)
    // Load existing team extras for this booking, async — they'll appear once fetched.
    if ((booking as any).team_size && (booking as any).team_size > 1) {
      fetch(`/api/bookings/${booking.id}/team`)
        .then(r => r.ok ? r.json() : null)
        .then((data: { extras?: string[] } | null) => {
          if (data?.extras) {
            setForm(prev => ({ ...prev, extra_team_member_ids: data.extras || [] }))
          }
        })
        .catch(() => {})
    }
  }

  const openCreate = () => {
    setCreateInitialValues({})
    setFormInstanceKey(k => k + 1)
    setShowCreateModal(true)
  }

  // Edit modal's "+ Add new address" (NewClientModal in add-contacts-only
  // mode -- see CreateBookingForm.tsx for the create-flow counterpart).
  const finishNewClientFlow = async () => {
    // Re-fetch addresses before closing — the client may have added more via
    // the contacts popup, and the picker's own effect only refires on
    // client_id change, not on every add inside that popup.
    if (newClientContactsId) {
      try {
        const res = await fetch(`/api/client/properties?client_id=${newClientContactsId}`)
        const d = await res.json()
        const props = d.properties || []
        setClientProperties(props)
        const primary = props.find((p: { is_primary: boolean }) => p.is_primary) || props[0]
        if (primary) setForm(prev => ({ ...prev, property_id: primary.id }))
      } catch { /* keep whatever was already loaded */ }
    }
    setShowNewClientModal(false)
    setNewClientContactsId(null)
  }

  const isExistingClient = (clientId: string) => {
    const client = clients.find(c => c.id === clientId)
    if (!client) return false
    return new Date(client.created_at) < new Date(Date.now() - 24 * 60 * 60 * 1000)
  }

  const calculateEditPrice = () => {
    const teamSize = Math.max(1, form.team_size || 1)
    const discountPercent = form.discount_enabled ? form.discount_percent : null
    const creditCents = form.one_time_credit_dollars > 0 ? Math.round(form.one_time_credit_dollars * 100) : null
    // If editing a completed booking with actual_hours, use actual_hours for pricing —
    // but the discount + one-time credit still apply on top, same as every other
    // recompute path (payment-processor, Stripe webhook, cleaner self-checkout).
    // This branch used to drop the discount entirely once actual_hours was set,
    // which could overcharge a discounted client on any post-checkout edit
    // (nycmaid 6ec48424).
    if (form.actual_hours && form.actual_hours > 0) {
      const basePrice = Math.round(form.actual_hours * form.hourly_rate * teamSize * 100)
      return applyCredit(applyDiscount(basePrice, discountPercent), creditCents)
    }
    const basePrice = form.hours * form.hourly_rate * teamSize * 100
    return applyCredit(applyDiscount(basePrice, discountPercent), creditCents)
  }

  // Check if pricing fields changed from what was loaded
  const pricingChanged = () => {
    if (!editingBooking) return true
    const s = parseNaive(editingBooking.start_time), e = parseNaive(editingBooking.end_time)
    const [sh, sm] = s.time.split(':').map(Number), [eh, em] = e.time.split(':').map(Number)
    const origHours = Math.round(((eh * 60 + em) - (sh * 60 + sm)) / 60) || 2
    const origRate = editingBooking.hourly_rate || form.hourly_rate
    // If recomputed price differs materially from stored price, pricing changed
    const recomputed = calculateEditPrice()
    const priceDelta = Math.abs(recomputed - editingBooking.price)
    return form.hours !== origHours || form.hourly_rate !== origRate ||
      priceDelta > 100 ||
      form.actual_hours !== editingBooking.actual_hours
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
    if (editingBooking?.recurring_type || editingBooking?.schedule_id) {
      setShowUpdateChoice(true)
      return
    }
    await saveBooking('single')
  }

  // Build naive datetime string from date + time + hours (no Date object, no TZ shift)
  const buildNaiveTime = (date: string, time: string, addHours: number = 0) => {
    const [h, m] = time.split(':').map(Number)
    const totalMinutes = h * 60 + m + addHours * 60
    const newH = Math.floor(totalMinutes / 60) % 24
    const newM = totalMinutes % 60
    return `${date}T${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}:00`
  }

  // Calculate minute difference between two naive time strings
  const naiveMinuteDiff = (a: string, b: string) => {
    const [ad, at] = a.split('T'); const [bd, bt] = b.split('T')
    const [ay, am, aday] = ad.split('-').map(Number); const [by, bm, bday] = bd.split('-').map(Number)
    const [ah, amin] = at.split(':').map(Number); const [bh, bmin] = bt.split(':').map(Number)
    const aTotal = new Date(ay, am - 1, aday).getTime() / 60000 + ah * 60 + amin
    const bTotal = new Date(by, bm - 1, bday).getTime() / 60000 + bh * 60 + bmin
    return aTotal - bTotal
  }

  // Shift a naive time string by N minutes
  const shiftNaive = (s: string, minutes: number) => {
    const [datePart, timePart] = s.split('T')
    const [y, mo, d] = datePart.split('-').map(Number)
    const [h, m] = timePart.split(':').map(Number)
    const dt = new Date(y, mo - 1, d, h, m + minutes)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}:00`
  }

  const saveBooking = async (scope: 'single' | 'all') => {
    setSaving(true)
    setShowUpdateChoice(false)

    const newStartStr = buildNaiveTime(form.start_date, form.start_time)
    const newEndStr = buildNaiveTime(form.start_date, form.start_time, form.hours)
    const recurringType = form.repeat_enabled ? getRecurringDisplayName(form.repeat_type, form.start_date) : null

    const updateData = {
      ...form,
      team_member_id: form.team_member_id || null,
      // Same bug as team_member_id above, just missed: form.property_id is ''
      // (not null) when a booking has no property record — bookings.property_id
      // is a uuid column, so Postgres rejects '' with the same
      // "invalid input syntax for type uuid: ''" save failure. Reproduced on
      // Erin Han's booking (property_id null in the DB, no client_properties row).
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

    if (scope === 'all' && (editingBooking?.schedule_id || editingBooking?.recurring_type)) {
      // Check if the recurring pattern itself changed (not just time/price/cleaner)
      const oldRecurringType = editingBooking.recurring_type
      const patternChanged = recurringType !== oldRecurringType

      if (patternChanged && editingBooking.schedule_id && form.repeat_enabled) {
        // Pattern changed: one atomic server call replaces the old N+N
        // delete-each / create-each loop (rule update + cancel-future +
        // regenerate, all server-side). Only future scheduled/pending bookings
        // from this booking forward are touched.
        const startDateObj = new Date(form.start_date + 'T12:00:00')
        const newDates = generateInitialBatchDates({
          recurringType: rawRecurringType(form.repeat_type) as RecurringType,
          startDate: form.start_date,
          repeatEnabled: true,
          repeatEnd: form.repeat_end as RepeatEnd,
          repeatEndCount: form.repeat_end_count,
          repeatEndDate: form.repeat_end_date,
          customIntervalWeeks: form.custom_interval,
        })
        const res = await fetch('/api/admin/recurring-schedules/' + editingBooking.schedule_id + '/regenerate', {
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
            from_date: editingBooking.start_time,
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
      } else {
        // Pattern unchanged: shift times/update fields on existing bookings
        const deltaMinutes = naiveMinuteDiff(newStartStr, editingBooking.start_time)
        const durationMinutes = form.hours * 60

        const futureBookings = editingBooking.schedule_id
          ? bookings.filter(b =>
              b.schedule_id === editingBooking.schedule_id &&
              b.status === 'scheduled' &&
              b.start_time >= editingBooking.start_time
            )
          : bookings.filter(b =>
              b.client_id === editingBooking.client_id &&
              b.recurring_type === editingBooking.recurring_type &&
              b.status === 'scheduled' &&
              b.start_time >= editingBooking.start_time
            )

        // Batch update all future bookings in one request (no email spam)
        // status/payment_status/payment_method are per-instance — never propagate
        // them across the series, or editing a completed past booking will mark
        // every future booking completed/paid too.
        const batchUpdates = futureBookings.map(booking => ({
          id: booking.id,
          data: buildSeriesUpdateData({
            startTime: shiftNaive(booking.start_time, deltaMinutes),
            endTime: shiftNaive(booking.start_time, deltaMinutes + durationMinutes),
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

        // Also update the schedule record with non-pattern fields
        if (editingBooking.schedule_id) {
          await fetch('/api/admin/recurring-schedules/' + editingBooking.schedule_id, {
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
    } else {
      // Update this booking
      const res = await fetch('/api/bookings/' + editingBooking?.id, {
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

      // If repeat newly enabled on a non-recurring booking, create future bookings
      if (form.repeat_enabled && !editingBooking?.recurring_type && editRecurringDates.length > 1) {
        for (let i = 1; i < editRecurringDates.length; i++) {
          const date = editRecurringDates[i]
          await fetch('/api/bookings', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              client_id: editingBooking?.client_id, team_member_id: form.team_member_id,
              start_time: buildNaiveTime(date, form.start_time), end_time: buildNaiveTime(date, form.start_time, form.hours),
              service_type: form.service_type, price: calculateEditPrice(),
              hourly_rate: form.hourly_rate, recurring_type: recurringType, notes: form.notes || null,
              referrer_id: form.referrer_id || null, sales_partner_id: form.sales_partner_id || null,
              skip_email: true
            })
          })
        }
      }
    }

    // Save team membership (lead + extras + team_size) for this booking.
    if (editingBooking?.id) {
      await fetch(`/api/bookings/${editingBooking.id}/team`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: form.team_member_id || null,
          extra_team_member_ids: form.extra_team_member_ids,
          team_size: form.team_size,
        })
      })
    }

    // Refresh booking in place — don't close panel
    const { data: refreshed } = await fetch('/api/bookings/' + editingBooking?.id).then(r => r.ok ? r.json() : { data: null })
    if (refreshed) setEditingBooking(refreshed)
    loadBookings()
    setSaving(false)
  }


  const handleCancel = async (scope: 'single' | 'all') => {
    if (!editingBooking) return
    setSaving(true)

    try {
      if (scope === 'all' && (editingBooking.schedule_id || editingBooking.recurring_type)) {
        if (editingBooking.schedule_id) {
          // Use schedule_id for precise series cancellation (server-side)
          const res = await fetch('/api/bookings/' + editingBooking.id + '?cancel_series=true', { method: 'DELETE' })
          if (!res.ok) {
            const err = await res.json().catch(() => ({ error: res.statusText }))
            alert(`Failed to cancel series: ${err.error || 'Unknown error'}`)
            setSaving(false)
            return
          }
        } else {
          // Legacy fallback: batch cancel by client_id + recurring_type
          const futureBookings = bookings.filter(b =>
            b.client_id === editingBooking.client_id &&
            b.recurring_type === editingBooking.recurring_type &&
            (b.status === 'scheduled' || b.status === 'pending') &&
            b.start_time >= editingBooking.start_time
          )

          if (futureBookings.length > 0) {
            // Cancel first with email, rest skip email
            const res = await fetch('/api/bookings/' + futureBookings[0].id, { method: 'DELETE' })
            if (!res.ok) {
              const err = await res.json().catch(() => ({ error: res.statusText }))
              alert(`Failed to cancel booking: ${err.error || 'Unknown error'}`)
              setSaving(false)
              return
            }
            if (futureBookings.length > 1) {
              const rest = futureBookings.slice(1)
              const results = await Promise.allSettled(
                rest.map(b => fetch('/api/bookings/' + b.id + '?skip_email=true', { method: 'DELETE' }))
              )
              const failedCount = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.ok)).length
              if (failedCount > 0) {
                alert(`Cancelled ${rest.length - failedCount} of ${rest.length} remaining bookings in this series. ${failedCount} could not be cancelled and are still scheduled — check the bookings list.`)
              }
            }
          }
        }
      } else if (editingBooking.schedule_id) {
        // Single occurrence of a recurring series → record a skip exception.
        // This removes THIS date's booking AND stops the generator from
        // refilling it, without disturbing the rest of the series. Cleaner than
        // a bare delete the cron could regenerate.
        const occDate = editingBooking.start_time.split('T')[0]
        const res = await fetch('/api/admin/recurring-schedules/' + editingBooking.schedule_id + '/exception', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ occurrence_date: occDate, type: 'skip' }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: res.statusText }))
          alert(`Failed to cancel this occurrence: ${err.error || 'Unknown error'}`)
          setSaving(false)
          return
        }
      } else {
        const res = await fetch('/api/bookings/' + editingBooking.id + '/status', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'cancelled' }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: res.statusText }))
          alert(`Failed to cancel booking: ${err.error || 'Unknown error'}`)
          setSaving(false)
          return
        }
      }

      // Refresh — booking now shows as cancelled
      const res2 = await fetch('/api/bookings/' + editingBooking.id)
      if (res2.ok) { const refreshed = await res2.json(); if (refreshed) setEditingBooking(refreshed) }
      await loadBookings()
    } catch (e) {
      alert(`Failed to cancel booking: ${e instanceof Error ? e.message : 'Network error'}`)
    }
    setSaving(false)
  }

  const handleResend = async (bookingId: string, channel: 'email' | 'sms') => {
    setResendMenuId(null)
    const res = await fetch('/api/send-booking-emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId, clientOnly: true, ...(channel === 'sms' ? { channel: 'sms' } : {}) })
    })
    if (res.ok) {
      alert(channel === 'sms' ? 'Confirmation text sent!' : 'Confirmation email sent!')
    } else {
      const data = await res.json().catch(() => ({}))
      alert(data.error || `Failed to send ${channel}`)
    }
  }

  // Manual trigger for the same "30-min heads up" flow a cleaner fires from
  // the team portal (/api/team-portal/30min-alert) — admin + client SMS with
  // pay link, hours worked, and amount owed. force:true bypasses the 30-min
  // dedupe window since this is an explicit manual resend, not the automatic
  // cleaner-triggered path.
  const handleSend30MinAlert = async (bookingId: string) => {
    setResendMenuId(null)
    const res = await fetch('/api/team-portal/30min-alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId, force: true })
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      alert(data.error || 'Failed to send 30-min alert')
    } else if (data.skipped) {
      alert('Already paid — no alert sent')
    } else if (data.clientNotified === false) {
      alert('Admin notified, but client text failed to send — check Notifications')
    } else {
      alert('30-min alert sent!')
    }
    loadBookings()
  }

  const copyTeamLink = () => {
    if (editingBooking?.team_member_token) {
      navigator.clipboard.writeText(window.location.origin + '/team/' + editingBooking.team_member_token)
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    }
  }

  const toLocalISOString = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`
  }

  const formatDate = (dateStr: string) => {
    // Parse naive datetime string to avoid timezone shift
    const [datePart, timePart] = dateStr.split('T')
    const [y, mo, d] = datePart.split('-').map(Number)
    const [h, m] = (timePart || '00:00').split(':').map(Number)
    const dt = new Date(y, mo - 1, d, h, m)
    return dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' , timeZone: 'America/New_York' })
  }

  // created_at is a real tz-aware timestamp (unlike start_time's naive ET
  // string), so it needs actual parsing + zone conversion, not formatDate's
  // literal split.
  const formatBookedAt = (dateStr: string) => {
    const d = new Date(dateStr.endsWith('Z') || dateStr.includes('+') ? dateStr : dateStr + 'Z')
    return d.toLocaleString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
      timeZone: timezone,
    })
  }

  const SOURCE_LABELS: Record<string, string> = {
    admin: 'Staff', client_portal: 'Self-Booked', yinez_sms: 'Yinez (Text)',
    yinez_voice: 'Yinez (Voice)', sales: 'Sales', import: 'Import',
    recurring_auto: 'Recurring', other: 'Other',
  }
  const sourceLabel = (source: string) => SOURCE_LABELS[source] || 'Other'

  const serviceTypesData = useServiceTypes()
  // Catalog-driven only — no cleaning fallback. Shows the tenant's own services.
  const serviceTypes = serviceTypesData.map(s => s.name)

  // Reverse-map stored recurring_type display name back to form repeat_type
  const reverseRecurringType = (displayName: string | null): string => {
    if (!displayName) return 'weekly'
    const lower = displayName.toLowerCase()
    if (lower === 'daily') return 'daily'
    if (lower === 'weekly') return 'weekly'
    if (lower === 'bi-weekly') return 'biweekly'
    if (lower === 'tri-weekly') return 'triweekly'
    if (lower === 'monthly') return 'monthly_date'
    if (lower === 'custom') return 'custom'
    // Pattern like "1st Mon", "2nd Thu" = monthly_day
    if (/^\d/.test(displayName)) return 'monthly_day'
    return 'weekly'
  }

  const activeFilterCount = [filters.service_type, filters.team_member_id, filters.client_id, filters.date_from, filters.date_to].filter(Boolean).length

  // Status counts for filter pills
  const statusCounts = {
    all: bookings.length,
    scheduled: bookings.filter(b => b.status === 'scheduled' || b.status === 'confirmed').length,
    in_progress: bookings.filter(b => b.status === 'in_progress').length,
    completed: bookings.filter(b => b.status === 'completed').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length,
    pending: bookings.filter(b => b.status === 'pending').length,
  }

  // Summary stats. Previously always summed `bookings` (the full, unfiltered
  // all-time set) regardless of active filters, so changing a filter never
  // moved this number. Now: no filters -> ledger-true YTD (agrees with
  // Finance/dashboard); filters active -> sum the actually-filtered slice,
  // since the ledger can't answer "revenue for this cleaner/date range" at
  // that granularity.
  const filteredCompletedRevenue = filteredBookings.filter(b => b.status === 'completed').reduce((sum, b) => sum + b.price, 0)
  // ledgerYtdRevenue (from /api/finance/summary's yearRevenue) is already in
  // cents, same as bookings[].price — no conversion needed.
  const totalRevenue = activeFilterCount === 0 && ledgerYtdRevenue != null ? ledgerYtdRevenue : filteredCompletedRevenue
  const upcomingCount = bookings.filter(b => (b.status === 'scheduled' || b.status === 'confirmed') && new Date(b.start_time) > new Date()).length
  const thisWeekCount = bookings.filter(b => {
    const d = new Date(b.start_time)
    const now = new Date()
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    return d >= now && d <= weekFromNow && (b.status === 'scheduled' || b.status === 'confirmed')
  }).length

  // Daily Overview — today's closeout numbers, shown inside the Close Out
  // Jobs panel. "Today" = the booking's own start_time falling on the local
  // calendar day. Cancelled bookings never generate revenue/labor and are
  // excluded regardless of status. Labor figures only count in_progress/
  // completed jobs (labor isn't incurred yet on a merely-scheduled job).
  const dailyOverview = (() => {
    const now = new Date()
    const todaysJobs = bookings.filter(b => {
      if (b.status === 'cancelled') return false
      const d = new Date(b.start_time)
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
    })
    const revenueCents = todaysJobs.reduce((sum, b) => {
      if (b.payment_status === 'paid') return sum + (b.price || 0)
      if (b.payment_status === 'partial') return sum + (b.partial_payment_cents || 0)
      return sum
    }, 0)
    const tipsCents = todaysJobs
      .filter(b => b.payment_status === 'paid')
      .reduce((sum, b) => sum + (b.tip_amount || 0), 0)
    const laborJobs = todaysJobs.filter(b => b.status === 'in_progress' || b.status === 'completed')
    const laborTotalCents = laborJobs.reduce((sum, b) => sum + (b.team_member_pay || 0), 0)
    const laborOwedCents = laborJobs
      .filter(b => !b.team_member_paid)
      .reduce((sum, b) => sum + (b.team_member_pay || 0), 0)
    // Profit = client revenue minus total labor cost. Tips aren't in this
    // math on either side — they're a 100% pass-through to the cleaner
    // (see the Stripe webhook), never company revenue, so they don't
    // affect profit or margin.
    const profitCents = revenueCents - laborTotalCents
    const profitMarginPct = revenueCents > 0 ? (profitCents / revenueCents) * 100 : 0
    const avgTicketCents = todaysJobs.length > 0
      ? Math.round(todaysJobs.reduce((sum, b) => sum + (b.price || 0), 0) / todaysJobs.length)
      : 0
    return { revenueCents, tipsCents, laborTotalCents, laborOwedCents, profitCents, profitMarginPct, avgTicketCents }
  })()

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredBookings.length / pageSize))
  const paginatedBookings = filteredBookings.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1) }, [filters, searchQuery])

  // On-system button variants (thin-line/ink, matching sched-/clients-/sl- tokens
  // this component renders inside — see design-system audit, 2026-07-18).
  const btnGhost = 'px-4 py-2.5 border rounded text-sm font-medium transition-all'
  const btnGhostStyle = { borderColor: 'var(--sched-line)', color: 'var(--sched-ink)', background: 'var(--sched-canvas)' } as const
  const btnActiveStyle = { borderColor: 'var(--sched-ink)', color: 'var(--sched-canvas)', background: 'var(--sched-ink)' } as const

  return (
    <div className="sched-scope">
      <BookingsSettings />
      <main className="p-3 md:p-6 max-w-[1400px] mx-auto">
        {/* Header — page title itself comes from the shared dashboard masthead
            ("Schedule."); this row is just the bar-label + actions. */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-5">
          <div className="sched-bar-label">Bookings</div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setShowFilters(!showFilters)} className={btnGhost} style={showFilters || activeFilterCount > 0 ? btnActiveStyle : btnGhostStyle}>
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
              </span>
            </button>
            <button onClick={() => { setShowWaitlist(!showWaitlist); if (!showWaitlist) loadWaitlist() }} className={btnGhost + ' flex items-center gap-2'} style={showWaitlist ? btnActiveStyle : btnGhostStyle}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Waitlist
            </button>
            <button onClick={() => setShowCloseOut(!showCloseOut)} className={btnGhost + ' flex items-center gap-2'} style={showCloseOut ? btnActiveStyle : btnGhostStyle}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Close Out{closeOutJobs.length > 0 ? ` (${closeOutJobs.length})` : ''}
            </button>
            <button onClick={() => {
              const escCsv = (v: unknown) => {
                let s = v == null ? '' : String(v)
                // Neutralize CSV formula injection (Excel/Sheets execute leading =,+,-,@).
                if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
                return `"${s.replace(/"/g, '""')}"`
              }
              const rows = filteredBookings.map(b => [
                bookingWallClockDate(b.start_time), nycmaidWallClockTime(b.start_time),
                b.clients?.name || '', crewNames(b), b.service_type || '', b.status,
                b.hourly_rate ? '$' + b.hourly_rate : '', '$' + (b.price / 100).toFixed(0), b.payment_status || ''
              ].map(escCsv).join(','))
              const csv = 'Date,Time,Client,Cleaner,Service,Status,Rate,Price,Payment\n' + rows.join('\n')
              const blob = new Blob([csv], { type: 'text/csv' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a'); a.href = url; a.download = `bookings-${new Date().toISOString().split('T')[0]}.csv`; a.click()
              URL.revokeObjectURL(url)
            }} className={btnGhost} style={btnGhostStyle}>Export</button>
            <button onClick={openCreate} className={btnGhost + ' flex items-center gap-2'} style={btnActiveStyle}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              New Booking
            </button>
          </div>
        </div>

        {/* Quick Links */}
        <div className="text-xs mb-4 hidden md:flex items-center gap-1 flex-wrap" style={{ color: 'var(--sched-muted-2)' }}>
          <a href={bookingPathForTenant(tenantSlug)} target="_blank" style={{ color: 'var(--sched-muted)' }} className="hover:underline">Client Portal</a>
          <span style={{ color: 'var(--sched-line)' }} className="mx-1">/</span>
          <a href="/book/new" target="_blank" style={{ color: 'var(--sched-muted)' }} className="hover:underline">New Booking</a>
          <span style={{ color: 'var(--sched-line)' }} className="mx-1">/</span>
          <a href="/book/collect" target="_blank" style={{ color: 'var(--sched-muted)' }} className="hover:underline">Collect Info</a>
          <span style={{ color: 'var(--sched-line)' }} className="mx-1">/</span>
          <a href="/team" target="_blank" style={{ color: 'var(--sched-muted)' }} className="hover:underline">Team Portal</a>
        </div>

        {/* Stat outlook — same sched-outlook/sched-stat pattern as the Calendar tab. */}
        {!loading && (
          <div className="sched-outlook" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            <div className="sched-stat">
              <div className="sched-stat-label flex items-center gap-1.5">
                Upcoming
                <SettingsHint label="Appointment reminder settings" fieldKey="booking_reminder" />
              </div>
              <div className="sched-stat-value">{upcomingCount}</div>
              <div className="sched-stat-sub">Scheduled, not yet done</div>
            </div>
            <div className="sched-stat">
              <div className="sched-stat-label">This Week</div>
              <div className="sched-stat-value">{thisWeekCount}</div>
              <div className="sched-stat-sub">Scheduled in the next 7 days</div>
            </div>
            <div className="sched-stat">
              <div className="sched-stat-label">Completed</div>
              <div className="sched-stat-value">{statusCounts.completed}</div>
              <div className="sched-stat-sub">All time</div>
            </div>
            <div className="sched-stat">
              <div className="sched-stat-label">Revenue</div>
              <div className="sched-stat-value"><span className="unit">$</span>{Math.round(totalRevenue / 100).toLocaleString('en-US')}</div>
              <div className="sched-stat-sub">Completed bookings</div>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="relative mb-4">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <svg className="w-4 h-4" style={{ color: 'var(--sched-muted-2)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          <input
            type="text"
            placeholder={`Search client, ${worker.singular.toLowerCase()}, address...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded text-sm transition-all"
            style={{ border: '1px solid var(--sched-line)', color: 'var(--sched-ink)', background: 'var(--sched-canvas)' }}
          />
        </div>

        {/* Status Filter Pills — same sched-status-chip pattern as the Calendar tab's status filters. */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide flex-nowrap">
          {([
            { key: '', slug: 'all', label: 'All', count: statusCounts.all, show: true },
            { key: 'pending', slug: 'pending', label: 'Pending', count: statusCounts.pending, show: statusCounts.pending > 0 },
            { key: 'scheduled', slug: 'scheduled', label: 'Scheduled', count: statusCounts.scheduled, show: true },
            { key: 'in_progress', slug: 'in-progress', label: 'In Progress', count: statusCounts.in_progress, show: true },
            { key: 'completed', slug: 'completed', label: 'Completed', count: statusCounts.completed, show: true },
            { key: 'cancelled', slug: 'cancelled', label: 'Canceled', count: statusCounts.cancelled, show: true },
          ] as const).filter((s) => s.show).map((s) => (
            <span
              key={s.key}
              onClick={() => setFilters({ ...filters, status: s.key })}
              className={`sched-status-chip ${s.slug} ${filters.status === s.key ? 'active' : ''}`}
            >
              {s.slug !== 'all' && <span className="sched-status-chip-dot" />}
              {s.label}
              <span className="sched-tab-count">{s.count}</span>
            </span>
          ))}
        </div>

        {/* Advanced Filters Panel */}
        {showFilters && (
          <div className="bg-gray-50/80 backdrop-blur-sm rounded-xl p-4 mb-4 space-y-4 border border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Service</label>
                <select value={filters.service_type} onChange={(e) => setFilters({ ...filters, service_type: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-[var(--sched-ink)] text-sm bg-white focus:outline-none focus:border-[var(--sched-ink)]">
                  <option value="">All</option>
                  {serviceTypes.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{worker.singular}</label>
                <select value={filters.team_member_id} onChange={(e) => setFilters({ ...filters, team_member_id: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-[var(--sched-ink)] text-sm bg-white focus:outline-none focus:border-[var(--sched-ink)]">
                  <option value="">All</option>
                  {cleaners.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Client</label>
                <select value={filters.client_id} onChange={(e) => setFilters({ ...filters, client_id: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-[var(--sched-ink)] text-sm bg-white focus:outline-none focus:border-[var(--sched-ink)]">
                  <option value="">All</option>
                  {[...clients].sort((a,b) => a.name.localeCompare(b.name)).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">From</label>
                <input type="date" value={filters.date_from} onChange={(e) => setFilters({ ...filters, date_from: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-[var(--sched-ink)] text-sm bg-white focus:outline-none focus:border-[var(--sched-ink)]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">To</label>
                <input type="date" value={filters.date_to} onChange={(e) => setFilters({ ...filters, date_to: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-[var(--sched-ink)] text-sm bg-white focus:outline-none focus:border-[var(--sched-ink)]" />
              </div>
            </div>
            <div className="flex justify-between items-center pt-2">
              <p className="text-sm text-gray-500">{filteredBookings.length} booking{filteredBookings.length !== 1 ? 's' : ''} found</p>
              <button onClick={clearFilters} className="text-sm text-gray-400 hover:text-[var(--sched-ink)] transition-colors">Clear All</button>
            </div>
          </div>
        )}

        {/* Pending Bookings Section */}
        {!loading && bookings.filter(b => b.status === 'pending').length > 0 && (
          <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200/60 rounded-xl p-4 mb-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <h3 className="text-xs font-bold text-red-700 uppercase tracking-wide">Pending Approval ({bookings.filter(b => b.status === 'pending').length})</h3>
            </div>
            <div className="space-y-2">
              {bookings.filter(b => b.status === 'pending').map((b) => (
                <div key={b.id} onClick={() => openEdit(b)} className="flex items-center justify-between bg-white/80 backdrop-blur-sm border border-red-200/40 rounded-xl p-3.5 cursor-pointer hover:bg-white hover:shadow-sm transition-all">
                  <div>
                    <p className="text-[var(--sched-ink)] font-semibold text-sm">{b.clients?.name || '-'}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{formatDate(b.start_time)} · {b.service_type}</p>
                    <ContactChips phone={b.clients?.phone} address={b.clients?.address} />
                    {b.suggested_team_member_id && (() => {
                      const suggested = cleaners.find(c => c.id === b.suggested_team_member_id)
                      return suggested ? (
                        <p className="text-green-600 text-xs mt-1 font-medium">Suggested: {suggested.name}{b.suggested_reason ? ` — ${b.suggested_reason}` : ''}</p>
                      ) : null
                    })()}
                  </div>
                  <div className="text-right flex flex-col items-end gap-1.5">
                    <span className="px-2.5 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">{b.source === 'waitlist' ? 'Pending/Waitlist' : 'Pending'}</span>
                    <p className="text-[var(--sched-ink)] text-sm font-semibold">~${(b.price / 100).toFixed(0)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Waitlist Panel */}
        {showWaitlist && (
          <div className="mb-5">
            <div className="bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-200/60 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500" />
                  <h3 className="text-xs font-bold text-purple-700 uppercase tracking-wide">Waiting List ({waitlistEntries.length})</h3>
                </div>
                <button onClick={() => setShowWaitlist(false)} className="text-gray-400 hover:text-gray-600 text-sm">Close</button>
              </div>
              {waitlistLoading ? (
                <div className="flex items-center justify-center py-6">
                  <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : waitlistEntries.length === 0 ? (
                <p className="text-purple-600 text-sm py-4 text-center">No one on the waiting list!</p>
              ) : (
                <div className="space-y-3">
                  {waitlistEntries.map((entry) => (
                    <div key={entry.id} className="bg-white rounded-xl border border-gray-200 p-4 transition-all">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-[var(--sched-ink)] font-semibold text-sm">{entry.name || 'Unknown'}</p>
                          <p className="text-gray-500 text-xs mt-0.5">{formatPhone(entry.phone)}</p>
                          {entry.service_type && <p className="text-gray-400 text-xs mt-0.5">{entry.service_type}</p>}
                        </div>
                        <div className="text-right">
                          {entry.preferred_date && (
                            <p className="text-purple-700 font-medium text-sm">
                              {new Date(entry.preferred_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' , timeZone: 'America/New_York' })}
                            </p>
                          )}
                          {entry.preferred_time && <p className="text-gray-400 text-xs">{entry.preferred_time}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-3">
                        <button
                          onClick={() => {
                            const tomorrow = new Date()
                            tomorrow.setDate(tomorrow.getDate() + 1)
                            const startTime = entry.preferred_time
                              ? entry.preferred_time.replace(/\s*(am|pm)/i, (_, ap) => ap.toLowerCase() === 'am' ? ':00' : ':00').replace(/(\d{1,2})(am|pm)/i, (_, h, ap) => { const hr = parseInt(h); const hour = ap.toLowerCase() === 'pm' && hr < 12 ? hr + 12 : ap.toLowerCase() === 'am' && hr === 12 ? 0 : hr; return `${String(hour).padStart(2, '0')}:00` })
                              : '09:00'
                            setCreateInitialValues({
                              clientId: entry.client_id || undefined,
                              startDate: entry.preferred_date || tomorrow.toISOString().split('T')[0],
                              startTime,
                              serviceType: entry.service_type || undefined,
                              notes: 'Booked from waitlist',
                            })
                            setFormInstanceKey(k => k + 1)
                            setShowCreateModal(true)
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-50 border border-purple-200 text-purple-700 hover:bg-purple-100 transition-all"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          Book Now
                        </button>
                        <a href={`/admin/comhub?text=${encodeURIComponent('+1' + entry.phone.replace(/\D/g, ''))}`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100 transition-all">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                          Text
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Close Out Panel */}
        {showCloseOut && (
          <div className="mb-5">
            <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200/60 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <h3 className="text-xs font-bold text-emerald-700 uppercase tracking-wide">Close Out Jobs ({closeOutJobs.length})</h3>
                </div>
                <button onClick={() => setShowCloseOut(false)} className="text-gray-400 hover:text-gray-600 text-sm">Close</button>
              </div>

              {/* Daily Overview — today's revenue/tips/labor snapshot (see dailyOverview above) */}
              <div className="mb-4">
                <h4 className="text-[10px] font-bold text-emerald-600/80 uppercase tracking-wide mb-2">Daily Overview</h4>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                  <div className="bg-white rounded-xl border border-emerald-200/60 p-3">
                    <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide mb-1">Revenue Today</p>
                    <p className="text-xl font-semibold text-[var(--sched-ink)]">${(dailyOverview.revenueCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-teal-200/60 p-3">
                    <p className="text-[10px] font-bold text-teal-700 uppercase tracking-wide mb-1">Avg Ticket</p>
                    <p className="text-xl font-semibold text-[var(--sched-ink)]">${(dailyOverview.avgTicketCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-amber-200/60 p-3">
                    <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide mb-1">Labor Owed</p>
                    <p className="text-xl font-semibold text-[var(--sched-ink)]">${(dailyOverview.laborOwedCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-sky-200/60 p-3">
                    <p className="text-[10px] font-bold text-sky-700 uppercase tracking-wide mb-1">Tips Today</p>
                    <p className="text-xl font-semibold text-[var(--sched-ink)]">${(dailyOverview.tipsCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-3">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Total Due to Labor</p>
                    <p className="text-xl font-semibold text-[var(--sched-ink)]">${(dailyOverview.laborTotalCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-violet-200/60 p-3">
                    <p className="text-[10px] font-bold text-violet-700 uppercase tracking-wide mb-1">Total Profit</p>
                    <p className="text-xl font-semibold text-[var(--sched-ink)]">
                      {dailyOverview.profitCents < 0 ? '-' : ''}${Math.abs(dailyOverview.profitCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      <span className="text-sm font-normal text-gray-400 ml-1">({dailyOverview.profitMarginPct.toFixed(1)}%)</span>
                    </p>
                  </div>
                </div>
              </div>

              {closeOutJobs.length === 0 ? (
                <p className="text-emerald-600 text-sm py-4 text-center">All jobs are closed out!</p>
              ) : (
                <div className="space-y-3">
                  {closeOutJobs.map((b) => {
                    const isSaving = closeOutSaving === b.id
                    const isExpanded = closeOutExpanded.has(b.id)
                    const toggleExpanded = () => {
                      setCloseOutExpanded(prev => {
                        const next = new Set(prev)
                        if (next.has(b.id)) next.delete(b.id); else next.add(b.id)
                        return next
                      })
                    }
                    return (
                      <div key={b.id} className={'bg-white rounded-xl border p-4 transition-all ' + (isSaving ? 'opacity-60 border-emerald-200' : 'border-gray-200')}>
                        {/* Job header */}
                        <div className="flex items-start justify-between mb-3">
                          <button onClick={toggleExpanded} className="flex-1 text-left hover:opacity-80 transition-opacity">
                            <p className="text-[var(--sched-ink)] font-semibold text-sm flex items-center gap-1.5">
                              <span className={'inline-block transition-transform ' + (isExpanded ? 'rotate-90' : '')}>▸</span>
                              {b.clients?.name || '-'}
                            </p>
                            <p className="text-gray-500 text-xs mt-0.5 ml-4">{formatDate(b.start_time)} · {crewNames(b)}</p>
                            <p className="text-gray-400 text-xs mt-0.5 ml-4">{b.service_type}</p>
                          </button>
                          <div className="text-right">
                            {(() => {
                              const summary = closeOutSummaries[b.id]
                              const totalBill = summary ? summary.customerOwesCents / 100 : b.price / 100
                              const outstanding = summary ? summary.customerOutstandingCents / 100 : null
                              return (
                                <>
                                  <p className="text-[var(--sched-ink)] font-bold text-lg">${(outstanding !== null && outstanding > 0 ? outstanding : totalBill).toFixed(0)}</p>
                                  {outstanding === null ? (
                                    <p className="text-gray-400 text-xs">Customer owes</p>
                                  ) : outstanding > 0 ? (
                                    <p className="text-red-600 text-xs font-medium">Customer owes</p>
                                  ) : (
                                    <p className="text-emerald-700 text-xs font-medium">Paid in full</p>
                                  )}
                                  {summary ? (
                                    <p className={'text-xs mt-1 font-medium ' + (summary.laborOutstandingCents > 0 ? 'text-red-600' : 'text-emerald-700')}>
                                      Labor ${(summary.laborDueCents / 100).toFixed(2)}
                                      {summary.laborOutstandingCents > 0 ? ` (${(summary.laborOutstandingCents / 100).toFixed(2)} owed)` : ' (paid)'}
                                    </p>
                                  ) : (
                                    b.team_member_pay ? <p className="text-gray-400 text-xs">Pay: ${(Number(b.team_member_pay) / 100).toFixed(2)}</p> : null
                                  )}
                                </>
                              )
                            })()}
                          </div>
                        </div>
                        {/* Close out controls */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                          {/* Job Complete */}
                          <button
                            disabled={isSaving}
                            onClick={() => {
                              const newStatus = b.status === 'completed' ? 'in_progress' : 'completed'
                              handleCloseOutUpdate(b.id, { status: newStatus })
                            }}
                            className={'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border ' +
                              (b.status === 'completed'
                                ? 'bg-green-50 border-green-200 text-green-700'
                                : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-green-300 hover:bg-green-50/50')}
                          >
                            <span className={'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ' +
                              (b.status === 'completed' ? 'border-green-500 bg-green-500' : 'border-gray-300')}>
                              {b.status === 'completed' && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                            </span>
                            Job Done
                          </button>
                          {/* Payment status — read-only, reflects the REAL payments-table
                              total (closeOutSummaries), not a flippable flag. There is
                              nothing to click here: use Zelle/Apple to actually record money. */}
                          {(() => {
                            const summary = closeOutSummaries[b.id]
                            const reallyPaid = !!summary && summary.customerOutstandingCents <= 0
                            return (
                              <span className={'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border ' +
                                (reallyPaid ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-500')}>
                                <span className={'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ' +
                                  (reallyPaid ? 'border-green-500 bg-green-500' : 'border-gray-300')}>
                                  {reallyPaid && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                </span>
                                {reallyPaid ? 'Paid' : summary ? 'Not paid' : 'Loading…'}
                              </span>
                            )
                          })()}
                          {/* Record a REAL client payment for whatever's still outstanding —
                              disabled until the real balance is known, and once it's $0. */}
                          <div className="flex gap-1">
                            <button
                              disabled={isSaving || !closeOutSummaries[b.id] || closeOutSummaries[b.id].customerOutstandingCents <= 0}
                              onClick={() => recordClientPayment(b, 'zelle')}
                              className={'flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all border disabled:opacity-40 ' +
                                (b.payment_method === 'zelle'
                                  ? 'bg-purple-50 border-purple-300 text-purple-700'
                                  : 'bg-gray-50 border-gray-200 text-gray-400 hover:border-purple-200 hover:text-purple-600')}
                            >
                              Zelle
                            </button>
                            <button
                              disabled={isSaving || !closeOutSummaries[b.id] || closeOutSummaries[b.id].customerOutstandingCents <= 0}
                              onClick={() => recordClientPayment(b, 'apple_pay')}
                              className={'flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all border disabled:opacity-40 ' +
                                (b.payment_method === 'apple_pay'
                                  ? 'bg-gray-800 border-gray-800 text-white'
                                  : 'bg-gray-50 border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-600')}
                            >
                              Apple
                            </button>
                          </div>
                          {/* Remind — manual, admin-clicked text + email for whatever's
                              really still outstanding. Never fires on its own. */}
                          <button
                            disabled={isSaving || !closeOutSummaries[b.id] || closeOutSummaries[b.id].customerOutstandingCents <= 0}
                            onClick={() => sendPaymentReminder(b)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border disabled:opacity-40 bg-gray-50 border-gray-200 text-gray-500 hover:border-blue-300 hover:bg-blue-50/50 hover:text-blue-700"
                          >
                            Remind
                          </button>
                          {/* Cleaner Paid — pays every team member's REAL outstanding
                              balance (inserts team_member_payouts rows), not a flag flip. */}
                          <button
                            disabled={isSaving || !closeOutSummaries[b.id] || closeOutSummaries[b.id].laborOutstandingCents <= 0}
                            onClick={() => payAllCleaners(b)}
                            className={'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border disabled:opacity-40 ' +
                              (closeOutSummaries[b.id]?.laborOutstandingCents === 0
                                ? 'bg-green-50 border-green-200 text-green-700'
                                : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-green-300 hover:bg-green-50/50')}
                          >
                            <span className={'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ' +
                              (closeOutSummaries[b.id]?.laborOutstandingCents === 0 ? 'border-green-500 bg-green-500' : 'border-gray-300')}>
                              {closeOutSummaries[b.id]?.laborOutstandingCents === 0 && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                            </span>
                            Team Paid
                          </button>
                        </div>
                        {isExpanded && <CloseoutDetail bookingId={b.id} onAnyChange={loadBookings} />}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            {/* Recently closed out */}
            {recentlyClosedJobs.length > 0 && (
              <div className="bg-gray-50/80 border border-gray-200/60 rounded-xl p-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Recently Closed (Last 7 Days)</h3>
                <div className="space-y-1">
                  {recentlyClosedJobs.map((b) => {
                    const isExpanded = closeOutExpanded.has(b.id)
                    const toggleExpanded = () => {
                      setCloseOutExpanded(prev => {
                        const next = new Set(prev)
                        if (next.has(b.id)) next.delete(b.id); else next.add(b.id)
                        return next
                      })
                    }
                    return (
                      <div key={b.id} className="rounded-lg hover:bg-white/60 transition-colors">
                        <button onClick={toggleExpanded} className="w-full flex items-center justify-between py-2 px-3 text-left">
                          <div className="flex items-center gap-3">
                            <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <div>
                              <p className="text-sm text-[var(--sched-ink)] font-medium flex items-center gap-1.5">
                                <span className={'inline-block transition-transform ' + (isExpanded ? 'rotate-90' : '')}>▸</span>
                                {b.clients?.name || '-'}
                              </p>
                              <p className="text-xs text-gray-400 ml-4">{formatDate(b.start_time)} · {crewNames(b)}</p>
                            </div>
                          </div>
                          <div className="text-right flex items-center gap-3">
                            <span className="text-xs text-gray-400">{b.payment_method === 'zelle' ? 'Zelle' : 'Apple'}</span>
                            <span className="text-sm font-semibold text-[var(--sched-ink)]">${(b.price / 100).toFixed(0)}</span>
                          </div>
                        </button>
                        {isExpanded && <CloseoutDetail bookingId={b.id} onAnyChange={loadBookings} />}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Desktop Table */}
        <div className="bg-white rounded-xl border border-gray-200/60 overflow-hidden shadow-sm hidden md:block">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-[var(--sched-ink)] border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-400 text-sm">Loading bookings...</p>
              </div>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </div>
              <p className="text-gray-500 text-sm">No bookings found.</p>
              <p className="text-gray-400 text-xs mt-1">Try adjusting your filters or search</p>
            </div>
          ) : (
            <>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Client</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Service</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Date & Time</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden xl:table-cell">Booked</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden xl:table-cell">Source</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">{worker.singular}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Rate</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Recurring</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginatedBookings.map((b) => (
                  <tr
                    key={b.id}
                    className={
                      'cursor-pointer transition-colors ' +
                      (b.status === 'in_progress' ? 'bg-amber-50/50 hover:bg-amber-50' :
                       b.status === 'cancelled' ? 'bg-gray-50/50 opacity-60 hover:opacity-80 hover:bg-gray-50' :
                       b.status === 'pending' ? 'bg-red-50/30 hover:bg-red-50/60' :
                       'hover:bg-gray-50/80')
                    }
                    onClick={() => openEdit(b)}
                  >
                    <td className="px-4 py-3.5">
                      <div>
                        <p className={'text-sm font-medium ' + (b.status === 'cancelled' ? 'text-gray-400' : 'text-[var(--sched-ink)]')}>{b.clients?.name || '-'}</p>
                        <ContactChips phone={b.clients?.phone} address={b.clients?.address} />
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={'text-sm ' + (b.status === 'cancelled' ? 'text-gray-400' : 'text-gray-600')}>{b.service_type}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={'text-sm ' + (b.status === 'cancelled' ? 'text-gray-400' : 'text-[var(--sched-ink)]')}>{formatDate(b.start_time)}</span>
                    </td>
                    <td className="px-4 py-3.5 hidden xl:table-cell">
                      <span className="text-sm text-gray-500">{b.created_at ? formatBookedAt(b.created_at) : <span className="text-gray-300">--</span>}</span>
                    </td>
                    <td className="px-4 py-3.5 hidden xl:table-cell">
                      <span className="px-2 py-1 bg-gray-50 text-gray-600 rounded-full text-xs font-medium border border-gray-100 whitespace-nowrap">{sourceLabel(b.source)}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={'text-sm ' + (b.status === 'cancelled' ? 'text-gray-400' : 'text-gray-600')}>{crewNames(b) !== 'Unassigned' ? crewNames(b) : <span className="text-gray-300">--</span>}</span>
                    </td>
                    <td className="px-4 py-3.5 hidden lg:table-cell">
                      <span className={'text-sm ' + (b.status === 'cancelled' ? 'text-gray-400' : 'text-gray-500')}>${(() => { const hours = Math.max(1, Math.round((new Date(b.end_time).getTime() - new Date(b.start_time).getTime()) / (1000 * 60 * 60))); return b.hourly_rate ? b.hourly_rate : b.price ? Math.round(b.price / 100 / hours) : 69 })()}/hr</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={'text-sm font-semibold ' + (b.status === 'cancelled' ? 'text-gray-400 line-through' : 'text-[var(--sched-ink)]')}>~${(b.price / 100).toFixed(0)}</span>
                    </td>
                    <td className="px-4 py-3.5 hidden lg:table-cell">
                      {b.recurring_type ? <span className="px-2 py-1 bg-purple-50 text-purple-600 rounded-full text-xs font-medium border border-purple-100">{b.recurring_type}</span> : <span className="text-gray-300">--</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={
                        'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ' +
                        (b.status === 'pending' ? 'bg-red-100 text-red-700' :
                         b.status === 'in_progress' ? 'bg-amber-100 text-amber-700' :
                         b.status === 'completed' ? 'bg-green-100 text-green-700' :
                         b.status === 'cancelled' ? 'bg-gray-100 text-gray-500' :
                         'bg-blue-100 text-blue-700')
                      }>
                        {b.status === 'completed' && <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                        {b.status === 'in_progress' && <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
                        {b.status === 'pending' && b.source === 'waitlist' ? 'Pending/Waitlist' : b.status === 'in_progress' ? 'In Progress' : b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        {b.status !== 'cancelled' && (
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                if (resendMenuId === b.id) {
                                  setResendMenuId(null)
                                } else {
                                  const rect = e.currentTarget.getBoundingClientRect()
                                  setResendMenuPos({ top: rect.bottom + 4, left: rect.right - 130 })
                                  setResendMenuId(b.id)
                                }
                              }}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                              title="Resend confirmation"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                            </button>
                            {resendMenuId === b.id && resendMenuPos && createPortal(
                              <>
                                <div className="fixed inset-0 z-[9998]" onClick={() => setResendMenuId(null)} />
                                <div
                                  className="fixed bg-white border border-gray-200 rounded-lg shadow-lg z-[9999] py-1 min-w-[130px]"
                                  style={{ top: resendMenuPos.top, left: resendMenuPos.left }}
                                >
                                  <button onClick={() => handleResend(b.id, 'email')} className="w-full text-left px-3 py-1.5 text-sm text-[var(--sched-ink)] hover:bg-gray-50 transition-colors">Email</button>
                                  <button onClick={() => handleResend(b.id, 'sms')} className="w-full text-left px-3 py-1.5 text-sm text-[var(--sched-ink)] hover:bg-gray-50 transition-colors">Text</button>
                                  <button onClick={() => handleSend30MinAlert(b.id)} className="w-full text-left px-3 py-1.5 text-sm text-[var(--sched-ink)] hover:bg-gray-50 transition-colors whitespace-nowrap">30-Min Alert</button>
                                </div>
                              </>,
                              document.body
                            )}
                          </div>
                        )}
                        <button onClick={() => openEdit(b)} className="p-1.5 rounded-lg text-gray-400 hover:text-[var(--sched-ink)] hover:bg-gray-100 transition-colors" title="Edit">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={async () => { if (confirm(`Delete this booking for ${b.clients?.name || 'this client'}? This is permanent and the client is not notified.`)) { try { const res = await fetch('/api/bookings/' + b.id + '?skip_email=true', { method: 'DELETE' }); if (!res.ok) { const err = await res.json().catch(() => ({ error: res.statusText })); alert(`Failed to delete: ${err.error || 'Unknown error'}`); } await loadBookings() } catch (e) { alert(`Failed to delete: ${e instanceof Error ? e.message : 'Network error'}`) } } }} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete (permanent, silent)">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-xs text-gray-400">
                  Showing {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, filteredBookings.length)} of {filteredBookings.length}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    Prev
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                    .reduce((acc: (number | string)[], p, i, arr) => {
                      if (i > 0 && typeof arr[i - 1] === 'number' && (p as number) - (arr[i - 1] as number) > 1) acc.push('...')
                      acc.push(p)
                      return acc
                    }, [])
                    .map((p, i) =>
                      typeof p === 'string' ? (
                        <span key={`ellipsis-${i}`} className="px-1.5 text-gray-300 text-xs">...</span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => setCurrentPage(p as number)}
                          className={
                            'min-w-[28px] h-7 rounded-lg text-xs font-medium transition-colors ' +
                            (currentPage === p ? 'bg-[var(--sched-ink)] text-white' : 'text-gray-500 hover:bg-gray-100')
                          }
                        >
                          {p}
                        </button>
                      )
                    )}
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
            </>
          )}
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-7 h-7 border-2 border-[var(--sched-ink)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 text-sm">No bookings found.</p>
            </div>
          ) : (
            <>
              {paginatedBookings.map((b) => (
                <div
                  key={b.id}
                  onClick={() => openEdit(b)}
                  className={
                    'bg-white rounded-xl border border-gray-200/60 p-4 cursor-pointer transition-all active:scale-[0.99] ' +
                    (b.status === 'in_progress' ? 'border-amber-200 bg-amber-50/30 shadow-sm' :
                     b.status === 'cancelled' ? 'opacity-60' :
                     b.status === 'pending' ? 'border-red-200 bg-red-50/20' :
                     'hover:shadow-sm')
                  }
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className={'font-semibold text-sm ' + (b.status === 'cancelled' ? 'text-gray-400' : 'text-[var(--sched-ink)]')}>{b.clients?.name || '-'}</p>
                      <ContactChips phone={b.clients?.phone} address={b.clients?.address} />
                    </div>
                    <span className={
                      'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ml-2 flex-shrink-0 ' +
                      (b.status === 'pending' ? 'bg-red-100 text-red-700' :
                       b.status === 'in_progress' ? 'bg-amber-100 text-amber-700' :
                       b.status === 'completed' ? 'bg-green-100 text-green-700' :
                       b.status === 'cancelled' ? 'bg-gray-100 text-gray-500' :
                       'bg-blue-100 text-blue-700')
                    }>
                      {b.status === 'completed' && <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                      {b.status === 'in_progress' && <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
                      {b.status === 'pending' && b.source === 'waitlist' ? 'Pending/Waitlist' : b.status === 'in_progress' ? 'In Progress' : b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-2">
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      {formatDate(b.start_time)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-gray-100">
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{b.service_type}</span>
                      {crewNames(b) !== 'Unassigned' && <span className="text-gray-400">/ {crewNames(b)}</span>}
                      {b.recurring_type && <span className="px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded-full text-xs font-medium">{b.recurring_type}</span>}
                    </div>
                    <span className={'text-sm font-bold ' + (b.status === 'cancelled' ? 'text-gray-400 line-through' : 'text-[var(--sched-ink)]')}>~${(b.price / 100).toFixed(0)}</span>
                  </div>
                </div>
              ))}

              {/* Mobile Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2 pb-4">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 rounded-xl text-sm font-medium text-gray-500 bg-white border border-gray-200 disabled:opacity-30 transition-colors"
                  >
                    Prev
                  </button>
                  <span className="text-xs text-gray-400">Page {currentPage} of {totalPages}</span>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 rounded-xl text-sm font-medium text-gray-500 bg-white border border-gray-200 disabled:opacity-30 transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>

      </main>

      {showModal && editingBooking && (
        <SidePanel open={showModal} onClose={() => { setShowModal(false); setEditingBooking(null) }} title={editingBooking.clients?.name || 'Booking'} width="max-w-lg">
          <form onSubmit={handleSubmit}>
            {/* ── CLIENT HEADER ── */}
            {editingBooking.job_seq != null && editingBooking.clients?.customer_number != null && tenantSlug && (
              <p className="text-xs font-mono text-gray-400 -mt-1 mb-2">Job #{formatJobNumber(tenantSlug, editingBooking.clients.customer_number, editingBooking.job_seq)}</p>
            )}
            {editingBooking.client_id && clients.find(c => c.id === editingBooking.client_id)?.do_not_service && (
              <div className="bg-red-50 border-2 border-red-300 rounded-lg p-3 mb-3">
                <p className="text-red-700 font-bold text-sm">DO NOT SERVICE</p>
              </div>
            )}
            <div className="flex items-start justify-between mb-1">
              <div>
                {clientProperties.length > 0 ? (
                  <select
                    value={form.property_id}
                    onChange={(e) => {
                      if (e.target.value === '__add_address__') {
                        setNewClientContactsId(editingBooking.client_id)
                        setShowNewClientModal(true)
                        return
                      }
                      setForm({ ...form, property_id: e.target.value })
                    }}
                    className="text-sm text-gray-600 border border-gray-200 rounded px-1.5 py-0.5 -ml-1.5"
                  >
                    {clientProperties.map(p => (
                      <option key={p.id} value={p.id}>{p.address}{p.is_primary ? ' (primary)' : ''}</option>
                    ))}
                    <option value="__add_address__">+ Add new address</option>
                  </select>
                ) : (
                  editingBooking.clients?.address && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(editingBooking.clients.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-gray-600 hover:text-blue-600 hover:underline"
                    >
                      {editingBooking.clients.address}
                    </a>
                  )
                )}
                {editingBooking.clients?.phone && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm font-medium text-[var(--sched-ink)]">{formatPhone(editingBooking.clients.phone)}</span>
                    <CallTextCopy phone={editingBooking.clients.phone} />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={`text-xs font-medium px-2 py-1 rounded-full border-0 appearance-none cursor-pointer ${
                  form.status === 'pending' ? 'bg-red-100 text-red-700' : form.status === 'scheduled' ? 'bg-green-100 text-green-700' : form.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : form.status === 'completed' ? 'bg-gray-100 text-gray-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  <option value="pending">Pending</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Canceled</option>
                </select>
                {(editingBooking.recurring_type || editingBooking.schedule_id) && (
                  <span className="px-2 py-1 bg-purple-50 text-purple-600 rounded-full text-xs font-medium">{editingBooking.recurring_type || 'Recurring'}</span>
                )}
                {(editingBooking.notes || '').includes('Client accepted terms') ? (
                  <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium">✓ Terms accepted</span>
                ) : (
                  <span className="px-2 py-1 bg-gray-50 text-gray-500 rounded-full text-xs font-medium">Awaiting terms</span>
                )}
              </div>
            </div>
            {editingBooking.team_member_token && (
              <button type="button" onClick={copyTeamLink} className="text-xs text-[var(--sched-muted)] hover:text-[var(--sched-ink)] mb-2 block">{copied ? 'Copied!' : 'Copy team link'}</button>
            )}

            {/* ── JOB PROGRESS ── */}
            {(() => {
              const locations = [
                { label: 'Check-in', loc: editingBooking.check_in_location },
                { label: 'Check-out', loc: editingBooking.check_out_location }
              ].filter(l => l.loc && typeof l.loc === 'object' && 'distance_miles' in (l.loc as Record<string, unknown>))
              if (locations.length === 0) return null
              return (
                <div className="mb-3 space-y-1">
                  {locations.map(({ label, loc }) => {
                    const l = loc as Record<string, unknown>; const flagged = l.flagged as boolean; const dist = l.distance_miles as number
                    return <div key={label} className={`text-xs px-3 py-1.5 rounded-lg ${flagged ? 'bg-red-50 text-red-700 font-medium' : 'bg-green-50 text-green-700'}`}>{flagged ? '⚠️' : '✓'} {label}: {dist.toFixed(2)} mi</div>
                  })}
                </div>
              )
            })()}
            {!editingBooking.check_in_time && (
              <div className="mb-3">
                <p className="text-xs font-semibold text-[var(--sched-muted)] mb-1.5">Notify Client on My Way</p>
                <div className="flex gap-2">
                  {([30, 60, 90] as const).map((minutes) => (
                    <button
                      key={minutes}
                      type="button"
                      disabled={sendingOmw === minutes}
                      onClick={async () => {
                        setSendingOmw(minutes)
                        try {
                          const res = await fetch('/api/team-portal/on-my-way', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookingId: editingBooking.id, minutes }) })
                          if (!res.ok) alert('Failed to send')
                        } catch { alert('Failed to send') }
                        setSendingOmw(null)
                      }}
                      className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                    >
                      {sendingOmw === minutes ? '...' : minutes}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {form.status === 'scheduled' && !editingBooking.check_in_time && (
              <button type="button" onClick={async () => { setSaving(true); const now = new Date().toISOString(); await fetch('/api/bookings/' + editingBooking.id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'in_progress', check_in_time: now, team_member_id: form.team_member_id || null, skip_email: true }) }); setEditingBooking({ ...editingBooking, status: 'in_progress', check_in_time: now }); setForm({ ...form, status: 'in_progress' }); loadBookings(); setSaving(false) }} className="w-full mb-3 py-2 bg-[var(--sched-ink)] text-white rounded-lg text-sm font-medium">Check In (Admin)</button>
            )}
            {editingBooking.check_in_time && (
              <div className="mb-3 space-y-1.5">
                {editCheckInVal === null ? (
                  <p className="text-xs text-green-700 bg-green-50 px-3 py-1.5 rounded-lg flex items-center justify-between">
                    <span>Checked in: {toEST(editingBooking.check_in_time, timezone)}</span>
                    <span className="flex items-center gap-2">
                      <button type="button" onClick={() => setEditCheckInVal(toDateTimeLocalET(editingBooking.check_in_time!, timezone))} className="text-[10px] underline text-green-800">edit</button>
                      {!editingBooking.check_out_time && (
                        <button type="button" disabled={saving} onClick={async () => { if (!confirm('Undo check-in? Sends this job back to scheduled.')) return; setSaving(true); const res = await fetch('/api/bookings/' + editingBooking.id + '/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stage: 'check-in' }) }); if (res.ok) { setEditingBooking({ ...editingBooking, status: 'scheduled', check_in_time: null, check_in_location: null, fifteen_min_alert_time: null }); setForm({ ...form, status: 'scheduled' }); loadBookings() } else { const d = await res.json().catch(() => ({})); alert(d.error || 'Failed to undo') } setSaving(false) }} className="text-[10px] underline text-red-600">undo</button>
                      )}
                    </span>
                  </p>
                ) : (
                  <div className="text-xs text-green-700 bg-green-50 px-3 py-1.5 rounded-lg flex items-center gap-2">
                    <span>Check-in:</span>
                    <input type="datetime-local" value={editCheckInVal} onChange={(e) => setEditCheckInVal(e.target.value)} className="bg-white border border-green-200 rounded px-1 py-0.5 text-xs" />
                    <button type="button" disabled={saving} onClick={async () => { if (!editCheckInVal) return; setSaving(true); const iso = fromDateTimeLocalET(editCheckInVal, timezone); await fetch('/api/bookings/' + editingBooking.id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ check_in_time: iso, skip_email: true }) }); setEditingBooking({ ...editingBooking, check_in_time: iso }); setEditCheckInVal(null); loadBookings(); setSaving(false) }} className="px-2 py-0.5 bg-green-700 text-white rounded text-[10px]">Save</button>
                    <button type="button" onClick={() => setEditCheckInVal(null)} className="px-2 py-0.5 border border-green-300 rounded text-[10px]">Cancel</button>
                  </div>
                )}
                {editingBooking.fifteen_min_alert_time && <p className="text-xs text-yellow-700 bg-yellow-50 px-3 py-1.5 rounded-lg">30-min warning: {toEST(editingBooking.fifteen_min_alert_time, timezone)}</p>}
                {editingBooking.check_out_time && (
                  editCheckOutVal === null ? (
                    <p className="text-xs text-green-700 bg-green-50 px-3 py-1.5 rounded-lg flex items-center justify-between">
                      <span>Checked out: {toEST(editingBooking.check_out_time, timezone)}{editingBooking.actual_hours ? ` (${editingBooking.actual_hours}hrs)` : ''}</span>
                      <span className="flex items-center gap-2">
                        <button type="button" onClick={() => setEditCheckOutVal(toDateTimeLocalET(editingBooking.check_out_time!, timezone))} className="text-[10px] underline text-green-800">edit</button>
                        <button type="button" disabled={saving} onClick={async () => { if (!confirm('Undo check-out? Sends this job back to in-progress.')) return; setSaving(true); const res = await fetch('/api/bookings/' + editingBooking.id + '/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stage: 'check-out' }) }); if (res.ok) { setEditingBooking({ ...editingBooking, status: 'in_progress', check_out_time: null, check_out_location: null, actual_hours: null }); setForm({ ...form, status: 'in_progress', actual_hours: null }); loadBookings() } else { const d = await res.json().catch(() => ({})); alert(d.error || 'Failed to undo') } setSaving(false) }} className="text-[10px] underline text-red-600">undo</button>
                      </span>
                    </p>
                  ) : (
                    <div className="text-xs text-green-700 bg-green-50 px-3 py-1.5 rounded-lg flex items-center gap-2 flex-wrap">
                      <span>Check-out:</span>
                      <input type="datetime-local" value={editCheckOutVal} onChange={(e) => setEditCheckOutVal(e.target.value)} className="bg-white border border-green-200 rounded px-1 py-0.5 text-xs" />
                      <button type="button" disabled={saving} onClick={async () => { if (!editCheckOutVal) return; setSaving(true); const iso = fromDateTimeLocalET(editCheckOutVal, timezone); const cleanerHourlyPay = form.pay_rate || cleaners.find(c => c.id === form.team_member_id)?.pay_rate; const { actualHours, priceCents: updatedPrice, cleanerPayCents: cleanerPay } = computeCheckoutPricing({ checkInIso: editingBooking.check_in_time!, checkOutIso: iso, hourlyRate: editingBooking.hourly_rate, cleanerHourlyRate: cleanerHourlyPay, discountPercent: editingBooking.discount_percent, oneTimeCreditCents: editingBooking.one_time_credit_cents, recurringType: editingBooking.recurring_type, maxHours: (editingBooking as any).max_hours, teamSize: (editingBooking as any).team_size }); await fetch('/api/bookings/' + editingBooking.id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ check_out_time: iso, actual_hours: actualHours, price: updatedPrice, team_member_pay: cleanerPay, skip_email: true }) }); setEditingBooking({ ...editingBooking, check_out_time: iso, actual_hours: actualHours, price: updatedPrice, team_member_pay: cleanerPay }); setForm({ ...form, actual_hours: actualHours, team_member_pay: cleanerPay }); setEditCheckOutVal(null); loadBookings(); setSaving(false) }} className="px-2 py-0.5 bg-green-700 text-white rounded text-[10px]">Save</button>
                      <button type="button" onClick={() => setEditCheckOutVal(null)} className="px-2 py-0.5 border border-green-300 rounded text-[10px]">Cancel</button>
                    </div>
                  )
                )}
                {!editingBooking.check_out_time && (
                  <div className="flex gap-2">
                    {!editingBooking.fifteen_min_alert_time && (
                      <button type="button" onClick={async () => { setSaving(true); try { const res = await fetch('/api/team-portal/30min-alert', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookingId: editingBooking.id }) }); if (!res.ok) { const err = await res.json().catch(() => ({})); alert(`Alert failed: ${err.error || res.statusText}`) } else { setEditingBooking({ ...editingBooking, fifteen_min_alert_time: new Date().toISOString() }) } } catch { alert('Alert failed: network error') } setSaving(false) }} className="flex-1 py-2 bg-yellow-500 text-white rounded-lg text-xs font-bold">30-Min Alert</button>
                    )}
                    {!confirmCheckout ? (
                      <button type="button" onClick={() => setConfirmCheckout(true)} className="flex-1 py-2 bg-green-600 text-white rounded-lg text-xs font-medium">Check Out</button>
                    ) : (
                      <div className="flex-1 flex gap-1.5">
                        <button type="button" onClick={() => setConfirmCheckout(false)} className="flex-1 py-2 border border-gray-300 text-gray-600 rounded-lg text-xs">Cancel</button>
                        <button type="button" onClick={async () => { setConfirmCheckout(false); setSaving(true); const now = new Date(); const cleanerHourlyPay = form.pay_rate || cleaners.find(c => c.id === form.team_member_id)?.pay_rate; const { actualHours, priceCents: updatedPrice, cleanerPayCents: cleanerPay } = computeCheckoutPricing({ checkInIso: editingBooking.check_in_time!, checkOutIso: now.toISOString(), hourlyRate: editingBooking.hourly_rate, cleanerHourlyRate: cleanerHourlyPay, discountPercent: editingBooking.discount_percent, oneTimeCreditCents: editingBooking.one_time_credit_cents, recurringType: editingBooking.recurring_type, maxHours: (editingBooking as any).max_hours, teamSize: (editingBooking as any).team_size }); await fetch('/api/bookings/' + editingBooking.id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'completed', check_out_time: now.toISOString(), actual_hours: actualHours, price: updatedPrice, team_member_pay: cleanerPay, team_member_id: form.team_member_id || null, skip_email: true }) }); setEditingBooking({ ...editingBooking, status: 'completed', check_out_time: now.toISOString(), actual_hours: actualHours, price: updatedPrice, team_member_pay: cleanerPay }); setForm({ ...form, status: 'completed', actual_hours: actualHours, team_member_pay: cleanerPay }); loadBookings(); setSaving(false) }} className="flex-1 py-2 bg-red-600 text-white rounded-lg text-xs font-bold">Confirm Check Out</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            {(editingBooking.walkthrough_video_url || editingBooking.final_video_url) && (
              <div className="mb-3 grid grid-cols-2 gap-2">
                {editingBooking.walkthrough_video_url && <div><p className="text-[10px] text-gray-400 mb-0.5">Before</p><video src={editingBooking.walkthrough_video_url} controls className="w-full rounded-lg max-h-[120px]" preload="metadata" /></div>}
                {editingBooking.final_video_url && <div><p className="text-[10px] text-gray-400 mb-0.5">After</p><video src={editingBooking.final_video_url} controls className="w-full rounded-lg max-h-[120px]" preload="metadata" /></div>}
              </div>
            )}

            {/* ── BOOKING DETAILS (compact) ── */}
            <div className="bg-gray-50 rounded-xl p-3 mb-3 space-y-2">
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block text-[10px] text-gray-400 uppercase">Date</label>
                  <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-[var(--sched-ink)] bg-white" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 uppercase">Time</label>
                  <input type="time" min="07:00" max="19:00" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-[var(--sched-ink)] bg-white" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 uppercase">Hours</label>
                  <select value={form.hours} onChange={(e) => setForm({ ...form, hours: parseInt(e.target.value) })} className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-[var(--sched-ink)] bg-white">
                    {[1,2,3,4,5,6,7,8].map(h => <option key={h} value={h}>{h}hr</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 uppercase">Rate</label>
                  <div className="flex gap-1">
                    <select
                      value={[59, 69, 89, 99, 79, 49, 65, 75, 100].includes(form.hourly_rate) ? form.hourly_rate : 'custom'}
                      onChange={(e) => {
                        const v = e.target.value
                        if (v === 'custom') {
                          const isPreset = [59, 69, 89, 99, 79, 49, 65, 75, 100].includes(form.hourly_rate)
                          setForm({ ...form, hourly_rate: isPreset ? 0 : form.hourly_rate })
                        } else setForm({ ...form, hourly_rate: parseInt(v) })
                      }}
                      className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-[var(--sched-ink)] bg-white"
                    >
                      <option value={59}>$59</option>
                      <option value={69}>$69</option>
                      <option value={89}>$89</option>
                      <option value={99}>$99</option>
                      <option value={79}>$79 (Legacy)</option>
                      <option value={49}>$49 (Legacy)</option>
                      <option value={65}>$65 (Legacy)</option>
                      <option value={75}>$75 (Legacy)</option>
                      <option value={100}>$100 (Legacy)</option>
                      <option value="custom">Custom</option>
                    </select>
                    {![59, 69, 89, 99, 79, 49, 65, 75, 100].includes(form.hourly_rate) && (
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={form.hourly_rate}
                        onChange={(e) => setForm({ ...form, hourly_rate: parseInt(e.target.value) || 0 })}
                        className="w-16 px-1.5 py-1.5 border border-gray-200 rounded-lg text-sm text-[var(--sched-ink)] bg-white"
                        placeholder="$"
                      />
                    )}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-gray-400 uppercase">Service</label>
                  <select value={form.service_type} onChange={(e) => setForm({ ...form, service_type: e.target.value })} className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-[var(--sched-ink)] bg-white">
                    {serviceTypes.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="flex items-end">
                  <div className="flex items-center justify-between w-full px-2 py-1.5 border border-gray-200 rounded-lg bg-white">
                    <span className="text-sm text-[var(--sched-ink)]">Discount</span>
                    <div onClick={() => setForm({ ...form, discount_enabled: !form.discount_enabled })} className={`w-9 h-5 rounded-full transition-colors ${form.discount_enabled ? 'bg-green-600' : 'bg-gray-300'} relative cursor-pointer`}>
                      <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-[3px] transition-transform ${form.discount_enabled ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
                    </div>
                  </div>
                </div>
              </div>
              {form.discount_enabled && (
                <div className="flex gap-1 items-center">
                  <label className="text-[10px] text-gray-400 uppercase w-14">Percent</label>
                  <select
                    value={[5, 10, 20].includes(form.discount_percent) ? form.discount_percent : 'custom'}
                    onChange={(e) => {
                      const v = e.target.value
                      if (v === 'custom') {
                        const isPreset = [5, 10, 20].includes(form.discount_percent)
                        setForm({ ...form, discount_percent: isPreset ? 15 : form.discount_percent })
                      } else setForm({ ...form, discount_percent: parseInt(v) })
                    }}
                    className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-[var(--sched-ink)] bg-white"
                  >
                    <option value={20}>20% ($69 weekly)</option>
                    <option value={10}>10% ($69 biweekly/monthly &middot; $59 weekly)</option>
                    <option value={5}>5% ($59 biweekly/monthly)</option>
                    <option value="custom">Custom</option>
                  </select>
                  {![5, 10, 20].includes(form.discount_percent) && (
                    <input
                      type="number"
                      min="1"
                      max="50"
                      step="1"
                      value={form.discount_percent}
                      onChange={(e) => setForm({ ...form, discount_percent: parseInt(e.target.value) || 0 })}
                      className="w-16 px-1.5 py-1.5 border border-gray-200 rounded-lg text-sm text-[var(--sched-ink)] bg-white"
                      placeholder="%"
                    />
                  )}
                </div>
              )}
              {/* One-time credit: a flat comp on THIS visit only (e.g. service
                  recovery). Stacks on top of the discount above and never
                  touches the recurring schedule, so future visits are unaffected. */}
              {!showOneTimeCredit ? (
                <button type="button" onClick={() => setShowOneTimeCredit(true)} className="text-left text-[11px] text-amber-700 hover:text-amber-800 font-medium pt-0.5">
                  + One-time credit (this visit only)
                </button>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-amber-700 uppercase font-semibold">One-time credit — this visit only</span>
                    <button type="button" onClick={() => { setShowOneTimeCredit(false); setForm({ ...form, one_time_credit_dollars: 0, one_time_credit_reason: '' }) }} className="text-[10px] text-amber-600 hover:text-amber-800">Remove</button>
                  </div>
                  <div className="flex gap-1.5">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={form.one_time_credit_dollars || ''}
                      onChange={(e) => setForm({ ...form, one_time_credit_dollars: parseFloat(e.target.value) || 0 })}
                      className="w-20 px-2 py-1.5 border border-amber-300 rounded-lg text-sm text-[var(--sched-ink)] bg-white"
                      placeholder="$ off"
                    />
                    <input
                      type="text"
                      value={form.one_time_credit_reason}
                      onChange={(e) => setForm({ ...form, one_time_credit_reason: e.target.value })}
                      className="flex-1 px-2 py-1.5 border border-amber-300 rounded-lg text-sm text-[var(--sched-ink)] bg-white"
                      placeholder="Reason (optional) — e.g. service recovery"
                    />
                  </div>
                </div>
              )}
              <div className="flex justify-between text-xs pt-1 border-t border-gray-200">
                <span className="text-gray-500">~{getEstimatedHoursRange(form.hours)}hrs × ${form.hourly_rate}{form.team_size > 1 ? ` × ${form.team_size} cleaners` : ''}{form.discount_enabled && form.discount_percent > 0 ? ` − ${form.discount_percent}%` : ''}{form.one_time_credit_dollars > 0 ? ` − $${form.one_time_credit_dollars} credit` : ''}</span>
                <span className="font-semibold text-[var(--sched-ink)]">~${(calculateEditPrice() / 100).toFixed(0)}</span>
              </div>
              <div className="flex gap-1.5 pt-2 border-t border-gray-200">
                <div className="flex-1">
                  <label className="block text-[10px] text-gray-400 uppercase mb-1">Referred by</label>
                  <select value={form.referrer_id} onChange={(e) => setForm({ ...form, referrer_id: e.target.value })} className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-[var(--sched-ink)] bg-white">
                    <option value="">None</option>
                    {referrers.filter(r => r.active).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] text-gray-400 uppercase mb-1">Sales partner</label>
                  <select value={form.sales_partner_id} onChange={(e) => setForm({ ...form, sales_partner_id: e.target.value })} className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-[var(--sched-ink)] bg-white">
                    <option value="">None</option>
                    {salesPartners.filter(s => s.active).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="pt-2 border-t border-gray-200">
                <RecurringOptions startDate={form.start_date} enabled={form.repeat_enabled} onEnabledChange={(v) => setForm({ ...form, repeat_enabled: v })} repeatType={form.repeat_type} onRepeatTypeChange={(v) => setForm({ ...form, repeat_type: v })} repeatEnd={form.repeat_end} onRepeatEndChange={(v) => setForm({ ...form, repeat_end: v })} repeatEndCount={form.repeat_end_count} onRepeatEndCountChange={(v) => setForm({ ...form, repeat_end_count: v })} repeatEndDate={form.repeat_end_date} onRepeatEndDateChange={(v) => setForm({ ...form, repeat_end_date: v })} customInterval={form.custom_interval} onCustomIntervalChange={(v) => setForm({ ...form, custom_interval: v })} previewDates={!(editingBooking?.recurring_type || editingBooking?.schedule_id) ? editRecurringDates : []} />
              </div>
            </div>

            {/* ── ACTUAL LABOR (completed only) ── */}
            {(form.status === 'completed' || form.actual_hours) && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-3">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-green-600 uppercase">Hours</label>
                    <input type="number" step="0.5" min="0" value={form.actual_hours ?? ''} onChange={(e) => { const hrs = e.target.value ? parseFloat(e.target.value) : null; const cr = cleaners.find(c => c.id === form.team_member_id)?.pay_rate || 25; setForm({ ...form, actual_hours: hrs, team_member_pay: hrs ? Math.round(hrs * cr * 100) : null }) }} placeholder="—" className="w-full px-2 py-1.5 border border-green-300 rounded-lg text-sm text-[var(--sched-ink)] bg-white" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-green-600 uppercase">Team Pay</label>
                    <input type="number" step="0.01" min="0" value={form.team_member_pay != null ? (form.team_member_pay / 100).toFixed(2) : ''} onChange={(e) => setForm({ ...form, team_member_pay: e.target.value ? Math.round(parseFloat(e.target.value) * 100) : null })} placeholder="auto" className="w-full px-2 py-1.5 border border-green-300 rounded-lg text-sm text-[var(--sched-ink)] bg-white" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-green-600 uppercase">Team Paid</label>
                    <select value={form.team_member_paid ? 'paid' : 'not_paid'} onChange={(e) => setForm({ ...form, team_member_paid: e.target.value === 'paid' })} className={'w-full px-2 py-1.5 border rounded-lg text-sm ' + (form.team_member_paid ? 'border-green-300 text-green-700 bg-green-50' : 'border-green-300 text-[var(--sched-ink)] bg-white')}>
                      <option value="not_paid">No</option><option value="paid">Yes</option>
                    </select>
                  </div>
                </div>
                {form.actual_hours && <p className="text-xs text-green-700 mt-1 text-right font-medium">{form.actual_hours}hrs × ${form.hourly_rate} = ${(form.actual_hours * form.hourly_rate).toFixed(0)}</p>}
              </div>
            )}

            {/* ── PAYMENT ── */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <label className="block text-[10px] text-gray-400 uppercase">Payment</label>
                <select value={form.payment_status} onChange={(e) => setForm({ ...form, payment_status: e.target.value })} className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-[var(--sched-ink)]">
                  <option value="pending">Pending</option><option value="paid">Paid</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-gray-400 uppercase">Method</label>
                <select value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-[var(--sched-ink)]">
                  <option value="">—</option><option value="zelle">Zelle</option><option value="apple_pay">Apple Pay</option>
                </select>
              </div>
            </div>

            {/* ── CLEANER / TEAM ── */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[10px] text-gray-400 uppercase">{form.team_size > 1 ? worker.plural : worker.singular}</label>
                <div className="flex items-center gap-2">
                  <label className="text-[10px] text-gray-500">Rate</label>
                  <div className="flex items-center">
                    <span className="text-[var(--sched-ink)] text-xs mr-0.5">$</span>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={form.pay_rate ?? ''}
                      onChange={(e) => setForm({ ...form, pay_rate: e.target.value ? parseInt(e.target.value) : null })}
                      placeholder="auto"
                      className="w-14 px-1.5 py-0.5 border border-gray-300 rounded text-xs text-[var(--sched-ink)] bg-white"
                    />
                    <span className="text-[var(--sched-ink)] text-xs ml-0.5">/hr</span>
                  </div>
                  <label className="text-[10px] text-gray-500">Team size</label>
                  <select
                    value={form.team_size}
                    onChange={(e) => {
                      const n = parseInt(e.target.value, 10) || 1
                      const maxExtras = Math.max(0, n - 1)
                      setForm({ ...form, team_size: n, extra_team_member_ids: form.extra_team_member_ids.slice(0, maxExtras) })
                    }}
                    className="px-2 py-0.5 border border-gray-300 rounded text-xs text-[var(--sched-ink)] bg-white"
                  >
                    {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                  {form.team_size > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const ranked = Object.values(smartScores)
                          .filter(s => s.available)
                          .sort((a, b) => b.score - a.score)
                          .slice(0, form.team_size)
                        if (ranked.length === 0) return
                        const lead = ranked[0]?.id || ''
                        const extras = ranked.slice(1).map(r => r.id)
                        setForm({ ...form, team_member_id: lead, extra_team_member_ids: extras })
                      }}
                      className="text-[10px] px-2 py-0.5 bg-[#A8F0DC] text-[var(--sched-ink)] rounded font-semibold hover:bg-[#90E5CC]"
                    >
                      Auto-pick top {form.team_size}
                    </button>
                  )}
                </div>
              </div>
              {editingBooking.suggested_team_member_id && !editingBooking.team_member_id && form.team_size <= 1 && (() => {
                const suggested = cleaners.find(c => c.id === editingBooking.suggested_team_member_id)
                return suggested ? (
                  <button type="button" onClick={() => setForm({ ...form, team_member_id: suggested.id })} className="w-full mb-1.5 px-3 py-2 rounded-lg border-2 border-green-400 bg-green-50 text-left text-sm hover:bg-green-100 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-green-800">Suggested: {suggested.name}</span>
                      <span className="text-[10px] text-green-600 font-medium">Tap to assign</span>
                    </div>
                    {editingBooking.suggested_reason && <p className="text-[10px] text-green-600 mt-0.5">{editingBooking.suggested_reason}</p>}
                  </button>
                ) : null
              })()}
              {suggestions.length > 0 && (
                <SuggestionStrip
                  suggestions={suggestions}
                  variant={Object.values(smartScores).filter(s => s.available).length === 0 ? 'full' : 'better'}
                  onPick={(t) => setForm({ ...form, start_time: t })}
                />
              )}
              {Object.keys(smartScores).length > 0 && (
                <p className="text-[10px] text-gray-500 mb-1">
                  Ranked by zone match, proximity, and schedule fit
                  {form.team_size > 1 && <> · click to add. Drag to reorder — top = LEAD.</>}
                </p>
              )}
              {/* Team order with drag-to-reorder. Top = lead. */}
              {form.team_size > 1 && (form.team_member_id || form.extra_team_member_ids.length > 0) && (
                <div className="mb-2 p-2 bg-indigo-50/60 border border-indigo-200 rounded-lg">
                  <p className="text-[10px] text-indigo-700 font-semibold uppercase tracking-wide mb-1.5">Team order — drag to reorder</p>
                  <div className="space-y-1">
                    {[form.team_member_id, ...form.extra_team_member_ids].filter(Boolean).map((cid, idx, arr) => {
                      const c = cleaners.find(x => x.id === cid)
                      return (
                        <div
                          key={cid}
                          draggable
                          onDragStart={(e) => { e.dataTransfer.setData('text/plain', String(idx)) }}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault()
                            const fromIdx = parseInt(e.dataTransfer.getData('text/plain'), 10)
                            if (Number.isNaN(fromIdx) || fromIdx === idx) return
                            const next = [...arr]
                            const [moved] = next.splice(fromIdx, 1)
                            next.splice(idx, 0, moved)
                            setForm({ ...form, team_member_id: next[0] || '', extra_team_member_ids: next.slice(1) })
                          }}
                          className="flex items-center justify-between bg-white border border-indigo-200 rounded-md px-2.5 py-1.5 text-sm cursor-move hover:border-indigo-400"
                        >
                          <span className="flex items-center gap-2">
                            <span className="text-gray-400 text-base leading-none">⋮⋮</span>
                            <span className="font-medium text-[var(--sched-ink)]">{c?.name || cid}</span>
                            {idx === 0 && <span className="text-[10px] bg-indigo-600 text-white px-1.5 py-0.5 rounded font-semibold">LEAD</span>}
                            {idx > 0 && <span className="text-[10px] bg-indigo-400 text-white px-1.5 py-0.5 rounded font-semibold">EXTRA</span>}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const next = arr.filter((_, i) => i !== idx)
                              setForm({ ...form, team_member_id: next[0] || '', extra_team_member_ids: next.slice(1) })
                            }}
                            className="text-xs text-gray-400 hover:text-red-600"
                            title="Remove from team"
                          >✕</button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              <div className="space-y-1 max-h-36 overflow-y-auto">
                {form.team_size <= 1 && (
                  <button type="button" onClick={() => setForm({ ...form, team_member_id: '' })} className={`w-full flex items-center px-3 py-1.5 rounded-lg border text-sm ${!form.team_member_id ? 'border-indigo-500 bg-indigo-50 font-medium' : 'border-gray-200 hover:border-gray-300'} text-[var(--sched-ink)]`}>Unassigned</button>
                )}
                {cleaners
                  .filter(c => c.active !== false && (c.status || 'active') !== 'inactive')
                  .slice()
                  .sort((a, b) => {
                    const sa = smartScores[a.id]
                    const sb = smartScores[b.id]
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
                  const avail = getCleanerAvailability(c, form.start_date, form.start_time, form.hours, bookings, timezone)
                  const isLead = form.team_member_id === c.id
                  const isExtra = form.extra_team_member_ids.includes(c.id)
                  const selected = isLead || isExtra
                  const isSuggested = c.id === editingBooking.suggested_team_member_id
                  const smart = smartScores[c.id]
                  const isZoneMatch = !!smart?.zone_match
                  const topPick = smart && smart.available && Object.values(smartScores).filter(s => s.available).sort((x, y) => y.score - x.score)[0]?.id === c.id
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
                    <button key={c.id} type="button" onClick={onClickPick} className={`w-full text-left px-3 py-1.5 rounded-lg border text-sm ${
                      isLead
                        ? 'border-indigo-500 bg-indigo-50'
                        : isExtra
                          ? 'border-indigo-500 bg-indigo-50'
                          : topPick
                            ? 'border-green-400 bg-green-50'
                            : isSuggested || isZoneMatch
                              ? 'border-green-300 bg-green-50/50'
                              : avail.available
                                ? 'border-gray-200 hover:border-gray-300'
                                : 'border-gray-200 text-gray-400'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className={selected ? 'font-medium text-[var(--sched-ink)]' : ''}>
                          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '9999px', background: colorForMember(memberColors, c.id), marginRight: '6px', verticalAlign: 'middle' }} />{(topPick || isSuggested) && !selected ? '★ ' : ''}{c.name}
                          {isLead && form.team_size > 1 && <span className="ml-1.5 text-[9px] bg-indigo-600 text-white px-1 py-0.5 rounded font-semibold">LEAD</span>}
                          {isExtra && <span className="ml-1.5 text-[9px] bg-indigo-400 text-white px-1 py-0.5 rounded font-semibold">EXTRA</span>}
                          {smart?.is_preferred && <span className="ml-1.5 text-[9px] bg-amber-500 text-white px-1 py-0.5 rounded font-semibold">★ PREFERRED</span>}
                          {isZoneMatch && <span className="ml-1.5 text-[9px] text-green-700 bg-green-100 px-1 py-0.5 rounded font-medium">zone</span>}
                          {smart?.has_car === false && <span className="ml-1 text-[9px] text-gray-500">no car</span>}
                        </span>
                        {form.start_date && (avail.available ? <span className="text-[10px] text-green-600 font-medium">{smart?.reason || 'Available'}</span> : <span className="text-[10px] text-red-500">{avail.reason}</span>)}
                      </div>
                      {smart?.available && (smart.distance_miles != null || smart.travel_from_prev_min != null || smart.travel_to_next_min != null || smart.travel_to_home_min != null || smart.can_make_home === false) && (
                        <div className="mt-0.5 text-[9px] text-gray-500 flex flex-wrap gap-x-2">
                          {smart.distance_miles != null && <span>📍 {smart.distance_miles} mi</span>}
                          {smart.travel_from_prev_min != null && <span>🚗 {smart.travel_from_prev_min} min from {smart.prev_job_label || 'prev'}</span>}
                          {smart.travel_to_next_min != null && <span>➡️ {smart.travel_to_next_min} min to {smart.next_job_label || 'next'}</span>}
                          {smart.travel_to_home_min != null && <span>🏠 {smart.travel_to_home_min} min to home</span>}
                          {smart.can_make_home === false && <span className="text-amber-600">won&apos;t make home on time</span>}
                        </div>
                      )}
                      {form.start_date && avail.dayBookings && avail.dayBookings.length > 0 && (
                        <div className="mt-0.5 flex flex-wrap gap-1">{avail.dayBookings.map((b, i) => <span key={i} className="text-[9px] bg-gray-100 text-gray-500 px-1 py-0.5 rounded">{b.time} {b.client} ({b.hours}hr)</span>)}</div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* ── NOTES ── */}
            <div className="mt-3 mb-3">
              <label className="block text-[10px] text-gray-400 uppercase mb-1">Notes</label>
              {editingBooking.notes && <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2 mb-2 italic">{editingBooking.notes}</p>}
              <BookingNotes bookingId={editingBooking.id} mode="admin" authorName="Admin" />
            </div>

            {/* ── ACTIONS ── */}
            <div className="flex gap-2 pt-3 border-t border-gray-100">
              <button type="button" onClick={async () => { if (confirm(`Delete this booking for ${editingBooking.clients?.name || 'this client'}? This is permanent and the client is not notified.`)) { try { const res = await fetch('/api/bookings/' + editingBooking.id + '?skip_email=true', { method: 'DELETE' }); if (!res.ok) { const err = await res.json().catch(() => ({ error: res.statusText })); alert(`Failed to delete: ${err.error || 'Unknown error'}`); return } setShowModal(false); setEditingBooking(null); await loadBookings() } catch (e) { alert(`Failed to delete: ${e instanceof Error ? e.message : 'Network error'}`) } } }} className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm">Delete</button>
              {(editingBooking.recurring_type || editingBooking.schedule_id) && editingBooking.status !== 'cancelled' && (
                <div className="relative">
                  <button type="button" onClick={() => setShowCancelMenu(!showCancelMenu)} className="px-3 py-2 text-gray-500 hover:bg-gray-50 rounded-lg text-sm" title="Stops future occurrences from being generated — notifies the client">Cancel series ▾</button>
                  {showCancelMenu && (
                    <div className="absolute left-0 bottom-full mb-1 bg-white border rounded-lg shadow-lg py-1 min-w-[160px] z-10">
                      <button type="button" onClick={() => { setShowCancelMenu(false); handleCancel('single') }} className="w-full px-3 py-2 text-left text-gray-600 hover:bg-gray-50 text-sm">This booking</button>
                      <button type="button" onClick={() => { setShowCancelMenu(false); handleCancel('all') }} className="w-full px-3 py-2 text-left text-gray-600 hover:bg-gray-50 text-sm">All future</button>
                    </div>
                  )}
                </div>
              )}
              <div className="flex-1" />
              <button type="button" onClick={() => { setShowModal(false); setEditingBooking(null) }} className="px-4 py-2 border border-gray-300 rounded-lg text-[var(--sched-ink)] text-sm">Close</button>
              <button type="submit" disabled={saving || form.status === 'pending'} title={form.status === 'pending' ? 'Change the status before saving' : undefined} className="px-6 py-2 bg-[var(--sched-ink)] text-white rounded-lg text-sm font-medium disabled:opacity-50">{saving ? '...' : 'Save'}</button>
            </div>
          </form>
        </SidePanel>
      )}

      {showUpdateChoice && (
        <div className="fixed inset-0 bg-[rgba(28,28,28,0.5)] flex items-center justify-center z-[10001]" onClick={() => setShowUpdateChoice(false)}>
          <div className="bg-white rounded-lg p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-[var(--sched-ink)] mb-4">Update Recurring Booking</h3>
            <p className="text-gray-600 mb-6">Apply changes to:</p>
            <div className="space-y-3">
              <button onClick={() => saveBooking('single')} className="w-full py-3 px-4 border border-gray-300 rounded-lg text-[var(--sched-ink)] hover:bg-gray-50 text-left">
                <p className="font-medium">This booking only</p>
                <p className="text-sm text-gray-500">Only update this appointment</p>
              </button>
              <button onClick={() => saveBooking('all')} className="w-full py-3 px-4 border border-gray-300 rounded-lg text-[var(--sched-ink)] hover:bg-gray-50 text-left">
                <p className="font-medium">All future bookings</p>
                <p className="text-sm text-gray-500">Update this and all upcoming appointments</p>
              </button>
            </div>
            <button onClick={() => setShowUpdateChoice(false)} className="w-full mt-4 py-2 text-gray-500 hover:text-[var(--sched-ink)]">Cancel</button>
          </div>
        </div>
      )}

      {showCreateModal && (
        <SidePanel open={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create Booking" width="max-w-lg">
          <CreateBookingForm
            key={formInstanceKey}
            initialValues={createInitialValues}
            onCreated={() => { setShowCreateModal(false); loadBookings() }}
            onCancel={() => setShowCreateModal(false)}
          />
        </SidePanel>
      )}

      {showNewClientModal && (
        <NewClientModal
          initialClientId={newClientContactsId}
          initialClientName={newClientContactsId ? clients.find(c => c.id === newClientContactsId)?.name : undefined}
          referrers={referrers}
          salesPartners={salesPartners}
          onDone={finishNewClientFlow}
        />
      )}
    </div>
  )
}
