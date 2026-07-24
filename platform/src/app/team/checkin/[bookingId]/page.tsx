'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTeamAuth } from '../../layout'
import PhotoCapture from '@/components/PhotoCapture'
import TeamChecklist from '@/components/TeamChecklist'

export default function CheckInPage() {
  const { bookingId } = useParams<{ bookingId: string }>()
  const { auth, authLoaded, t } = useTeamAuth()
  const router = useRouter()
  const [status, setStatus] = useState<'idle' | 'checking-in' | 'done'>('idle')
  const [error, setError] = useState('')

  function getLocation(): Promise<{ lat: number; lng: number } | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null)
        return
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10000 }
      )
    })
  }

  async function checkIn() {
    if (!auth) return
    setStatus('checking-in')
    setError('')
    const location = await getLocation()
    const res = await fetch('/api/team-portal/checkin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.token}`,
      },
      body: JSON.stringify({
        booking_id: bookingId,
        lat: location?.lat,
        lng: location?.lng,
      }),
    })
    if (res.ok) {
      setStatus('done')
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error || t('Could not check in. Make sure location is on and you are at the job address.', 'No se pudo registrar. Verifica que la ubicación esté activada y que estés en la dirección.'))
      setStatus('idle')
    }
  }

  // Wait for the layout's localStorage read before deciding the member is
  // logged out -- auth is null both while that read is pending AND when
  // truly logged out, and redirecting on the former bounces an already
  // -authenticated cleaner back to the PIN screen on every fresh page load.
  useEffect(() => {
    if (authLoaded && !auth) router.push('/team/login')
  }, [authLoaded, auth, router])

  if (!authLoaded || !auth) return null

  return (
    <div className="flex flex-col items-center pt-12">
      <h1 className="text-xl font-bold text-slate-800 mb-2">{t('Check In', 'Registro de Entrada')}</h1>
      <p className="text-sm text-slate-400 mb-8">{t('Tap to check in at this job', 'Toca para registrar tu entrada')}</p>

      {error && <p className="text-red-500 text-sm mb-4 text-center max-w-xs">{error}</p>}

      {status === 'idle' && (
        <button
          onClick={checkIn}
          className="w-40 h-40 rounded-full bg-slate-800 text-white flex flex-col items-center justify-center text-lg font-bold"
        >
          <span className="text-3xl mb-1">📍</span>
          {t('Check In', 'Registrar Entrada')}
        </button>
      )}

      {status === 'checking-in' && (
        <div className="w-40 h-40 rounded-full bg-gray-200 flex items-center justify-center">
          <p className="text-sm text-slate-400 text-center">{t('Checking in...', 'Registrando...')}</p>
        </div>
      )}

      {status === 'done' && (
        <div className="text-center space-y-4">
          <div className="w-40 h-40 mx-auto rounded-full bg-green-50 border-4 border-green-500 flex flex-col items-center justify-center">
            <span className="text-3xl mb-1">✓</span>
            <p className="text-green-600 font-bold">{t('Checked In!', '¡Registrado!')}</p>
          </div>
          <button
            onClick={() => router.push('/team')}
            className="bg-slate-800 text-white px-8 py-3 rounded-xl font-medium"
          >
            {t('Continue', 'Continuar')}
          </button>
          <div className="w-full max-w-sm mx-auto space-y-3 pt-4 border-t border-gray-100">
            <p className="text-xs text-slate-400">{t('Optional', 'Opcional')}</p>
            <PhotoCapture bookingId={bookingId} photoType="before" token={auth!.token} t={t} />
            <TeamChecklist bookingId={bookingId} token={auth!.token} t={t} />
          </div>
        </div>
      )}

      {status === 'idle' && (
        <button onClick={() => router.push('/team')} className="mt-8 text-sm text-slate-400">
          {t('Back', 'Volver')}
        </button>
      )}
    </div>
  )
}
