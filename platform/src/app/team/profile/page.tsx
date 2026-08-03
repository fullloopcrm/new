'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTeamAuth } from '../layout'
import AddressAutocomplete from '@/components/AddressAutocomplete'
import { SERVICE_ZONES } from '@/lib/service-zones'
import { uploadViaSignedUrl } from '@/lib/client-upload'

type Profile = {
  name: string | null
  email: string | null
  address: string | null
  avatar_url: string | null
  preferred_language: string | null
  service_zones: string[] | null
  has_car: boolean | null
  labor_only: boolean | null
  max_travel_minutes: number | null
}

const EMPTY_PROFILE: Profile = {
  name: '', email: '', address: '', avatar_url: null, preferred_language: 'en',
  service_zones: [], has_car: false, labor_only: false, max_travel_minutes: null,
}

export default function TeamProfilePage() {
  const { auth, authLoaded, t } = useTeamAuth()
  const router = useRouter()
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!authLoaded) return
    if (!auth) { router.push('/team/login'); return }
    fetch('/api/team-portal/profile', {
      headers: { Authorization: `Bearer ${auth.token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.profile) {
          setProfile({
            ...EMPTY_PROFILE,
            ...data.profile,
            service_zones: data.profile.service_zones || [],
          })
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [auth, authLoaded, router])

  function toggleZone(zoneId: string) {
    setProfile((prev) => {
      const zones = prev.service_zones || []
      const next = zones.includes(zoneId) ? zones.filter((z) => z !== zoneId) : [...zones, zoneId]
      return { ...prev, service_zones: next }
    })
  }

  async function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !auth) return
    setUploadingPhoto(true)
    setError('')
    try {
      const url = await uploadViaSignedUrl(file, 'photo')
      setProfile((prev) => ({ ...prev, avatar_url: url }))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('Photo upload failed', 'Error al subir la foto'))
    }
    setUploadingPhoto(false)
  }

  async function save() {
    if (!auth) return
    setSaving(true)
    setError('')
    const res = await fetch('/api/team-portal/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
      body: JSON.stringify({
        name: profile.name,
        email: profile.email,
        address: profile.address,
        avatar_url: profile.avatar_url,
        preferred_language: profile.preferred_language,
        service_zones: profile.service_zones,
        has_car: profile.has_car,
        labor_only: profile.labor_only,
        max_travel_minutes: profile.max_travel_minutes,
      }),
    })
    setSaving(false)
    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } else {
      setError(t('Could not save. Try again.', 'No se pudo guardar. Intente de nuevo.'))
    }
  }

  if (!auth || loading) return null

  return (
    <div className="pb-20">
      <h1 className="text-xl font-bold text-slate-800 mb-6">{t('Profile', 'Perfil')}</h1>

      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
        <h2 className="font-semibold text-slate-800 mb-3">{t('Photo', 'Foto')}</h2>
        <div className="flex items-center gap-4">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-gray-300" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center text-2xl text-gray-400">
              📷
            </div>
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingPhoto}
            className="px-4 py-2 border border-gray-300 rounded-lg text-slate-700 text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            {uploadingPhoto ? t('Uploading...', 'Subiendo...') : t('Change Photo', 'Cambiar Foto')}
          </button>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoSelect} className="hidden" />
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 space-y-4">
        <h2 className="font-semibold text-slate-800">{t('Contact Info', 'Información de Contacto')}</h2>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">{t('Name', 'Nombre')}</label>
          <input
            value={profile.name || ''}
            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-slate-800"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">{t('Email', 'Correo Electrónico')}</label>
          <input
            type="email"
            value={profile.email || ''}
            onChange={(e) => setProfile({ ...profile, email: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-slate-800"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">{t('Address', 'Dirección')}</label>
          <AddressAutocomplete
            value={profile.address || ''}
            onChange={(val) => setProfile({ ...profile, address: val })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-slate-800"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">{t('Preferred Language', 'Idioma Preferido')}</label>
          <select
            value={profile.preferred_language || 'en'}
            onChange={(e) => setProfile({ ...profile, preferred_language: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-slate-800 bg-white"
          >
            <option value="en">English</option>
            <option value="es">Español</option>
            <option value="ru">Русский</option>
          </select>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
        <h2 className="font-semibold text-slate-800 mb-1">{t('Where can you work?', '¿Dónde puede trabajar?')}</h2>
        <p className="text-xs text-slate-400 mb-3">{t('Select all areas you can service', 'Seleccione todas las áreas donde puede dar servicio')}</p>
        <div className="space-y-2">
          {SERVICE_ZONES.map((zone) => {
            const selected = (profile.service_zones || []).includes(zone.id)
            return (
              <label key={zone.id} className={`flex items-center gap-3 px-3 py-2.5 border rounded-lg cursor-pointer ${selected ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                <input type="checkbox" checked={selected} onChange={() => toggleZone(zone.id)} className="w-4 h-4 rounded border-gray-300 text-green-600" />
                <span className="text-sm text-slate-800">{t(zone.label, zone.labelES)}</span>
                {zone.car_required && <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">{t('Car needed', 'Auto requerido')}</span>}
              </label>
            )
          })}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 space-y-4">
        <h2 className="font-semibold text-slate-800">{t('Transport & Supplies', 'Transporte y Suministros')}</h2>
        <button
          type="button"
          onClick={() => setProfile({ ...profile, has_car: !profile.has_car })}
          className="w-full flex items-center justify-between"
        >
          <span className="text-sm text-slate-800">{t('Do you have a car?', '¿Tiene auto?')}</span>
          <span className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${profile.has_car ? 'bg-green-500' : 'bg-slate-300'}`}>
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${profile.has_car ? 'left-5' : 'left-0.5'}`} />
          </span>
        </button>
        <button
          type="button"
          onClick={() => setProfile({ ...profile, labor_only: !profile.labor_only })}
          className="w-full flex items-center justify-between"
        >
          <span className="text-sm text-slate-800">{t('Labor only (no supplies)?', '¿Solo mano de obra (sin suministros)?')}</span>
          <span className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${profile.labor_only ? 'bg-amber-500' : 'bg-slate-300'}`}>
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${profile.labor_only ? 'left-5' : 'left-0.5'}`} />
          </span>
        </button>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">{t('How far will you travel?', '¿Qué tan lejos viajará?')}</label>
          <select
            value={profile.max_travel_minutes ?? ''}
            onChange={(e) => setProfile({ ...profile, max_travel_minutes: e.target.value ? Number(e.target.value) : null })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-slate-800 bg-white"
          >
            <option value="">{t('Select...', 'Seleccionar...')}</option>
            <option value="30">{t('Up to 30 min', 'Hasta 30 min')}</option>
            <option value="45">{t('Up to 45 min', 'Hasta 45 min')}</option>
            <option value="60">{t('Up to 1 hour', 'Hasta 1 hora')}</option>
            <option value="90">{t('Up to 1.5 hours', 'Hasta 1.5 horas')}</option>
            <option value="120">{t('Up to 2 hours', 'Hasta 2 horas')}</option>
          </select>
        </div>
      </div>

      {error && <p className="text-red-600 text-sm bg-red-50 px-4 py-3 rounded-lg mb-4">{error}</p>}

      <button onClick={save} disabled={saving} className="w-full bg-slate-800 text-white py-3 rounded-xl font-medium disabled:opacity-50">
        {saving ? t('Saving...', 'Guardando...') : saved ? t('Saved!', '¡Guardado!') : t('Save', 'Guardar')}
      </button>
    </div>
  )
}
