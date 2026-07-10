'use client'
import { useState, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const specialties = [
  'Hairstylist',
  'Barber',
  'Nail Technician',
  'Makeup Artist',
  'Esthetician',
  'Waxing Specialist',
  'Multiple Specialties',
]

const formatPhone = (value: string) => {
  const cleaned = value.replace(/\D/g, '')
  if (cleaned.length <= 3) return cleaned
  if (cleaned.length <= 6) return '(' + cleaned.slice(0, 3) + ') ' + cleaned.slice(3)
  return '(' + cleaned.slice(0, 3) + ') ' + cleaned.slice(3, 6) + '-' + cleaned.slice(6, 10)
}

export default function ApplicationForm() {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    specialty: '',
    instagram: '',
    experience: '',
    availability: '',
    message: '',
    website: '',
  })
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [uploadProgress, setUploadProgress] = useState('')

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
      setError(errData.error || `Failed to prepare ${type} upload.`)
      return null
    }
    const { path, token, publicUrl } = await signedRes.json()

    const { error } = await supabase.storage
      .from('uploads')
      .uploadToSignedUrl(path, token, file, { contentType: file.type })

    if (error) {
      setError(`Failed to upload ${type}. Please try again.`)
      return null
    }

    return publicUrl
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!form.name.trim() || !form.phone.trim() || !form.specialty) {
      setError('Please fill in all required fields.')
      return
    }
    if (!videoFile) {
      setError('Please upload a video selfie (minimum 30 seconds).')
      return
    }

    setLoading(true)

    try {
      let videoUrl: string | null = null
      if (videoFile) {
        setUploadProgress('Uploading video...')
        videoUrl = await uploadFile(videoFile, 'video')
        if (!videoUrl) { setLoading(false); setUploadProgress(''); return }
      }

      setUploadProgress('Submitting application...')

      const res = await fetch('/api/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          videoUrl,
        }),
      })

      if (res.ok) {
        setDone(true)
      } else {
        const data = await res.json()
        setError(data.error || 'Something went wrong. Please try again.')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    }
    setLoading(false)
    setUploadProgress('')
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-purple-100 bg-white p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-100">
          <svg className="h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="mb-2 font-display text-2xl font-bold text-slate-800">Application Received!</h3>
        <p className="text-slate-500">
          Thanks, {form.name.split(' ')[0]}. We review every application personally and most candidates hear back within 48 hours.
        </p>
      </div>
    )
  }

  const inputClass = 'w-full px-4 py-3 border border-gray-300 rounded-lg text-charcoal text-base focus:border-purple-400 focus:ring-1 focus:ring-purple-400 focus:outline-none'
  const labelClass = 'block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1'

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-purple-100 bg-white p-5 sm:p-8 space-y-5">
      <div>
        <h3 className="text-center font-display text-xl font-bold text-slate-800">Apply to Join the Team</h3>
        <p className="text-center text-sm text-slate-500 mt-1">$49/hr via Zelle or Apple Cash — paid within 30 minutes of job completion.</p>
      </div>

      {/* Name */}
      <div>
        <label className={labelClass}>Full Name *</label>
        <input
          type="text"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className={inputClass}
          placeholder="Your full name"
        />
      </div>

      {/* Phone */}
      <div>
        <label className={labelClass}>Phone *</label>
        <input
          type="tel"
          required
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })}
          className={inputClass}
          placeholder="(555) 123-4567"
        />
      </div>

      {/* Specialty */}
      <div>
        <label className={labelClass}>Specialty *</label>
        <select
          required
          value={form.specialty}
          onChange={(e) => setForm({ ...form, specialty: e.target.value })}
          className={inputClass}
        >
          <option value="">Choose one</option>
          {specialties.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Instagram */}
      <div>
        <label className={labelClass}>Instagram Handle</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">@</span>
          <input
            type="text"
            value={form.instagram}
            onChange={(e) => setForm({ ...form, instagram: e.target.value })}
            className={`${inputClass} pl-8`}
            placeholder="yourusername"
          />
        </div>
      </div>

      {/* Experience + Availability */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Years of Experience</label>
          <select
            value={form.experience}
            onChange={(e) => setForm({ ...form, experience: e.target.value })}
            className={inputClass}
          >
            <option value="">Select</option>
            <option value="0-1">Less than 1 year</option>
            <option value="1-2">1-2 years</option>
            <option value="2-5">2-5 years</option>
            <option value="5-10">5-10 years</option>
            <option value="10+">10+ years</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Availability</label>
          <select
            value={form.availability}
            onChange={(e) => setForm({ ...form, availability: e.target.value })}
            className={inputClass}
          >
            <option value="">Select</option>
            <option value="full-time">Full-Time (5-6 days/week)</option>
            <option value="part-time">Part-Time (2-4 days/week)</option>
            <option value="weekends">Weekends Only</option>
            <option value="flexible">Flexible</option>
          </select>
        </div>
      </div>

      {/* Video Selfie */}
      <div>
        <label className={labelClass}>Video Selfie <span className="text-purple-500">(min 30 seconds)</span></label>
        <p className="text-xs text-gray-400 mb-2">Tell us about yourself, your experience, and why you want to join. MP4, MOV, or WebM, under 100MB.</p>
        <div className="flex items-center gap-3">
          {videoFile ? (
            <div className="flex items-center gap-2 bg-purple-50 px-3 py-2 rounded-lg flex-1 min-w-0">
              <span className="text-sm text-slate-700 truncate">{videoFile.name}</span>
              <span className="text-xs text-slate-400 flex-shrink-0">({(videoFile.size / 1024 / 1024).toFixed(1)}MB)</span>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => videoInputRef.current?.click()}
            className="px-4 py-2.5 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-purple-300 hover:bg-purple-50 flex-shrink-0"
          >
            {videoFile ? 'Change' : 'Upload Video'}
          </button>
          <input
            ref={videoInputRef}
            type="file"
            accept="video/mp4,video/quicktime,video/webm,video/x-m4v"
            onChange={handleVideoSelect}
            className="hidden"
          />
        </div>
      </div>

      {/* Message */}
      <div>
        <label className={labelClass}>Anything else? <span className="text-gray-300">(optional)</span></label>
        <textarea
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          className={inputClass}
          rows={3}
          placeholder="Tell us about your specialties, clients you love working with, etc."
        />
      </div>

      {error && (
        <p className="text-red-600 text-sm bg-red-50 px-4 py-3 rounded-lg">{error}</p>
      )}

      {/* Honeypot — hidden from humans, bots will fill it */}
      <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', top: 'auto', width: '1px', height: '1px', overflow: 'hidden' }}>
        <label>
          Website
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={form.website}
            onChange={(e) => setForm({ ...form, website: e.target.value })}
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-4 rounded-full bg-purple-600 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-purple-700 disabled:opacity-60"
      >
        {loading ? (uploadProgress || 'Submitting...') : 'Submit Application'}
      </button>

      <p className="text-center text-xs text-gray-400">
        By applying, you confirm you hold a valid NYS license for your specialty.
      </p>
    </form>
  )
}
