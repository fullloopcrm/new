'use client'

import { useState } from 'react'

interface PhotoCaptureProps {
  bookingId: string
  photoType: 'before' | 'after' | 'progress'
  token: string
  t: (en: string, es: string) => string
}

export default function PhotoCapture({ bookingId, photoType, token, t }: PhotoCaptureProps) {
  const [uploading, setUploading] = useState(false)
  const [count, setCount] = useState(0)
  const [error, setError] = useState('')

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploading(true)
    setError('')
    try {
      for (const file of Array.from(files)) {
        if (file.size > 8 * 1024 * 1024) {
          setError(t('Photo too large (max 8MB)', 'Foto muy grande (max 8MB)'))
          continue
        }
        const form = new FormData()
        form.append('file', file)
        form.append('booking_id', bookingId)
        form.append('photo_type', photoType)
        const res = await fetch('/api/team-portal/photos', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        })
        if (res.ok) setCount((c) => c + 1)
      }
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div className="text-center">
      <label className={`inline-block px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium cursor-pointer ${uploading ? 'opacity-50' : 'hover:bg-slate-50'}`}>
        {uploading ? t('Uploading…', 'Subiendo…') : t('Add job photos', 'Agregar fotos')}
        <input type="file" accept="image/*" multiple className="hidden" disabled={uploading} onChange={handleUpload} />
      </label>
      {count > 0 && <p className="text-xs text-green-600 mt-1">{count} {t('photo(s) uploaded', 'foto(s) subida(s)')}</p>}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}
