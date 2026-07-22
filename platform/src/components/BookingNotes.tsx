'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import VideoNoteDetail from './VideoNoteDetail'

export interface TranscriptClipOverview {
  start_seconds: number
  end_seconds: number
  title: string
  bullets: string[]
}

export interface AiOverview {
  highlights: string[]
  summary: string
  location_overview?: string
  areas_observed?: { name: string; condition: string; notes: string }[]
  issues_flagged?: { issue: string; severity: string; timestamp: string }[]
  work_performed?: { task: string; notes: string }[]
  recommendations?: string[]
  customer_message?: string
  internal_notes?: string
  transcript_clips: TranscriptClipOverview[]
}

export interface TranscriptSegment {
  start: number
  end: number
  text: string
  speaker: number | null
}

// A note's images are either plain URLs (older text notes) or {url,
// timestamp_seconds} objects (stills captured during a LoopCam video note,
// where the timestamp lets the still seek the paired video).
type NoteImage = string | { url: string; timestamp_seconds: number }

function imageUrl(img: NoteImage): string {
  return typeof img === 'string' ? img : img.url
}

export interface BookingNote {
  id: string
  booking_id: string | null
  author_type: 'admin' | 'client' | 'system' | 'crew'
  author_name: string | null
  content: string | null
  images: NoteImage[]
  created_at: string
  note_type?: 'text' | 'video'
  video_url?: string | null
  video_duration_seconds?: number | null
  video_session_type?: string | null
  transcript_json?: TranscriptSegment[] | null
  ai_overview_json?: AiOverview | null
  processing_status?: 'uploading' | 'uploaded' | 'transcribing' | 'summarizing' | 'complete' | 'failed' | null
  processing_failure_reason?: string | null
  mentioned_team_member_ids?: string[]
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
  jobId,
  mode,
  authorName,
  clientId,
  projectName,
}: {
  bookingId?: string
  jobId?: string
  mode: 'admin' | 'client'
  authorName: string
  clientId?: string
  projectName?: string
}) {
  const anchorParam = bookingId ? `booking_id=${bookingId}` : `job_id=${jobId}`
  const [notes, setNotes] = useState<BookingNote[]>([])
  const [feedTab, setFeedTab] = useState<'updates' | 'media'>('updates')
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const videoFileRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)
  const dragCounter = useRef(0)
  const [uploadingVideo, setUploadingVideo] = useState(false)

  // @-mention: admin-only (client portal shouldn't tag internal crew).
  const [teamMembers, setTeamMembers] = useState<{ id: string; name: string }[]>([])
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionedIds, setMentionedIds] = useState<string[]>([])

  useEffect(() => {
    if (mode !== 'admin') return
    fetch('/api/cleaners')
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => setTeamMembers((rows || []).map((m: { id: string; name: string }) => ({ id: m.id, name: m.name }))))
      .catch(() => {})
  }, [mode])

  const mentionMatches =
    mentionQuery !== null
      ? teamMembers.filter((m) => m.name.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 6)
      : []

  const handleTextChange = (value: string) => {
    setText(value)
    const atIndex = value.lastIndexOf('@')
    if (mode === 'admin' && atIndex !== -1 && !value.slice(atIndex + 1).includes(' ') && value.slice(atIndex + 1).length <= 20) {
      setMentionQuery(value.slice(atIndex + 1))
    } else {
      setMentionQuery(null)
    }
  }

  const selectMention = (member: { id: string; name: string }) => {
    const atIndex = text.lastIndexOf('@')
    if (atIndex === -1) return
    setText(text.slice(0, atIndex) + '@' + member.name.replace(/\s+/g, '') + ' ')
    setMentionedIds((prev) => (prev.includes(member.id) ? prev : [...prev, member.id]))
    setMentionQuery(null)
  }

  // Bold @Name for ids actually in mentioned_team_member_ids — resolved via
  // the loaded teamMembers list, not by pattern-matching arbitrary "@word"
  // text, so an unrelated "@" in a note doesn't render as a fake mention.
  function renderWithMentions(content: string, mentionedIdsForNote: string[]) {
    const names = mentionedIdsForNote
      .map((id) => teamMembers.find((m) => m.id === id)?.name)
      .filter((n): n is string => !!n)
      .map((n) => n.replace(/\s+/g, ''))
    if (names.length === 0) return content
    const pattern = new RegExp(`@(${names.join('|')})\\b`, 'g')
    const parts = content.split(pattern)
    return parts.map((part, i) => (names.includes(part) ? <strong key={i}>@{part}</strong> : part))
  }

  const loadNotes = async () => {
    const res = await fetch(`/api/booking-notes?${anchorParam}`)
    if (res.ok) setNotes(await res.json())
  }

  useEffect(() => {
    loadNotes()
    const interval = setInterval(loadNotes, 30000)
    return () => clearInterval(interval)
  }, [anchorParam])

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

  // Admin-only: attach an existing video file (e.g. one a client texted in)
  // as a video note — same shape as a LoopCam field recording, transcribed +
  // AI-summarized the same way, just uploaded rather than recorded live.
  const handleVideoFile = async (file: File) => {
    setUploadingVideo(true)
    try {
      const params = new URLSearchParams({
        ...(bookingId ? { booking_id: bookingId } : { job_id: jobId as string }),
        filename: file.name,
        content_type: file.type || 'video/mp4',
      })
      const signedRes = await fetch(`/api/booking-notes/video?${params}`)
      if (!signedRes.ok) throw new Error('Failed to get upload URL')
      const { signedUrl, path, publicUrl } = await signedRes.json()

      const putRes = await fetch(signedUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
      if (!putRes.ok) throw new Error('Video upload failed')

      const duration = await new Promise<number>((resolve) => {
        const v = document.createElement('video')
        v.preload = 'metadata'
        v.onloadedmetadata = () => resolve(v.duration || 0)
        v.onerror = () => resolve(0)
        v.src = URL.createObjectURL(file)
      })

      const createRes = await fetch('/api/booking-notes/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: bookingId,
          job_id: jobId,
          video_url: publicUrl,
          video_storage_path: path,
          video_duration_seconds: duration,
        }),
      })
      if (!createRes.ok) throw new Error('Failed to save video note')
      const { note } = await createRes.json()

      // Fire-and-forget: transcription/AI overview runs server-side.
      fetch(`/api/booking-notes/${note.id}/retry-process`, { method: 'POST' }).catch(() => {})

      await loadNotes()
    } catch (e) {
      alert(`Failed to attach video: ${e instanceof Error ? e.message : 'Network error'}`)
    }
    setUploadingVideo(false)
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
          if (bookingId) fd.append('booking_id', bookingId)
          else if (jobId) fd.append('job_id', jobId)
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
        if (bookingId) fd.append('booking_id', bookingId)
        else if (jobId) fd.append('job_id', jobId)
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
            job_id: jobId,
            content: text.trim(),
            author_type: mode,
            author_name: authorName,
            client_id: clientId,
            mentioned_team_member_ids: mentionedIds,
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
      setMentionedIds([])
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

  // Admin-only retry for a video note stuck in 'failed' — crew retries happen
  // from the team portal itself, straight against the processing route.
  const retryProcessing = async (noteId: string) => {
    await fetch(`/api/booking-notes/${noteId}/retry-process`, { method: 'POST' })
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

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-100 shrink-0">
        <button
          onClick={() => setFeedTab('updates')}
          className={`text-xs font-medium uppercase tracking-wide px-3 py-2 border-b-2 -mb-px ${
            feedTab === 'updates' ? 'border-[#1E2A4A] text-[#1E2A4A]' : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          Updates
        </button>
        <button
          onClick={() => setFeedTab('media')}
          className={`text-xs font-medium uppercase tracking-wide px-3 py-2 border-b-2 -mb-px ${
            feedTab === 'media' ? 'border-[#1E2A4A] text-[#1E2A4A]' : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          Media
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 py-2 min-h-[120px]">
        {notes.filter((n) => (feedTab === 'media' ? n.note_type === 'video' : n.note_type !== 'video')).length === 0 && (
          <p className="text-center text-gray-400 text-sm py-6">
            {feedTab === 'media' ? 'No media yet' : 'No updates yet'}
          </p>
        )}
        {notes
          .filter((n) => (feedTab === 'media' ? n.note_type === 'video' : n.note_type !== 'video'))
          .map((note) => {
          const own = isOwn(note)
          const images = note.images || []

          // Video notes render as a full-width detail card (not a chat bubble) —
          // the two-column video/tabs layout doesn't fit the narrow 85% bubble.
          if (note.note_type === 'video') {
            return (
              <div key={note.id} className="relative group">
                <VideoNoteDetail
                  note={note}
                  projectName={projectName || 'Job'}
                  onRetry={() => retryProcessing(note.id)}
                />
                {mode === 'admin' && (
                  <button
                    onClick={() => handleDelete(note.id)}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs hidden group-hover:flex items-center justify-center z-10"
                    title="Delete"
                  >
                    &times;
                  </button>
                )}
              </div>
            )
          }

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
                      {images.map((img, i) => (
                        <img
                          key={i}
                          src={imageUrl(img)}
                          alt=""
                          className="rounded-lg w-full max-h-[180px] object-cover cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setLightbox(imageUrl(img))}
                        />
                      ))}
                    </div>
                  )}
                  {note.content && (
                    <p className="text-[15px] leading-snug whitespace-pre-wrap break-words">
                      {renderWithMentions(note.content, note.mentioned_team_member_ids || [])}
                    </p>
                  )}
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
      <div className="relative flex items-end gap-2 mt-2 border-t border-gray-100 pt-2">
        {mentionMatches.length > 0 && (
          <div className="absolute bottom-full left-10 mb-1 w-48 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-10">
            {mentionMatches.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => selectMention(m)}
                className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50 text-[#1E2A4A]"
              >
                @{m.name}
              </button>
            ))}
          </div>
        )}
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
        {mode === 'admin' && (
          <>
            <input
              ref={videoFileRef}
              type="file"
              accept="video/mp4,video/quicktime,video/webm,video/3gpp,video/x-m4v"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleVideoFile(f); e.target.value = '' }}
            />
            <button
              type="button"
              onClick={() => videoFileRef.current?.click()}
              disabled={uploadingVideo}
              className="p-2 text-gray-400 hover:text-[#1E2A4A] rounded-lg hover:bg-gray-100 flex-shrink-0 disabled:opacity-40"
              title="Attach a video (transcribed + AI-summarized)"
            >
              {uploadingVideo ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              )}
            </button>
          </>
        )}
        <textarea
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={mode === 'admin' ? 'Add a note... @ to tag someone' : 'Add a note...'}
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
