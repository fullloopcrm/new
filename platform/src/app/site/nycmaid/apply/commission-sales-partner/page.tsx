'use client'
import { useState, useRef } from 'react'
import { validateEmail } from '@/lib/validate-email'

const SEGMENTS = [
  'Homeowners',
  'Commercial (offices, gyms, medical, retail, restaurants)',
  'Property management companies',
  'Airbnb hosts / superhosts',
  'Doormen / building staff',
  'Real estate agents',
  'Corporate concierges',
  'Moving companies',
  'Interior designers',
  'Renovation contractors',
]

const EMPTY_FORM = {
  name: '',
  email: '',
  phone: '',
  location: '',
  lane: '',
  sales_background: '',
  target_segments: [] as string[],
  warm_intros: '',
  bilingual: '',
  why: '',
  referral_source: '',
  linkedin_url: '',
}

export default function ApplySalesPartnerPage() {
  const [form, setForm] = useState(EMPTY_FORM)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [emailSuggestion, setEmailSuggestion] = useState('')
  const [uploadProgress, setUploadProgress] = useState('')

  const formatPhone = (value: string) => {
    const cleaned = value.replace(/\D/g, '')
    if (cleaned.length <= 3) return cleaned
    if (cleaned.length <= 6) return '(' + cleaned.slice(0, 3) + ') ' + cleaned.slice(3)
    return '(' + cleaned.slice(0, 3) + ') ' + cleaned.slice(3, 6) + '-' + cleaned.slice(6, 10)
  }

  const toggleSegment = (seg: string) => {
    setForm((f) => ({
      ...f,
      target_segments: f.target_segments.includes(seg)
        ? f.target_segments.filter((s) => s !== seg)
        : [...f.target_segments, seg],
    }))
  }

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v'].includes(file.type)) {
      setError('Please select a video file (MP4, MOV, or WebM).')
      return
    }
    if (file.size > 100 * 1024 * 1024) {
      setError('Video must be under 100MB.')
      return
    }
    setVideoFile(file)
    setError('')
  }

  const uploadFile = async (file: File, type: string): Promise<string | null> => {
    const signedRes = await fetch('/api/apply/signed-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, filename: file.name, contentType: file.type }),
    })
    if (!signedRes.ok) {
      const errData = await signedRes.json().catch(() => ({}))
      setError(errData.error || `Failed to prepare upload for ${type}.`)
      return null
    }
    const { signedUrl, publicUrl } = await signedRes.json()

    const uploadRes = await fetch(signedUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    })
    if (!uploadRes.ok) {
      setError(`Failed to upload ${type}. Please try again.`)
      return null
    }
    return publicUrl
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!videoFile) {
      setError('Please record and upload a 60-second selfie video. Applications without a video will not be reviewed.')
      return
    }
    if (form.email) {
      const emailCheck = validateEmail(form.email)
      if (!emailCheck.valid) {
        if (emailCheck.suggestion) {
          setEmailSuggestion(emailCheck.suggestion)
          setError(`Did you mean ${emailCheck.suggestion}?`)
        } else {
          setError(emailCheck.error || 'Please enter a valid email.')
        }
        return
      }
    }
    setLoading(true)
    setError('')

    try {
      setUploadProgress('Uploading video...')
      const video_url = await uploadFile(videoFile, 'video')
      if (!video_url) { setLoading(false); setUploadProgress(''); return }

      setUploadProgress('Submitting application...')
      const res = await fetch('/api/sales-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, video_url }),
      })

      if (res.ok) {
        setDone(true)
      } else {
        const data = await res.json()
        setError(data.error || 'Something went wrong.')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    }
    setLoading(false)
    setUploadProgress('')
  }

  if (done) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <div className="bg-[#1E2A4A] px-6 py-4">
          <h1 className="text-white text-xl font-bold">The NYC Maid</h1>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-sm">
            <div className="text-5xl mb-4">&#10003;</div>
            <h2 className="text-2xl font-bold text-[#1E2A4A] mb-2">Application Received!</h2>
            <p className="text-gray-600">Thanks, {form.name.split(' ')[0]}. We&apos;ll review your application for the Commission Sales Partner role and reach out within 48 hours. If it&apos;s a fit, we&apos;ll set up a quick 15-minute call this week.</p>
            <p className="text-gray-500 text-sm mt-4">Questions? (212) 202-8400</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#1E2A4A] px-6 py-4">
        <h1 className="text-white text-xl font-bold">The NYC Maid</h1>
        <p className="text-gray-400 text-sm">Commission Sales Partner Application — 1099</p>
      </div>

      <div className="max-w-lg mx-auto p-4 pt-6">
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <div>
            <h2 className="text-xl font-bold text-[#1E2A4A]">Apply — Commission Sales Partner</h2>
            <p className="text-gray-500 text-sm mt-1">10% recurring commission · Paid daily via Stripe · 1099 · No cap</p>
            <p className="text-gray-400 text-xs mt-2">All fields marked with * are required.</p>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-[#1E2A4A] mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-[#1E2A4A] text-base"
              placeholder="Your full name"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-[#1E2A4A] mb-1">Phone *</label>
            <input
              type="tel"
              required
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-[#1E2A4A] text-base"
              placeholder="(212) 555-1234"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-[#1E2A4A] mb-1">Email *</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => { setForm({ ...form, email: e.target.value }); setEmailSuggestion('') }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-[#1E2A4A] text-base"
              placeholder="your@email.com"
            />
            {emailSuggestion && (
              <button type="button" onClick={() => { setForm({ ...form, email: emailSuggestion }); setEmailSuggestion(''); setError('') }} className="mt-1 text-sm text-[#1E2A4A] hover:underline">
                Use {emailSuggestion}?
              </button>
            )}
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-[#1E2A4A] mb-1">Your Location (NYC area) *</label>
            <input
              type="text"
              required
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-[#1E2A4A] text-base"
              placeholder="Neighborhood, Borough / City"
            />
          </div>

          {/* Lane */}
          <div>
            <label className="block text-sm font-medium text-[#1E2A4A] mb-1">Which lane fits you? *</label>
            <select
              required
              value={form.lane}
              onChange={(e) => setForm({ ...form, lane: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-[#1E2A4A] text-base"
            >
              <option value="">Select...</option>
              <option value="direct">Direct client outreach</option>
              <option value="referrer">Referrer network building</option>
              <option value="both">Both</option>
            </select>
          </div>

          {/* Target segments */}
          <div>
            <label className="block text-sm font-medium text-[#1E2A4A] mb-1">Which segments do you have real access to? *</label>
            <p className="text-xs text-gray-500 mb-2">Check all that apply.</p>
            <div className="space-y-2">
              {SEGMENTS.map((seg) => (
                <label key={seg} className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.target_segments.includes(seg)}
                    onChange={() => toggleSegment(seg)}
                    className="mt-1 min-w-[16px] min-h-[16px]"
                  />
                  <span>{seg}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Sales background */}
          <div>
            <label className="block text-sm font-medium text-[#1E2A4A] mb-1">Sales background *</label>
            <p className="text-xs text-gray-500 mb-2">2-3 sentences — who are you, what have you sold before?</p>
            <textarea
              required
              value={form.sales_background}
              onChange={(e) => setForm({ ...form, sales_background: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-[#1E2A4A] text-base"
              rows={3}
              placeholder="e.g. 5 years in real estate, before that insurance sales..."
            />
          </div>

          {/* Warm intros */}
          <div>
            <label className="block text-sm font-medium text-[#1E2A4A] mb-1">Warm intros in your first 30 days? *</label>
            <input
              type="text"
              required
              value={form.warm_intros}
              onChange={(e) => setForm({ ...form, warm_intros: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-[#1E2A4A] text-base"
              placeholder="Your best estimate, e.g. 15-20"
            />
          </div>

          {/* Bilingual */}
          <div>
            <label className="block text-sm font-medium text-[#1E2A4A] mb-1">Bilingual? (English / Spanish)</label>
            <select
              value={form.bilingual}
              onChange={(e) => setForm({ ...form, bilingual: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-[#1E2A4A] text-base"
            >
              <option value="">Select...</option>
              <option value="fluent-both">Fluent in both</option>
              <option value="conversational-spanish">Conversational Spanish</option>
              <option value="english-only">English only</option>
            </select>
          </div>

          {/* LinkedIn / resume */}
          <div>
            <label className="block text-sm font-medium text-[#1E2A4A] mb-1">LinkedIn or resume link</label>
            <input
              type="url"
              value={form.linkedin_url}
              onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-[#1E2A4A] text-base"
              placeholder="https://linkedin.com/in/you (optional)"
            />
          </div>

          {/* Selfie Video */}
          <div>
            <label className="block text-sm font-medium text-[#1E2A4A] mb-1">60-Second Selfie Video *</label>
            <p className="text-xs text-gray-500 mb-2">Sell us on you. Who you are, your network, why you&apos;ll crush this. MP4, MOV, or WebM, under 100MB.</p>
            <div className="flex items-center gap-4">
              {videoFile ? (
                <div className="flex items-center gap-2 bg-[#A8F0DC]/20 px-3 py-2 rounded-lg flex-1 min-w-0">
                  <span className="text-[#1E2A4A] text-sm truncate">{videoFile.name}</span>
                  <span className="text-[#1E2A4A]/50 text-xs flex-shrink-0">({(videoFile.size / 1024 / 1024).toFixed(1)}MB)</span>
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                className="px-4 py-2 border border-gray-300 rounded-lg text-[#1E2A4A] text-sm hover:bg-gray-50 flex-shrink-0"
              >
                {videoFile ? 'Change Video' : 'Upload Video'}
              </button>
              <input
                ref={videoInputRef}
                type="file"
                accept="video/mp4,video/quicktime,video/webm,video/x-m4v"
                onChange={handleVideoSelect}
                className="hidden"
              />
            </div>
            <p className="text-xs text-red-500 mt-1 font-medium">Applications without a video will not be reviewed.</p>
          </div>

          {/* Referral source */}
          <div>
            <label className="block text-sm font-medium text-[#1E2A4A] mb-1">How did you find this role?</label>
            <input
              type="text"
              value={form.referral_source}
              onChange={(e) => setForm({ ...form, referral_source: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-[#1E2A4A] text-base"
              placeholder="Optional"
            />
          </div>

          {/* Why */}
          <div>
            <label className="block text-sm font-medium text-[#1E2A4A] mb-1">Anything else?</label>
            <textarea
              value={form.why}
              onChange={(e) => setForm({ ...form, why: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-[#1E2A4A] text-base"
              rows={3}
              placeholder="Optional"
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 px-4 py-3 rounded-lg">{error}</p>
          )}

          <div className="my-5 p-4 border border-gray-200 rounded-lg bg-gray-50">
            <label className="flex items-start gap-3 cursor-pointer text-[13px] leading-relaxed text-gray-600">
              <input type="checkbox" name="sms_consent" required className="mt-1 min-w-[18px] min-h-[18px]" />
              <span>
                By checking this box, I consent to receive text messages from <strong>The NYC Maid</strong> regarding my application. Reply STOP to opt out. Msg &amp; data rates may apply.
                <br /><br />
                <a href="https://www.thenycmaid.com/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-[#1E2A4A] hover:underline">Privacy Policy</a> | <a href="https://www.thenycmaid.com/terms-conditions" target="_blank" rel="noopener noreferrer" className="text-[#1E2A4A] hover:underline">Terms &amp; Conditions</a>
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-[#1E2A4A] text-white rounded-lg text-lg font-semibold hover:bg-[#1E2A4A]/90 disabled:opacity-50"
          >
            {loading ? (uploadProgress || 'Submitting...') : 'Submit Application'}
          </button>

          <p className="text-xs text-gray-400 text-center">Questions? (212) 202-8400</p>
        </form>
      </div>
    </div>
  )
}
