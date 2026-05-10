// @ts-nocheck
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import SelfieVerification from '@/app/site/nyc-classifieds/_components/SelfieVerification'
import { boroughs, businessCategories } from '@/app/site/nyc-classifieds/_lib/data'

type Step = 'email' | 'otp' | 'type' | 'name' | 'business' | 'pin' | 'address' | 'selfie' | 'done'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

type Hours = Record<string, { open: string; close: string; closed: boolean }>

function defaultHours(): Hours {
  const h: Hours = {}
  for (const d of DAYS) {
    h[d] = { open: '09:00', close: '17:00', closed: d === 'Sun' }
  }
  return h
}

const allNeighborhoods = boroughs.flatMap(b =>
  b.neighborhoods.map(n => ({ label: `${n}, ${b.name}`, value: n }))
)

export default function SignupClient() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [emailToken, setEmailToken] = useState('')
  const [accountType, setAccountType] = useState<'personal' | 'business'>('personal')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  // Business fields
  const [businessName, setBusinessName] = useState('')
  const [businessCategory, setBusinessCategory] = useState('')
  const [website, setWebsite] = useState('')
  const [phone, setPhone] = useState('')
  const [businessDesc, setBusinessDesc] = useState('')
  const [hours, setHours] = useState<Hours>(defaultHours)
  const [serviceArea, setServiceArea] = useState<string[]>([])
  const [areaSearch, setAreaSearch] = useState('')
  // Auth fields
  const [pin, setPin] = useState('')
  const [pinConfirm, setPinConfirm] = useState('')
  const [address, setAddress] = useState('')
  const [addressSuggestions, setAddressSuggestions] = useState<{ display_name: string; lat: number; lng: number }[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [addressSelected, setAddressSelected] = useState(false)
  const addressRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [noResults, setNoResults] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Signup funnel tracking
  const [sessionId] = useState(() => crypto.randomUUID())
  const trackEvent = useCallback((trackStep: string, trackStatus: string, trackError?: string, metadata?: Record<string, unknown>) => {
    fetch('/api/signup-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, step: trackStep, status: trackStatus, error: trackError, metadata }),
    }).catch(() => {})
  }, [sessionId])

  const isBusiness = accountType === 'business'

  // Track step changes
  useEffect(() => {
    trackEvent(step, 'started')
  }, [step, trackEvent])

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (addressRef.current && !addressRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const fetchSuggestions = useCallback((query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.length < 3) {
      setAddressSuggestions([])
      setShowSuggestions(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`)
        if (res.ok) {
          const data = await res.json()
          setAddressSuggestions(data)
          setShowSuggestions(data.length > 0)
          setNoResults(data.length === 0 && query.length >= 5)
        }
      } catch {}
    }, 350)
  }, [])

  // ── API helper (only for OTP send/verify) ──
  const api = async (body: Record<string, unknown>) => {
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      return data
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Something went wrong'
      setError(msg)
      return null
    } finally {
      setLoading(false)
    }
  }

  const handleSendOtp = async () => {
    const data = await api({ action: 'send-otp', email })
    if (data?.sent) {
      trackEvent('email', 'completed')
      setStep('otp')
    } else {
      trackEvent('email', 'failed', error || 'send failed')
    }
  }

  const handleVerifyOtp = async () => {
    const data = await api({ action: 'verify-otp', email, code: otp })
    if (data?.verified) {
      trackEvent('otp', 'completed')
      if (data.hasPin) {
        // Existing user — already logged in via cookie
        window.location.href = '/account'
      } else {
        // New signup — store token, continue flow (nothing saved to DB yet)
        setEmailToken(data.emailToken)
        setStep('type')
      }
    } else {
      trackEvent('otp', 'failed', error || 'verification failed')
    }
  }

  // ── Steps 3-7: all client-side only, no API calls ──

  const handleSetType = (type: 'personal' | 'business') => {
    trackEvent('type', 'completed', undefined, { account_type: type })
    setAccountType(type)
    setStep('name')
  }

  const handleSetName = () => {
    if (!firstName.trim() || !lastName.trim()) {
      setError('First and last name required')
      trackEvent('name', 'failed', 'validation')
      return
    }
    trackEvent('name', 'completed')
    setError('')
    setStep(isBusiness ? 'business' : 'pin')
  }

  const handleSetBusiness = () => {
    if (!businessName.trim()) { setError('Business name required'); trackEvent('business', 'failed', 'Business name required'); return }
    if (!businessCategory) { setError('Pick a category'); trackEvent('business', 'failed', 'Pick a category'); return }
    trackEvent('business', 'completed')
    setError('')
    setStep('pin')
  }

  const handleSetPin = () => {
    if (pin !== pinConfirm) { setError('PINs do not match'); trackEvent('pin', 'failed', 'PINs do not match'); return }
    if (!/^\d{4,10}$/.test(pin)) { setError('PIN must be 4\u201310 digits'); trackEvent('pin', 'failed', 'Invalid PIN format'); return }
    trackEvent('pin', 'completed')
    setError('')
    setStep('address')
  }

  const handleSetAddress = () => {
    if (!address.trim()) { setError('Enter your address'); trackEvent('address', 'failed', 'Empty address'); return }
    if (!addressSelected || !coords) {
      setError('Please select an address from the suggestions')
      trackEvent('address', 'failed', 'No autocomplete selection')
      return
    }
    trackEvent('address', 'completed')
    setStep('selfie')
  }

  // ── Final step: selfie captured → send EVERYTHING to server at once ──
  const handleCompleteSignup = async (blob: Blob, geoCoords: { lat: number; lon: number }) => {
    if (!coords) throw new Error('Address coordinates missing')

    const formData = new FormData()
    // Auth
    formData.append('email', email)
    formData.append('emailToken', emailToken)
    // User
    formData.append('name', `${firstName.trim()} ${lastName.trim()}`.trim())
    formData.append('pin', pin)
    formData.append('accountType', accountType)
    formData.append('address', address)
    formData.append('addressLat', String(coords.lat))
    formData.append('addressLng', String(coords.lng))
    // Selfie + geo
    formData.append('selfie', blob, 'selfie.jpg')
    formData.append('geoLat', String(geoCoords.lat))
    formData.append('geoLon', String(geoCoords.lon))
    // Business (optional)
    if (isBusiness) {
      formData.append('businessName', businessName)
      formData.append('businessCategory', businessCategory)
      if (website) formData.append('website', website)
      if (phone) formData.append('phone', phone)
      if (businessDesc) formData.append('businessDesc', businessDesc)
      formData.append('hours', JSON.stringify(hours))
      formData.append('serviceArea', JSON.stringify(serviceArea))
    }

    const res = await fetch('/api/auth/complete-signup', {
      method: 'POST',
      body: formData,
    })
    const data = await res.json()
    if (!res.ok) {
      trackEvent('selfie', 'failed', data.error || 'Signup failed')
      throw new Error(data.error || 'Signup failed')
    }
    trackEvent('selfie', 'completed')
  }

  const handleVerified = () => {
    trackEvent('done', 'completed')
    setStep('done')
    setTimeout(() => { window.location.href = '/account' }, 2000)
  }

  const toggleArea = (n: string) => {
    setServiceArea(prev => prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n])
  }

  const updateHour = (day: string, field: 'open' | 'close' | 'closed', val: string | boolean) => {
    setHours(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: val },
    }))
  }

  const filteredNeighborhoods = areaSearch
    ? allNeighborhoods.filter(n => n.label.toLowerCase().includes(areaSearch.toLowerCase()))
    : allNeighborhoods

  const SupportFooter = () => (
    <div style={supportFooterStyle}>
      <p style={{ margin: 0, fontWeight: 600, color: '#475569' }}>Real people, real support</p>
      <p style={{ margin: '0.375rem 0 0' }}>
        Call or text us:{' '}
        <a href="tel:2122029220" style={{ color: '#2563eb', fontWeight: 600 }}>212.202.9220</a>
      </p>
      <p style={{ margin: '0.25rem 0 0' }}>
        <a href="/feedback" style={{ color: '#2563eb', fontWeight: 500 }}>Send feedback</a>
        {' '}&middot;{' '}Or use the chat bubble in the bottom right
      </p>
    </div>
  )

  // Dynamic progress steps
  const visibleSteps: Step[] = isBusiness
    ? ['email', 'otp', 'type', 'name', 'business', 'pin', 'address', 'selfie']
    : ['email', 'otp', 'type', 'name', 'pin', 'address', 'selfie']

  const stepLabels: Record<Step, string> = {
    email: 'Email', otp: 'Verify', type: 'Type', name: 'Name',
    business: 'Business', pin: 'PIN', address: 'Address', selfie: 'Selfie', done: 'Done',
  }

  const currentIdx = visibleSteps.indexOf(step)

  const goBack = () => {
    setError('')
    if (currentIdx > 0) setStep(visibleSteps[currentIdx - 1])
  }

  return (
    <main style={{ maxWidth: '480px', margin: '0 auto', padding: '1.5rem', minHeight: 'calc(100vh - 56px)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      {/* Progress */}
      {step !== 'done' && (
        <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '2rem' }}>
          {visibleSteps.map((s, i) => (
            <div key={s} style={{ flex: 1 }}>
              <div style={{
                height: '4px', borderRadius: '2px',
                backgroundColor: i <= currentIdx ? '#2563eb' : '#e2e8f0',
                transition: 'background-color 0.2s',
              }} />
              <div style={{
                fontSize: '0.7rem',
                color: i <= currentIdx ? '#2563eb' : '#94a3b8',
                marginTop: '0.25rem', textAlign: 'center',
              }}>
                {stepLabels[s]}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Email ── */}
      {step === 'email' && (
        <div>
          <h1 style={h1Style}>Create your account</h1>
          <p style={descStyle}>Enter your email to get started.</p>
          <div style={{
            backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '0.5rem',
            padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.8125rem', color: '#1e40af', lineHeight: 1.5,
          }}>
            You&apos;ll need camera access and location services enabled to complete signup. Works on phone or laptop.
          </div>
          <input type="email" placeholder="you@example.com" value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
            style={inputStyle} />
          {error && <p style={errorStyle}>{error}</p>}
          <button onClick={handleSendOtp} disabled={loading || !email} style={btnStyle}>
            {loading ? 'Sending...' : 'Send Verification Code'}
          </button>
          <p style={{ textAlign: 'center', marginTop: '1rem', color: '#64748b', fontSize: '0.875rem' }}>
            Already have an account? <a href="/login" style={{ color: '#2563eb', fontWeight: 500 }}>Log in</a>
          </p>
          <SupportFooter />
        </div>
      )}

      {/* ── OTP ── */}
      {step === 'otp' && (
        <div>
          <h1 style={h1Style}>Check your email</h1>
          <p style={descStyle}>We sent a 6-digit code to <strong>{email}</strong></p>
          <input type="text" inputMode="numeric" maxLength={6} placeholder="000000" value={otp}
            onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
            onKeyDown={e => e.key === 'Enter' && handleVerifyOtp()}
            style={{ ...inputStyle, textAlign: 'center', letterSpacing: '0.25em', fontSize: '1.5rem' }} />
          {error && <p style={errorStyle}>{error}</p>}
          <button onClick={handleVerifyOtp} disabled={loading || otp.length !== 6} style={btnStyle}>
            {loading ? 'Verifying...' : 'Verify Code'}
          </button>
          <button onClick={() => { setOtp(''); handleSendOtp() }} style={linkBtnStyle}>Resend code</button>
          <button onClick={goBack} style={backBtnStyle}>Back</button>
          <SupportFooter />
        </div>
      )}

      {/* ── Account Type ── */}
      {step === 'type' && (
        <div>
          <h1 style={h1Style}>Are you a person or a business?</h1>
          <p style={descStyle}>Businesses get a free profile page to promote to the neighborhood.</p>
          <button onClick={() => handleSetType('personal')} style={{ ...typeCardStyle, borderColor: '#e2e8f0' }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem' }}>Person</div>
            <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
              Post listings, message sellers, join the community.
            </div>
          </button>
          <button onClick={() => handleSetType('business')}
            style={{ ...typeCardStyle, borderColor: '#2563eb', backgroundColor: '#eff6ff' }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem' }}>Business</div>
            <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
              Get a free business profile page with your website, hours, photos, and services — visible to all NYC users. Required to post in Services.
            </div>
          </button>
          {error && <p style={errorStyle}>{error}</p>}
          <button onClick={goBack} style={backBtnStyle}>Back</button>
          <SupportFooter />
        </div>
      )}

      {/* ── Name ── */}
      {step === 'name' && (
        <div>
          <h1 style={h1Style}>{isBusiness ? 'Your name' : 'What\u2019s your name?'}</h1>
          <p style={descStyle}>{isBusiness ? 'The contact person for this business.' : 'Your full name is shown on your profile and listings. Use your real name \u2014 we do random verification checks.'}</p>
          <input type="text" placeholder="First name" value={firstName}
            onChange={e => setFirstName(e.target.value)}
            style={{ ...inputStyle, marginBottom: '0.75rem' }} />
          <input type="text" placeholder="Last name" value={lastName}
            onChange={e => setLastName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSetName()}
            style={inputStyle} />
          {error && <p style={errorStyle}>{error}</p>}
          <button onClick={handleSetName} disabled={!firstName.trim() || !lastName.trim()} style={btnStyle}>
            Continue
          </button>
          <button onClick={goBack} style={backBtnStyle}>Back</button>
          <SupportFooter />
        </div>
      )}

      {/* ── Business Details ── */}
      {step === 'business' && (
        <div>
          <h1 style={h1Style}>Your business profile</h1>
          <p style={descStyle}>This becomes your free business page on NYC Classifieds. Promote to your whole neighborhood.</p>

          <label style={labelStyle}>Business name *</label>
          <input type="text" placeholder="Joe's Plumbing" value={businessName}
            onChange={e => setBusinessName(e.target.value)} style={inputStyle} />

          <label style={labelStyle}>Category *</label>
          <select value={businessCategory} onChange={e => setBusinessCategory(e.target.value)}
            style={{ ...inputStyle, backgroundColor: '#fff' }}>
            <option value="">Select a category...</option>
            {businessCategories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <label style={labelStyle}>Tell NYC about your business</label>
          <textarea placeholder="What do you do? What makes you different?" value={businessDesc}
            onChange={e => setBusinessDesc(e.target.value)} rows={3}
            style={{ ...inputStyle, resize: 'vertical' }} />

          <label style={labelStyle}>Website</label>
          <input type="url" placeholder="https://yourbusiness.com" value={website}
            onChange={e => setWebsite(e.target.value)} style={inputStyle} />

          <label style={labelStyle}>Phone number</label>
          <input type="tel" placeholder="(212) 555-1234" value={phone}
            onChange={e => setPhone(e.target.value)} style={inputStyle} />

          <label style={labelStyle}>Hours of operation</label>
          <div style={{ marginBottom: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', overflow: 'hidden' }}>
            {DAYS.map(day => (
              <div key={day} style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.5rem 0.75rem',
                borderBottom: day !== 'Sun' ? '1px solid #f1f5f9' : 'none',
                backgroundColor: hours[day].closed ? '#f8fafc' : '#fff',
              }}>
                <span style={{ width: '2.5rem', fontSize: '0.8125rem', fontWeight: 600, color: '#374151' }}>{day}</span>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: '#64748b', cursor: 'pointer' }}>
                  <input type="checkbox" checked={hours[day].closed}
                    onChange={e => updateHour(day, 'closed', e.target.checked)} />
                  Closed
                </label>
                {!hours[day].closed && (
                  <>
                    <input type="time" value={hours[day].open}
                      onChange={e => updateHour(day, 'open', e.target.value)}
                      style={timeInputStyle} />
                    <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>to</span>
                    <input type="time" value={hours[day].close}
                      onChange={e => updateHour(day, 'close', e.target.value)}
                      style={timeInputStyle} />
                  </>
                )}
              </div>
            ))}
          </div>

          <label style={labelStyle}>Service area — which neighborhoods do you serve?</label>
          <input type="text" placeholder="Search neighborhoods..." value={areaSearch}
            onChange={e => setAreaSearch(e.target.value)}
            style={{ ...inputStyle, marginBottom: '0.5rem' }} />
          {serviceArea.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '0.5rem' }}>
              {serviceArea.map(n => (
                <span key={n} onClick={() => toggleArea(n)} style={{
                  padding: '0.25rem 0.5rem', borderRadius: '1rem', fontSize: '0.75rem',
                  backgroundColor: '#2563eb', color: '#fff', cursor: 'pointer', fontWeight: 500,
                }}>
                  {n} &times;
                </span>
              ))}
            </div>
          )}
          <div style={{
            maxHeight: '160px', overflowY: 'auto', border: '1px solid #e2e8f0',
            borderRadius: '0.5rem', marginBottom: '1rem',
          }}>
            {filteredNeighborhoods.map(n => (
              <div key={n.label} onClick={() => toggleArea(n.value)} style={{
                padding: '0.375rem 0.75rem', fontSize: '0.8125rem', cursor: 'pointer',
                backgroundColor: serviceArea.includes(n.value) ? '#eff6ff' : '#fff',
                color: serviceArea.includes(n.value) ? '#2563eb' : '#374151',
                borderBottom: '1px solid #f1f5f9',
              }}>
                {n.label}
              </div>
            ))}
          </div>

          {error && <p style={errorStyle}>{error}</p>}
          <button onClick={handleSetBusiness} disabled={!businessName.trim() || !businessCategory} style={btnStyle}>
            Continue
          </button>
          <p style={{ fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center', marginTop: '0.75rem' }}>
            You can add photos after signup from your profile.
          </p>
          <button onClick={goBack} style={backBtnStyle}>Back</button>
          <SupportFooter />
        </div>
      )}

      {/* ── PIN ── */}
      {step === 'pin' && (
        <div>
          <h1 style={h1Style}>Set a PIN</h1>
          <p style={descStyle}>Choose 4–10 digits. You&apos;ll use this to log in quickly.</p>
          <input type="password" inputMode="numeric" maxLength={10} placeholder="PIN (4–10 digits)" value={pin}
            onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
            style={{ ...inputStyle, marginBottom: '0.75rem' }} />
          <input type="password" inputMode="numeric" maxLength={10} placeholder="Confirm PIN" value={pinConfirm}
            onChange={e => setPinConfirm(e.target.value.replace(/\D/g, ''))}
            onKeyDown={e => e.key === 'Enter' && handleSetPin()}
            style={inputStyle} />
          {error && <p style={errorStyle}>{error}</p>}
          <button onClick={handleSetPin} disabled={pin.length < 4} style={btnStyle}>
            Set PIN
          </button>
          <button onClick={goBack} style={backBtnStyle}>Back</button>
          <SupportFooter />
        </div>
      )}

      {/* ── Address ── */}
      {step === 'address' && (
        <div>
          <h1 style={h1Style}>{isBusiness ? 'Business address' : 'Your NYC address'}</h1>
          <p style={descStyle}>
            {isBusiness
              ? 'We verify your business is at this location. Your neighborhood is shown publicly.'
              : 'We verify you live in NYC. Only your neighborhood is shown — your exact address stays private.'}
          </p>
          <div style={{
            backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '0.5rem',
            padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.8125rem', color: '#1e40af', lineHeight: 1.5,
          }}>
            <strong>Tip:</strong> Type your NYC address and select from the dropdown. You&apos;ll need to take a selfie at this location next.
            <br />e.g., 150 W 47th St, Manhattan
          </div>
          <div ref={addressRef} style={{ position: 'relative' }}>
            <input type="text" placeholder="e.g. 150 W 47th St, New York"
              autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
              value={address}
              onChange={e => {
                setAddress(e.target.value)
                setAddressSelected(false)
                setCoords(null)
                setError('')
                setNoResults(false)
                fetchSuggestions(e.target.value)
              }}
              onFocus={() => { if (addressSuggestions.length > 0) setShowSuggestions(true) }}
              onKeyDown={e => e.key === 'Enter' && handleSetAddress()}
              style={inputStyle} />
            {showSuggestions && addressSuggestions.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '-0.75rem',
                backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '0.5rem',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10, maxHeight: '200px', overflowY: 'auto',
              }}>
                {addressSuggestions.map((s, i) => (
                  <div key={i} onClick={() => {
                    setAddress(s.display_name)
                    setCoords({ lat: s.lat, lng: s.lng })
                    setAddressSelected(true)
                    setShowSuggestions(false)
                    setError('')
                  }} style={{
                    padding: '0.625rem 0.75rem', fontSize: '0.875rem', cursor: 'pointer',
                    borderBottom: i < addressSuggestions.length - 1 ? '1px solid #f1f5f9' : 'none',
                    color: '#1f2937',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f0f9ff')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#fff')}>
                    {s.display_name}
                  </div>
                ))}
              </div>
            )}
          </div>
          {addressSelected && (
            <p style={{ fontSize: '0.8125rem', color: '#16a34a', marginTop: '-0.5rem', marginBottom: '0.75rem' }}>
              &#10003; Address selected
            </p>
          )}
          {noResults && !addressSelected && (
            <p style={{ fontSize: '0.8125rem', color: '#ea580c', marginTop: '-0.5rem', marginBottom: '0.75rem' }}>
              No results found. Try including your street number and borough.
            </p>
          )}
          {error && <p style={errorStyle}>{error}</p>}
          <button onClick={handleSetAddress} disabled={!addressSelected || !coords} style={btnStyle}>
            Continue
          </button>
          <button onClick={goBack} style={backBtnStyle}>Back</button>
          <SupportFooter />
        </div>
      )}

      {/* ── Selfie ── */}
      {step === 'selfie' && coords && (
        <div>
          <h1 style={h1Style}>{isBusiness ? 'Verify your location' : 'Take a selfie'}</h1>
          <p style={descStyle}>
            {isBusiness
              ? <>Take a photo at your business. This becomes your profile photo. You must be at <strong>{address}</strong> right now.</>
              : <>This becomes your profile photo. You must be at <strong>{address}</strong> right now — we verify your exact location.</>}
          </p>
          <div style={{
            backgroundColor: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '0.5rem',
            padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.8125rem', color: '#92400e', lineHeight: 1.5,
          }}>
            Make sure location services are on and you&apos;re at your address. Your phone&apos;s GPS location must match the address you entered.
          </div>
          <SelfieVerification onVerified={handleVerified} onSubmit={handleCompleteSignup} />
          <button onClick={goBack} style={backBtnStyle}>Back</button>
          <SupportFooter />
        </div>
      )}

      {/* ── Done ── */}
      {step === 'done' && (
        <div style={{ textAlign: 'center', padding: '3rem 0' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>&#10003;</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#16a34a', marginBottom: '0.5rem' }}>
            You&apos;re verified!
          </h1>
          <p style={{ color: '#64748b' }}>
            {isBusiness
              ? 'Your business profile is live. Redirecting...'
              : 'Redirecting you to the homepage...'}
          </p>
        </div>
      )}
    </main>
  )
}

const h1Style: React.CSSProperties = { fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }
const descStyle: React.CSSProperties = { color: '#64748b', marginBottom: '1.5rem' }
const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '0.375rem' }

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.75rem 1rem', borderRadius: '0.5rem',
  border: '1px solid #e2e8f0', fontSize: '1rem', outline: 'none',
  marginBottom: '1rem', fontFamily: "'DM Sans', sans-serif",
}

const timeInputStyle: React.CSSProperties = {
  padding: '0.25rem 0.375rem', borderRadius: '0.25rem', border: '1px solid #e2e8f0',
  fontSize: '0.8125rem', outline: 'none', fontFamily: "'DM Sans', sans-serif",
}

const btnStyle: React.CSSProperties = {
  width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: 'none',
  backgroundColor: '#2563eb', color: '#fff', fontSize: '1rem', fontWeight: 600, cursor: 'pointer',
}

const errorStyle: React.CSSProperties = { color: '#dc2626', fontSize: '0.875rem', marginBottom: '0.75rem' }

const linkBtnStyle: React.CSSProperties = {
  display: 'block', width: '100%', textAlign: 'center', background: 'none',
  border: 'none', color: '#2563eb', fontSize: '0.875rem', cursor: 'pointer',
  marginTop: '0.75rem', padding: '0.5rem',
}

const backBtnStyle: React.CSSProperties = {
  display: 'block', width: '100%', textAlign: 'center', background: 'none',
  border: 'none', color: '#64748b', fontSize: '0.875rem', cursor: 'pointer',
  marginTop: '0.75rem', padding: '0.5rem',
}

const supportFooterStyle: React.CSSProperties = {
  marginTop: '1.5rem', padding: '0.75rem 1rem', borderRadius: '0.5rem',
  backgroundColor: '#f8fafc', border: '1px solid #e2e8f0',
  fontSize: '0.8125rem', color: '#64748b', lineHeight: 1.6, textAlign: 'center',
}

const typeCardStyle: React.CSSProperties = {
  width: '100%', padding: '1.25rem', borderRadius: '0.75rem', border: '2px solid',
  backgroundColor: '#fff', cursor: 'pointer', textAlign: 'left', marginBottom: '0.75rem',
}
