'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePortalAuth } from '../layout'

type ServiceType = {
  id: string
  name: string
  description: string | null
  default_duration_hours: number
  default_hourly_rate: number
}

export default function BookingWizardPage() {
  const { auth } = usePortalAuth()
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [services, setServices] = useState<ServiceType[]>([])
  const [selectedService, setSelectedService] = useState<ServiceType | null>(null)
  const [dateTime, setDateTime] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!auth) { router.push('/portal/login'); return }
    fetch('/api/portal/services', {
      headers: { Authorization: `Bearer ${auth.token}` },
    })
      .then((r) => r.json())
      .then((data) => setServices((data.services || []).filter((s: ServiceType & { active: boolean }) => s.active)))
      .catch(() => {})
  }, [auth, router])

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
      <h1 className="text-xl font-bold text-gray-900 mb-6">Book an Appointment</h1>

      {/* Progress */}
      <div className="flex gap-1 mb-6">
        {[1, 2, 3].map((s) => (
          <div key={s} className={`flex-1 h-1.5 rounded-full ${s <= step ? 'bg-gray-900' : 'bg-gray-200'}`} />
        ))}
      </div>

      {step === 1 && (
        <div>
          <h2 className="font-semibold text-gray-900 mb-4">Select a Service</h2>
          <div className="space-y-2">
            {services.map((s) => (
              <button
                key={s.id}
                onClick={() => { setSelectedService(s); setStep(2) }}
                className={`w-full text-left bg-white border rounded-xl p-4 transition-colors ${
                  selectedService?.id === s.id ? 'border-gray-900' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="font-medium text-sm">{s.name}</p>
                {s.description && <p className="text-xs text-gray-400 mt-1">{s.description}</p>}
                <p className="text-xs text-gray-500 mt-1">{s.default_duration_hours}hr &middot; ${s.default_hourly_rate}/hr</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && selectedService && (
        <div>
          <h2 className="font-semibold text-gray-900 mb-4">Choose Date & Time</h2>
          <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
            <p className="text-sm text-gray-400 mb-1">Selected</p>
            <p className="font-medium text-sm">{selectedService.name}</p>
            <p className="text-xs text-gray-500">{selectedService.default_duration_hours}hr &middot; ~${selectedService.default_hourly_rate * selectedService.default_duration_hours}</p>
          </div>
          <input
            type="datetime-local"
            value={dateTime}
            onChange={(e) => setDateTime(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm mb-4"
          />
          <textarea
            placeholder="Any notes or special instructions?"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm mb-4"
          />
          <div className="flex gap-2">
            <button onClick={() => setStep(1)} className="flex-1 py-3 text-sm border border-gray-300 rounded-lg">Back</button>
            <button onClick={() => dateTime && setStep(3)} disabled={!dateTime} className="flex-1 bg-gray-900 text-white py-3 rounded-lg text-sm font-medium disabled:opacity-50">Review</button>
          </div>
        </div>
      )}

      {step === 3 && selectedService && (
        <div>
          <h2 className="font-semibold text-gray-900 mb-4">Confirm Booking</h2>
          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3 mb-6">
            <div className="flex justify-between text-sm"><span className="text-gray-400">Service</span><span className="font-medium">{selectedService.name}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-400">Date</span><span>{new Date(dateTime).toLocaleString()}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-400">Duration</span><span>{selectedService.default_duration_hours} hours</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-400">Est. Price</span><span className="font-medium">${selectedService.default_hourly_rate * selectedService.default_duration_hours}</span></div>
            {notes && <div className="text-sm"><span className="text-gray-400">Notes: </span>{notes}</div>}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setStep(2)} className="flex-1 py-3 text-sm border border-gray-300 rounded-lg">Back</button>
            <button onClick={submit} disabled={loading} className="flex-1 bg-gray-900 text-white py-3 rounded-lg text-sm font-medium disabled:opacity-50">
              {loading ? 'Booking...' : 'Confirm Booking'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
