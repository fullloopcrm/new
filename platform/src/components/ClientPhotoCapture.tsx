'use client'

import { useState } from 'react'

interface ClientPhotoCaptureProps {
  bookingId: string
  token: string
}

export default function ClientPhotoCapture({ bookingId, token }: ClientPhotoCaptureProps) {
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
        if (file.size > 8 * 1024 * 1024) { setError('Photo too large (max 8MB)'); continue }
        const form = new FormData()
        form.append('file', file)
        form.append('booking_id', bookingId)
        const res = await fetch('/api/portal/photos', {
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
    <div className="text-sm">
      <label className={`inline-block px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-medium cursor-pointer ${uploading ? 'opacity-50' : 'hover:bg-slate-50'}`}>
        {uploading ? 'Uploading…' : '📷 Send a photo'}
        <input type="file" accept="image/*" multiple className="hidden" disabled={uploading} onChange={handleUpload} />
      </label>
      {count > 0 && <span className="text-xs text-green-600 ml-2">{count} sent</span>}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}
