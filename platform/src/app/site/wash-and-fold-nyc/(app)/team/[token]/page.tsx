// @ts-nocheck
'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import TranslatedNotes from '@/app/site/wash-and-fold-nyc/_components/TranslatedNotes'
import VideoUpload from '@/app/site/wash-and-fold-nyc/_components/VideoUpload'

interface Booking {
  id: string
  start_time: string
  end_time: string
  service_type: string
  notes: string | null
  check_in_time: string | null
  fifteen_min_alert_time: string | null
  check_out_time: string | null
  status: string
  hourly_rate: number | null
  walkthrough_video_url: string | null
  final_video_url: string | null
  clients: {
    name: string
    phone: string
    address: string
    notes: string | null
  } | null
  cleaners: {
    name: string
  } | null
}

export default function TeamPortalPage() {
  useEffect(() => { document.title = 'Team Portal | The NYC Wash and Fold Service Company' }, []);
  const params = useParams()
  const token = params.token as string
  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [checkingIn, setCheckingIn] = useState(false)
  const [checkingOut, setCheckingOut] = useState(false)
  const [alertSent, setAlertSent] = useState(false)

  // Initialize alertSent from booking data (persists across page reloads)
  useEffect(() => {
    if (booking?.fifteen_min_alert_time) setAlertSent(true)
  }, [booking])
  const [locationStatus, setLocationStatus] = useState('')

  useEffect(() => {
    loadBooking()
  }, [token])

  const loadBooking = async () => {
    const res = await fetch(`/api/team/${token}`)
    if (res.ok) {
      const data = await res.json()
      setBooking(data)
    } else {
      setError('Invalid or expired link / Enlace inválido o expirado')
    }
    setLoading(false)
  }

  const getLocation = (): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setLocationStatus('Location not supported / Ubicación no soportada')
        resolve(null)
        return
      }
      setLocationStatus('Getting location... / Obteniendo ubicación...')
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocationStatus('')
          resolve({ lat: position.coords.latitude, lng: position.coords.longitude })
        },
        (err) => {
          setLocationStatus('Location denied - continuing / Ubicación denegada - continuando')
          resolve(null)
        },
        { enableHighAccuracy: true, timeout: 10000 }
      )
    })
  }

  const handleCheckIn = async () => {
    setCheckingIn(true)
    const location = await getLocation()

    const res = await fetch(`/api/team/${token}/check-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ location })
    })

    if (res.ok) {
      loadBooking()
    } else {
      setError('Failed to check in / Error al registrar entrada')
    }
    setCheckingIn(false)
  }

  const handleCheckOut = async () => {
    setCheckingOut(true)
    const location = await getLocation()

    const res = await fetch(`/api/team/${token}/check-out`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ location })
    })

    if (res.ok) {
      loadBooking()
    } else {
      setError('Failed to check out / Error al registrar salida')
    }
    setCheckingOut(false)
  }

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-500 text-lg">Loading... / Cargando...</p>
      </div>
    )
  }

  if (error && !booking) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#1E2A4A] mb-2">Link Expired / Enlace Expirado</h1>
          <p className="text-gray-500">This job link is no longer valid. Contact the office for assistance.</p>
          <p className="text-gray-500">Este enlace ya no es válido. Contacta la oficina para ayuda.</p>
          <p className="text-gray-500 mt-4">
            Office / Oficina: <a href="tel:9179706002" className="text-[#1E2A4A]">(917) 970-6002</a>
          </p>
        </div>
      </div>
    )
  }

  if (!booking) return null

  const isCheckedIn = !!booking.check_in_time
  const isCheckedOut = !!booking.check_out_time
  const isCompleted = booking.status === 'completed' || isCheckedOut

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#1E2A4A] text-white p-4">
        <p className="text-sm opacity-80">The NYC Wash and Fold Service Company</p>
        <h1 className="text-xl font-semibold">{booking.cleaners?.name || 'Team Member'}</h1>
      </div>

      {/* Job Card */}
      <div className="p-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Date/Time Header */}
          <div className="bg-gray-50 p-4 border-b border-gray-200">
            <p className="text-lg font-semibold text-[#1E2A4A]">{formatDate(booking.start_time)}</p>
            <p className="text-gray-600">{formatTime(booking.start_time)} - {formatTime(booking.end_time)}</p>
          </div>

          {/* Client Info */}
          <div className="p-4 space-y-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Client / Cliente</p>
              <p className="text-lg font-medium text-[#1E2A4A]">{booking.clients?.name || 'N/A'}</p>
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-1">Address / Dirección</p>
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(booking.clients?.address || '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-lg text-[#1E2A4A] underline"
              >
                {booking.clients?.address || 'N/A'}
              </a>
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-1">Phone / Teléfono</p>
              <a
                href={`tel:${booking.clients?.phone}`}
                className="text-lg text-[#1E2A4A] underline"
              >
                {booking.clients?.phone || 'N/A'}
              </a>
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-1">Service / Servicio</p>
              <p className="text-[#1E2A4A]">{booking.service_type}</p>
            </div>

            {(booking.clients?.notes || booking.notes) && (
              <div className="p-4 rounded-xl border-2 bg-[#A8F0DC]/20 border-[#A8F0DC]/30">
                <TranslatedNotes text={[booking.clients?.notes, booking.notes].filter(Boolean).join('\n\n')} label="Notes / Notas" />
              </div>
            )}
          </div>
        </div>

        {/* Check In/Out Status */}
        {(isCheckedIn || isCheckedOut) && (
          <div className="mt-4 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-500 mb-2">Status / Estado</p>
            {isCheckedIn && (
              <p className="text-green-600 font-medium">
                ✓ Checked in at / Entrada a las {formatTime(booking.check_in_time!)}
              </p>
            )}
            {isCheckedOut && (
              <p className="text-green-600 font-medium">
                ✓ Checked out at / Salida a las {formatTime(booking.check_out_time!)}
              </p>
            )}
          </div>
        )}

        {/* Location Status */}
        {locationStatus && (
          <p className="text-center text-gray-500 mt-4">{locationStatus}</p>
        )}

        {/* Error */}
        {error && (
          <p className="text-center text-red-500 mt-4">{error}</p>
        )}

        {/* Action Buttons */}
        <div className="mt-6 space-y-3">
          {!isCheckedIn && !isCompleted && (
            <button
              onClick={handleCheckIn}
              disabled={checkingIn}
              className="w-full py-4 bg-green-600 text-white text-lg font-semibold rounded-xl hover:bg-green-700 disabled:opacity-50"
            >
              {checkingIn ? 'Checking In... / Registrando...' : 'Check In / Registrar Entrada'}
            </button>
          )}

          {/* Video Uploads */}
          {isCheckedIn && !isCheckedOut && (
            <div className="space-y-3">
              <VideoUpload
                bookingId={booking.id}
                type="walkthrough"
                existingUrl={booking.walkthrough_video_url}
              />
              <VideoUpload
                bookingId={booking.id}
                type="final"
                existingUrl={booking.final_video_url}
              />
            </div>
          )}

          {isCheckedIn && !isCheckedOut && (
            <>
              {alertSent ? (
                <div className="w-full py-4 bg-green-100 text-green-700 text-lg font-bold rounded-xl text-center">
                  ✓ Text & notification sent / Texto y aviso enviados
                </div>
              ) : (
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/team/15min-alert', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ bookingId: booking.id }),
                      })
                      if (!res.ok) throw new Error('Failed')
                      setAlertSent(true)
                    } catch {
                      alert('Error sending / Error al enviar')
                    }
                  }}
                  className="w-full py-4 bg-yellow-500 text-white text-lg font-bold rounded-xl hover:bg-yellow-600"
                >
                  15-Min Heads Up / Aviso de 15 Min
                </button>
              )}
              <button
                onClick={handleCheckOut}
                disabled={checkingOut}
                className="w-full py-4 bg-red-600 text-white text-lg font-semibold rounded-xl hover:bg-red-700 disabled:opacity-50"
              >
                {checkingOut ? 'Checking Out... / Registrando...' : 'Check Out / Registrar Salida'}
              </button>
            </>
          )}

          {isCompleted && (
            <div className="text-center py-4">
              <p className="text-2xl mb-2">✅</p>
              <p className="text-lg font-semibold text-green-600">Job Complete! / ¡Trabajo Completo!</p>
              <p className="text-gray-500">Great work today. / Buen trabajo hoy.</p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-6 flex gap-3">
          <a
            href={`https://maps.google.com/?q=${encodeURIComponent(booking.clients?.address || '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-3 bg-white border border-gray-300 text-[#1E2A4A] text-center font-medium rounded-xl"
          >
            📍 Navigate / Navegar
          </a>
          <a
            href={`tel:${booking.clients?.phone}`}
            className="flex-1 py-3 bg-white border border-gray-300 text-[#1E2A4A] text-center font-medium rounded-xl"
          >
            📞 Call / Llamar
          </a>
        </div>
      </div>
    </div>
  )
}
