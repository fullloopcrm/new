'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePortalAuth } from '../layout'
import { recurringDiscountPct } from '@/lib/nycmaid/recurring-discount'
import AddressAutocomplete from '@/components/AddressAutocomplete'

type ServiceType = {
  id: string
  name: string
  description: string | null
  default_duration_hours: number
  default_hourly_rate: number
}

type Property = {
  id: string
  label: string | null
  address: string
  unit: string | null
  is_primary: boolean
}

export default function BookingWizardPage() {
  const { auth } = usePortalAuth()
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [services, setServices] = useState<ServiceType[]>([])
  const [selectedService, setSelectedService] = useState<ServiceType | null>(null)
  const [dateTime, setDateTime] = useState('')
  const [notes, setNotes] = useState('')
  const [recurring, setRecurring] = useState('none')
  const [loading, setLoading] = useState(false)
  const [properties, setProperties] = useState<Property[]>([])
  const [propertyId, setPropertyId] = useState('')
  const [addingAddress, setAddingAddress] = useState(false)
  const [newAddress, setNewAddress] = useState('')
  const [newUnit, setNewUnit] = useState('')
  const [addressError, setAddressError] = useState('')
  const [savingAddress, setSavingAddress] = useState(false)

  function loadProperties() {
    if (!auth) return
    fetch('/api/portal/properties', {
      headers: { Authorization: `Bearer ${auth.token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        const props: Property[] = data.properties || []
        setProperties(props)
        const primary = props.find((p) => p.is_primary)
        if (primary) setPropertyId(primary.id)
        return props
      })
      .catch(() => {})
  }

  useEffect(() => {
    if (!auth) { router.push('/portal/login'); return }
    fetch('/api/portal/services', {
      headers: { Authorization: `Bearer ${auth.token}` },
    })
      .then((r) => r.json())
      .then((data) => setServices((data.services || []).filter((s: ServiceType & { active: boolean }) => s.active)))
      .catch(() => {})
    loadProperties()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth, router])

  async function addAddress() {
    if (!auth) return
    if (newAddress.trim().length < 5) { setAddressError('Enter a full address.'); return }
    setSavingAddress(true); setAddressError('')
    const res = await fetch('/api/portal/properties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
      body: JSON.stringify({ address: newAddress.trim(), unit: newUnit.trim() || null }),
    })
    setSavingAddress(false)
    if (!res.ok) { setAddressError((await res.json().catch(() => ({}))).error || 'Failed to add'); return }
    const created = (await res.json().catch(() => ({}))).property
    setNewAddress(''); setNewUnit(''); setAddingAddress(false)
    const propsRes = await fetch('/api/portal/properties', { headers: { Authorization: `Bearer ${auth.token}` } })
    const data = await propsRes.json().catch(() => ({}))
    const props: Property[] = data.properties || []
    setProperties(props)
    if (created?.id) setPropertyId(created.id)
  }

  async function submit() {
    if (!auth || !selectedService || !dateTime) return
    setLoading(true)
    const endTime = new Date(new Date(dateTime).getTime() + selectedService.default_duration_hours * 3600000)

    const res = await fetch('/api/portal/bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.token}`,
      },
      body: JSON.stringify({
        service_type_id: selectedService.id,
        start_time: new Date(dateTime).toISOString(),
        end_time: endTime.toISOString(),
        notes,
        recurring_type: recurring,
        property_id: propertyId || null,
      }),
    })
    if (res.ok) {
      router.push('/portal')
    }
    setLoading(false)
  }

  if (!auth) return null

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-800 mb-6">Book an Appointment</h1>

      {/* Progress */}
      <div className="flex gap-1 mb-6">
        {[1, 2, 3].map((s) => (
          <div key={s} className={`flex-1 h-1.5 rounded-full ${s <= step ? 'bg-slate-800' : 'bg-gray-200'}`} />
        ))}
      </div>

      {step === 1 && (
        <div>
          <h2 className="font-semibold text-slate-800 mb-4">Select a Service</h2>
          <div className="space-y-2">
            {services.map((s) => (
              <button
                key={s.id}
                onClick={() => { setSelectedService(s); setStep(2) }}
                className={`w-full text-left bg-white border rounded-xl p-4 transition-colors ${
                  selectedService?.id === s.id ? 'border-slate-800' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="font-medium text-sm">{s.name}</p>
                {s.description && <p className="text-xs text-slate-400 mt-1">{s.description}</p>}
                <p className="text-xs text-slate-400 mt-1">{s.default_duration_hours}hr &middot; ${s.default_hourly_rate}/hr</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && selectedService && (
        <div>
          <h2 className="font-semibold text-slate-800 mb-4">Choose Date & Time</h2>
          <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
            <p className="text-sm text-slate-400 mb-1">Selected</p>
            <p className="font-medium text-sm">{selectedService.name}</p>
            <p className="text-xs text-slate-400">{selectedService.default_duration_hours}hr &middot; ~${selectedService.default_hourly_rate * selectedService.default_duration_hours}</p>
          </div>
          <input
            type="datetime-local"
            value={dateTime}
            onChange={(e) => setDateTime(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm mb-4"
          />
          <label className="block text-sm font-medium text-slate-600 mb-1">Address</label>
          {!addingAddress ? (
            <select
              value={propertyId}
              onChange={(e) => {
                if (e.target.value === '__add_address__') { setAddingAddress(true); setAddressError(''); return }
                setPropertyId(e.target.value)
              }}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm mb-4"
            >
              {properties.length === 0 && <option value="">Select an address</option>}
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.label ? `${p.label} — ${p.address}` : p.address}</option>
              ))}
              <option value="__add_address__">+ Add new address</option>
            </select>
          ) : (
            <div className="border border-gray-200 rounded-lg p-3 mb-4 space-y-2">
              <AddressAutocomplete value={newAddress} onChange={setNewAddress} placeholder="Street, city, state, ZIP" />
              <input
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value)}
                placeholder="Apt / unit (optional)"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              {addressError && <p className="text-red-600 text-xs">{addressError}</p>}
              <div className="flex gap-2">
                <button type="button" onClick={addAddress} disabled={savingAddress} className="flex-1 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                  {savingAddress ? 'Saving…' : 'Save address'}
                </button>
                <button type="button" onClick={() => { setAddingAddress(false); setNewAddress(''); setNewUnit(''); setAddressError('') }} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm">
                  Cancel
                </button>
              </div>
            </div>
          )}
          <label className="block text-sm font-medium text-slate-600 mb-1">Frequency</label>
          <select
            value={recurring}
            onChange={(e) => setRecurring(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm mb-1"
          >
            <option value="none">One-time</option>
            <option value="weekly">Weekly — save 20%</option>
            <option value="biweekly">Bi-weekly — save 10%</option>
            <option value="monthly">Monthly — save 10%</option>
          </select>
          {recurring !== 'none' && (
            <p className="text-xs text-emerald-600 mb-4">
              Recurring discount applied — {recurring === 'weekly' ? '20%' : '10%'} off every visit.
            </p>
          )}
          <textarea
            placeholder="Any notes or special instructions?"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm mb-4"
          />
          <div className="flex gap-2">
            <button onClick={() => setStep(1)} className="flex-1 py-3 text-sm border border-gray-300 rounded-lg">Back</button>
            <button onClick={() => dateTime && setStep(3)} disabled={!dateTime} className="flex-1 bg-slate-800 text-white py-3 rounded-lg text-sm font-medium disabled:opacity-50">Review</button>
          </div>
        </div>
      )}

      {step === 3 && selectedService && (
        <div>
          <h2 className="font-semibold text-slate-800 mb-4">Confirm Booking</h2>
          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3 mb-6">
            <div className="flex justify-between text-sm"><span className="text-slate-400">Service</span><span className="font-medium">{selectedService.name}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-400">Date</span><span>{new Date(dateTime).toLocaleString()}</span></div>
            {properties.length > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Address</span>
                <span className="text-right">{properties.find((p) => p.id === propertyId)?.address || '—'}</span>
              </div>
            )}
            <div className="flex justify-between text-sm"><span className="text-slate-400">Duration</span><span>{selectedService.default_duration_hours} hours</span></div>
            {(() => {
              const base = selectedService.default_hourly_rate * selectedService.default_duration_hours
              const pct = recurringDiscountPct(recurring)
              const net = Math.round(base * (1 - pct))
              return (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Est. Price</span>
                  <span className="font-medium">
                    {pct > 0 ? (<><span className="line-through text-slate-400 mr-1">${base}</span>${net} <span className="text-emerald-600">({pct * 100}% off)</span></>) : (<>${base}</>)}
                  </span>
                </div>
              )
            })()}
            {recurring !== 'none' && <div className="flex justify-between text-sm"><span className="text-slate-400">Frequency</span><span className="capitalize">{recurring}</span></div>}
            {notes && <div className="text-sm"><span className="text-slate-400">Notes: </span>{notes}</div>}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setStep(2)} className="flex-1 py-3 text-sm border border-gray-300 rounded-lg">Back</button>
            <button onClick={submit} disabled={loading} className="flex-1 bg-slate-800 text-white py-3 rounded-lg text-sm font-medium disabled:opacity-50">
              {loading ? 'Booking...' : 'Confirm Booking'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
