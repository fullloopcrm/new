'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTeamAuth } from '../../layout'
import VideoUpload from '@/components/VideoUpload'

export default function CheckInPage() {
  const { bookingId } = useParams<{ bookingId: string }>()
  const { auth, t } = useTeamAuth()
  const router = useRouter()
  const [status, setStatus] = useState<'idle' | 'getting-gps' | 'confirming' | 'done'>('idle')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [error, setError] = useState('')

  function getLocation() {
    setStatus('getting-gps')
    setError('')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setStatus('confirming')
      },
      (err) => {
        setError(t('Could not get location: ', 'No se pudo obtener ubicación: ') + err.message)
        setStatus('idle')
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  async function checkIn() {
    if (!auth) return
    setStatus('done')
    const res = await fetch('/api/team-portal/checkin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.token}`,
      },
      body: JSON.stringify({
        booking_id: bookingId,
        lat: coords?.lat,
        lng: coords?.lng,
      }),
    })
    if (res.ok) {
      // Stay on page so team member can upload walkthrough video
      setStatus('done')
    } else {
      const data = await res.json()
      setError(data.error || 'Check-in failed')
      setStatus('confirming')
    }
  }

  if (!auth) {
    router.push('/team/login')
    return null
  }

  return (
    <div className="flex flex-col items-center pt-12">
      <h1 className="text-xl font-bold text-slate-800 mb-2">{t('Check In', 'Registro de Entrada')}</h1>
      <p className="text-sm text-slate-400 mb-8">{t('Verify your location to start the job', 'Verifica tu ubicación para iniciar')}</p>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {status === 'idle' && (
        <button
          onClick={getLocation}
          className="w-40 h-40 rounded-full bg-slate-800 text-white flex flex-col items-center justify-center text-lg font-bold"
        >
          <span className="text-3xl mb-1">📍</span>
          {t('Get GPS', 'Obtener GPS')}
        </button>
      )}

      {status === 'getting-gps' && (
        <div className="w-40 h-40 rounded-full bg-gray-200 flex items-center justify-center">
          <p className="text-sm text-slate-400 text-center">{t('Getting location...', 'Obteniendo ubicación...')}</p>
        </div>
      )}

      {status === 'confirming' && coords && (
        <div className="text-center">
          <div className="w-40 h-40 rounded-full bg-green-50 border-4 border-green-500 flex flex-col items-center justify-center mb-4">
            <span className="text-3xl mb-1">✓</span>
            <p className="text-xs text-green-700 font-mono">{coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}</p>
          </div>
          <button
            onClick={checkIn}
            className="bg-green-600 text-white px-8 py-3 rounded-xl font-medium"
          >
            {t('Confirm Check In', 'Confirmar Entrada')}
          </button>
        </div>
      )}

      {status === 'done' && (
        <div className="text-center space-y-4">
          <p className="text-green-600 font-bold text-lg">{t('Checked In!', '¡Registrado!')}</p>
          <div className="w-full max-w-sm mx-auto">
            <VideoUpload
              bookingId={bookingId}
              type="walkthrough"
              token={auth!.token}
              t={t}
              onUploaded={() => {}}
            />
          </div>
          <button
            onClick={() => router.push('/team')}
            className="bg-slate-800 text-white px-8 py-3 rounded-xl font-medium"
          >
            {t('Continue', 'Continuar')}
          </button>
        </div>
      )}

      {status !== 'done' && (
        <button onClick={() => router.push('/team')} className="mt-8 text-sm text-slate-400">
          {t('Back', 'Volver')}
        </button>
      )}
    </div>
  )
}
