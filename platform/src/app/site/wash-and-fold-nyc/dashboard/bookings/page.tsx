// @ts-nocheck
'use client'
import DashboardHeader from '@/app/site/wash-and-fold-nyc/_components/DashboardHeader'
import SidePanel from '@/app/site/wash-and-fold-nyc/_components/SidePanel'
import { Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { RecurringOptions, generateRecurringDates, getRecurringDisplayName } from '@/app/site/wash-and-fold-nyc/_components/RecurringOptions'
import AddressAutocomplete from '@/app/site/wash-and-fold-nyc/_components/AddressAutocomplete'
import { useServiceTypes } from '@/app/site/wash-and-fold-nyc/_lib/useServiceTypes'

export default function BookingsPageWrapper() {
  return (
    <Suspense>
      <BookingsPage />
    </Suspense>
  )
}

interface Booking {
  id: string
  start_time: string
  end_time: string
  service_type: string
  price: number
  status: string
  payment_status: string
  payment_method: string | null
  notes: string | null
  client_id: string
  cleaner_id: string
  cleaner_token: string | null
  hourly_rate: number | null
  recurring_type: string | null
  actual_hours: number | null
  cleaner_pay: number | null
  check_in_time: string | null
  check_out_time: string | null
  check_in_location: Record<string, unknown> | null
  check_out_location: Record<string, unknown> | null
  clients: { id: string; name: string; phone: string; address: string } | null
  cleaners: { id: string; name: string } | null
}

interface Client { id: string; name: string; phone: string; email: string; address: string; created_at: string; do_not_service?: boolean }
interface Cleaner { id: string; name: string; hourly_rate?: number }
interface Referrer { id: string; name: string; ref_code: string; active: boolean }

function BookingsPage() {
  const searchParams = useSearchParams()
  useEffect(() => { document.title = 'Bookings | The NYC Wash and Fold Service Company' }, []);
  const formatPhone = (value: string) => {
    const cleaned = value.replace(/\D/g, '')
    if (cleaned.length <= 3) return cleaned
    if (cleaned.length <= 6) return '(' + cleaned.slice(0,3) + ') ' + cleaned.slice(3)
    return '(' + cleaned.slice(0,3) + ') ' + cleaned.slice(3,6) + '-' + cleaned.slice(6,10)
  }

  const [bookings, setBookings] = useState<Booking[]>([])
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [cleaners, setCleaners] = useState<Cleaner[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showNewClientModal, setShowNewClientModal] = useState(false)
  const [showUpdateChoice, setShowUpdateChoice] = useState(false)
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null)
  const editingBookingRef = useRef<Booking | null>(null)
  const [form, setForm] = useState({
    status: '', payment_status: '', payment_method: '', notes: '', cleaner_id: '',
    start_date: '', start_time: '', hours: 2, service_type: '', hourly_rate: 75,
    discount_enabled: false,
    repeat_enabled: false, repeat_type: 'weekly', repeat_end: 'never',
    repeat_end_count: 10, repeat_end_date: '', custom_interval: 3,
    actual_hours: null as number | null, cleaner_pay: null as number | null,
    cleaner_paid: false,
    _originalPrice: 0
  })
  const [createForm, setCreateForm] = useState({
    client_id: '', cleaner_id: '', start_date: '', start_time: '09:00',
    hours: 2, hourly_rate: 75, service_type: 'Standard Cleaning', notes: '',
    repeat_enabled: false, repeat_type: 'weekly', repeat_end: 'never',
    repeat_end_count: 10, repeat_end_date: '', custom_interval: 3,
    discount_enabled: false,
    is_emergency: false, cleaner_pay_rate: 40, status: 'scheduled' as string
  })
  const [newClientForm, setNewClientForm] = useState({ name: '', phone: '', email: '', address: '', unit: '', referrer_id: '', notes: '' })
  const [referrers, setReferrers] = useState<Referrer[]>([])
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  
  const [clientSearch, setClientSearch] = useState('')
  const [showClientDropdown, setShowClientDropdown] = useState(false)
  const [filteredClients, setFilteredClients] = useState<Client[]>([])
  
  const [filters, setFilters] = useState({
    status: '',
    service_type: '',
    cleaner_id: '',
    client_id: '',
    date_from: '',
    date_to: ''
  })
  const [showFilters, setShowFilters] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => { loadBookings(); loadClients(); loadCleaners(); loadReferrers() }, [])
  useEffect(() => { applyFilters() }, [bookings, filters, searchQuery])

  useEffect(() => {
    if (clientSearch) {
      const search = clientSearch.toLowerCase()
      const filtered = clients
        .filter(c => c.name.toLowerCase().includes(search) || c.phone.includes(search) || c.email?.toLowerCase().includes(search))
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(0, 8)
      setFilteredClients(filtered)
    } else {
      setFilteredClients([])
    }
  }, [clientSearch, clients])

  // Auto-open create modal when linked from clients page with ?new=1&client_id=xxx
  useEffect(() => {
    if (searchParams.get('new') === '1' && clients.length > 0) {
      const clientId = searchParams.get('client_id')
      const client = clientId ? clients.find(c => c.id === clientId) : null
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const endDate = new Date()
      endDate.setMonth(endDate.getMonth() + 3)
      setCreateForm({
        client_id: client ? client.id : '',
        cleaner_id: '', start_date: tomorrow.toISOString().split('T')[0],
        start_time: '09:00', hours: 2, hourly_rate: 75, service_type: 'Standard Cleaning', notes: '',
        repeat_enabled: false, repeat_type: 'weekly', repeat_end: 'never',
        repeat_end_count: 10, repeat_end_date: endDate.toISOString().split('T')[0], custom_interval: 3,
        discount_enabled: false, is_emergency: false, cleaner_pay_rate: 40, status: 'scheduled'
      })
      if (client) {
        setClientSearch(client.name + ' - ' + client.phone)
      }
      setShowClientDropdown(false)
      setShowCreateModal(true)
    }
  }, [searchParams, clients])

  // Auto-open edit modal when linked from calendar with ?edit=BOOKING_ID
  useEffect(() => {
    const editId = searchParams.get('edit')
    if (editId && bookings.length > 0) {
      const booking = bookings.find(b => b.id === editId)
      if (booking) {
        setFilters({ status: '', service_type: '', cleaner_id: '', client_id: '', date_from: '', date_to: '' })
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
      const endDate = new Date()
      endDate.setMonth(endDate.getMonth() + 3)
      setCreateForm({
        client_id: '', cleaner_id: '', start_date: date,
        start_time: time || '09:00', hours: 2, hourly_rate: 75, service_type: 'Standard Cleaning', notes: '',
        repeat_enabled: false, repeat_type: 'weekly', repeat_end: 'never',
        repeat_end_count: 10, repeat_end_date: endDate.toISOString().split('T')[0], custom_interval: 3,
        discount_enabled: false, is_emergency: false, cleaner_pay_rate: 40, status: 'scheduled'
      })
      setClientSearch('')
      setShowClientDropdown(false)
      setShowCreateModal(true)
      window.history.replaceState({}, '', '/dashboard/bookings')
    }
  }, [searchParams])

  const loadBookings = async () => { 
    const res = await fetch('/api/bookings')
    if (res.ok) {
      const data = await res.json()
      data.sort((a: Booking, b: Booking) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
      setBookings(data)
    }
    setLoading(false) 
  }
  const loadClients = async () => { const res = await fetch('/api/clients'); if (res.ok) setClients(await res.json()) }
  const loadCleaners = async () => { const res = await fetch('/api/cleaners'); if (res.ok) setCleaners(await res.json()) }
  const loadReferrers = async () => { const res = await fetch('/api/referrers'); if (res.ok) setReferrers(await res.json()) }

  const applyFilters = () => {
    let result = [...bookings]
    if (filters.status) result = result.filter(b => b.status === filters.status)
    if (filters.service_type) result = result.filter(b => b.service_type === filters.service_type)
    if (filters.cleaner_id) result = result.filter(b => b.cleaner_id === filters.cleaner_id)
    if (filters.client_id) result = result.filter(b => b.client_id === filters.client_id)
    if (filters.date_from) result = result.filter(b => new Date(b.start_time) >= new Date(filters.date_from))
    if (filters.date_to) result = result.filter(b => new Date(b.start_time) <= new Date(filters.date_to + 'T23:59:59'))
    if (searchQuery) { const q = searchQuery.toLowerCase(); result = result.filter(b => (b.clients?.name || '').toLowerCase().includes(q) || (b.clients?.phone || '').includes(q) || (b.clients?.address || '').toLowerCase().includes(q) || (b.cleaners?.name || '').toLowerCase().includes(q)) }
    setFilteredBookings(result)
  }

  const clearFilters = () => {
    setFilters({ status: 'scheduled', service_type: '', cleaner_id: '', client_id: '', date_from: '', date_to: '' })
  }

  // Parse naive datetime string (no timezone conversion)
  const parseNaive = (s: string) => {
    const [datePart, timePart] = s.split('T')
    return { date: datePart, time: (timePart || '00:00').slice(0, 5) }
  }

  const openEdit = (booking: Booking) => {
    editingBookingRef.current = booking
    setEditingBooking(booking)
    const start = parseNaive(booking.start_time)
    const end = parseNaive(booking.end_time)
    // Calculate hours from naive time strings
    const [sh, sm] = start.time.split(':').map(Number)
    const [eh, em] = end.time.split(':').map(Number)
    const hours = Math.round(((eh * 60 + em) - (sh * 60 + sm)) / 60) || 2

    // Derive rate: use stored hourly_rate, or calculate from price/hours, or default to 75
    const rate = booking.hourly_rate || (booking.price && hours ? Math.round(booking.price / 100 / hours) : 75)
    // Snap to nearest known rate option
    const knownRates = [49, 65, 75]
    const snappedRate = knownRates.reduce((best, r) => Math.abs(r - rate) < Math.abs(best - rate) ? r : best, 75)
    const fullPrice = (hours || 2) * snappedRate * 100
    const hasDiscount = booking.price < fullPrice && booking.price > 0

    const endDate3 = new Date()
    endDate3.setMonth(endDate3.getMonth() + 3)

    setForm({
      status: booking.status,
      payment_status: booking.payment_status,
      payment_method: booking.payment_method || '',
      notes: booking.notes || '',
      cleaner_id: booking.cleaner_id || '',
      start_date: start.date,
      start_time: start.time,
      hours: hours || 2,
      service_type: booking.service_type,
      hourly_rate: snappedRate,
      discount_enabled: hasDiscount,
      repeat_enabled: !!booking.recurring_type,
      repeat_type: reverseRecurringType(booking.recurring_type),
      repeat_end: 'never',
      repeat_end_count: 10,
      repeat_end_date: endDate3.toISOString().split('T')[0],
      custom_interval: 3,
      actual_hours: booking.actual_hours,
      cleaner_pay: booking.cleaner_pay,
      cleaner_paid: !!(booking as any).cleaner_paid,
      _originalPrice: booking.price
    })
    setShowModal(true)
    setCopied(false)
  }

  const openCreate = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const endDate = new Date()
    endDate.setMonth(endDate.getMonth() + 3)
    setCreateForm({
      client_id: '', cleaner_id: '', start_date: tomorrow.toISOString().split('T')[0],
      start_time: '09:00', hours: 2, hourly_rate: 75, service_type: 'Standard Cleaning', notes: '',
      repeat_enabled: false, repeat_type: 'weekly', repeat_end: 'never',
      repeat_end_count: 10, repeat_end_date: endDate.toISOString().split('T')[0], custom_interval: 3,
      discount_enabled: false, is_emergency: false, cleaner_pay_rate: 40, status: 'scheduled'
    })
    setClientSearch('')
    setShowClientDropdown(false)
    setShowCreateModal(true)
  }

  const handleClientSelect = (client: Client) => {
    setCreateForm({ ...createForm, client_id: client.id })
    setClientSearch(client.name + ' - ' + client.phone)
    setShowClientDropdown(false)
  }

  const handleClientSearchChange = (value: string) => {
    setClientSearch(value)
    setCreateForm({ ...createForm, client_id: '' })
    setShowClientDropdown(true)
  }

  const handleNewClientClick = () => {
    setNewClientForm({ name: '', phone: '', email: '', address: '', unit: '', referrer_id: '', notes: '' })
    setShowNewClientModal(true)
    setShowClientDropdown(false)
  }

  const handleNewClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const fullAddress = newClientForm.unit
      ? `${newClientForm.address}, ${newClientForm.unit}`
      : newClientForm.address
    const res = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newClientForm.name, phone: newClientForm.phone, email: newClientForm.email, address: fullAddress, referrer_id: newClientForm.referrer_id || null, notes: newClientForm.notes || null })
    })
    if (res.ok) {
      const newClient = await res.json()
      await loadClients()
      setCreateForm({ ...createForm, client_id: newClient.id })
      setClientSearch(newClient.name + ' - ' + newClient.phone)
      setShowNewClientModal(false)
      setNewClientForm({ name: '', phone: '', email: '', address: '', unit: '', referrer_id: '', notes: '' })
    }
    setSaving(false)
  }

  const isExistingClient = (clientId: string) => {
    const client = clients.find(c => c.id === clientId)
    if (!client) return false
    return new Date(client.created_at) < new Date(Date.now() - 24 * 60 * 60 * 1000)
  }

  const calculatePrice = () => {
    const basePrice = createForm.hours * createForm.hourly_rate * 100
    if (createForm.discount_enabled) {
      const discounted = basePrice * 0.9
      return Math.floor(discounted / 500) * 500 // round down to nearest $5
    }
    return basePrice
  }

  const calculateEditPrice = () => {
    // If editing a completed booking with actual_hours, use actual_hours for pricing
    if (form.actual_hours && form.actual_hours > 0) {
      return Math.round(form.actual_hours * form.hourly_rate * 100)
    }
    const basePrice = form.hours * form.hourly_rate * 100
    if (form.discount_enabled) {
      const discounted = basePrice * 0.9
      return Math.floor(discounted / 500) * 500
    }
    return basePrice
  }

  // Check if pricing fields changed from what was loaded
  const pricingChanged = () => {
    if (!editingBooking) return true
    const s = parseNaive(editingBooking.start_time), e = parseNaive(editingBooking.end_time)
    const [sh, sm] = s.time.split(':').map(Number), [eh, em] = e.time.split(':').map(Number)
    const origHours = Math.round(((eh * 60 + em) - (sh * 60 + sm)) / 60) || 2
    const origRate = editingBooking.hourly_rate || form.hourly_rate
    return form.hours !== origHours || form.hourly_rate !== origRate ||
      form.discount_enabled !== (editingBooking.price < origHours * origRate * 100 && editingBooking.price > 0) ||
      form.actual_hours !== editingBooking.actual_hours
  }

  const getEstimatedHoursRange = (hours: number) => {
    const ranges: Record<number, string> = { 1: '1-2', 2: '2-3', 3: '3-4', 4: '4-6', 5: '5-7', 6: '6-8', 7: '7-9' }
    return ranges[hours] || hours + '-' + (hours + 2)
  }

  const recurringDates = generateRecurringDates(
    createForm.start_date, createForm.repeat_enabled, createForm.repeat_type,
    createForm.repeat_end, createForm.repeat_end_count, createForm.repeat_end_date, createForm.custom_interval
  )

  const editRecurringDates = generateRecurringDates(
    form.start_date, form.repeat_enabled, form.repeat_type,
    form.repeat_end, form.repeat_end_count, form.repeat_end_date, form.custom_interval
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (editingBooking?.recurring_type) {
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
    const booking = editingBookingRef.current || editingBooking
    if (!booking?.id) {
      alert('No booking selected')
      return
    }
    const bookingId = booking.id
    setSaving(true)
    setShowUpdateChoice(false)

    const newStartStr = buildNaiveTime(form.start_date, form.start_time)
    const newEndStr = buildNaiveTime(form.start_date, form.start_time, form.hours)
    const recurringType = form.repeat_enabled ? getRecurringDisplayName(form.repeat_type, form.start_date) : null

    const updateData = {
      status: form.status,
      payment_status: form.payment_status,
      payment_method: form.payment_method || null,
      notes: form.notes || null,
      cleaner_id: form.cleaner_id || null,
      start_time: newStartStr,
      end_time: newEndStr,
      price: pricingChanged() ? calculateEditPrice() : form._originalPrice,
      service_type: form.service_type,
      hourly_rate: form.hourly_rate,
      recurring_type: recurringType,
      actual_hours: form.actual_hours,
      cleaner_pay: form.cleaner_pay,
      cleaner_paid: form.cleaner_paid
    }

    if (scope === 'all' && booking.recurring_type) {
      // Calculate minute delta from original booking to apply to all future
      const deltaMinutes = naiveMinuteDiff(newStartStr, booking.start_time)
      const durationMinutes = form.hours * 60

      const futureBookings = bookings.filter(b =>
        b.client_id === booking.client_id &&
        b.recurring_type === booking.recurring_type &&
        b.status === 'scheduled' &&
        b.start_time >= booking.start_time
      )

      for (let i = 0; i < futureBookings.length; i++) {
        const bk = futureBookings[i]
        const shiftedStart = shiftNaive(bk.start_time, deltaMinutes)
        const shiftedEnd = shiftNaive(bk.start_time, deltaMinutes + durationMinutes)
        const res = await fetch('/api/bookings/' + bk.id, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...updateData,
            start_time: shiftedStart,
            end_time: shiftedEnd
          })
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Unknown error' }))
          alert(`Failed to update booking ${i + 1}/${futureBookings.length}: ${err.error || res.statusText}`)
          setSaving(false)
          return
        }
      }
    } else {
      // Update this booking
      const res = await fetch('/api/bookings/' + bookingId, {
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
      if (form.repeat_enabled && !booking.recurring_type && editRecurringDates.length > 1) {
        for (let i = 1; i < editRecurringDates.length; i++) {
          const date = editRecurringDates[i]
          await fetch('/api/bookings', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              client_id: booking.client_id, cleaner_id: form.cleaner_id,
              start_time: buildNaiveTime(date, form.start_time), end_time: buildNaiveTime(date, form.start_time, form.hours),
              service_type: form.service_type, price: calculateEditPrice(),
              hourly_rate: form.hourly_rate, recurring_type: recurringType, notes: form.notes || null,
              skip_email: true
            })
          })
        }
      }
    }

    setShowModal(false)
    setEditingBooking(null)
    editingBookingRef.current = null
    loadBookings()
    setSaving(false)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    const recurringType = createForm.repeat_enabled ? getRecurringDisplayName(createForm.repeat_type, createForm.start_date) : null

    for (let i = 0; i < recurringDates.length; i++) {
      const date = recurringDates[i]
      const res = await fetch('/api/bookings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: createForm.client_id,
          cleaner_id: createForm.is_emergency ? null : createForm.cleaner_id,
          start_time: buildNaiveTime(date, createForm.start_time),
          end_time: buildNaiveTime(date, createForm.start_time, createForm.hours),
          service_type: createForm.service_type,
          price: calculatePrice(),
          hourly_rate: createForm.hourly_rate,
          recurring_type: recurringType,
          notes: createForm.notes || null,
          skip_email: i > 0 || createForm.is_emergency,
          status: createForm.is_emergency ? 'available' : createForm.status,
          cleaner_pay_rate: createForm.is_emergency ? createForm.cleaner_pay_rate : null
        })
      })

      // Broadcast emergency job to all cleaners
      if (createForm.is_emergency && res.ok) {
        const booking = await res.json()
        await fetch('/api/bookings/broadcast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ booking_id: booking.id })
        })
      }
    }
    setShowCreateModal(false); loadBookings(); setSaving(false)
  }

  const handleCancel = async (scope: 'single' | 'all') => {
    if (!editingBooking) return
    setSaving(true)

    if (scope === 'all' && editingBooking.recurring_type) {
      const futureBookings = bookings.filter(b =>
        b.client_id === editingBooking.client_id &&
        b.recurring_type === editingBooking.recurring_type &&
        b.status === 'scheduled' &&
        new Date(b.start_time) >= new Date(editingBooking.start_time)
      )

      for (let i = 0; i < futureBookings.length; i++) {
        const booking = futureBookings[i]
        await fetch('/api/bookings/' + booking.id + (i > 0 ? '?skip_email=true' : ''), { method: 'DELETE' })
      }
    } else {
      await fetch('/api/bookings/' + editingBooking.id, { method: 'DELETE' })
    }

    setShowModal(false)
    setEditingBooking(null)
    loadBookings()
    setSaving(false)
  }

  const handleResendEmails = async (bookingId: string, clientName?: string) => {
    if (!confirm(`Resend confirmation email to ${clientName || 'client'}?`)) return
    const res = await fetch('/api/send-booking-emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId, clientOnly: true })
    })
    if (res.ok) {
      alert('Confirmation email sent!')
    } else {
      alert('Failed to send email')
    }
  }

  const copyTeamLink = () => {
    if (editingBooking?.cleaner_token) {
      navigator.clipboard.writeText(window.location.origin + '/team/' + editingBooking.cleaner_token)
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
    return dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  }

  const serviceTypesData = useServiceTypes()
  const serviceTypes = serviceTypesData.length > 0 ? serviceTypesData.map(s => s.name) : ['Standard Cleaning', 'Deep Cleaning', 'Move In/Out', 'Post Construction']

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

  const activeFilterCount = [filters.status, filters.service_type, filters.cleaner_id, filters.client_id, filters.date_from, filters.date_to].filter(Boolean).length

  return (
    <div className="min-h-screen bg-white">
      <DashboardHeader currentPage="bookings" />
      <main className="p-3 md:p-6">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-2xl font-semibold text-black">Bookings</h2>
          <div className="flex gap-3">
            <button onClick={() => setShowFilters(!showFilters)} className={'px-4 py-2 border rounded-lg font-medium ' + (showFilters || activeFilterCount > 0 ? 'border-black bg-black text-white' : 'border-gray-300 text-black')}>
              Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
            </button>
            <button onClick={openCreate} className="bg-black text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-800">Create</button>
          </div>
        </div>
        <div className="text-sm text-gray-500 mb-4 hidden md:block">
          Client portal: <a href="https://www.washandfoldnyc.com/book" target="_blank" className="text-blue-600 hover:underline">washandfoldnyc.com/book</a> ·
          New booking: <a href="https://www.washandfoldnyc.com/book/new" target="_blank" className="text-blue-600 hover:underline ml-1">washandfoldnyc.com/book/new</a> ·
          Collect info: <a href="https://www.washandfoldnyc.com/book/collect" target="_blank" className="text-blue-600 hover:underline ml-1">washandfoldnyc.com/book/collect</a> ·
          Team portal: <a href="https://www.washandfoldnyc.com/team" target="_blank" className="text-blue-600 hover:underline ml-1">washandfoldnyc.com/team</a>
        </div>
        <input type="text" placeholder="Search client, cleaner, address..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black mb-4 focus:outline-none focus:border-black" />

        {showFilters && (
          <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-black text-sm">
                  <option value="">All</option>
                  <option value="pending">Pending</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Service</label>
                <select value={filters.service_type} onChange={(e) => setFilters({ ...filters, service_type: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-black text-sm">
                  <option value="">All</option>
                  {serviceTypes.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Cleaner</label>
                <select value={filters.cleaner_id} onChange={(e) => setFilters({ ...filters, cleaner_id: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-black text-sm">
                  <option value="">All</option>
                  {cleaners.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Client</label>
                <select value={filters.client_id} onChange={(e) => setFilters({ ...filters, client_id: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-black text-sm">
                  <option value="">All</option>
                  {[...clients].sort((a,b) => a.name.localeCompare(b.name)).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
                <input type="date" value={filters.date_from} onChange={(e) => setFilters({ ...filters, date_from: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-black text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
                <input type="date" value={filters.date_to} onChange={(e) => setFilters({ ...filters, date_to: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-black text-sm" />
              </div>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600">{filteredBookings.length} booking{filteredBookings.length !== 1 ? 's' : ''}</p>
              <button onClick={clearFilters} className="text-sm text-gray-500 hover:text-black">Clear Filters</button>
            </div>
          </div>
        )}

        {/* Pending Bookings Section */}
        {!loading && bookings.filter(b => b.status === 'pending').length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <h3 className="text-sm font-semibold text-red-700 mb-3">Pending Approval ({bookings.filter(b => b.status === 'pending').length})</h3>
            <div className="space-y-2">
              {bookings.filter(b => b.status === 'pending').map((b) => (
                <div key={b.id} onClick={() => openEdit(b)} className="flex items-center justify-between bg-white border border-red-200 rounded-lg p-3 cursor-pointer hover:bg-red-50">
                  <div>
                    <p className="text-red-700 font-medium">{b.clients?.name || '-'}</p>
                    <p className="text-red-600 text-sm">{formatDate(b.start_time)} · {b.service_type}</p>
                    <p className="text-red-500 text-sm">{b.clients?.address || ''}</p>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">Pending</span>
                    <p className="text-red-600 text-sm mt-1">~${(b.price / 100).toFixed(0)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="border border-gray-200 rounded-lg overflow-hidden">
          {loading ? <p className="p-6 text-gray-500">Loading...</p> : filteredBookings.length === 0 ? <p className="p-6 text-gray-500">No bookings found.</p> : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left p-3 md:p-4 font-medium text-black text-sm">Date/Time</th>
                  <th className="text-left p-3 md:p-4 font-medium text-black text-sm">Client</th>
                  <th className="text-left p-3 md:p-4 font-medium text-black text-sm">Staff</th>
                  <th className="text-left p-4 font-medium text-black text-sm hidden md:table-cell">Service</th>
                  <th className="text-left p-4 font-medium text-black text-sm hidden lg:table-cell">Rate</th>
                  <th className="text-left p-3 md:p-4 font-medium text-black text-sm">Est.</th>
                  <th className="text-left p-4 font-medium text-black text-sm hidden md:table-cell">Recurring</th>
                  <th className="text-left p-3 md:p-4 font-medium text-black text-sm">Status</th>
                  <th className="text-left p-4 font-medium text-black text-sm hidden md:table-cell"></th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((b) => (
                  <tr key={b.id} className={'border-b border-gray-100 hover:bg-gray-50 cursor-pointer' + (b.status === 'pending' ? ' bg-red-50' : '')} onClick={() => openEdit(b)}>
                    <td className={'p-3 md:p-4 text-sm ' + (b.status === 'pending' ? 'text-red-700' : 'text-black')}>{formatDate(b.start_time)}</td>
                    <td className={'p-3 md:p-4 font-medium text-sm ' + (b.status === 'pending' ? 'text-red-700' : 'text-black')}>{b.clients?.name || '-'}</td>
                    <td className={'p-3 md:p-4 text-sm ' + (b.status === 'pending' ? 'text-red-600' : 'text-gray-600')}>{b.cleaners?.name || '-'}</td>
                    <td className={'p-4 hidden md:table-cell ' + (b.status === 'pending' ? 'text-red-600' : 'text-gray-600')}>{b.service_type}</td>
                    <td className={'p-4 hidden lg:table-cell ' + (b.status === 'pending' ? 'text-red-600' : 'text-gray-600')}>${(() => { const hours = Math.max(1, Math.round((new Date(b.end_time).getTime() - new Date(b.start_time).getTime()) / (1000 * 60 * 60))); return b.hourly_rate ? b.hourly_rate : b.price ? Math.round(b.price / 100 / hours) : 75 })()}/hr</td>
                    <td className={'p-3 md:p-4 text-sm ' + (b.status === 'pending' ? 'text-red-700' : 'text-black')}>~${(b.price / 100).toFixed(0)}</td>
                    <td className="p-4 hidden md:table-cell">{b.recurring_type ? <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">{b.recurring_type}</span> : '-'}</td>
                    <td className="p-3 md:p-4"><span className={'px-2 py-1 rounded-full text-xs font-medium ' + (b.status === 'pending' ? 'bg-red-100 text-red-700' : b.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' : b.status === 'completed' ? 'bg-green-100 text-green-700' : b.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700')}>{b.status === 'in_progress' ? 'in progress' : b.status}</span></td>
                    <td className="p-4 hidden md:table-cell" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        {b.status !== 'cancelled' && (
                          <>
                            <button onClick={() => handleResendEmails(b.id, b.clients?.name)} className="text-green-600 hover:underline text-sm">Resend</button>
                            <span className="text-gray-300">|</span>
                          </>
                        )}
                        <button onClick={() => openEdit(b)} className="text-blue-600 hover:underline text-sm">Edit</button>
                        <span className="text-gray-300">|</span>
                        {b.status === 'cancelled' ? (
                          <button onClick={() => { if (confirm(`Permanently delete this cancelled booking for ${b.clients?.name || 'this client'}?`)) { fetch('/api/bookings/' + b.id + '?hard_delete=true', { method: 'DELETE' }).then(() => loadBookings()) } }} className="text-red-600 hover:underline text-sm">Delete</button>
                        ) : (
                          <button onClick={() => { if (confirm(`Cancel booking for ${b.clients?.name || 'this client'}?`)) { fetch('/api/bookings/' + b.id, { method: 'DELETE' }).then(() => loadBookings()) } }} className="text-red-600 hover:underline text-sm">Cancel</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </main>

      {showModal && editingBooking && (
        <SidePanel open={showModal} onClose={() => { setShowModal(false); setEditingBooking(null) }} title="Edit Booking">
            <p className="text-black font-medium">{editingBooking.clients?.name}</p>
            {editingBooking.client_id && clients.find(c => c.id === editingBooking.client_id)?.do_not_service && (
              <div className="bg-red-50 border-2 border-red-300 rounded-lg p-3 my-2">
                <p className="text-red-700 font-bold text-sm">DO NOT SERVICE</p>
                <p className="text-red-600 text-sm">This client is flagged. Check notes before proceeding.</p>
              </div>
            )}
            {editingBooking.clients?.address && (
              <p className="text-black text-base">{editingBooking.clients.address}</p>
            )}
            {editingBooking.clients?.phone && (
              <div className="flex items-center gap-3 mt-2 mb-4">
                <span className="text-black text-base font-medium">{editingBooking.clients.phone}</span>
                <a href={`tel:${editingBooking.clients.phone}`} className="px-4 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-full text-sm font-medium hover:bg-green-100">Call</a>
                <a href={`sms:${editingBooking.clients.phone}`} className="px-4 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-sm font-medium hover:bg-blue-100">Text</a>
              </div>
            )}
            {!editingBooking.clients?.phone && <div className="mb-4" />}
            {/* GPS Distance */}
            {(() => {
              const locations = [
                { label: 'Check-in', loc: editingBooking.check_in_location },
                { label: 'Check-out', loc: editingBooking.check_out_location }
              ].filter(l => l.loc && typeof l.loc === 'object' && 'distance_miles' in (l.loc as Record<string, unknown>))
              if (locations.length === 0) return null
              return (
                <div className="mb-4 space-y-1">
                  {locations.map(({ label, loc }) => {
                    const l = loc as Record<string, unknown>
                    const flagged = l.flagged as boolean
                    const dist = l.distance_miles as number
                    return (
                      <div key={label} className={`text-sm px-3 py-2 rounded-lg ${flagged ? 'bg-red-50 text-red-700 font-medium' : 'bg-green-50 text-green-700'}`}>
                        {flagged ? '⚠️' : '✓'} {label}: {dist.toFixed(2)} mi from address
                      </div>
                    )
                  })}
                </div>
              )
            })()}
            {/* Admin Check-In / Check-Out */}
            {editingBooking.status === 'scheduled' && !editingBooking.check_in_time && (
              <button
                type="button"
                onClick={async () => {
                  if (!confirm('Check in this booking now? This will set the start time to now.')) return
                  setSaving(true)
                  const now = new Date().toISOString()
                  await fetch('/api/bookings/' + editingBooking.id, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...form, status: 'in_progress', check_in_time: now, skip_email: true })
                  })
                  setShowModal(false)
                  setEditingBooking(null)
                  loadBookings()
                  setSaving(false)
                }}
                className="w-full mb-3 py-2.5 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
              >
                Check In (Admin)
              </button>
            )}
            {editingBooking.check_in_time && !editingBooking.check_out_time && (
              <div className="mb-3">
                <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg mb-2">
                  Checked in: {new Date(editingBooking.check_in_time + (editingBooking.check_in_time.endsWith('Z') ? '' : 'Z')).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' })}
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    if (!confirm('Check out this booking now? This will calculate actual hours and payment.')) return
                    setSaving(true)
                    const now = new Date()
                    const ciStr = editingBooking.check_in_time!
                    const checkIn = new Date(ciStr)
                    const rawHours = (now.getTime() - checkIn.getTime()) / (1000 * 60 * 60)
                    // 10-min grace: 3:09 → 3.0hrs, 3:10 → 3.5hrs
                    const totalMin = rawHours * 60
                    const halfHrs = Math.floor(totalMin / 30)
                    const rem = totalMin - halfHrs * 30
                    const actualHours = rem >= 10 ? (halfHrs + 1) * 0.5 : halfHrs * 0.5
                    const clientRate = editingBooking.hourly_rate || 75
                    const cleanerRate = 25
                    const updatedPrice = Math.round(actualHours * clientRate * 100)
                    const cleanerPay = Math.round(actualHours * cleanerRate * 100)
                    await fetch('/api/bookings/' + editingBooking.id, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        ...form,
                        status: 'completed',
                        check_out_time: now.toISOString(),
                        actual_hours: actualHours,
                        price: updatedPrice,
                        cleaner_pay: cleanerPay,
                        skip_email: true
                      })
                    })
                    setShowModal(false)
                    setEditingBooking(null)
                    loadBookings()
                    setSaving(false)
                  }}
                  className="w-full py-2.5 px-4 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
                >
                  Check Out (Admin)
                </button>
              </div>
            )}
            {editingBooking.check_in_time && editingBooking.check_out_time && (
              <div className="mb-3 space-y-1">
                <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">
                  Checked in: {new Date(editingBooking.check_in_time + (editingBooking.check_in_time.endsWith('Z') ? '' : 'Z')).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' })}
                </p>
                <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">
                  Checked out: {new Date(editingBooking.check_out_time + (editingBooking.check_out_time.endsWith('Z') ? '' : 'Z')).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' })}
                  {editingBooking.actual_hours ? ` (${editingBooking.actual_hours}hrs)` : ''}
                </p>
              </div>
            )}
            {editingBooking.recurring_type && (
              <p className="text-purple-600 text-sm mb-4 bg-purple-50 px-3 py-2 rounded-lg">🔄 Recurring: {editingBooking.recurring_type}</p>
            )}
            {editingBooking.cleaner_token && (
              <button type="button" onClick={copyTeamLink} className="w-full mb-4 py-2 px-4 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg font-medium hover:bg-blue-100">
                {copied ? 'Copied!' : 'Copy Team Link'}
              </button>
            )}
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                {/* Date & Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">Date</label>
                    <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">Time</label>
                    <input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black" />
                  </div>
                </div>
                
                {/* Service & Hours */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">Service</label>
                    <select value={form.service_type} onChange={(e) => setForm({ ...form, service_type: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black">
                      {serviceTypes.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">Hours</label>
                    <select value={form.hours} onChange={(e) => setForm({ ...form, hours: parseInt(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black">
                      {[1,2,3,4,5,6,7,8].map(h => <option key={h} value={h}>{h}hr</option>)}
                    </select>
                  </div>
                </div>

                {/* Rate */}
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Rate</label>
                  <select value={form.hourly_rate} onChange={(e) => setForm({ ...form, hourly_rate: parseInt(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black">
                    <option value={59}>$59/hr</option>
                    <option value={75}>$75/hr</option>
                    <option value={100}>$100/hr (Same-Day)</option>
                  </select>
                </div>

                {/* 10% Discount Toggle */}
                <div className="flex justify-between items-center py-3 border-t border-b border-gray-200">
                  <h4 className="font-medium text-black">10% Discount</h4>
                  <div
                    onClick={() => setForm({ ...form, discount_enabled: !form.discount_enabled })}
                    className={`w-10 h-6 rounded-full transition-colors ${form.discount_enabled ? 'bg-green-600' : 'bg-gray-300'} relative cursor-pointer`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${form.discount_enabled ? 'translate-x-5' : 'translate-x-1'}`} />
                  </div>
                </div>

                {/* Estimate display */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Estimate: ~{getEstimatedHoursRange(form.hours)}hrs × ${form.hourly_rate}/hr{form.discount_enabled ? ' − 10%' : ''}</span>
                    <span className="font-semibold text-black">~${(calculateEditPrice() / 100).toFixed(0)}</span>
                  </div>
                </div>
                {(form.status === 'completed' || form.actual_hours) && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-3">
                    <p className="text-xs font-medium text-green-700">ACTUAL LABOR</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-green-700 mb-1">Hours Worked</label>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={form.actual_hours ?? ''}
                          onChange={(e) => {
                            const hrs = e.target.value ? parseFloat(e.target.value) : null
                            const cleanerRate = cleaners.find(c => c.id === form.cleaner_id)?.hourly_rate || 25
                            setForm({ ...form, actual_hours: hrs, cleaner_pay: hrs ? Math.round(hrs * cleanerRate * 100) : null })
                          }}
                          placeholder="e.g. 3"
                          className="w-full px-3 py-2 border border-green-300 rounded-lg text-black bg-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-green-700 mb-1">Team Pay ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={form.cleaner_pay != null ? (form.cleaner_pay / 100).toFixed(2) : ''}
                          onChange={(e) => {
                            const val = e.target.value ? Math.round(parseFloat(e.target.value) * 100) : null
                            setForm({ ...form, cleaner_pay: val })
                          }}
                          placeholder="auto"
                          className="w-full px-3 py-2 border border-green-300 rounded-lg text-black bg-white text-sm"
                        />
                      </div>
                    </div>
                    {form.actual_hours && (
                      <div className="flex justify-between text-sm">
                        <span className="text-green-700">Actual: {form.actual_hours}hrs × ${form.hourly_rate}/hr</span>
                        <span className="font-semibold text-green-700">${(form.actual_hours * form.hourly_rate).toFixed(0)}</span>
                      </div>
                    )}
                  </div>
                )}

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
                  previewDates={!editingBooking?.recurring_type ? editRecurringDates : []}
                />

                <div>
                  <label className="block text-sm font-medium text-black mb-1">Cleaner</label>
                  <select value={form.cleaner_id} onChange={(e) => setForm({ ...form, cleaner_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black">
                    <option value="">Select...</option>
                    {cleaners.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black">
                    <option value="pending">Pending</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Payment</label>
                  <select value={form.payment_status} onChange={(e) => setForm({ ...form, payment_status: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black">
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Method</label>
                  <select value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black">
                    <option value="">-</option>
                    <option value="zelle">Zelle</option>
                    <option value="apple_pay">Apple Pay</option>
                  </select>
                </div>
                {form.status === 'completed' && (
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">Team Paid</label>
                    <select value={form.cleaner_paid ? 'paid' : 'not_paid'} onChange={(e) => setForm({ ...form, cleaner_paid: e.target.value === 'paid' })} className={'w-full px-3 py-2 border rounded-lg ' + (form.cleaner_paid ? 'border-green-300 text-green-700 bg-green-50' : 'border-gray-300 text-black')}>
                      <option value="not_paid">Not Paid</option>
                      <option value="paid">Paid</option>
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Notes</label>
                  <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black" rows={6} />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                {editingBooking.recurring_type ? (
                  <div className="relative group">
                    <button type="button" className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg">Cancel ▾</button>
                    <div className="absolute left-0 bottom-full mb-1 hidden group-hover:block bg-white border rounded-lg shadow-lg py-1 min-w-[180px]">
                      <button type="button" onClick={() => handleCancel('single')} className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 text-sm">This booking only</button>
                      <button type="button" onClick={() => handleCancel('all')} className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 text-sm">All future bookings</button>
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={() => handleCancel('single')} className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg">Cancel Booking</button>
                )}
                <button type="button" onClick={() => { setShowModal(false); setEditingBooking(null) }} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-black">Close</button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2 bg-black text-white rounded-lg">{saving ? '...' : 'Save'}</button>
              </div>
            </form>
        </SidePanel>
      )}

      {showUpdateChoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]" onClick={() => setShowUpdateChoice(false)}>
          <div className="bg-white rounded-lg p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-black mb-4">Update Recurring Booking</h3>
            <p className="text-gray-600 mb-6">Apply changes to:</p>
            <div className="space-y-3">
              <button onClick={() => saveBooking('single')} className="w-full py-3 px-4 border border-gray-300 rounded-lg text-black hover:bg-gray-50 text-left">
                <p className="font-medium">This booking only</p>
                <p className="text-sm text-gray-500">Only update this appointment</p>
              </button>
              <button onClick={() => saveBooking('all')} className="w-full py-3 px-4 border border-gray-300 rounded-lg text-black hover:bg-gray-50 text-left">
                <p className="font-medium">All future bookings</p>
                <p className="text-sm text-gray-500">Update this and all upcoming appointments</p>
              </button>
            </div>
            <button onClick={() => setShowUpdateChoice(false)} className="w-full mt-4 py-2 text-gray-500 hover:text-black">Cancel</button>
          </div>
        </div>
      )}

      {showCreateModal && (
        <SidePanel open={showCreateModal} onClose={() => { setShowCreateModal(false); setShowClientDropdown(false) }} title="Create Booking" width="max-w-lg">
            <form onSubmit={handleCreate}>
              <div className="space-y-4">
                <div className="relative">
                  <label className="block text-sm font-medium text-black mb-1">Client *</label>
                  <input
                    type="text"
                    required={!createForm.client_id}
                    value={clientSearch}
                    onChange={(e) => handleClientSearchChange(e.target.value)}
                    onFocus={() => setShowClientDropdown(true)}
                    placeholder="Search by name or phone..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black"
                  />
                  
                  {showClientDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                      <button type="button" onClick={handleNewClientClick} className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-200 font-medium text-blue-600">+ New Client</button>
                      {filteredClients.length > 0 ? (
                        filteredClients.map((client) => (
                          <button key={client.id} type="button" onClick={() => handleClientSelect(client)} className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0">
                            <div className="font-medium text-black">{client.name}</div>
                            <div className="text-sm text-gray-500">{client.phone}</div>
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

                {createForm.client_id && clients.find(c => c.id === createForm.client_id)?.do_not_service && (
                  <div className="bg-red-50 border-2 border-red-300 rounded-lg p-3">
                    <p className="text-red-700 font-bold text-sm">DO NOT SERVICE</p>
                    <p className="text-red-600 text-sm">This client is flagged as Do Not Service. Check client notes before proceeding.</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Service</label>
                  <select value={createForm.service_type} onChange={(e) => {
                    const isEmergency = e.target.value === 'Emergency / Same-Day'
                    setCreateForm({ ...createForm, service_type: e.target.value, is_emergency: isEmergency, cleaner_id: isEmergency ? '' : createForm.cleaner_id })
                  }} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black">
                    {serviceTypes.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                {createForm.is_emergency ? (
                  <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-700 mb-3">🚨 Broadcasts to all team - first to claim gets it</p>
                    <label className="block text-sm font-medium text-red-700 mb-1">Team Pay Rate</label>
                    <div className="flex items-center">
                      <span className="text-black text-lg mr-1">$</span>
                      <input
                        type="number"
                        step="1"
                        min="25"
                        max="100"
                        value={createForm.cleaner_pay_rate}
                        onChange={(e) => setCreateForm({ ...createForm, cleaner_pay_rate: parseInt(e.target.value) || 40 })}
                        className="w-24 px-3 py-2 border border-red-300 rounded-lg text-black text-center font-mono bg-white"
                      />
                      <span className="text-black ml-1">/hr</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">Cleaner *</label>
                    <select required value={createForm.cleaner_id} onChange={(e) => setCreateForm({ ...createForm, cleaner_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black">
                      <option value="">Select...</option>
                      {cleaners.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">Hours</label>
                    <select value={createForm.hours} onChange={(e) => setCreateForm({ ...createForm, hours: parseInt(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black">
                      {[1,2,3,4,5,6,7,8].map(h => <option key={h} value={h}>{h}hr</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">Rate</label>
                    <select value={createForm.hourly_rate} onChange={(e) => setCreateForm({ ...createForm, hourly_rate: parseInt(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black">
                      <option value={59}>$59/hr</option>
                      <option value={75}>$75/hr</option>
                      <option value={100}>$100/hr (Same-Day)</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">Date *</label>
                    <input type="date" required value={createForm.start_date} onChange={(e) => setCreateForm({ ...createForm, start_date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">Time *</label>
                    <input type="time" required value={createForm.start_time} onChange={(e) => setCreateForm({ ...createForm, start_time: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black" />
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

                <div className="flex justify-between items-center py-3 border-t border-b border-gray-200">
                  <h4 className="font-medium text-black">10% Discount</h4>
                  <div
                    onClick={() => setCreateForm({ ...createForm, discount_enabled: !createForm.discount_enabled })}
                    className={`w-10 h-6 rounded-full transition-colors ${createForm.discount_enabled ? 'bg-green-600' : 'bg-gray-300'} relative cursor-pointer`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${createForm.discount_enabled ? 'translate-x-5' : 'translate-x-1'}`} />
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-2">ESTIMATE</p>
                  <div className="flex justify-between">
                    <span>~{getEstimatedHoursRange(createForm.hours)}hrs × ${createForm.hourly_rate}/hr{createForm.discount_enabled ? ' − 10%' : ''}</span>
                    <span className="font-semibold">~${((calculatePrice() / 100) * recurringDates.length).toFixed(0)}</span>
                  </div>
                  {recurringDates.length > 1 && <p className="text-xs text-gray-500 mt-1">{recurringDates.length} bookings</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-1">Status</label>
                  <select value={createForm.status} onChange={(e) => setCreateForm({ ...createForm, status: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black">
                    <option value="pending">Pending</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Notes</label>
                  <textarea value={createForm.notes} onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black" rows={2} placeholder="Access codes..." />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => { setShowCreateModal(false); setShowClientDropdown(false) }} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-black">Cancel</button>
                <button type="submit" disabled={saving || !createForm.client_id} className="flex-1 px-4 py-2 bg-black text-white rounded-lg disabled:bg-gray-300">
                  {saving ? 'Creating...' : recurringDates.length > 1 ? 'Create ' + recurringDates.length + ' Bookings' : 'Create'}
                </button>
              </div>
            </form>
        </SidePanel>
      )}

      {showNewClientModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]" onClick={() => setShowNewClientModal(false)}>
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-black mb-4">New Client</h3>
            <form onSubmit={handleNewClientSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input type="text" required value={newClientForm.name} onChange={(e) => setNewClientForm({ ...newClientForm, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-black" placeholder="John Smith" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={newClientForm.email} onChange={(e) => setNewClientForm({ ...newClientForm, email: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-black" placeholder="john@email.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                <input type="tel" required value={newClientForm.phone} onChange={(e) => setNewClientForm({ ...newClientForm, phone: formatPhone(e.target.value) })} className="w-full px-3 py-2 border rounded-lg text-black" placeholder="212-555-1234" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <AddressAutocomplete value={newClientForm.address} onChange={(val) => setNewClientForm({ ...newClientForm, address: val })} placeholder="123 Main St, New York, NY 10001" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit / Apt</label>
                <input type="text" value={newClientForm.unit} onChange={(e) => setNewClientForm({ ...newClientForm, unit: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-black" placeholder="Apt 4B" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Referred By</label>
                <select value={newClientForm.referrer_id} onChange={(e) => setNewClientForm({ ...newClientForm, referrer_id: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-black">
                  <option value="">None</option>
                  {referrers.filter(ref => ref.active).map(ref => <option key={ref.id} value={ref.id}>{ref.name} ({ref.ref_code})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={newClientForm.notes} onChange={(e) => setNewClientForm({ ...newClientForm, notes: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-black" rows={3} placeholder="Any special instructions..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowNewClientModal(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-black">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2 bg-black text-white rounded-lg">{saving ? '...' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
