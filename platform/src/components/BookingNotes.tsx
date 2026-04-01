'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface BookingNote {
  id: string
  booking_id: string
  author_type: 'admin' | 'client' | 'system'
  author_name: string | null
  content: string | null
  images: string[]
  created_at: string
}

function timeAgo(dateStr: string): string {
  const now = new Date()
  const d = new Date(dateStr)
  const diffMs = now.getTime() - d.getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function BookingNotes({
  bookingId,
  mode,
  authorName,
  clientId,
}: {
  bookingId: string
  mode: 'admin' | 'client'
  authorName: string
  clientId?: string
}) {
  const [notes, setNotes] = useState<BookingNote[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)
  const dragCounter = useRef(0)

  const loadNotes = async () => {
    const res = await fetch(`/api/booking-notes?booking_id=${bookingId}`)
    if (res.ok) setNotes(await res.json())
  }

  useEffect(() => {
    loadNotes()
    const interval = setInterval(loadNotes, 30000)
    return () => clearInterval(interval)
  }, [bookingId])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [notes])

  const addFiles = useCallback((files: FileList | File[]) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
    const valid = Array.from(files).filter(f => allowed.includes(f.type) && f.size <= 5 * 1024 * 1024)
    if (valid.length === 0) return

    setImageFiles(prev => {
      const combined = [...prev, ...valid].slice(0, 10)
      return combined
    })
    // Generate previews for new files only
    for (const f of valid) {
      const reader = new FileReader()
      reader.onload = (ev) => {
        setImagePreviews(p => [...p, ev.target?.result as string].slice(0, 10))
      }
      reader.readAsDataURL(f)
    }
  }, [])

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index))
    setImagePreviews(prev => prev.filter((_, i) => i !== index))
  }

  const clearImages = () => {
    setImageFiles([])
    setImagePreviews([])
    if (fileRef.current) fileRef.current.value = ''
  }

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current++
    if (e.dataTransfer.types.includes('Files')) setDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current--
    if (dragCounter.current === 0) setDragging(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(false)
    dragCounter.current = 0
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files)
    }
  }

  const handleSend = async () => {
    if (!text.trim() && imageFiles.length === 0) return
    setSending(true)

    try {
      let res: Response
      if (imageFiles.length > 0) {
        // Upload each image individually to avoid body size limits
        const uploadedUrls: string[] = []
        for (const file of imageFiles) {
          const fd = new FormData()
          fd.append('file', file)
          fd.append('booking_id', bookingId)
          const uploadRes = await fetch('/api/booking-notes/upload', { method: 'POST', body: fd })
          if (!uploadRes.ok) {
            const err = await uploadRes.json().catch(() => ({ error: 'Upload failed' }))
            alert(`Failed to upload image: ${err.error}`)
            setSending(false)
            return
          }
          const uploadData = await uploadRes.json()
          // Single image creates the note directly — if multiple, we get back just the URL
          if (imageFiles.length === 1) {
            // Note already created by the API
            setText('')
            clearImages()
            await loadNotes()
            setSending(false)
            return
          }
          uploadedUrls.push(uploadData.url)
        }

        // Multiple images: create note with all URLs
        const fd = new FormData()
        fd.append('booking_id', bookingId)
        fd.append('author_type', mode)
        fd.append('author_name', authorName)
        fd.append('image_urls', JSON.stringify(uploadedUrls))
        if (text.trim()) fd.append('content', text.trim())
        if (clientId) fd.append('client_id', clientId)
        res = await fetch('/api/booking-notes/upload', { method: 'POST', body: fd })
      } else {
        res = await fetch('/api/booking-notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            booking_id: bookingId,
            content: text.trim(),
            author_type: mode,
            author_name: authorName,
            client_id: clientId,
          }),
        })
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }))
        alert(`Failed to save note: ${err.error || 'Unknown error'}`)
        setSending(false)
        return
      }

      setText('')
      clearImages()
      await loadNotes()
    } catch (e) {
      alert(`Failed to save note: ${e instanceof Error ? e.message : 'Network error'}`)
    }
    setSending(false)
  }

  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (noteId: string) => {
    setDeletingId(noteId)
  }

  const confirmDelete = async () => {
    if (!deletingId) return
    await fetch(`/api/booking-notes/${deletingId}`, { method: 'DELETE' })
    setDeletingId(null)
    await loadNotes()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const isOwn = (note: BookingNote) =>
    (mode === 'admin' && note.author_type === 'admin') ||
    (mode === 'client' && note.author_type === 'client')

  return (
    <div
      ref={dropRef}
      className={`flex flex-col h-full relative ${dragging ? 'ring-2 ring-[#1E2A4A] ring-dashed rounded-xl bg-[#1E2A4A]/5' : ''}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drop overlay */}
      {dragging && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="bg-[#1E2A4A] text-white px-4 py-2 rounded-xl text-sm font-medium shadow-lg">
            Drop images here
          </div>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 py-2 min-h-[120px] max-h-[400px]">
        {notes.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-6">No notes yet</p>
        )}
        {notes.map((note) => {
          const own = isOwn(note)
          const images = note.images || []
          return (
            <div key={note.id} className={`flex ${own ? 'justify-end' : 'justify-start'} group`}>
              <div className={`max-w-[85%] relative`}>
                <p className={`text-[10px] mb-0.5 ${own ? 'text-right' : 'text-left'} text-gray-400`}>
                  {note.author_name || note.author_type} &middot; {timeAgo(note.created_at)}
                </p>
                <div className={`rounded-2xl px-3.5 py-2 ${
                  own
                    ? 'bg-[#1E2A4A] text-white rounded-br-md'
                    : 'bg-gray-100 text-[#1E2A4A] rounded-bl-md'
                }`}>
                  {/* Image grid */}
                  {images.length > 0 && (
                    <div className={`grid gap-1.5 mb-1.5 ${
                      images.length === 1 ? 'grid-cols-1' : images.length === 2 ? 'grid-cols-2' : 'grid-cols-3'
                    }`}>
                      {images.map((url, i) => (
                        <img
                          key={i}
                          src={url}
                          alt=""
                          className="rounded-lg w-full max-h-[180px] object-cover cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setLightbox(url)}
                        />
                      ))}
                    </div>
                  )}
                  {note.content && <p className="text-[15px] leading-snug whitespace-pre-wrap break-words">{note.content}</p>}
                </div>
                {mode === 'admin' && (
                  <button
                    onClick={() => handleDelete(note.id)}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs hidden group-hover:flex items-center justify-center"
                    title="Delete"
                  >
                    &times;
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Image previews */}
      {imagePreviews.length > 0 && (
        <div className="flex gap-2 mt-2 mb-1 flex-wrap">
          {imagePreviews.map((src, i) => (
            <div key={i} className="relative">
              <img src={src} alt="" className="h-14 w-14 rounded-lg object-cover" />
              <button
                onClick={() => removeImage(i)}
                className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center"
              >
                &times;
              </button>
            </div>
          ))}
          {imageFiles.length < 10 && (
            <button
              onClick={() => fileRef.current?.click()}
              className="h-14 w-14 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-[#1E2A4A] hover:text-[#1E2A4A] transition-colors"
              title="Add more"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            </button>
          )}
        </div>
      )}

      {/* Input */}
      <div className="flex items-end gap-2 mt-2 border-t border-gray-100 pt-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          multiple
          className="hidden"
          onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = '' }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="p-2 text-gray-400 hover:text-[#1E2A4A] rounded-lg hover:bg-gray-100 flex-shrink-0"
          title="Attach images"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
        </button>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={imageFiles.length > 0 ? 'Add directions for these images...' : 'Add a note...'}
          rows={1}
          className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm text-[#1E2A4A] resize-none focus:outline-none focus:border-[#1E2A4A]"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={sending || (!text.trim() && imageFiles.length === 0)}
          className="p-2 bg-[#1E2A4A] text-white rounded-xl disabled:opacity-40 flex-shrink-0"
        >
          {sending ? (
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
          )}
        </button>
      </div>

      {/* Delete confirmation */}
      {deletingId && (
        <div className="flex items-center gap-2 py-2 px-3 bg-red-50 border border-red-200 rounded-lg mt-2">
          <p className="text-sm text-red-700 flex-1">Delete this note?</p>
          <button onClick={() => setDeletingId(null)} className="px-3 py-1 text-sm text-gray-600 border border-gray-300 rounded-lg">No</button>
          <button onClick={confirmDelete} className="px-3 py-1 text-sm text-white bg-red-600 rounded-lg">Delete</button>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[10002]" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" className="max-w-[90vw] max-h-[90vh] rounded-lg" />
        </div>
      )}
    </div>
  )
}
