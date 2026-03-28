'use client'

import { useState, useRef } from 'react'

interface VideoUploadProps {
  bookingId: string
  type: 'walkthrough' | 'final'
  existingUrl?: string | null
  token: string
  t: (en: string, es: string) => string
  onUploaded?: (url: string) => void
}

export default function VideoUpload({ bookingId, type, existingUrl, token, t, onUploaded }: VideoUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [videoUrl, setVideoUrl] = useState(existingUrl || null)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const label = type === 'walkthrough'
    ? t('Walkthrough Video', 'Video de Recorrido')
    : t('Final Video', 'Video Final')

  const instruction = type === 'walkthrough'
    ? t('Record a walkthrough before you start', 'Graba un recorrido antes de empezar')
    : t('Record the finished job', 'Graba el trabajo terminado')

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 150 * 1024 * 1024) {
      setError(t('Video too large (max 150MB)', 'Video muy grande (max 150MB)'))
      return
    }

    setError('')
    setUploading(true)
    setProgress(5)

    try {
      // Step 1: Get signed upload URL from server
      setProgress(10)
      const params = new URLSearchParams({
        booking_id: bookingId,
        type,
        filename: file.name,
        content_type: file.type || 'video/mp4',
      })
      const signedRes = await fetch(`/api/team-portal/video-upload?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (!signedRes.ok) {
        const err = await signedRes.json()
        throw new Error(err.error || 'Failed to get upload URL')
      }
      const { signedUrl, publicUrl } = await signedRes.json()

      // Step 2: Upload directly to Supabase via signed URL (bypasses Vercel 4.5MB limit)
      setProgress(15)
      const xhr = new XMLHttpRequest()

      await new Promise<void>((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 75) + 15)
          }
        })

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve()
          } else {
            reject(new Error(`Upload failed (${xhr.status})`))
          }
        })

        xhr.addEventListener('error', () => reject(new Error('Network error during upload')))
        xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')))

        xhr.open('PUT', signedUrl)
        xhr.setRequestHeader('Content-Type', file.type || 'video/mp4')
        xhr.setRequestHeader('x-upsert', 'true')
        xhr.send(file)
      })

      // Step 3: Save reference in database
      setProgress(92)
      const saveRes = await fetch('/api/team-portal/video-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ booking_id: bookingId, type, url: publicUrl }),
      })

      if (!saveRes.ok) {
        throw new Error('Failed to save video reference')
      }

      setProgress(100)
      setVideoUrl(publicUrl)
      onUploaded?.(publicUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('Upload failed', 'Error al subir'))
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  if (videoUrl) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <p className="text-sm font-semibold text-green-700 mb-2">{label}</p>
        <video
          src={videoUrl}
          controls
          className="w-full rounded-lg max-h-[200px]"
          preload="metadata"
        />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-sm font-semibold text-slate-800 mb-1">{label}</p>
      <p className="text-xs text-gray-500 mb-3">{instruction}</p>

      {uploading ? (
        <div className="space-y-2">
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 text-center">
            {t(`Uploading... ${progress}%`, `Subiendo... ${progress}%`)}
          </p>
        </div>
      ) : (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="video/*"
            capture="environment"
            onChange={handleUpload}
            className="hidden"
          />
          <button
            onClick={() => inputRef.current?.click()}
            className="w-full py-3 bg-slate-800 text-white font-semibold rounded-xl hover:bg-slate-700 transition-colors"
          >
            {type === 'walkthrough'
              ? t('Record Walkthrough', 'Grabar Recorrido')
              : t('Record Final', 'Grabar Final')}
          </button>
        </>
      )}

      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
    </div>
  )
}
