'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTeamAuth } from '../../layout'

export default function CheckOutPage() {
  const { bookingId } = useParams<{ bookingId: string }>()
  const { auth, t } = useTeamAuth()
  const router = useRouter()
  const [status, setStatus] = useState<'idle' | 'getting-gps' | 'confirming' | 'done'>('idle')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [result, setResult] = useState<{ hours_worked: number; earnings: number } | null>(null)
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

  async function checkOut() {
    if (!auth) return
    setStatus('done')
    const res = await fetch('/api/team-portal/checkout', {
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
    const data = await res.json()
    if (res.ok) {
      setResult({ hours_worked: data.hours_worked, earnings: data.earnings })
    } else {
      setError(data.error || 'Check-out failed')
      setStatus('confirming')
    }
  }

  if (!auth) {
    router.push('/team/login')
    return null
  }

  return (
    <div className="flex flex-col items-center pt-12">
      <h1 className="text-xl font-bold text-gray-900 mb-2">{t('Check Out', 'Registro de Salida')}</h1>
      <p className="text-sm text-gray-500 mb-8">{t('Verify your location to complete', 'Verifica tu ubicación para completar')}</p>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {status === 'idle' && (
        <button onClick={getLocation} className="w-40 h-40 rounded-full bg-gray-900 text-white flex flex-col items-center justify-center text-lg font-bold">
          <span className="text-3xl mb-1">📍</span>
          {t('Get GPS', 'Obtener GPS')}
        </button>
      )}

      {status === 'getting-gps' && (
        <div className="w-40 h-40 rounded-full bg-gray-200 flex items-center justify-center">
          <p className="text-sm text-gray-500 text-center">{t('Getting location...', 'Obteniendo ubicación...')}</p>
        </div>
      )}

      {status === 'confirming' && coords && (
        <div className="text-center">
          <div className="w-40 h-40 rounded-full bg-blue-50 border-4 border-blue-500 flex flex-col items-center justify-center mb-4">
            <span className="text-3xl mb-1">✓</span>
            <p className="text-xs text-blue-700 font-mono">{coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}</p>
          </div>
          <button onClick={checkOut} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-medium">
            {t('Confirm Check Out', 'Confirmar Salida')}
          </button>
        </div>
      )}

      {status === 'done' && result && (
        <div className="text-center space-y-4">
          <p className="text-green-600 font-bold text-lg">{t('Job Complete!', '¡Trabajo Completado!')}</p>
          <div className="bg-white border border-gray-200 rounded-xl p-6 w-64">
            <p className="text-sm text-gray-400">{t('Hours Worked', 'Horas Trabajadas')}</p>
            <p className="text-2xl font-bold text-gray-900">{result.hours_worked.toFixed(1)}</p>
            <p className="text-sm text-gray-400 mt-3">{t('Earnings', 'Ganancias')}</p>
            <p className="text-2xl font-bold text-green-600">${result.earnings.toFixed(2)}</p>
          </div>
        </div>
      )}

      <button onClick={() => router.push('/team')} className="mt-8 text-sm text-gray-400">
        {t('Back', 'Volver')}
      </button>
    </div>
  )
}
