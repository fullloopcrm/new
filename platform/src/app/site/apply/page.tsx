'use client'
import { useState, useRef } from 'react'
import AddressAutocomplete from '@/components/AddressAutocomplete'
import { validateEmail } from '@/lib/validate-email'
import { SERVICE_ZONES } from '@/lib/service-zones'

export default function ApplyPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    unit: '',
    experience: '',
    availability: '',
    referral_source: '',
    references: [
      { name: '', phone: '' },
      { name: '', phone: '' },
      { name: '', phone: '' },
    ],
    notes: '',
    service_zones: [] as string[],
    has_car: false,
    labor_only: false,
    max_travel_minutes: '',
  })
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [emailSuggestion, setEmailSuggestion] = useState('')

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Please select a JPEG, PNG, or WebP image / Por favor seleccione una imagen JPEG, PNG o WebP')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Photo must be under 5MB / La foto debe ser menor de 5MB')
      return
    }
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
    setError('')
  }

  const formatPhone = (value: string) => {
    const cleaned = value.replace(/\D/g, '')
    if (cleaned.length <= 3) return cleaned
    if (cleaned.length <= 6) return '(' + cleaned.slice(0, 3) + ') ' + cleaned.slice(3)
    return '(' + cleaned.slice(0, 3) + ') ' + cleaned.slice(3, 6) + '-' + cleaned.slice(6, 10)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!photoFile) {
      setError('Please upload a photo of yourself smiling / Por favor suba una foto suya sonriendo')
      return
    }
    if (form.email) {
      const emailCheck = validateEmail(form.email)
      if (!emailCheck.valid) {
        if (emailCheck.suggestion) {
          setEmailSuggestion(emailCheck.suggestion)
          setError(`Did you mean ${emailCheck.suggestion}? / ¿Quiso decir ${emailCheck.suggestion}?`)
        } else {
          setError(emailCheck.error || 'Please enter a valid email / Por favor ingrese un correo válido')
        }
        return
      }
    }
    setLoading(true)
    setError('')

    try {
      // Upload photo first
      let photo_url = ''
      const uploadData = new FormData()
      uploadData.append('file', photoFile)
      const uploadRes = await fetch('/api/cleaners/upload', { method: 'POST', body: uploadData })
      if (!uploadRes.ok) {
        const errData = await uploadRes.json().catch(() => ({}))
        setError(errData.error || 'Failed to upload photo / Error al subir la foto')
        setLoading(false)
        return
      }
      const uploadJson = await uploadRes.json()
      photo_url = uploadJson.url

      const res = await fetch('/api/cleaner-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, photo_url })
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
  }

  if (done) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <div className="bg-[#1E2A4A] px-6 py-4">
          <h1 className="text-white text-xl font-bold">The NYC Maid</h1>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-sm">
            <div className="text-5xl mb-4">✓</div>
            <h2 className="text-2xl font-bold text-[#1E2A4A] mb-2">Application Received! / ¡Solicitud Recibida!</h2>
            <p className="text-gray-600">Thanks, {form.name.split(' ')[0]}. We&apos;ll review your application and reach out soon.</p>
            <p className="text-gray-600 mt-2">Gracias, {form.name.split(' ')[0]}. Revisaremos su solicitud y nos comunicaremos pronto.</p>
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
        <p className="text-gray-400 text-sm">Join Our Team / Únete a Nuestro Equipo</p>
      </div>

      <div className="max-w-lg mx-auto p-4 pt-6">
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <div>
            <h2 className="text-xl font-bold text-[#1E2A4A]">Apply to Join Our Team / Solicite Unirse a Nuestro Equipo</h2>
            <p className="text-gray-500 text-sm mt-1">We&apos;re looking for reliable, detail-oriented cleaners in NYC.</p>
            <p className="text-gray-500 text-sm">Buscamos limpiadores confiables y detallistas en NYC.</p>
          </div>

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

          <div>
            <label className="block text-sm font-medium text-[#1E2A4A] mb-1">Email / Correo Electrónico</label>
            <input
              type="email"
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

          <div>
            <label className="block text-sm font-medium text-[#1E2A4A] mb-1">Photo of You Smiling / Foto Suya Sonriendo *</label>
            <p className="text-xs text-gray-500 mb-2">This photo will be shared with clients / Esta foto se compartirá con los clientes</p>
            <div className="flex items-center gap-4">
              {photoPreview ? (
                <img src={photoPreview} alt="Preview" className="w-20 h-20 rounded-full object-cover border-2 border-gray-300 flex-shrink-0" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl text-gray-400">📷</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 border border-gray-300 rounded-lg text-[#1E2A4A] text-sm hover:bg-gray-50"
              >
                {photoPreview ? 'Change Photo / Cambiar Foto' : 'Upload Photo / Subir Foto'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoSelect}
                className="hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1E2A4A] mb-1">Your Address / Su Dirección *</label>
            <AddressAutocomplete
              value={form.address}
              onChange={(val) => setForm({ ...form, address: val })}
              placeholder="Start typing address... / Comience a escribir la dirección..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-[#1E2A4A] text-base"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1E2A4A] mb-1">Apt / Unit / Apto</label>
            <input
              type="text"
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-[#1E2A4A] text-base"
              placeholder="Apt 4B"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1E2A4A] mb-1">Cleaning Experience / Experiencia de Limpieza</label>
            <select
              value={form.experience}
              onChange={(e) => setForm({ ...form, experience: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-[#1E2A4A] text-base"
            >
              <option value="">Select... / Seleccionar...</option>
              <option value="none">No professional experience / Sin experiencia profesional</option>
              <option value="1-2 years">1-2 years / 1-2 años</option>
              <option value="3-5 years">3-5 years / 3-5 años</option>
              <option value="5+ years">5+ years / 5+ años</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1E2A4A] mb-1">Availability / Disponibilidad</label>
            <select
              value={form.availability}
              onChange={(e) => setForm({ ...form, availability: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-[#1E2A4A] text-base"
            >
              <option value="">Select... / Seleccionar...</option>
              <option value="full-time">Full-time (5+ days/week) / Tiempo completo (5+ días/semana)</option>
              <option value="part-time">Part-time (2-4 days/week) / Medio tiempo (2-4 días/semana)</option>
              <option value="weekends">Weekends only / Solo fines de semana</option>
              <option value="flexible">Flexible / Flexible</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1E2A4A] mb-1">Where can you work? / ¿Dónde puede trabajar? *</label>
            <p className="text-xs text-gray-500 mb-2">Select all areas you can service / Seleccione todas las áreas donde puede dar servicio</p>
            <div className="grid grid-cols-1 gap-2">
              {SERVICE_ZONES.map(zone => (
                <label key={zone.id} className="flex items-center gap-3 px-3 py-2.5 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={form.service_zones.includes(zone.id)}
                    onChange={(e) => {
                      const zones = e.target.checked
                        ? [...form.service_zones, zone.id]
                        : form.service_zones.filter(z => z !== zone.id)
                      setForm({ ...form, service_zones: zones })
                    }}
                    className="w-4 h-4 rounded border-gray-300 text-[#1E2A4A]"
                  />
                  <span className="text-sm text-[#1E2A4A]">{zone.label} / {zone.labelES}</span>
                  {zone.car_required && <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">Car needed</span>}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-3 px-3 py-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={form.has_car}
                onChange={(e) => setForm({ ...form, has_car: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-[#1E2A4A]"
              />
              <div>
                <span className="text-sm font-medium text-[#1E2A4A]">I drive / Yo manejo</span>
                <p className="text-xs text-gray-500">Required for Long Island, Staten Island, and some outer borough areas</p>
                <p className="text-xs text-gray-500">Requerido para Long Island, Staten Island, y algunas áreas exteriores</p>
                <p className="text-xs text-green-600 font-medium mt-1">+$5/hr bonus for driving locations (Long Island, NJ) / +$5/hr bonificación para ubicaciones con manejo</p>
              </div>
            </label>
          </div>

          <div>
            <div>
              <label className="block text-sm font-medium text-[#1E2A4A] mb-2">Do you bring your own cleaning supplies &amp; equipment? / ¿Trae sus propios suministros y equipo de limpieza? *</label>
              <div className="grid grid-cols-2 gap-3">
                <label className={`flex items-center gap-3 px-3 py-3 border rounded-lg cursor-pointer ${!form.labor_only ? 'border-[#1E2A4A] bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                  <input
                    type="radio"
                    name="supplies"
                    checked={!form.labor_only}
                    onChange={() => setForm({ ...form, labor_only: false })}
                    className="w-4 h-4"
                  />
                  <div>
                    <span className="text-sm font-medium text-[#1E2A4A]">Yes / Sí</span>
                    <p className="text-xs text-green-600 font-medium">$30/hr</p>
                  </div>
                </label>
                <label className={`flex items-center gap-3 px-3 py-3 border rounded-lg cursor-pointer ${form.labor_only ? 'border-[#1E2A4A] bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                  <input
                    type="radio"
                    name="supplies"
                    checked={form.labor_only}
                    onChange={() => setForm({ ...form, labor_only: true })}
                    className="w-4 h-4"
                  />
                  <div>
                    <span className="text-sm font-medium text-[#1E2A4A]">No — labor only / Solo mano de obra</span>
                    <p className="text-xs text-blue-600 font-medium">$25/hr</p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1E2A4A] mb-1">How far will you travel? / ¿Qué tan lejos viajará?</label>
            <select
              value={form.max_travel_minutes}
              onChange={(e) => setForm({ ...form, max_travel_minutes: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-[#1E2A4A] text-base"
            >
              <option value="">Select... / Seleccionar...</option>
              <option value="30">Up to 30 min / Hasta 30 min</option>
              <option value="45">Up to 45 min / Hasta 45 min</option>
              <option value="60">Up to 1 hour / Hasta 1 hora</option>
              <option value="90">Up to 1.5 hours / Hasta 1.5 horas</option>
              <option value="120">Up to 2 hours / Hasta 2 horas</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1E2A4A] mb-1">References / Referencias *</label>
            <p className="text-xs text-gray-500 mb-3">Please provide 3 references / Por favor proporcione 3 referencias</p>
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

          <div>
            <label className="block text-sm font-medium text-[#1E2A4A] mb-1">How did you hear about us? / ¿Cómo se enteró de nosotros? *</label>
            <input
              type="text"
              required
              value={form.referral_source}
              onChange={(e) => setForm({ ...form, referral_source: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-[#1E2A4A] text-base"
              placeholder="e.g. Google, friend, Indeed... / ej. Google, amigo, Indeed..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1E2A4A] mb-1">Anything else? / ¿Algo más?</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-[#1E2A4A] text-base"
              rows={3}
              placeholder="Tell us about yourself... / Cuéntenos sobre usted..."
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 px-4 py-3 rounded-lg">{error}</p>
          )}

          <div className="my-5 p-4 border border-gray-200 rounded-lg bg-gray-50">
            <label className="flex items-start gap-3 cursor-pointer text-[13px] leading-relaxed text-gray-600">
              <input type="checkbox" name="sms_consent" required className="mt-1 min-w-[18px] min-h-[18px]" />
              <span>
                By checking this box, I consent to receive transactional text messages from <strong>The NYC Maid</strong> for appointment confirmations, reminders, and customer support. Reply STOP to opt out. Reply HELP for help. Msg frequency may vary. Msg &amp; data rates may apply.
                <br /><br />
                Al marcar esta casilla, doy mi consentimiento para recibir mensajes de texto de <strong>The NYC Maid</strong> para confirmaciones de citas, recordatorios y atención al cliente. Responda STOP para cancelar. Responda HELP para ayuda.
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
            {loading ? 'Submitting... / Enviando...' : 'Submit Application / Enviar Solicitud'}
          </button>

          <p className="text-xs text-gray-400 text-center">
            Questions? / ¿Preguntas? (212) 202-9030
          </p>
        </form>
      </div>
    </div>
  )
}
