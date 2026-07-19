'use client'

import { useState } from 'react'
import { VIDEO_MAX_SIZE, MAX_VIDEO_DURATION_SECONDS } from '@/lib/job-video'

interface PhotoCaptureProps {
  bookingId: string
  photoType: 'before' | 'after' | 'progress'
  token: string
  t: (en: string, es: string) => string
}

// Reads a video file's duration client-side (server can't verify this without
// a media-processing step this app doesn't have — see lib/job-video.ts).
function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src)
      resolve(video.duration)
    }
    video.onerror = () => {
      URL.revokeObjectURL(video.src)
      reject(new Error('Could not read video'))
    }
    video.src = URL.createObjectURL(file)
  })
}

export default function PhotoCapture({ bookingId, photoType, token, t }: PhotoCaptureProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadingVideo, setUploadingVideo] = useState(false)
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

  async function handleVideoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingVideo(true)
    setError('')
    try {
      if (file.size > VIDEO_MAX_SIZE) {
        setError(t('Video too large (max 150MB)', 'Video muy grande (max 150MB)'))
        return
      }

      let duration = 0
      try {
        duration = await readVideoDuration(file)
      } catch {
        // Some mobile browsers can't read metadata before upload — proceed
        // without a client-side duration check rather than block the crew.
      }
      if (duration > MAX_VIDEO_DURATION_SECONDS) {
        setError(t('Video too long (max 3 min)', 'Video muy largo (max 3 min)'))
        return
      }

      const params = new URLSearchParams({
        booking_id: bookingId,
        filename: file.name,
        content_type: file.type || 'video/mp4',
      })
      const signedRes = await fetch(`/api/team-portal/photos/signed-url?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!signedRes.ok) {
        const err = await signedRes.json().catch(() => ({}))
        throw new Error(err.error || t('Failed to get upload URL', 'Error al obtener URL de subida'))
      }
      const { signedUrl, publicUrl } = await signedRes.json()

      const putRes = await fetch(signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'video/mp4', 'x-upsert': 'true' },
        body: file,
      })
      if (!putRes.ok) throw new Error(t('Upload failed', 'Error al subir'))

      const saveRes = await fetch('/api/team-portal/photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          booking_id: bookingId,
          url: publicUrl,
          photo_type: photoType,
          duration_seconds: duration || null,
        }),
      })
      if (!saveRes.ok) throw new Error(t('Failed to save video', 'Error al guardar video'))

      setCount((c) => c + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('Upload failed', 'Error al subir'))
    } finally {
      setUploadingVideo(false)
      e.target.value = ''
    }
  }

  return (
    <div className="text-center">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <label className={`inline-block px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium cursor-pointer ${uploading ? 'opacity-50' : 'hover:bg-slate-50'}`}>
          {uploading ? t('Uploading…', 'Subiendo…') : t('Add job photos', 'Agregar fotos')}
          <input type="file" accept="image/*" multiple className="hidden" disabled={uploading} onChange={handleUpload} />
        </label>
        <label className={`inline-block px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium cursor-pointer ${uploadingVideo ? 'opacity-50' : 'hover:bg-slate-50'}`}>
          {uploadingVideo ? t('Uploading…', 'Subiendo…') : t('Add job video', 'Agregar video')}
          <input type="file" accept="video/*" capture="environment" className="hidden" disabled={uploadingVideo} onChange={handleVideoUpload} />
        </label>
      </div>
      {count > 0 && <p className="text-xs text-green-600 mt-1">{count} {t('item(s) uploaded', 'archivo(s) subido(s)')}</p>}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}
