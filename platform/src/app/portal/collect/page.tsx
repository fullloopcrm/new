'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import AddressAutocomplete from '@/components/address-autocomplete'
import { validateEmail } from '@/lib/validate-email'
import { useFormTracking } from '@/lib/useFormTracking'

interface TenantLite {
  name: string
  primary_color?: string | null
  domain?: string | null
  privacy_url?: string | null
  terms_url?: string | null
}

function CollectFormContent({ tenant }: { tenant: TenantLite }) {
  useEffect(() => { document.title = `Complete Your Booking | ${tenant.name}` }, [tenant.name])
  const searchParams = useSearchParams()
  const srcDomain = searchParams.get('src') || ''
  const convoId = searchParams.get('convo_id') || ''
  const { trackStart, trackSuccess } = useFormTracking('/portal/collect')

  const [form, setForm] = useState({
    name: '', email: '', phone: '', address: '', apt: '',
    referrer_name: '', referrer_phone: '', pet_name: '', pet_type: '',
  })
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [emailSuggestion, setEmailSuggestion] = useState('')

  const primary = tenant.primary_color || '#1E2A4A'

  const formatPhone = (value: string) => {
    const cleaned = value.replace(/\D/g, '')
    if (cleaned.length <= 3) return cleaned
    if (cleaned.length <= 6) return '(' + cleaned.slice(0, 3) + ') ' + cleaned.slice(3)
    return '(' + cleaned.slice(0, 3) + ') ' + cleaned.slice(3, 6) + '-' + cleaned.slice(6, 10)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (form.email) {
      const emailCheck = validateEmail(form.email)
      if (!emailCheck.valid) {
        if (emailCheck.suggestion) {
          setEmailSuggestion(emailCheck.suggestion)
          setError(`Did you mean ${emailCheck.suggestion}?`)
        } else {
          setError(emailCheck.error || 'Please enter a valid email')
        }
        setLoading(false)
        return
      }
    }

    const fullAddress = form.apt ? `${form.address}, ${form.apt}` : form.address

    try {
      const res = await fetch('/api/portal/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          address: fullAddress,
          referrer_name: form.referrer_name || null,
          referrer_phone: form.referrer_phone || null,
          pet_name: form.pet_name || null,
          pet_type: form.pet_type || null,
          src: srcDomain || null,
          convo_id: convoId || null,
        }),
      })

      if (res.ok) {
        trackSuccess()
        setDone(true)
      } else {
        const data = await res.json()
        setError(data.error || 'Something went wrong.')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    }
    setLoading(false)
  }

  if (done) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <div className="px-6 py-4" style={{ backgroundColor: primary }}>
          <h1 className="text-white text-xl font-bold">{tenant.name}</h1>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-sm">
            <div className="text-5xl mb-4">&#10003;</div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: primary }}>All set!</h2>
            <p className="text-gray-600">
              {convoId
                ? `Thanks, ${form.name.split(' ')[0]}! Your request is submitted. We'll confirm shortly.`
                : `Thanks, ${form.name.split(' ')[0]}. We have your info and will be in touch.`}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-6 py-4" style={{ backgroundColor: primary }}>
        <h1 className="text-white text-xl font-bold">{tenant.name}</h1>
        <p className="text-gray-400 text-sm">New Client Info</p>
      </div>

      {convoId && (
        <div className="border-b px-6 py-3" style={{ backgroundColor: `${primary}12`, borderColor: `${primary}33` }}>
          <p className="text-sm font-medium text-center" style={{ color: primary }}>Almost done! Fill in your info below to complete your booking.</p>
        </div>
      )}

      <div className="max-w-lg mx-auto p-4 pt-6">
        <form onSubmit={handleSubmit} onFocusCapture={trackStart} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <h2 className="text-xl font-bold" style={{ color: primary }}>Your Information</h2>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: primary }}>Full Name *</label>
            <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base" style={{ color: primary }} placeholder="John Smith" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: primary }}>Email</label>
            <input type="email" value={form.email}
              onChange={(e) => { setForm({ ...form, email: e.target.value }); setEmailSuggestion('') }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base" style={{ color: primary }} placeholder="john@example.com" />
            {emailSuggestion && (
              <button type="button" onClick={() => { setForm({ ...form, email: emailSuggestion }); setEmailSuggestion(''); setError('') }}
                className="mt-1 text-sm hover:underline" style={{ color: primary }}>
                Use {emailSuggestion}?
              </button>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: primary }}>Phone *</label>
            <input type="tel" required value={form.phone}
              onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base" style={{ color: primary }} placeholder="(212) 555-1234" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: primary }}>Address *</label>
            <AddressAutocomplete value={form.address} onChange={(val) => setForm({ ...form, address: val })}
              placeholder="Start typing address..." className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: primary }}>Apt / Unit</label>
            <input type="text" value={form.apt} onChange={(e) => setForm({ ...form, apt: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base" style={{ color: primary }} placeholder="Apt 4B" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: primary }}>Have a pet? <span className="text-gray-400 font-normal">(optional)</span></label>
            <div className="grid grid-cols-2 gap-3">
              <input type="text" value={form.pet_name} onChange={(e) => setForm({ ...form, pet_name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base" style={{ color: primary }} placeholder="Pet's name" />
              <select value={form.pet_type} onChange={(e) => setForm({ ...form, pet_type: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base" style={{ color: primary }}>
                <option value="">Type</option>
                <option value="dog">Dog</option>
                <option value="cat">Cat</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-5">
            <label className="block text-sm font-medium mb-2" style={{ color: primary }}>Referred by someone? <span className="text-gray-400 font-normal">(optional)</span></label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input type="text" value={form.referrer_name} onChange={(e) => setForm({ ...form, referrer_name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base" style={{ color: primary }} placeholder="Their name" />
              <input type="tel" value={form.referrer_phone} onChange={(e) => setForm({ ...form, referrer_phone: formatPhone(e.target.value) })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base" style={{ color: primary }} placeholder="Their phone" />
            </div>
          </div>

          {error && (<p className="text-red-600 text-sm bg-red-50 px-4 py-3 rounded-lg">{error}</p>)}

          <div className="my-5 p-4 border border-gray-200 rounded-lg bg-gray-50">
            <label className="flex items-start gap-3 cursor-pointer text-[13px] leading-relaxed text-gray-600">
              <input type="checkbox" name="sms_consent" required className="mt-1 min-w-[18px] min-h-[18px]" />
              <span>By checking this box, I consent to receive transactional text messages from <strong>{tenant.name}</strong> for appointment confirmations, reminders, and support. Reply STOP to opt out. Reply HELP for help. Msg frequency may vary. Msg &amp; data rates may apply.</span>
            </label>
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-4 text-white rounded-lg text-lg font-semibold disabled:opacity-50"
            style={{ backgroundColor: primary }}>
            {loading ? 'Submitting...' : 'Submit'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function CollectInfoPage() {
  // Tenant context comes from middleware — render skeleton until mount
  const [tenant, setTenant] = useState<TenantLite | null>(null)
  useEffect(() => {
    fetch('/api/tenant/public').then(r => r.ok ? r.json() : null).then(t => { if (t) setTenant(t) }).catch(() => {})
  }, [])

  if (!tenant) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-500">Loading...</p></div>
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-500">Loading...</p></div>}>
      <CollectFormContent tenant={tenant} />
    </Suspense>
  )
}
