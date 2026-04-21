'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { validateEmail } from '@/lib/validate-email'

const EMPTY_FORM = {
  name: '',
  email: '',
  phone: '',
  location: '',
  bilingual: '',
  availability_start: '',
  current_job: '',
  references: [
    { name: '', phone: '' },
    { name: '', phone: '' },
  ],
  notes: ''
}

export default function ApplyCoordinatorPage() {
  const [form, setForm] = useState(EMPTY_FORM)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [emailSuggestion, setEmailSuggestion] = useState('')
  const [uploadProgress, setUploadProgress] = useState('')
  const [draftStatus, setDraftStatus] = useState<'idle' | 'saving' | 'saved' | 'loaded'>('idle')
  const [draftPhotoUrl, setDraftPhotoUrl] = useState<string | null>(null)
  const [draftVideoUrl, setDraftVideoUrl] = useState<string | null>(null)

  // Load draft on mount
  useEffect(() => {
    fetch('/api/management-applications/draft?position=operations-coordinator')
      .then(r => r.json())
      .then(({ draft }) => {
        if (draft?.form_data) {
          setForm({ ...EMPTY_FORM, ...draft.form_data })
          if (draft.photo_url) { setDraftPhotoUrl(draft.photo_url); setPhotoPreview(draft.photo_url) }
          if (draft.video_url) setDraftVideoUrl(draft.video_url)
          setDraftStatus('loaded')
        }
      })
      .catch(() => {})
  }, [])

  // Auto-save draft (debounced)
  const saveDraftTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveDraft = useCallback((currentForm: typeof form, photoUrl?: string | null, videoUrl?: string | null) => {
    if (saveDraftTimeout.current) clearTimeout(saveDraftTimeout.current)
    saveDraftTimeout.current = setTimeout(() => {
      setDraftStatus('saving')
      fetch('/api/management-applications/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          form_data: currentForm,
          position: 'operations-coordinator',
          photo_url: photoUrl ?? draftPhotoUrl,
          video_url: videoUrl ?? draftVideoUrl,
        })
      })
        .then(() => setDraftStatus('saved'))
        .catch(() => setDraftStatus('idle'))
    }, 2000)
  }, [draftPhotoUrl, draftVideoUrl])

  useEffect(() => {
    if (done) return
    const hasContent = form.name || form.email || form.phone || form.location
    if (hasContent) saveDraft(form)
  }, [form, done, saveDraft])

  const formatPhone = (value: string) => {
    const cleaned = value.replace(/\D/g, '')
    if (cleaned.length <= 3) return cleaned
    if (cleaned.length <= 6) return '(' + cleaned.slice(0, 3) + ') ' + cleaned.slice(3)
    return '(' + cleaned.slice(0, 3) + ') ' + cleaned.slice(3, 6) + '-' + cleaned.slice(6, 10)
  }

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Please select a JPEG, PNG, or WebP image. / Por favor seleccione una imagen JPEG, PNG o WebP.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Photo must be under 10MB. / La foto debe ser menor de 10MB.')
      return
    }
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
    setDraftPhotoUrl(null)
    setError('')
  }

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v'].includes(file.type)) {
      setError('Please select a video file (MP4, MOV, or WebM). / Por favor seleccione un archivo de video (MP4, MOV o WebM).')
      return
    }
    if (file.size > 100 * 1024 * 1024) {
      setError('Video must be under 100MB. / El video debe ser menor de 100MB.')
      return
    }
    setVideoFile(file)
    setDraftVideoUrl(null)
    setError('')
  }

  const uploadFile = async (file: File, type: string): Promise<string | null> => {
    const signedRes = await fetch('/api/management-applications/signed-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, filename: file.name, contentType: file.type })
    })
    if (!signedRes.ok) {
      const errData = await signedRes.json().catch(() => ({}))
      setError(errData.error || `Failed to prepare upload for ${type}. / Error al preparar la subida de ${type}.`)
      return null
    }
    const { signedUrl, publicUrl } = await signedRes.json()

    const uploadRes = await fetch(signedUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    })

    if (!uploadRes.ok) {
      setError(`Failed to upload ${type}. Please try again. / Error al subir ${type}. Por favor intente de nuevo.`)
      return null
    }

    return publicUrl
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const needPhoto = !photoFile && !draftPhotoUrl
    const needVideo = !videoFile && !draftVideoUrl

    if (needPhoto) {
      setError('Please upload a photo of yourself. / Por favor suba una foto suya.')
      return
    }
    if (needVideo) {
      setError('Please upload a selfie video. Applications without a video will not be reviewed. / Por favor suba un video. Las solicitudes sin video no serán revisadas.')
      return
    }
    if (form.email) {
      const emailCheck = validateEmail(form.email)
      if (!emailCheck.valid) {
        if (emailCheck.suggestion) {
          setEmailSuggestion(emailCheck.suggestion)
          setError(`Did you mean ${emailCheck.suggestion}? / ¿Quiso decir ${emailCheck.suggestion}?`)
        } else {
          setError(emailCheck.error || 'Please enter a valid email. / Por favor ingrese un correo válido.')
        }
        return
      }
    }
    setLoading(true)
    setError('')

    try {
      let photo_url = draftPhotoUrl
      if (photoFile) {
        setUploadProgress('Uploading photo... / Subiendo foto...')
        photo_url = await uploadFile(photoFile, 'photo')
        if (!photo_url) { setLoading(false); setUploadProgress(''); return }
      }

      let video_url = draftVideoUrl
      if (videoFile) {
        setUploadProgress('Uploading video... / Subiendo video...')
        video_url = await uploadFile(videoFile, 'video')
        if (!video_url) { setLoading(false); setUploadProgress(''); return }
      }

      setUploadProgress('Submitting application... / Enviando solicitud...')

      const res = await fetch('/api/management-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          position: 'operations-coordinator',
          photo_url,
          video_url,
        })
      })

      if (res.ok) {
        setDone(true)
        fetch('/api/management-applications/draft', { method: 'DELETE' }).catch(() => {})
      } else {
        const data = await res.json()
        setError(data.error || 'Something went wrong. / Algo salió mal.')
      }
    } catch {
      setError('Something went wrong. Please try again. / Algo salió mal. Por favor intente de nuevo.')
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
            <h2 className="text-2xl font-bold text-[#1E2A4A] mb-2">Application Received! / ¡Solicitud Recibida!</h2>
            <p className="text-gray-600">Thanks, {form.name.split(' ')[0]}. We&apos;ll review your application for the Operations Admin position and reach out within 48 hours.</p>
            <p className="text-gray-500 text-sm mt-2 italic">Gracias, {form.name.split(' ')[0]}. Revisaremos su solicitud para el puesto de Coordinador de Operaciones y nos comunicaremos en 48 horas.</p>
            <p className="text-gray-500 text-sm mt-4">Questions? / ¿Preguntas? (212) 202-9030</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#1E2A4A] px-6 py-4">
        <h1 className="text-white text-xl font-bold">The NYC Maid</h1>
        <p className="text-gray-400 text-sm">Operations Admin Application — Part-Time</p>
        <p className="text-gray-500 text-xs italic">Solicitud de Coordinador de Operaciones — Medio Tiempo</p>
      </div>

      <div className="max-w-lg mx-auto p-4 pt-6">
        {draftStatus === 'loaded' && (
          <div className="mb-4 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
            Draft restored. / Borrador restaurado.
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <div>
            <h2 className="text-xl font-bold text-[#1E2A4A]">Apply for Operations Admin</h2>
            <p className="text-gray-400 text-sm italic">Solicite el Puesto de Coordinador de Operaciones</p>
            <p className="text-gray-500 text-sm mt-1">Part-Time | 10% Per Job | Averaged ~$40/hr Last Month | Paid Per Job via Zelle</p>
            <p className="text-gray-400 text-xs italic">Medio Tiempo | 10% Por Trabajo | Promedio ~$40/hr el mes pasado | Pago por trabajo vía Zelle</p>
            <p className="text-gray-400 text-xs mt-2">All fields marked with * are required. / Todos los campos marcados con * son obligatorios.</p>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-[#1E2A4A] mb-1">Full Name / Nombre Completo *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-[#1E2A4A] text-base"
              placeholder="Your full name / Su nombre completo"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-[#1E2A4A] mb-1">Phone / Teléfono *</label>
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
            <label className="block text-sm font-medium text-[#1E2A4A] mb-1">Email / Correo Electrónico *</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => { setForm({ ...form, email: e.target.value }); setEmailSuggestion('') }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-[#1E2A4A] text-base"
              placeholder="your@email.com / su@correo.com"
            />
            {emailSuggestion && (
              <button type="button" onClick={() => { setForm({ ...form, email: emailSuggestion }); setEmailSuggestion(''); setError('') }} className="mt-1 text-sm text-[#1E2A4A] hover:underline">
                Use {emailSuggestion}?
              </button>
            )}
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-[#1E2A4A] mb-1">Your Location / Su Ubicación *</label>
            <input
              type="text"
              required
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-[#1E2A4A] text-base"
              placeholder="City, State / Ciudad, Estado"
            />
          </div>

          {/* Bilingual */}
          <div>
            <label className="block text-sm font-medium text-[#1E2A4A] mb-1">Bilingual? / ¿Bilingüe? (English &amp; Spanish) *</label>
            <select
              required
              value={form.bilingual}
              onChange={(e) => setForm({ ...form, bilingual: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-[#1E2A4A] text-base"
            >
              <option value="">Select... / Seleccionar...</option>
              <option value="fluent-both">Fluent in both / Fluido en ambos</option>
              <option value="conversational-spanish">Conversational Spanish / Español conversacional</option>
              <option value="basic-spanish">Basic Spanish / Español básico</option>
              <option value="english-only">English only / Solo inglés</option>
            </select>
          </div>

          {/* Current Job / Situation */}
          <div>
            <label className="block text-sm font-medium text-[#1E2A4A] mb-1">What do you do now? / ¿Qué haces actualmente? *</label>
            <p className="text-xs text-gray-500 mb-2">This is a part-time role — tell us what you do with the rest of your time. / Esto es medio tiempo — cuéntanos qué haces con el resto de tu tiempo.</p>
            <input
              type="text"
              required
              value={form.current_job}
              onChange={(e) => setForm({ ...form, current_job: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-[#1E2A4A] text-base"
              placeholder="e.g. VA for 2 clients, stay-at-home parent, full-time dispatcher..."
            />
          </div>

          {/* Availability to Start */}
          <div>
            <label className="block text-sm font-medium text-[#1E2A4A] mb-1">When can you start? / ¿Cuándo puedes empezar? *</label>
            <select
              required
              value={form.availability_start}
              onChange={(e) => setForm({ ...form, availability_start: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-[#1E2A4A] text-base"
            >
              <option value="">Select... / Seleccionar...</option>
              <option value="immediately">Immediately / Inmediatamente</option>
              <option value="1-week">Within 1 week / En 1 semana</option>
              <option value="2-weeks">Within 2 weeks / En 2 semanas</option>
            </select>
          </div>

          {/* Photo Upload */}
          <div>
            <label className="block text-sm font-medium text-[#1E2A4A] mb-1">Photo of Yourself / Foto Suya *</label>
            <p className="text-xs text-gray-500 mb-2">Clear photo. JPEG, PNG, or WebP, under 10MB.</p>
            <div className="flex items-center gap-4">
              {photoPreview ? (
                <img src={photoPreview} alt="Preview" className="w-20 h-20 rounded-full object-cover border-2 border-gray-300 flex-shrink-0" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center flex-shrink-0">
                  <span className="text-gray-400 text-sm">Photo</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="px-4 py-2 border border-gray-300 rounded-lg text-[#1E2A4A] text-sm hover:bg-gray-50"
              >
                {photoPreview ? 'Change Photo / Cambiar' : 'Upload Photo / Subir Foto'}
              </button>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoSelect}
                className="hidden"
              />
            </div>
          </div>

          {/* Selfie Video */}
          <div>
            <label className="block text-sm font-medium text-[#1E2A4A] mb-1">60-Second Selfie Video / Video Selfie de 60 Segundos *</label>
            <p className="text-xs text-gray-500 mb-1">Tell us who you are and why this gig is a fit. If bilingual, speak in both. MP4, MOV, or WebM, under 100MB.</p>
            <p className="text-xs text-gray-400 italic mb-2">Cuéntanos quién eres y por qué este trabajo es para ti. Si eres bilingüe, habla en ambos idiomas.</p>
            <div className="flex items-center gap-4">
              {(videoFile || draftVideoUrl) ? (
                <div className="flex items-center gap-2 bg-[#A8F0DC]/20 px-3 py-2 rounded-lg flex-1 min-w-0">
                  <span className="text-[#1E2A4A] text-sm truncate">
                    {videoFile ? videoFile.name : 'Previously uploaded video'}
                  </span>
                  {videoFile && (
                    <span className="text-[#1E2A4A]/50 text-xs flex-shrink-0">({(videoFile.size / 1024 / 1024).toFixed(1)}MB)</span>
                  )}
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                className="px-4 py-2 border border-gray-300 rounded-lg text-[#1E2A4A] text-sm hover:bg-gray-50 flex-shrink-0"
              >
                {(videoFile || draftVideoUrl) ? 'Change Video / Cambiar' : 'Upload Video / Subir Video'}
              </button>
              <input
                ref={videoInputRef}
                type="file"
                accept="video/mp4,video/quicktime,video/webm,video/x-m4v"
                onChange={handleVideoSelect}
                className="hidden"
              />
            </div>
            <p className="text-xs text-red-500 mt-1 font-medium">Applications without a video will not be reviewed. / Las solicitudes sin video no serán revisadas.</p>
          </div>

          {/* References */}
          <div>
            <label className="block text-sm font-medium text-[#1E2A4A] mb-1">References / Referencias *</label>
            <p className="text-xs text-gray-500 mb-3">2 people who can vouch for you. / 2 personas que puedan responder por ti.</p>
            {form.references.map((ref, i) => (
              <div key={i} className="flex gap-3 mb-3">
                <input
                  type="text"
                  required
                  value={ref.name}
                  onChange={(e) => {
                    const updated = [...form.references]
                    updated[i] = { ...updated[i], name: e.target.value }
                    setForm({ ...form, references: updated })
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-[#1E2A4A] text-base"
                  placeholder={`Name / Nombre #${i + 1}`}
                />
                <input
                  type="tel"
                  required
                  value={ref.phone}
                  onChange={(e) => {
                    const updated = [...form.references]
                    updated[i] = { ...updated[i], phone: formatPhone(e.target.value) }
                    setForm({ ...form, references: updated })
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-[#1E2A4A] text-base"
                  placeholder={`Phone / Teléfono #${i + 1}`}
                />
              </div>
            ))}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-[#1E2A4A] mb-1">Anything else? / ¿Algo más?</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-[#1E2A4A] text-base"
              rows={3}
              placeholder="Optional / Opcional"
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
                Al marcar esta casilla, doy mi consentimiento para recibir mensajes de texto de <strong>The NYC Maid</strong> sobre mi solicitud. Responda STOP para cancelar.
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
            {loading ? (uploadProgress || 'Submitting... / Enviando...') : 'Submit Application / Enviar Solicitud'}
          </button>

          {draftStatus === 'saved' && (
            <p className="text-xs text-gray-400 text-center">Draft saved / Borrador guardado</p>
          )}

          <p className="text-xs text-gray-400 text-center">
            Questions? / ¿Preguntas? (212) 202-9030
          </p>
        </form>
      </div>
    </div>
  )
}
