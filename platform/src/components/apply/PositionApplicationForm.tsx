'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { PositionConfig } from '@/lib/positions/catalog'
import RecordedAnswer from './RecordedAnswer'

type RecordingKind = 'video' | 'audio'
type Recording = { url: string; kind: RecordingKind }

interface FormState {
  name: string
  email: string
  phone: string
  location: string
  recordings: Record<string, Recording>
  website: string // honeypot
}

function emptyForm(): FormState {
  return { name: '', email: '', phone: '', location: '', recordings: {}, website: '' }
}

function formatPhone(value: string): string {
  const cleaned = value.replace(/\D/g, '')
  if (cleaned.length <= 3) return cleaned
  if (cleaned.length <= 6) return '(' + cleaned.slice(0, 3) + ') ' + cleaned.slice(3)
  return '(' + cleaned.slice(0, 3) + ') ' + cleaned.slice(3, 6) + '-' + cleaned.slice(6, 10)
}

function buildRecordingsNotes(config: PositionConfig, recordings: Record<string, Recording>): string {
  const lines: string[] = []
  for (const q of config.recordedQuestions) {
    const rec = recordings[q.key]
    if (!rec) continue
    lines.push(`Q: ${q.label}`, `A: [${rec.kind === 'audio' ? 'Audio answer' : 'Video answer'}] ${rec.url}`, '')
  }
  return lines.join('\n').trim()
}

export default function PositionApplicationForm({ config }: { config: PositionConfig }) {
  const [form, setForm] = useState<FormState>(emptyForm)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [draftPhotoUrl, setDraftPhotoUrl] = useState<string | null>(null)
  const [draftStatus, setDraftStatus] = useState<'idle' | 'saving' | 'saved' | 'loaded'>('idle')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [uploadProgress, setUploadProgress] = useState('')

  const photoInputRef = useRef<HTMLInputElement>(null)
  const resumeInputRef = useRef<HTMLInputElement>(null)

  const persistDraft = useCallback((state: FormState, photoUrl: string | null) => {
    fetch('/api/management-applications/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        form_data: state,
        position: config.slug,
        photo_url: photoUrl,
        video_url: state.recordings[config.recordedQuestions[0]?.key]?.url || null,
      }),
    })
  }, [config.slug, config.recordedQuestions])

  // Load an in-progress draft, if one exists for this browser + position.
  useEffect(() => {
    fetch(`/api/management-applications/draft?position=${encodeURIComponent(config.slug)}`)
      .then((r) => r.json())
      .then(({ draft }) => {
        if (draft?.form_data) {
          setForm((prev) => ({ ...prev, ...draft.form_data, recordings: draft.form_data.recordings || {} }))
          if (draft.photo_url) { setDraftPhotoUrl(draft.photo_url); setPhotoPreview(draft.photo_url) }
          setDraftStatus('loaded')
        }
      })
      .catch(() => {})
  }, [config.slug])

  const debouncedSave = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (done) return
    if (!(form.name || form.email || form.phone || form.location)) return
    if (debouncedSave.current) clearTimeout(debouncedSave.current)
    debouncedSave.current = setTimeout(() => {
      setDraftStatus('saving')
      persistDraft(form, draftPhotoUrl)
      setDraftStatus('saved')
    }, 1500)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.name, form.email, form.phone, form.location])

  // Every recorded answer auto-saves immediately on upload — no debounce, no
  // waiting on other fields. A candidate who drops off after one question
  // keeps that answer.
  const handleRecordingSaved = (key: string, url: string, kind: RecordingKind) => {
    setForm((prev) => {
      const next = { ...prev, recordings: { ...prev.recordings, [key]: { url, kind } } }
      setDraftStatus('saving')
      persistDraft(next, draftPhotoUrl)
      setDraftStatus('saved')
      return next
    })
  }

  const handlePhotoSelect = (file: File | null) => {
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setError('Please select a JPEG, PNG, or WebP image.'); return }
    if (file.size > 20 * 1024 * 1024) { setError('Photo must be under 20MB.'); return }
    setError('')
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
    setDraftPhotoUrl(null)
  }

  const handleResumeSelect = (file: File | null) => {
    if (!file) return
    const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!validTypes.includes(file.type)) { setError('Please select a PDF or Word document.'); return }
    if (file.size > 10 * 1024 * 1024) { setError('Resume must be under 10MB.'); return }
    setError('')
    setResumeFile(file)
  }

  const uploadViaSignedUrl = async (file: File, type: 'photo' | 'resume'): Promise<string | null> => {
    const signedRes = await fetch('/api/management-applications/signed-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, filename: file.name, contentType: file.type }),
    })
    if (!signedRes.ok) {
      const errData = await signedRes.json().catch(() => ({}))
      setError(errData.error || `Failed to prepare ${type} upload.`)
      return null
    }
    const { signedUrl, publicUrl } = await signedRes.json()
    const uploadRes = await fetch(signedUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file })
    if (!uploadRes.ok) { setError(`Failed to upload ${type}. Please try again.`); return null }
    return publicUrl
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (config.photoRequired && !photoFile && !draftPhotoUrl) { setError('Please upload a photo of yourself.'); return }
    if (config.resumeRequired && !resumeFile) { setError('A resume is required for this role.'); return }
    for (const q of config.recordedQuestions) {
      if (!form.recordings[q.key]) { setError(`Please record an answer for: "${q.label}"`); return }
    }

    setLoading(true)
    try {
      let photo_url = draftPhotoUrl
      if (photoFile) {
        setUploadProgress('Uploading photo…')
        photo_url = await uploadViaSignedUrl(photoFile, 'photo')
        if (!photo_url) { setLoading(false); setUploadProgress(''); return }
      }

      let resume_url: string | null = null
      if (resumeFile) {
        setUploadProgress('Uploading resume…')
        resume_url = await uploadViaSignedUrl(resumeFile, 'resume')
        if (!resume_url) { setLoading(false); setUploadProgress(''); return }
      }

      const primaryRecording = form.recordings[config.recordedQuestions[0]?.key]

      setUploadProgress('Submitting application…')
      const res = await fetch('/api/management-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          location: form.location,
          notes: buildRecordingsNotes(config, form.recordings) || null,
          position: config.slug,
          photo_url,
          video_url: primaryRecording?.url || null,
          resume_url,
        }),
      })

      if (res.ok) {
        setDone(true)
        fetch(`/api/management-applications/draft?position=${encodeURIComponent(config.slug)}`, { method: 'DELETE' }).catch(() => {})
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
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
          <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="mb-2 text-2xl font-bold text-slate-800">Application Received</h3>
        <p className="text-slate-600 leading-relaxed">
          Thanks, {form.name.split(' ')[0] || 'there'}. We review every application personally and will follow up soon.
        </p>
        {config.supportPhone && <p className="mt-4 text-sm text-slate-400">Questions? {config.supportPhone}</p>}
      </div>
    )
  }

  const inputClass = 'w-full px-4 py-3 border border-gray-300 rounded-lg text-slate-800 text-base focus:border-slate-400 focus:ring-1 focus:ring-slate-400 focus:outline-none'
  const labelClass = 'block text-sm font-medium text-slate-700 mb-1'
  const sectionHeaderClass = 'mt-2 mb-1 pt-4 text-xs font-bold uppercase tracking-widest text-slate-400 border-t border-gray-100 first:border-t-0 first:pt-0'

  const answeredCount = config.recordedQuestions.filter((q) => form.recordings[q.key]).length

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-8 space-y-5">
      <div>
        <h3 className="text-center text-xl font-bold text-slate-800">Apply — {config.title}</h3>
        <p className="text-center text-sm text-slate-600 mt-2 bg-slate-50 rounded-lg px-4 py-3">{config.introMessage}</p>
        {draftStatus === 'loaded' && (
          <p className="text-center text-sm text-blue-600 mt-2">Draft restored from your last visit.</p>
        )}
      </div>

      <div className={sectionHeaderClass}>Your Contact Info</div>

      <div>
        <label className={labelClass}>Full Name *</label>
        <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Phone *</label>
        <input type="tel" required value={form.phone} onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })} className={inputClass} placeholder="(555) 123-4567" />
      </div>
      <div>
        <label className={labelClass}>Email *</label>
        <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Address *</label>
        <input type="text" required value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className={inputClass} placeholder="City, State" />
      </div>

      <div className={sectionHeaderClass}>Record Your Answers ({answeredCount}/{config.recordedQuestions.length})</div>
      <p className="text-xs text-gray-400 -mt-3">
        Each answer is video or audio, capped at {config.recordingSecondsLimit} seconds with auto-stop. Answer in any order — every recording saves the moment you finish it.
      </p>

      {config.recordedQuestions.map((q) => (
        <RecordedAnswer
          key={q.key}
          questionKey={q.key}
          label={q.label}
          helpText={q.helpText}
          maxSeconds={config.recordingSecondsLimit}
          existingUrl={form.recordings[q.key]?.url}
          existingKind={form.recordings[q.key]?.kind}
          onSaved={handleRecordingSaved}
        />
      ))}

      <div className={sectionHeaderClass}>Photo{config.resumeRequired || !config.photoRequired ? ' & Resume' : ''}</div>

      {config.photoRequired && (
        <div>
          <label className={labelClass}>Photo of Yourself *</label>
          <div className="flex items-center gap-4">
            {photoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoPreview} alt="Preview" className="w-16 h-16 rounded-full object-cover border-2 border-gray-300 flex-shrink-0" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex-shrink-0" />
            )}
            <button type="button" onClick={() => photoInputRef.current?.click()} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-slate-700 hover:bg-gray-50">
              {photoPreview ? 'Change Photo' : 'Upload Photo'}
            </button>
            <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => handlePhotoSelect(e.target.files?.[0] || null)} className="hidden" />
          </div>
        </div>
      )}

      <div>
        <label className={labelClass}>
          Resume / CV {config.resumeRequired ? '*' : <span className="text-gray-300">(optional)</span>}
        </label>
        <div className="flex items-center gap-3">
          {resumeFile && (
            <div className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-lg flex-1 min-w-0">
              <span className="text-sm text-slate-700 truncate">{resumeFile.name}</span>
            </div>
          )}
          <button type="button" onClick={() => resumeInputRef.current?.click()} className="px-4 py-2.5 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-slate-300 hover:bg-gray-50 flex-shrink-0">
            {resumeFile ? 'Change' : 'Upload Resume'}
          </button>
          <input ref={resumeInputRef} type="file" accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(e) => handleResumeSelect(e.target.files?.[0] || null)} className="hidden" />
        </div>
      </div>

      {/* Honeypot */}
      <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', top: 'auto', width: '1px', height: '1px', overflow: 'hidden' }}>
        <label>
          Website
          <input type="text" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
        </label>
      </div>

      {error && <p className="text-red-600 text-sm bg-red-50 px-4 py-3 rounded-lg">{error}</p>}

      <button type="submit" disabled={loading} className="w-full py-4 rounded-full bg-slate-900 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-slate-800 disabled:opacity-60">
        {loading ? (uploadProgress || 'Submitting…') : 'Submit Application'}
      </button>

      {draftStatus === 'saved' && <p className="text-center text-xs text-gray-400">Saved</p>}
      {config.supportPhone && <p className="text-center text-xs text-gray-400">Questions? {config.supportPhone}</p>}
    </form>
  )
}
