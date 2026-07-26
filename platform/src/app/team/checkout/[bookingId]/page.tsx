'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTeamAuth } from '../../layout'
import PhotoCapture from '@/components/PhotoCapture'
import TeamChecklist from '@/components/TeamChecklist'

export default function CheckOutPage() {
  const { bookingId } = useParams<{ bookingId: string }>()
  const { auth, authLoaded, t } = useTeamAuth()
  const router = useRouter()
  const [status, setStatus] = useState<'idle' | 'checking-out' | 'done'>('idle')
  const [result, setResult] = useState<{ hours_worked: number; earnings: number } | null>(null)
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

  async function checkOut() {
    if (!auth) return
    setStatus('checking-out')
    setError('')
    const location = await getLocation()
    const res = await fetch('/api/team-portal/checkout', {
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
    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      setResult({ hours_worked: data.hours_worked, earnings: data.earnings })
      setStatus('done')
    } else {
      setError(data.error || t('Could not check out. Make sure location is on and you are at the job address.', 'No se pudo registrar la salida. Verifica que la ubicación esté activada.'))
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
      <h1 className="text-xl font-bold text-slate-800 mb-2">{t('Check Out', 'Registro de Salida')}</h1>
      <p className="text-sm text-slate-400 mb-8">{t('Tap to check out of this job', 'Toca para registrar tu salida')}</p>

      {error && <p className="text-red-500 text-sm mb-4 text-center max-w-xs">{error}</p>}

      {status === 'idle' && (
        <button onClick={checkOut} className="w-40 h-40 rounded-full bg-slate-800 text-white flex flex-col items-center justify-center text-lg font-bold">
          <span className="text-3xl mb-1">📍</span>
          {t('Check Out', 'Registrar Salida')}
        </button>
      )}

      {status === 'checking-out' && (
        <div className="w-40 h-40 rounded-full bg-gray-200 flex items-center justify-center">
          <p className="text-sm text-slate-400 text-center">{t('Checking out...', 'Registrando...')}</p>
        </div>
      )}

      {status === 'done' && result && (
        <div className="text-center space-y-4">
          <p className="text-green-600 font-bold text-lg">{t('Job Complete!', '¡Trabajo Completado!')}</p>
          <div className="bg-white border border-gray-200 rounded-xl p-6 w-64 mx-auto">
            <p className="text-sm text-slate-400">{t('Hours Worked', 'Horas Trabajadas')}</p>
            <p className="text-2xl font-bold text-slate-800">{result.hours_worked.toFixed(1)}</p>
            <p className="text-sm text-slate-400 mt-3">{t('Earnings', 'Ganancias')}</p>
            <p className="text-2xl font-bold text-green-600">${result.earnings.toFixed(2)}</p>
          </div>
          <div className="w-full max-w-sm mx-auto space-y-3 pt-4 border-t border-gray-100">
            <p className="text-xs text-slate-400">{t('Optional', 'Opcional')}</p>
            <PhotoCapture bookingId={bookingId} photoType="after" token={auth!.token} t={t} />
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
