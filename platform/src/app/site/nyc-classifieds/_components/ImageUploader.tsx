'use client'

import { useState, useRef } from 'react'

interface Props {
  images: string[]
  onChange: (images: string[]) => void
  maxImages?: number
}

export default function ImageUploader({ images, onChange, maxImages = 8 }: Props) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const upload = async (file: File) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onChange([...images, data.url])
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    files.slice(0, maxImages - images.length).forEach(upload)
    if (inputRef.current) inputRef.current.value = ''
  }

  const remove = (idx: number) => {
    onChange(images.filter((_, i) => i !== idx))
  }

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
        {images.map((url, i) => (
          <div key={i} style={{ position: 'relative', width: '100px', height: '100px', borderRadius: '0.5rem', overflow: 'hidden' }}>
            <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <button
              onClick={() => remove(i)}
              style={{
                position: 'absolute', top: '4px', right: '4px',
                width: '20px', height: '20px', borderRadius: '50%',
                backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff',
                border: 'none', cursor: 'pointer', fontSize: '12px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              &times;
            </button>
          </div>
        ))}

        {images.length < maxImages && (
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            style={{
              width: '100px', height: '100px', borderRadius: '0.5rem',
              border: '2px dashed #e2e8f0', backgroundColor: '#f8fafc',
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: '#94a3b8', fontSize: '1.5rem',
            }}
          >
            {uploading ? '...' : '+'}
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={handleFiles}
        style={{ display: 'none' }}
      />
      <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
        Up to {maxImages} images. JPEG, PNG, or WebP. Max 5MB each.
      </p>
    </div>
  )
}
