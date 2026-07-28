'use client'

// Extracted verbatim from BookingsAdmin.tsx's create-booking modal so both
// Bookings ("New Booking") and Find a Team Member (inline, when a client has
// no unassigned bookings to broadcast) share one implementation — smart
// scheduling, team picker, recurring, discount, and one-time credit included.
// Self-contained: fetches its own cleaners/team-colors/referrers/sales-partners
// instead of requiring the caller's page-level state as props.
import './schedule.css'
import { useEffect, useRef, useState } from 'react'
import { useWorkerLabel } from '../worker-label-context'
import { buildMemberColors, colorForMember, type ColorableMember } from '../calendar/_colors'
import { RecurringOptions, generateRecurringDates, getRecurringDisplayName } from './_RecurringOptions'
import { useServiceTypes } from '@/lib/useServiceTypes'
import { formatPhone } from '@/lib/format'
import { applyDiscount, applyCredit } from '@/lib/discount'
import { isWeekendDate, WEEKEND_CLIENT_SUPPLIES_RATE, WEEKEND_SUPPLIES_PROVIDED_RATE } from '@/lib/nycmaid/weekend-pricing'
import NewClientModal, { type NewClientResult } from './NewClientModal'
import {
  SuggestionStrip,
  getCleanerAvailability,
  type SmartScore,
  type SlotSuggestion,
  type AvailabilityBooking,
} from './_create-booking-shared'

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

interface Client { id: string; name: string; phone: string; email: string; address: string; created_at: string; do_not_service?: boolean; preferred_team_member_id?: string | null }
interface Cleaner { id: string; name: string; hourly_rate?: number; working_days?: string[]; unavailable_dates?: string[]; schedule?: Record<string, unknown>; active?: boolean; status?: string; max_jobs_per_day?: number }
interface Referrer { id: string; name: string; ref_code: string; active: boolean }
interface SalesPartner { id: string; name: string; referral_code: string; active: boolean }

export interface CreateBookingFormProps {
  // When set, the client search UI is hidden and the form is fixed to this
  // client (Find a Team Member: client is already chosen on that page).
  lockedClientId?: string
  // When set, hides the team-member/cleaner picker entirely (Find a Team
  // Member: who covers it isn't decided at create time -- that's the whole
  // point of broadcasting. The booking is created unassigned regardless;
  // this only controls whether the picker UI shows).
  hideCleanerPicker?: boolean
  initialValues?: { clientId?: string; startDate?: string; startTime?: string; serviceType?: string; notes?: string }
  onCreated: () => void
  onCancel: () => void
}

export default function CreateBookingForm({ lockedClientId, hideCleanerPicker, initialValues, onCreated, onCancel }: CreateBookingFormProps) {
  // Weekend (Sat/Sun) new-client surcharge is NYC Maid only (Jeff, 2026-07-27).
  // This is a global/shared component with no tenant prop threaded in, so it
  // reads the operator's own domain — each tenant's dashboard is served on
  // its own domain (see src/middleware.ts), same as the public site. This
  // only gates a UI note + a rate suggestion; the booking API is unauthenticated-
  // client-safe pricing enforcement doesn't apply to admin-created bookings the
  // way it does to the public /api/client/book endpoint, so there's no separate
  // server-side override here — the admin sets the real rate directly.
  const isNycmaid = typeof window !== 'undefined' && window.location.hostname.includes('thenycmaid.com')
  const worker = useWorkerLabel()
  const serviceTypesData = useServiceTypes()
  // Catalog-driven only -- no cleaning fallback. Shows the tenant's own services.
  const serviceTypes = serviceTypesData.map(s => s.name)

  const [cleaners, setCleaners] = useState<Cleaner[]>([])
  const [memberColors, setMemberColors] = useState<Record<string, string>>({})
  const [referrers, setReferrers] = useState<Referrer[]>([])
  const [salesPartners, setSalesPartners] = useState<SalesPartner[]>([])
  const [knownClients, setKnownClients] = useState<Record<string, Client>>({})
  const [dayBookings, setDayBookings] = useState<AvailabilityBooking[]>([])

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const endDate = new Date()
  endDate.setMonth(endDate.getMonth() + 3)

  const [createForm, setCreateForm] = useState({
    client_id: lockedClientId || initialValues?.clientId || '', team_member_id: '',
    start_date: initialValues?.startDate || tomorrow.toISOString().split('T')[0],
    start_time: initialValues?.startTime || '09:00',
    hours: 2, hourly_rate: 69, service_type: initialValues?.serviceType || 'Standard Cleaning', notes: initialValues?.notes || '',
    repeat_enabled: false, repeat_type: 'weekly', repeat_end: 'never',
    repeat_end_count: 10, repeat_end_date: endDate.toISOString().split('T')[0], custom_interval: 3,
    discount_enabled: false, discount_percent: 10,
    one_time_credit_dollars: 0, one_time_credit_reason: '',
    is_emergency: false, pay_rate: null as number | null, status: 'scheduled' as string,
    team_size: 1, extra_team_member_ids: [] as string[], max_hours: null as number | null,
    override_availability: false, property_id: '' as string,
  })
  const [clientProperties, setClientProperties] = useState<{ id: string; address: string; is_primary: boolean }[]>([])
  const [showNewClientModal, setShowNewClientModal] = useState(false)
  const [newClientContactsId, setNewClientContactsId] = useState<string | null>(null)
  const [showOneTimeCreditCreate, setShowOneTimeCreditCreate] = useState(false)
  const [saving, setSaving] = useState(false)

  const [clientSearch, setClientSearch] = useState('')
  const [showClientDropdown, setShowClientDropdown] = useState(false)
  const [filteredClients, setFilteredClients] = useState<Client[]>([])

  const [smartScores, setSmartScores] = useState<Record<string, SmartScore>>({})
  const [smartScoresKey, setSmartScoresKey] = useState<string>('')
  const [suggestions, setSuggestions] = useState<SlotSuggestion[]>([])

  // Weekend (Sat/Sun) rate auto-adjust — mirrors the self-booking form's
  // reactive hourlyRate calc (Jeff, 2026-07-27: "it has to adjust
  // automatically... like it does on the front-end"). Tracks the last value
  // WE set so an admin's manual override is never clobbered by a later date
  // change — the effect only follows the date while hourly_rate still equals
  // our own prior suggestion.
  const lastAutoRateRef = useRef(69)
  useEffect(() => {
    if (!isNycmaid) return
    const expected = isWeekendDate(createForm.start_date) ? WEEKEND_SUPPLIES_PROVIDED_RATE : 69
    if (createForm.hourly_rate === lastAutoRateRef.current && expected !== createForm.hourly_rate) {
      lastAutoRateRef.current = expected
      setCreateForm(prev => ({ ...prev, hourly_rate: expected }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createForm.start_date, isNycmaid])

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

  // Locked client (Find a Team Member): fetch the full record once so the
  // DO NOT SERVICE badge check below has something to look up.
  useEffect(() => {
    if (!lockedClientId) return
    fetch(`/api/clients/${lockedClientId}`).then(r => r.ok ? r.json() : null).then(d => {
      if (d?.client) setKnownClients(prev => ({ ...prev, [d.client.id]: d.client }))
    }).catch(() => {})
  }, [lockedClientId])

  // Prefilled client (e.g. "Book Next" from the client drawer): the search
  // box otherwise stays blank even though client_id is already set, since
  // it only fills in via handleClientSelect on a manual pick.
  useEffect(() => {
    if (!initialValues?.clientId || lockedClientId) return
    fetch(`/api/clients/${initialValues.clientId}`).then(r => r.ok ? r.json() : null).then(d => {
      if (!d?.client) return
      setKnownClients(prev => ({ ...prev, [d.client.id]: d.client }))
      setClientSearch(d.client.name + (d.client.phone ? ' - ' + d.client.phone : ''))
    }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValues?.clientId, lockedClientId])

  // Searches the server instead of filtering a locally preloaded array -- see
  // BookingsAdmin.tsx's identical client-search effect for why (200-row cap).
  useEffect(() => {
    if (lockedClientId || !clientSearch) { setFilteredClients([]); return }
    let cancelled = false
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/clients?search=${encodeURIComponent(clientSearch)}&limit=8`)
        const json = await res.json()
        const rows: Client[] = Array.isArray(json.clients) ? json.clients : []
        if (!cancelled) {
          setFilteredClients(rows)
          setKnownClients(prev => {
            const next = { ...prev }
            for (const c of rows) next[c.id] = c
            return next
          })
        }
      } catch {
        if (!cancelled) setFilteredClients([])
      }
    }, 250)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [clientSearch, lockedClientId])

  // Load the selected client's addresses; default the picker to their primary.
  useEffect(() => {
    const cid = createForm.client_id
    if (!cid) { setClientProperties([]); return }
    let cancelled = false
    fetch(`/api/client/properties?client_id=${cid}`)
      .then(r => r.json())
      .then(d => {
        if (cancelled) return
        const props = d.properties || []
        setClientProperties(props)
        setCreateForm(prev => {
          if (prev.property_id && props.some((p: { id: string }) => p.id === prev.property_id)) return prev
          const primary = props.find((p: { is_primary: boolean }) => p.is_primary) || props[0]
          return primary ? { ...prev, property_id: primary.id } : prev
        })
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [createForm.client_id])

  // Per-day booking conflicts for the availability/team picker below -- scoped
  // to just the selected date instead of requiring the entire bookings table
  // as a prop (BookingsAdmin's edit modal, which stays put, still uses its own
  // full preloaded list for the same getCleanerAvailability call).
  useEffect(() => {
    const date = createForm.start_date
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
  }, [createForm.start_date, hideCleanerPicker])

  // Smart-schedule: fetch zone/proximity scores whenever the booking context changes
  useEffect(() => {
    if (hideCleanerPicker || !createForm.start_date || !createForm.start_time) {
      setSmartScores({}); setSmartScoresKey(''); setSuggestions([])
      return
    }
    const cli = createForm.client_id ? knownClients[createForm.client_id] : null
    const selProp = clientProperties.find(p => p.id === createForm.property_id)
    const ctxAddress = selProp?.address || cli?.address || ''
    if (!ctxAddress) return
    const key = [createForm.client_id, ctxAddress, createForm.start_date, createForm.start_time, createForm.hours, createForm.hourly_rate || '', createForm.team_size].join('|')
    if (key === smartScoresKey) return

    const controller = new AbortController()
    const params = new URLSearchParams({
      date: createForm.start_date,
      start_time: createForm.start_time,
      duration: String(createForm.hours),
      address: ctxAddress,
      client_id: createForm.client_id,
      team_size: String(createForm.team_size),
    })
    if (createForm.hourly_rate != null) params.set('hourly_rate', String(createForm.hourly_rate))
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
  }, [hideCleanerPicker, createForm.client_id, createForm.property_id, clientProperties, createForm.start_date, createForm.start_time, createForm.hours, createForm.hourly_rate, createForm.team_size, knownClients, smartScoresKey])

  const handleClientSelect = (client: Client) => {
    setCreateForm({ ...createForm, client_id: client.id })
    setClientSearch(client.name + ' - ' + client.phone)
    setShowClientDropdown(false)
    setKnownClients(prev => ({ ...prev, [client.id]: client }))
  }

  const handleClientSearchChange = (value: string) => {
    setClientSearch(value)
    setCreateForm({ ...createForm, client_id: '' })
    setShowClientDropdown(true)
  }

  const handleNewClientClick = () => {
    setNewClientContactsId(null)
    setShowNewClientModal(true)
    setShowClientDropdown(false)
  }

  // Fires once NewClientModal's blank form successfully creates the client --
  // it stays open afterward for the add-contacts/address step.
  const handleNewClientCreated = (newClient: NewClientResult) => {
    setKnownClients(prev => ({ ...prev, [newClient.id]: newClient as Client }))
    // Weekend rate suggestion is handled by the start_date-watching effect
    // above, which already covers this — no need to duplicate it here.
    setCreateForm({ ...createForm, client_id: newClient.id })
    setClientSearch(newClient.name + ' - ' + newClient.phone)
  }

  const finishNewClientFlow = async () => {
    // Re-fetch addresses before closing -- the client may have added more via
    // the contacts popup, and the picker's own effect only refires on
    // client_id change, not on every add inside that popup.
    if (newClientContactsId) {
      try {
        const res = await fetch(`/api/client/properties?client_id=${newClientContactsId}`)
        const d = await res.json()
        const props = d.properties || []
        setClientProperties(props)
        const primary = props.find((p: { is_primary: boolean }) => p.is_primary) || props[0]
        if (primary) setCreateForm(prev => ({ ...prev, property_id: primary.id }))
      } catch { /* keep whatever was already loaded */ }
    }
    setShowNewClientModal(false)
    setNewClientContactsId(null)
  }

  // Persisted discount/credit fields for the create-booking payload -- see
  // calculatePrice() for why one_time_credit is repeat_enabled-gated.
  const getCreateFormDiscount = () => ({
    discount_percent: createForm.discount_enabled ? createForm.discount_percent : null,
    one_time_credit_cents: (!createForm.repeat_enabled && createForm.one_time_credit_dollars > 0) ? Math.round(createForm.one_time_credit_dollars * 100) : null,
    one_time_credit_reason: (!createForm.repeat_enabled && createForm.one_time_credit_dollars > 0) ? (createForm.one_time_credit_reason || null) : null,
  })

  const calculatePrice = () => {
    const teamSize = Math.max(1, createForm.team_size || 1)
    const basePrice = createForm.hours * createForm.hourly_rate * teamSize * 100
    const discountPercent = createForm.discount_enabled ? createForm.discount_percent : null
    // Never bake the one-time credit into a recurring booking's price -- a
    // recurring schedule's price gets stored verbatim on every initial
    // occurrence (and the schedule itself, which future cron-generated visits
    // copy from), never recomputed per-visit. A "one-time" credit must NEVER
    // ride along on a repeat_enabled submission, or it silently becomes a
    // standing discount across every future visit instead of just this one
    // (nycmaid a8efe43f).
    const creditCents = (!createForm.repeat_enabled && createForm.one_time_credit_dollars > 0) ? Math.round(createForm.one_time_credit_dollars * 100) : null
    return applyCredit(applyDiscount(basePrice, discountPercent), creditCents)
  }

  const getEstimatedHoursRange = (hours: number) => {
    const ranges: Record<number, string> = { 1: '1-2', 2: '2-3', 3: '3-4', 4: '4-6', 5: '5-7', 6: '6-8', 7: '7-9' }
    return ranges[hours] || hours + '-' + (hours + 2)
  }

  const recurringDates = generateRecurringDates(
    createForm.start_date, createForm.repeat_enabled, createForm.repeat_type,
    createForm.repeat_end, createForm.repeat_end_count, createForm.repeat_end_date, createForm.custom_interval
  )

  // Build naive datetime string from date + time + hours (no Date object, no TZ shift)
  const buildNaiveTime = (date: string, time: string, addHours: number = 0) => {
    const [h, m] = time.split(':').map(Number)
    const totalMinutes = h * 60 + m + addHours * 60
    const newH = Math.floor(totalMinutes / 60) % 24
    const newM = totalMinutes % 60
    return `${date}T${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}:00`
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    const recurringType = createForm.repeat_enabled ? getRecurringDisplayName(createForm.repeat_type, createForm.start_date) : null

    if (createForm.is_emergency) {
      // Emergency: single booking + broadcast (can't batch)
      const date = recurringDates[0]
      const res = await fetch('/api/bookings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: createForm.client_id, property_id: createForm.property_id || null, team_member_id: null,
          start_time: buildNaiveTime(date, createForm.start_time),
          end_time: buildNaiveTime(date, createForm.start_time, createForm.hours),
          service_type: createForm.service_type, price: calculatePrice(),
          hourly_rate: createForm.hourly_rate, recurring_type: recurringType,
          notes: createForm.notes || null, skip_email: true,
          status: 'available', pay_rate: createForm.pay_rate,
          max_hours: createForm.max_hours,
          force: true,
          ...getCreateFormDiscount(),
        })
      })
      if (res.ok) {
        const booking = await res.json()
        await fetch('/api/bookings/broadcast', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ booking_id: booking.id })
        })
      }
    } else if (createForm.repeat_enabled && recurringType && recurringDates.length > 1) {
      // Recurring: create schedule + first 6 weeks of bookings (cron generates the rest daily)
      const fourWeeksOut = new Date(createForm.start_date + 'T12:00:00')
      fourWeeksOut.setDate(fourWeeksOut.getDate() + 42)
      const cutoff = fourWeeksOut.toISOString().split('T')[0]
      const initialDates = recurringDates.filter(d => d <= cutoff)

      const scheduleRes = await fetch('/api/admin/recurring-schedules', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: createForm.client_id,
          property_id: createForm.property_id || null,
          team_member_id: createForm.team_member_id,
          recurring_type: rawRecurringType(createForm.repeat_type),
          day_of_week: new Date(createForm.start_date + 'T12:00:00').getDay(),
          preferred_time: createForm.start_time,
          duration_hours: createForm.hours,
          hourly_rate: createForm.hourly_rate,
          pay_rate: createForm.pay_rate,
          notes: createForm.notes || null,
          start_date: createForm.start_date,
          price: calculatePrice(),
          service_type: createForm.service_type,
          status: createForm.status,
          dates: initialDates,
          discount_percent: getCreateFormDiscount().discount_percent,
        })
      })
      if (!scheduleRes.ok) {
        const err = await scheduleRes.json().catch(() => ({ error: 'Unknown error' }))
        alert(`Failed to create recurring schedule: ${err.error || scheduleRes.statusText}`)
      }
    } else {
      // Single booking via batch (1 booking)
      const bookings = recurringDates.map(date => ({
        client_id: createForm.client_id,
        property_id: createForm.property_id || null,
        team_member_id: createForm.team_member_id,
        start_time: buildNaiveTime(date, createForm.start_time),
        end_time: buildNaiveTime(date, createForm.start_time, createForm.hours),
        service_type: createForm.service_type,
        price: calculatePrice(),
        hourly_rate: createForm.hourly_rate,
        recurring_type: recurringType,
        notes: createForm.notes || null,
        status: createForm.status,
        team_size: createForm.team_size,
        extra_team_member_ids: createForm.extra_team_member_ids,
        max_hours: createForm.max_hours,
        pay_rate: createForm.pay_rate,
        ...getCreateFormDiscount(),
      }))

      await fetch('/api/bookings/batch', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookings })
      })
    }
    setSaving(false)
    onCreated()
  }

  const lockedClient = lockedClientId ? knownClients[lockedClientId] : null
  const currentClient = createForm.client_id ? knownClients[createForm.client_id] : null

  return (
    <div className="sched-scope">
      <form onSubmit={handleCreate}>
        <div className="space-y-4">
          {lockedClientId ? (
            <div>
              <label className="block text-sm font-medium text-[var(--sched-ink)] mb-1">Client</label>
              <div className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[var(--sched-ink)] bg-gray-50">
                {lockedClient ? `${lockedClient.name}${lockedClient.phone ? ' · ' + formatPhone(lockedClient.phone) : ''}` : '…'}
              </div>
            </div>
          ) : (
            <div className="relative">
              <label className="block text-sm font-medium text-[var(--sched-ink)] mb-1">Client *</label>
              <input
                type="text"
                required={!createForm.client_id}
                value={clientSearch}
                onChange={(e) => handleClientSearchChange(e.target.value)}
                onFocus={() => setShowClientDropdown(true)}
                placeholder="Search by name or phone..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[var(--sched-ink)]"
              />

              {showClientDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                  <button type="button" onClick={handleNewClientClick} className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-200 font-medium text-[var(--sched-ink)]">+ New Client</button>
                  {filteredClients.length > 0 ? (
                    filteredClients.map((client) => (
                      <button key={client.id} type="button" onClick={() => handleClientSelect(client)} className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0">
                        <div className="font-medium text-[var(--sched-ink)]">{client.name}</div>
                        <div className="text-sm text-gray-500">{formatPhone(client.phone)}</div>
                      </button>
                    ))
                  ) : clientSearch ? (
                    <div className="px-3 py-2 text-gray-500 text-sm">No clients found</div>
                  ) : (
                    <div className="px-3 py-2 text-gray-500 text-sm">Start typing to search...</div>
                  )}
                </div>
              )}
            </div>
          )}

          {currentClient?.do_not_service && (
            <div className="bg-red-50 border-2 border-red-300 rounded-lg p-3">
              <p className="text-red-700 font-bold text-sm">DO NOT SERVICE</p>
              <p className="text-red-600 text-sm">This client is flagged as Do Not Service. Check client notes before proceeding.</p>
            </div>
          )}
          {createForm.client_id && clientProperties.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-[var(--sched-ink)] mb-1">Address{clientProperties.length > 1 ? ' *' : ''}</label>
              <select
                value={createForm.property_id}
                onChange={(e) => {
                  if (e.target.value === '__add_address__') {
                    setNewClientContactsId(createForm.client_id)
                    setShowNewClientModal(true)
                    return
                  }
                  setCreateForm({ ...createForm, property_id: e.target.value })
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[var(--sched-ink)]"
              >
                {clientProperties.map(p => (
                  <option key={p.id} value={p.id}>{p.address}{p.is_primary ? ' (primary)' : ''}</option>
                ))}
                <option value="__add_address__">+ Add new address</option>
              </select>
              {clientProperties.length > 1 && (
                <p className="mt-1 text-xs text-gray-500">This client has multiple addresses — pick the one being cleaned.</p>
              )}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-[var(--sched-ink)] mb-1">Service</label>
            <select value={createForm.service_type} onChange={(e) => {
              const isEmergency = e.target.value === 'Emergency / Same-Day'
              // Only clear pay_rate when LEAVING emergency mode -- the emergency
              // "Team Pay Rate" field and the normal per-cleaner rate override share
              // this same state, and a stray emergency rate must not leak into a
              // normal booking. Switching between two non-emergency service types
              // must NOT wipe an admin's intentional per-cleaner rate override.
              const clearedPayRate = createForm.is_emergency && !isEmergency ? null : createForm.pay_rate
              setCreateForm({ ...createForm, service_type: e.target.value, is_emergency: isEmergency, team_member_id: isEmergency ? '' : createForm.team_member_id, pay_rate: clearedPayRate })
            }} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[var(--sched-ink)]">
              {serviceTypes.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--sched-ink)] mb-1">Date *</label>
              <input type="date" required value={createForm.start_date} onChange={(e) => setCreateForm({ ...createForm, start_date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[var(--sched-ink)]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--sched-ink)] mb-1">Time *</label>
              <input type="time" required min="07:00" max="19:00" value={createForm.start_time} onChange={(e) => setCreateForm({ ...createForm, start_time: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[var(--sched-ink)]" />
            </div>
          </div>
          {isNycmaid && (
            <p className="text-xs text-gray-500 -mt-2">
              Weekends (Sat &amp; Sun) are ${WEEKEND_SUPPLIES_PROVIDED_RATE}/hr (we bring supplies) or ${WEEKEND_CLIENT_SUPPLIES_RATE}/hr (their supplies) for new clients only — Friday is not a weekend day.
            </p>
          )}
          {!hideCleanerPicker && (createForm.is_emergency ? (
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700 mb-3">🚨 Broadcasts to all team - first to claim gets it</p>
              <label className="block text-sm font-medium text-red-700 mb-1">Team Pay Rate</label>
              <div className="flex items-center">
                <span className="text-[var(--sched-ink)] text-lg mr-1">$</span>
                <input
                  type="number"
                  step="1"
                  min="25"
                  max="100"
                  value={createForm.pay_rate ?? 40}
                  onChange={(e) => setCreateForm({ ...createForm, pay_rate: parseInt(e.target.value) || 40 })}
                  className="w-24 px-3 py-2 border border-red-300 rounded-lg text-[var(--sched-ink)] text-center font-mono bg-white"
                />
                <span className="text-[var(--sched-ink)] ml-1">/hr</span>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-[var(--sched-ink)]">{createForm.team_size > 1 ? worker.plural : worker.singular} *</label>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-600">Rate</label>
                  <div className="flex items-center">
                    <span className="text-[var(--sched-ink)] text-xs mr-0.5">$</span>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={createForm.pay_rate ?? ''}
                      onChange={(e) => setCreateForm({ ...createForm, pay_rate: e.target.value ? parseInt(e.target.value) : null })}
                      placeholder="auto"
                      className="w-14 px-1.5 py-0.5 border border-gray-300 rounded text-xs text-[var(--sched-ink)] bg-white"
                    />
                    <span className="text-[var(--sched-ink)] text-xs ml-0.5">/hr</span>
                  </div>
                  <label className="text-xs text-gray-600">Team size</label>
                  <select
                    value={createForm.team_size}
                    onChange={(e) => {
                      const n = parseInt(e.target.value, 10) || 1
                      // Trim extras if shrinking team
                      const maxExtras = Math.max(0, n - 1)
                      setCreateForm({
                        ...createForm,
                        team_size: n,
                        extra_team_member_ids: createForm.extra_team_member_ids.slice(0, maxExtras),
                      })
                    }}
                    className="px-2 py-1 border border-gray-300 rounded text-sm text-[var(--sched-ink)] bg-white"
                  >
                    {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                  {createForm.team_size > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const ranked = Object.values(smartScores)
                          .filter(s => s.available)
                          .sort((a, b) => b.score - a.score)
                          .slice(0, createForm.team_size)
                        if (ranked.length === 0) return
                        const lead = ranked[0]?.id || ''
                        const extras = ranked.slice(1).map(r => r.id)
                        setCreateForm({ ...createForm, team_member_id: lead, extra_team_member_ids: extras })
                      }}
                      className="text-xs px-2 py-1 bg-[#A8F0DC] text-[var(--sched-ink)] rounded font-semibold hover:bg-[#90E5CC]"
                    >
                      Auto-pick top {createForm.team_size}
                    </button>
                  )}
                </div>
              </div>
              {suggestions.length > 0 && (
                <SuggestionStrip
                  suggestions={suggestions}
                  variant={Object.values(smartScores).filter(s => s.available).length === 0 ? 'full' : 'better'}
                  onPick={(t) => setCreateForm({ ...createForm, start_time: t })}
                />
              )}
              {Object.keys(smartScores).length > 0 && (
                <p className="text-[10px] text-gray-500 mb-1">
                  Ranked by zone match, proximity, and schedule fit
                  {createForm.team_size > 1 && <> · click to add. Drag to reorder — top of the team list is the LEAD (handles check-in / 30-min / check-out).</>}
                </p>
              )}
              {/* Team order with drag-to-reorder. Top = lead. */}
              {createForm.team_size > 1 && (createForm.team_member_id || createForm.extra_team_member_ids.length > 0) && (
                <div className="mb-2 p-2 bg-indigo-50/60 border border-indigo-200 rounded-lg">
                  <p className="text-[10px] text-indigo-700 font-semibold uppercase tracking-wide mb-1.5">Team order — drag to reorder</p>
                  <div className="space-y-1">
                    {[createForm.team_member_id, ...createForm.extra_team_member_ids].filter(Boolean).map((cid, idx, arr) => {
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
                            setCreateForm({ ...createForm, team_member_id: next[0] || '', extra_team_member_ids: next.slice(1) })
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
                              setCreateForm({ ...createForm, team_member_id: next[0] || '', extra_team_member_ids: next.slice(1) })
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
              <div className="space-y-1">
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
                  const avail = getCleanerAvailability(c, createForm.start_date, createForm.start_time, createForm.hours, dayBookings)
                  const isLead = createForm.team_member_id === c.id
                  const isExtra = createForm.extra_team_member_ids.includes(c.id)
                  const selected = isLead || isExtra
                  const smart = smartScores[c.id]
                  const isZoneMatch = !!smart?.zone_match
                  const topPick = smart && smart.available && Object.values(smartScores).filter(s => s.available).sort((x, y) => y.score - x.score)[0]?.id === c.id
                  const onClickPick = () => {
                    if (createForm.team_size <= 1) {
                      // Single-cleaner mode: just set lead.
                      setCreateForm({ ...createForm, team_member_id: c.id, extra_team_member_ids: [] })
                      return
                    }
                    // Team mode: cycle lead → extra → off.
                    if (isLead) {
                      // Promote first extra to lead, drop this one.
                      const [newLead, ...rest] = createForm.extra_team_member_ids
                      setCreateForm({ ...createForm, team_member_id: newLead || '', extra_team_member_ids: rest })
                    } else if (isExtra) {
                      // Remove from extras.
                      setCreateForm({
                        ...createForm,
                        extra_team_member_ids: createForm.extra_team_member_ids.filter(x => x !== c.id),
                      })
                    } else if (!createForm.team_member_id) {
                      // No lead yet — set as lead.
                      setCreateForm({ ...createForm, team_member_id: c.id })
                    } else if (createForm.extra_team_member_ids.length < createForm.team_size - 1) {
                      // Add as extra (capacity remains).
                      setCreateForm({
                        ...createForm,
                        extra_team_member_ids: [...createForm.extra_team_member_ids, c.id],
                      })
                    }
                  }
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={onClickPick}
                      className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                        isLead
                          ? 'border-indigo-500 bg-indigo-50 text-[var(--sched-ink)]'
                          : isExtra
                            ? 'border-indigo-500 bg-indigo-50 text-[var(--sched-ink)]'
                            : topPick
                              ? 'border-green-400 bg-green-50 text-[var(--sched-ink)]'
                              : isZoneMatch
                                ? 'border-green-200 bg-green-50/40 text-[var(--sched-ink)]'
                                : 'border-gray-200 hover:border-gray-300 text-[var(--sched-ink)]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={selected ? 'font-medium' : ''}>
                          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '9999px', background: colorForMember(memberColors, c.id), marginRight: '6px', verticalAlign: 'middle' }} />{topPick && !selected ? '★ ' : ''}{c.name}
                          {smart?.is_preferred && <span className="ml-1.5 text-[10px] bg-amber-500 text-white px-1.5 py-0.5 rounded font-semibold">★ PREFERRED</span>}
                          {isLead && createForm.team_size > 1 && <span className="ml-1.5 text-[10px] bg-indigo-600 text-white px-1.5 py-0.5 rounded font-semibold">LEAD</span>}
                          {isExtra && <span className="ml-1.5 text-[10px] bg-indigo-400 text-white px-1.5 py-0.5 rounded font-semibold">EXTRA</span>}
                          {isZoneMatch && <span className="ml-1.5 text-[10px] text-green-700 bg-green-100 px-1.5 py-0.5 rounded font-medium">zone</span>}
                          {smart?.has_car === false && <span className="ml-1 text-[10px] text-gray-500">no car</span>}
                        </span>
                        {createForm.start_date && (
                          avail.available
                            ? <span className="text-xs text-green-600 font-medium">{smart?.reason || 'Available'}</span>
                            : <span className="text-xs text-red-500">{avail.reason}</span>
                        )}
                      </div>
                      {smart?.available && (smart.distance_miles != null || smart.travel_from_prev_min != null || smart.travel_to_next_min != null || smart.travel_to_home_min != null || smart.can_make_home === false) && (
                        <div className="mt-0.5 text-[10px] text-gray-500 flex flex-wrap gap-x-2">
                          {smart.distance_miles != null && <span>📍 {smart.distance_miles} mi from home</span>}
                          {smart.travel_from_prev_min != null && <span>🚗 {smart.travel_from_prev_min} min from {smart.prev_job_label || 'prev job'}</span>}
                          {smart.travel_to_next_min != null && <span>➡️ {smart.travel_to_next_min} min to {smart.next_job_label || 'next job'}</span>}
                          {smart.travel_to_home_min != null && <span>🏠 {smart.travel_to_home_min} min to home</span>}
                          {smart.can_make_home === false && <span className="text-amber-600">won&apos;t make home on time</span>}
                        </div>
                      )}
                      {createForm.start_date && avail.dayBookings && avail.dayBookings.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {avail.dayBookings.map((b, i) => (
                            <span key={i} className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                              {b.time} {b.client} ({b.hours}hr)
                            </span>
                          ))}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--sched-ink)] mb-1">Hours</label>
              <select value={createForm.hours} onChange={(e) => setCreateForm({ ...createForm, hours: parseInt(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[var(--sched-ink)]">
                {[1,2,3,4,5,6,7,8].map(h => <option key={h} value={h}>{h}hr</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--sched-ink)] mb-1">Rate</label>
              <input
                type="number"
                min={1}
                step={1}
                value={createForm.hourly_rate}
                onChange={(e) => setCreateForm({ ...createForm, hourly_rate: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[var(--sched-ink)]"
                placeholder="$/hr"
              />
            </div>
          </div>

          <RecurringOptions
            startDate={createForm.start_date}
            enabled={createForm.repeat_enabled}
            onEnabledChange={(v) => setCreateForm({ ...createForm, repeat_enabled: v })}
            repeatType={createForm.repeat_type}
            onRepeatTypeChange={(v) => setCreateForm({ ...createForm, repeat_type: v })}
            repeatEnd={createForm.repeat_end}
            onRepeatEndChange={(v) => setCreateForm({ ...createForm, repeat_end: v })}
            repeatEndCount={createForm.repeat_end_count}
            onRepeatEndCountChange={(v) => setCreateForm({ ...createForm, repeat_end_count: v })}
            repeatEndDate={createForm.repeat_end_date}
            onRepeatEndDateChange={(v) => setCreateForm({ ...createForm, repeat_end_date: v })}
            customInterval={createForm.custom_interval}
            onCustomIntervalChange={(v) => setCreateForm({ ...createForm, custom_interval: v })}
            previewDates={recurringDates}
          />

          <div className="py-3 border-t border-b border-gray-200 space-y-2">
            <div className="flex justify-between items-center">
              <h4 className="font-medium text-[var(--sched-ink)]">Discount</h4>
              <div
                onClick={() => setCreateForm({ ...createForm, discount_enabled: !createForm.discount_enabled })}
                className={`w-10 h-6 rounded-full transition-colors ${createForm.discount_enabled ? 'bg-green-600' : 'bg-gray-300'} relative cursor-pointer`}
              >
                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${createForm.discount_enabled ? 'translate-x-5' : 'translate-x-1'}`} />
              </div>
            </div>
            {createForm.discount_enabled && (
              <div className="flex gap-2 items-center pt-1">
                <label className="text-xs text-gray-500 w-12">Percent:</label>
                <select
                  value={[5, 10, 20].includes(createForm.discount_percent) ? createForm.discount_percent : 'custom'}
                  onChange={(e) => {
                    const v = e.target.value
                    if (v === 'custom') {
                      const isPreset = [5, 10, 20].includes(createForm.discount_percent)
                      setCreateForm({ ...createForm, discount_percent: isPreset ? 15 : createForm.discount_percent })
                    } else setCreateForm({ ...createForm, discount_percent: parseInt(v) })
                  }}
                  className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm text-[var(--sched-ink)]"
                >
                  <option value={20}>20% ($69 weekly)</option>
                  <option value={10}>10% ($69 biweekly/monthly &middot; $59 weekly)</option>
                  <option value={5}>5% ($59 biweekly/monthly)</option>
                  <option value="custom">Custom %</option>
                </select>
                {![5, 10, 20].includes(createForm.discount_percent) && (
                  <input
                    type="number"
                    min="1"
                    max="50"
                    step="1"
                    value={createForm.discount_percent}
                    onChange={(e) => setCreateForm({ ...createForm, discount_percent: parseInt(e.target.value) || 0 })}
                    className="w-20 px-2 py-1.5 border border-gray-300 rounded text-sm text-[var(--sched-ink)]"
                    placeholder="%"
                  />
                )}
              </div>
            )}
          </div>

          {/* One-time credit: a flat comp on THIS visit only. Stacks on
              top of the discount above and never touches recurring_schedules.
              Hidden when Repeat is on — a recurring schedule's price/discount
              apply to every generated visit, so a "one-time" credit here
              would silently become a standing discount instead of a comp
              for just this visit. Use the edit modal on the specific
              occurrence once it exists instead. */}
          {createForm.repeat_enabled ? null : !showOneTimeCreditCreate ? (
            <button type="button" onClick={() => setShowOneTimeCreditCreate(true)} className="text-left text-xs text-amber-700 hover:text-amber-800 font-medium">
              + One-time credit (this visit only)
            </button>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-amber-700 uppercase font-semibold">One-time credit — this visit only</span>
                <button type="button" onClick={() => { setShowOneTimeCreditCreate(false); setCreateForm({ ...createForm, one_time_credit_dollars: 0, one_time_credit_reason: '' }) }} className="text-xs text-amber-600 hover:text-amber-800">Remove</button>
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={createForm.one_time_credit_dollars || ''}
                  onChange={(e) => setCreateForm({ ...createForm, one_time_credit_dollars: parseFloat(e.target.value) || 0 })}
                  className="w-24 px-2 py-1.5 border border-amber-300 rounded text-sm text-[var(--sched-ink)]"
                  placeholder="$ off"
                />
                <input
                  type="text"
                  value={createForm.one_time_credit_reason}
                  onChange={(e) => setCreateForm({ ...createForm, one_time_credit_reason: e.target.value })}
                  className="flex-1 px-2 py-1.5 border border-amber-300 rounded text-sm text-[var(--sched-ink)]"
                  placeholder="Reason (optional)"
                />
              </div>
            </div>
          )}

          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-2">ESTIMATE{recurringDates.length > 1 ? ' (per visit)' : ''}</p>
            <div className="flex justify-between">
              <span>~{getEstimatedHoursRange(createForm.hours)}hrs × ${createForm.hourly_rate}/hr{createForm.team_size > 1 ? ` × ${createForm.team_size} cleaners` : ''}{createForm.discount_enabled && createForm.discount_percent > 0 ? ` − ${createForm.discount_percent}%` : ''}{!createForm.repeat_enabled && createForm.one_time_credit_dollars > 0 ? ` − $${createForm.one_time_credit_dollars} credit` : ''}</span>
              <span className="font-semibold">~${(calculatePrice() / 100).toFixed(0)}</span>
            </div>
            {recurringDates.length > 1 && <p className="text-xs text-gray-500 mt-1">Recurring schedule — billed per visit</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--sched-ink)] mb-1">Status</label>
            <select value={createForm.status} onChange={(e) => setCreateForm({ ...createForm, status: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[var(--sched-ink)]">
              <option value="pending">Pending</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Canceled</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--sched-ink)] mb-1">Notes</label>
            <textarea value={createForm.notes} onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[var(--sched-ink)]" rows={2} placeholder="Access codes..." />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button type="button" onClick={onCancel} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-[var(--sched-ink)]">Cancel</button>
          <button type="submit" disabled={saving || !createForm.client_id} className="flex-1 px-4 py-2 bg-[var(--sched-ink)] text-white rounded-lg disabled:bg-gray-300">
            {saving ? 'Creating...' : recurringDates.length > 1 ? 'Create Schedule' : 'Create'}
          </button>
        </div>
      </form>

      {showNewClientModal && (
        <NewClientModal
          initialClientId={newClientContactsId}
          initialClientName={newClientContactsId ? knownClients[newClientContactsId]?.name : undefined}
          referrers={referrers}
          salesPartners={salesPartners}
          onCreated={handleNewClientCreated}
          onDone={finishNewClientFlow}
        />
      )}
    </div>
  )
}
