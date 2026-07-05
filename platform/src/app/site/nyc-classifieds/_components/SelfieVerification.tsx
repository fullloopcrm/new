'use client'

import { useState, useRef, useCallback } from 'react'

interface Props {
  onVerified: () => void
  /** When provided, parent handles the upload. Receives (blob, geoCoords). */
  onSubmit?: (blob: Blob, geoCoords: { lat: number; lon: number }) => Promise<void>
}

export default function SelfieVerification({ onVerified, onSubmit }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [streaming, setStreaming] = useState(false)
  const [captured, setCaptured] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [geoCoords, setGeoCoords] = useState<{ lat: number; lon: number } | null>(null)

  const requestLocation = useCallback(() => {
    navigator.geolocation.getCurrentPosition(
      pos => {
        setGeoCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude })
        setError('')
      },
      err => {
        console.error('Geolocation error:', err.code, err.message)
        if (err.code === 1) {
          setError('Location access denied. Please enable location services.')
        } else if (err.code === 3) {
          setError('Location request timed out. Please try again.')
        } else {
          setError('Could not get your location. Please try again.')
        }
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 30000 }
    )
  }, [])

  const startCamera = useCallback(async () => {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setStreaming(true)
      }

      // Get geolocation simultaneously
      requestLocation()
    } catch {
      setError('Camera access denied. Please enable camera permissions.')
    }
  }, [requestLocation])

  const capture = () => {
    if (!videoRef.current || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    ctx.drawImage(videoRef.current, 0, 0)
    setCaptured(true)

    // Stop camera
    const stream = videoRef.current.srcObject as MediaStream
    stream?.getTracks().forEach(t => t.stop())
  }

  const retake = () => {
    setCaptured(false)
    startCamera()
  }

  const submit = async () => {
    if (!canvasRef.current) return
    if (!geoCoords) {
      setError('Getting your location... Please wait and try again.')
      requestLocation()
      return
    }

    setUploading(true)
    setError('')

    try {
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvasRef.current!.toBlob(
          b => (b ? resolve(b) : reject(new Error('Failed to capture image'))),
          'image/jpeg',
          0.85
        )
      })

      if (onSubmit) {
        // Parent handles the full submission (used by signup flow)
        await onSubmit(blob, geoCoords)
        onVerified()
      } else {
        // Default: call verify-location directly (used by re-verification)
        const formData = new FormData()
        formData.append('selfie', blob, 'selfie.jpg')
        formData.append('lat', String(geoCoords.lat))
        formData.append('lon', String(geoCoords.lon))

        const res = await fetch('/api/auth/verify-location', {
          method: 'POST',
          body: formData,
        })

        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Verification failed')

        onVerified()
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Verification failed'
      setError(msg)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      {!streaming && !captured && (
        <button onClick={startCamera} style={{
          width: '100%',
          padding: '1rem',
          borderRadius: '0.75rem',
          border: '2px dashed #e2e8f0',
          backgroundColor: '#f8fafc',
          cursor: 'pointer',
          color: '#475569',
          fontSize: '1rem',
        }}>
          Open Camera
        </button>
      )}

      <video
        ref={videoRef}
        style={{
          width: '100%',
          borderRadius: '0.75rem',
          display: streaming && !captured ? 'block' : 'none',
          backgroundColor: '#000',
        }}
        playsInline
        muted
      />

      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          borderRadius: '0.75rem',
          display: captured ? 'block' : 'none',
        }}
      />

      {streaming && !captured && (
        <button onClick={capture} style={{
          width: '100%',
          padding: '0.75rem',
          borderRadius: '0.5rem',
          border: 'none',
          backgroundColor: '#2563eb',
          color: '#fff',
          fontSize: '1rem',
          fontWeight: 600,
          cursor: 'pointer',
          marginTop: '1rem',
        }}>
          Capture Photo
        </button>
      )}

      {captured && (
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
          <button onClick={retake} style={{
            flex: 1,
            padding: '0.75rem',
            borderRadius: '0.5rem',
            border: '1px solid #e2e8f0',
            backgroundColor: '#fff',
            color: '#475569',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}>
            Retake
          </button>
          <button onClick={submit} disabled={uploading} style={{
            flex: 2,
            padding: '0.75rem',
            borderRadius: '0.5rem',
            border: 'none',
            backgroundColor: '#16a34a',
            color: '#fff',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}>
            {uploading ? 'Verifying...' : !geoCoords ? 'Retry Location' : 'Verify & Submit'}
          </button>
        </div>
      )}

      {geoCoords && streaming && (
        <p style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '0.5rem', textAlign: 'center' }}>
          Location acquired
        </p>
      )}

      {error && (
        <div style={{ marginTop: '0.75rem' }}>
          <p style={{ color: '#dc2626', fontSize: '0.875rem', marginBottom: '0.5rem' }}>{error}</p>
          {error.toLowerCase().includes('location') && (
            <div style={{
              backgroundColor: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '0.5rem',
              padding: '0.75rem 1rem', fontSize: '0.8125rem', color: '#9a3412', lineHeight: 1.6,
            }}>
              <strong>How to enable location:</strong>
              <ul style={{ margin: '0.375rem 0 0', paddingLeft: '1.25rem' }}>
                <li><strong>iPhone Safari:</strong> Settings &gt; Privacy &amp; Security &gt; Location Services &gt; Safari Websites &gt; Allow</li>
                <li><strong>iPhone Chrome:</strong> Settings &gt; Chrome &gt; Location &gt; Allow</li>
                <li><strong>Android Chrome:</strong> Tap the lock icon in the address bar &gt; Permissions &gt; Location &gt; Allow</li>
                <li><strong>Desktop Chrome:</strong> Click the lock icon in the address bar &gt; Site settings &gt; Location &gt; Allow</li>
                <li><strong>Desktop Safari:</strong> Safari &gt; Settings &gt; Websites &gt; Location &gt; Allow</li>
              </ul>
              <p style={{ margin: '0.375rem 0 0', fontSize: '0.75rem', color: '#c2410c' }}>After changing settings, refresh this page and try again.</p>
            </div>
          )}
          {error.toLowerCase().includes('camera') && (
            <div style={{
              backgroundColor: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '0.5rem',
              padding: '0.75rem 1rem', fontSize: '0.8125rem', color: '#9a3412', lineHeight: 1.6,
            }}>
              <strong>How to enable camera:</strong>
              <ul style={{ margin: '0.375rem 0 0', paddingLeft: '1.25rem' }}>
                <li><strong>iPhone Safari:</strong> Settings &gt; Safari &gt; Camera &gt; Allow</li>
                <li><strong>iPhone Chrome:</strong> Settings &gt; Chrome &gt; Camera &gt; Allow</li>
                <li><strong>Android Chrome:</strong> Tap the lock icon in the address bar &gt; Permissions &gt; Camera &gt; Allow</li>
                <li><strong>Desktop Chrome:</strong> Click the lock icon in the address bar &gt; Site settings &gt; Camera &gt; Allow</li>
                <li><strong>Desktop Safari:</strong> Safari &gt; Settings &gt; Websites &gt; Camera &gt; Allow</li>
              </ul>
              <p style={{ margin: '0.375rem 0 0', fontSize: '0.75rem', color: '#c2410c' }}>After changing settings, refresh this page and try again.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
