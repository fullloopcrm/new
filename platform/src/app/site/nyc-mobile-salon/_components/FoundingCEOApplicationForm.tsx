'use client'
import { useState, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const marketplacePlatforms = [
  'Glamsquad',
  'Soothe',
  'StyleSeat',
  'Priv',
  'BeGlammed',
  'Booksy',
  'Vagaro',
  'Urban Company',
  'Handy',
  'TaskRabbit',
  'Zeel',
  'Rinse',
  'ClassPass',
  'Blowtie',
  'Other marketplace / on-demand platform',
  'No direct marketplace experience',
]

const formatPhone = (value: string) => {
  const cleaned = value.replace(/\D/g, '')
  if (cleaned.length <= 3) return cleaned
  if (cleaned.length <= 6) return '(' + cleaned.slice(0, 3) + ') ' + cleaned.slice(3)
  return '(' + cleaned.slice(0, 3) + ') ' + cleaned.slice(3, 6) + '-' + cleaned.slice(6, 10)
}

type FormState = {
  name: string
  email: string
  phone: string
  linkedinUrl: string
  location: string
  currentRole: string
  currentCompany: string
  yearsExperience: string
  marketplaceBackground: string
  otherPlatforms: string
  plExperience: string
  teamSize: string
  biggestScale: string
  whySweatEquity: string
  plan306090: string
  anythingElse: string
  website: string
}

export default function FoundingCEOApplicationForm() {
  const [form, setForm] = useState<FormState>({
    name: '',
    email: '',
    phone: '',
    linkedinUrl: '',
    location: '',
    currentRole: '',
    currentCompany: '',
    yearsExperience: '',
    marketplaceBackground: '',
    otherPlatforms: '',
    plExperience: '',
    teamSize: '',
    biggestScale: '',
    whySweatEquity: '',
    plan306090: '',
    anythingElse: '',
    website: '',
  })
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const resumeInputRef = useRef<HTMLInputElement>(null)
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

  const handleResumeSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const validTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]
    if (!validTypes.includes(file.type)) {
      setError('Please select a PDF or Word document for your resume.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Resume must be under 10MB.')
      return
    }
    setResumeFile(file)
    setError('')
  }

  const uploadFile = async (file: File, type: 'video' | 'resume'): Promise<string | null> => {
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

    const { error: uploadErr } = await supabase.storage
      .from('uploads')
      .uploadToSignedUrl(path, token, file, { contentType: file.type })

    if (uploadErr) {
      setError(`Failed to upload ${type}. Please try again.`)
      return null
    }

    return publicUrl
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const required: (keyof FormState)[] = [
      'name',
      'email',
      'phone',
      'linkedinUrl',
      'location',
      'yearsExperience',
      'marketplaceBackground',
      'plExperience',
      'teamSize',
      'biggestScale',
      'whySweatEquity',
      'plan306090',
    ]
    for (const field of required) {
      if (!form[field].toString().trim()) {
        setError('Please fill out every required field — this application is deliberately in-depth.')
        return
      }
    }
    if (!videoFile) {
      setError('A 2-3 minute video intro is required.')
      return
    }

    setLoading(true)

    try {
      setUploadProgress('Uploading video intro...')
      const videoUrl = await uploadFile(videoFile, 'video')
      if (!videoUrl) {
        setLoading(false)
        setUploadProgress('')
        return
      }

      let resumeUrl: string | null = null
      if (resumeFile) {
        setUploadProgress('Uploading resume...')
        resumeUrl = await uploadFile(resumeFile, 'resume')
        if (!resumeUrl) {
          setLoading(false)
          setUploadProgress('')
          return
        }
      }

      setUploadProgress('Submitting application...')

      const res = await fetch('/api/apply-ceo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          videoUrl,
          resumeUrl,
        }),
      })

      if (res.ok) {
        setDone(true)
      } else {
        const data = await res.json().catch(() => ({}))
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
        <h3 className="mb-2 font-display text-2xl font-bold text-slate-800">
          Application Received
        </h3>
        <p className="text-slate-600 leading-relaxed">
          Thanks, {form.name.split(' ')[0]}. Every application is read personally by the founder. If your background is a fit, you&rsquo;ll get a direct response within 72 hours to schedule the first conversation.
        </p>
      </div>
    )
  }

  const inputClass =
    'w-full px-4 py-3 border border-gray-300 rounded-lg text-charcoal text-base focus:border-purple-400 focus:ring-1 focus:ring-purple-400 focus:outline-none'
  const labelClass = 'block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1'
  const sectionHeaderClass =
    'mt-2 mb-1 pt-4 text-xs font-bold uppercase tracking-widest text-purple-600 border-t border-purple-100 first:border-t-0 first:pt-0'

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-purple-100 bg-white p-5 sm:p-8 space-y-5"
    >
      <div>
        <h3 className="text-center font-display text-xl font-bold text-slate-800">
          In-Depth Operator Application
        </h3>
        <p className="text-center text-sm text-slate-500 mt-1">
          Every field marked * is required. Video intro required. Resume optional.
        </p>
      </div>

      {/* ── Section 1: About You ───────────────────────────────── */}
      <div className={sectionHeaderClass}>Section 1 — About You</div>

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

      <div>
        <label className={labelClass}>Email *</label>
        <input
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className={inputClass}
          placeholder="you@example.com"
        />
      </div>

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

      <div>
        <label className={labelClass}>LinkedIn URL *</label>
        <input
          type="url"
          required
          value={form.linkedinUrl}
          onChange={(e) => setForm({ ...form, linkedinUrl: e.target.value })}
          className={inputClass}
          placeholder="https://linkedin.com/in/yourname"
        />
      </div>

      <div>
        <label className={labelClass}>Where are you based? *</label>
        <select
          required
          value={form.location}
          onChange={(e) => setForm({ ...form, location: e.target.value })}
          className={inputClass}
        >
          <option value="">Choose one</option>
          <option value="nyc-current">Currently living in NYC</option>
          <option value="nyc-relocating">Relocating to NYC within 30-60 days</option>
          <option value="nyc-willing">Outside NYC — willing to relocate</option>
          <option value="outside">Outside NYC — not relocating</option>
        </select>
      </div>

      {/* ── Section 2: Your Track Record ────────────────────────── */}
      <div className={sectionHeaderClass}>Section 2 — Your Track Record</div>

      <div>
        <label className={labelClass}>Current or Most Recent Role</label>
        <input
          type="text"
          value={form.currentRole}
          onChange={(e) => setForm({ ...form, currentRole: e.target.value })}
          className={inputClass}
          placeholder="e.g. VP of Operations, Director of Growth, Head of Supply"
        />
      </div>

      <div>
        <label className={labelClass}>Current or Most Recent Company</label>
        <input
          type="text"
          value={form.currentCompany}
          onChange={(e) => setForm({ ...form, currentCompany: e.target.value })}
          className={inputClass}
          placeholder="Company name"
        />
      </div>

      <div>
        <label className={labelClass}>
          Years in marketplace / on-demand services *
        </label>
        <select
          required
          value={form.yearsExperience}
          onChange={(e) => setForm({ ...form, yearsExperience: e.target.value })}
          className={inputClass}
        >
          <option value="">Select</option>
          <option value="0-2">Less than 2 years</option>
          <option value="2-5">2-5 years</option>
          <option value="5-10">5-10 years</option>
          <option value="10+">10+ years</option>
          <option value="adjacent">
            No direct marketplace experience, but adjacent services experience
          </option>
        </select>
      </div>

      <div>
        <label className={labelClass}>
          Which platform(s) have you scaled, worked at, or led? *
        </label>
        <select
          required
          value={form.marketplaceBackground}
          onChange={(e) =>
            setForm({ ...form, marketplaceBackground: e.target.value })
          }
          className={inputClass}
        >
          <option value="">Choose the closest match</option>
          {marketplacePlatforms.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass}>
          Other platforms you&rsquo;ve worked at <span className="text-gray-300">(optional)</span>
        </label>
        <input
          type="text"
          value={form.otherPlatforms}
          onChange={(e) => setForm({ ...form, otherPlatforms: e.target.value })}
          className={inputClass}
          placeholder="Additional companies — comma-separated"
        />
      </div>

      <div>
        <label className={labelClass}>P&amp;L ownership experience *</label>
        <select
          required
          value={form.plExperience}
          onChange={(e) => setForm({ ...form, plExperience: e.target.value })}
          className={inputClass}
        >
          <option value="">Select</option>
          <option value="owned-full">Owned a full P&amp;L</option>
          <option value="owned-unit">Owned a business unit or market P&amp;L</option>
          <option value="contributed">Contributed to P&amp;L decisions</option>
          <option value="none">No direct P&amp;L experience yet</option>
        </select>
      </div>

      <div>
        <label className={labelClass}>Largest team you&rsquo;ve directly managed *</label>
        <select
          required
          value={form.teamSize}
          onChange={(e) => setForm({ ...form, teamSize: e.target.value })}
          className={inputClass}
        >
          <option value="">Select</option>
          <option value="0-5">0-5 direct reports</option>
          <option value="5-15">5-15</option>
          <option value="15-50">15-50</option>
          <option value="50-200">50-200</option>
          <option value="200+">200+</option>
        </select>
      </div>

      <div>
        <label className={labelClass}>
          What&rsquo;s the biggest platform or business you&rsquo;ve scaled? *
        </label>
        <p className="text-xs text-gray-400 mb-2">
          Give specifics. Revenue run-rate, number of active pros/providers, number of markets, years it took. Numbers matter more than titles here.
        </p>
        <textarea
          required
          value={form.biggestScale}
          onChange={(e) => setForm({ ...form, biggestScale: e.target.value })}
          className={inputClass}
          rows={4}
          placeholder="Example: I ran NYC + LA operations at [Company]. Scaled from $200K to $4M monthly GMV in 18 months. 120 active providers, 3,000 monthly bookings at peak. Owned the P&L for both markets."
        />
      </div>

      {/* ── Section 3: Why This Role ──────────────────────────── */}
      <div className={sectionHeaderClass}>Section 3 — Why This Role</div>

      <div>
        <label className={labelClass}>
          Why does sweat equity work for you right now? *
        </label>
        <p className="text-xs text-gray-400 mb-2">
          Be honest. This is the single most important question on the application. This role is pre-revenue, pre-funding — equity only, no salary during the ramp. Tell us why that structure works for you right now and what you&rsquo;re looking for in the equity stake.
        </p>
        <textarea
          required
          value={form.whySweatEquity}
          onChange={(e) => setForm({ ...form, whySweatEquity: e.target.value })}
          className={inputClass}
          rows={5}
          placeholder="What's your situation? Why is this the right structure at this point in your career? What do you need the equity stake to look like for this to be worth it?"
        />
      </div>

      <div>
        <label className={labelClass}>
          Your 30 / 60 / 90 day plan — if you got the offer today *
        </label>
        <p className="text-xs text-gray-400 mb-2">
          First 30 days: what do you learn and who do you meet? First 60 days: what do you hire and what do you ship? First 90 days: what&rsquo;s the first measurable outcome? This does not need to be polished — we want to see how you think.
        </p>
        <textarea
          required
          value={form.plan306090}
          onChange={(e) => setForm({ ...form, plan306090: e.target.value })}
          className={inputClass}
          rows={7}
          placeholder="Days 1-30: ... Days 31-60: ... Days 61-90: ..."
        />
      </div>

      {/* ── Section 4: Video Intro ────────────────────────────── */}
      <div className={sectionHeaderClass}>Section 4 — Video Intro (Required)</div>

      <div>
        <label className={labelClass}>
          2-3 Minute Video Intro <span className="text-purple-500">*</span>
        </label>
        <p className="text-xs text-gray-400 mb-2">
          Record on your phone. Horizontal or vertical, it doesn&rsquo;t matter. Tell us: who you are, what you&rsquo;ve built, and why this specific role — not a generic operator role — is the one you want. No slides, no editing, no production value. Just you talking. MP4, MOV, or WebM, under 100MB.
        </p>
        <div className="flex items-center gap-3">
          {videoFile ? (
            <div className="flex items-center gap-2 bg-purple-50 px-3 py-2 rounded-lg flex-1 min-w-0">
              <span className="text-sm text-slate-700 truncate">{videoFile.name}</span>
              <span className="text-xs text-slate-400 flex-shrink-0">
                ({(videoFile.size / 1024 / 1024).toFixed(1)}MB)
              </span>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => videoInputRef.current?.click()}
            className="px-4 py-2.5 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-purple-300 hover:bg-purple-50 flex-shrink-0"
          >
            {videoFile ? 'Change' : 'Upload Video Intro'}
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

      {/* ── Section 5: Resume + Anything Else ─────────────────── */}
      <div className={sectionHeaderClass}>Section 5 — Resume &amp; Notes</div>

      <div>
        <label className={labelClass}>
          Resume / CV <span className="text-gray-300">(optional — PDF or Word, under 10MB)</span>
        </label>
        <div className="flex items-center gap-3">
          {resumeFile ? (
            <div className="flex items-center gap-2 bg-purple-50 px-3 py-2 rounded-lg flex-1 min-w-0">
              <span className="text-sm text-slate-700 truncate">{resumeFile.name}</span>
              <span className="text-xs text-slate-400 flex-shrink-0">
                ({(resumeFile.size / 1024 / 1024).toFixed(1)}MB)
              </span>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => resumeInputRef.current?.click()}
            className="px-4 py-2.5 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-purple-300 hover:bg-purple-50 flex-shrink-0"
          >
            {resumeFile ? 'Change' : 'Upload Resume'}
          </button>
          <input
            ref={resumeInputRef}
            type="file"
            accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleResumeSelect}
            className="hidden"
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>
          Anything else we should know? <span className="text-gray-300">(optional)</span>
        </label>
        <textarea
          value={form.anythingElse}
          onChange={(e) => setForm({ ...form, anythingElse: e.target.value })}
          className={inputClass}
          rows={3}
          placeholder="References, portfolio, things that don't fit in a resume, etc."
        />
      </div>

      {/* Honeypot — hidden from humans, bots fill it */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '-10000px',
          top: 'auto',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
        }}
      >
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

      {error && (
        <p className="text-red-600 text-sm bg-red-50 px-4 py-3 rounded-lg">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-4 rounded-full bg-purple-600 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-purple-700 disabled:opacity-60"
      >
        {loading ? uploadProgress || 'Submitting...' : 'Submit Application'}
      </button>

      <p className="text-center text-xs text-gray-400">
        The founder reads every application personally. If it&rsquo;s a fit, you&rsquo;ll hear back within 72 hours.
      </p>
    </form>
  )
}
