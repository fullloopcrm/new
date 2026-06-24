'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'

const SERVICE_TYPES = [
  { value: '', label: 'Select a service (optional)' },
  { value: 'deep-cleaning', label: 'Deep Cleaning' },
  { value: 'apartment-cleaning', label: 'Regular Apartment Cleaning' },
  { value: 'weekly-maid-service', label: 'Weekly Maid Service' },
  { value: 'move-in-move-out', label: 'Move-In / Move-Out Cleaning' },
  { value: 'post-construction', label: 'Post-Construction Cleanup' },
  { value: 'same-day', label: 'Same-Day / Emergency Cleaning' },
  { value: 'airbnb', label: 'Airbnb Turnover' },
  { value: 'office', label: 'Office Cleaning' },
  { value: 'other', label: 'Other' },
]

type UploadedMedia = { url: string; type: 'image' | 'video' }

export default function ReviewForm() {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [text, setText] = useState('')
  const [serviceType, setServiceType] = useState('')
  const [neighborhood, setNeighborhood] = useState('')
  const [cleanerName, setCleanerName] = useState('')
  const [media, setMedia] = useState<UploadedMedia[]>([])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  const hasVideo = media.some(m => m.type === 'video')
  const imageCount = media.filter(m => m.type === 'image').length

  const uploadFile = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)

    const res = await fetch('/api/reviews/upload', {
      method: 'POST',
      body: formData,
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'Upload failed')
    }

    return await res.json() as UploadedMedia
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return

    const remaining = 5 - imageCount
    if (remaining <= 0) {
      setError('Maximum 5 images allowed')
      return
    }

    setUploading(true)
    setError('')

    try {
      const filesToUpload = Array.from(files).slice(0, remaining)
      const results = await Promise.all(filesToUpload.map(uploadFile))
      setMedia(prev => [...prev, ...results])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Image upload failed')
    } finally {
      setUploading(false)
      if (imageInputRef.current) imageInputRef.current.value = ''
    }
  }

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (hasVideo) {
      setError('Only one video review allowed')
      return
    }

    setUploading(true)
    setError('')

    try {
      const result = await uploadFile(file)
      setMedia(prev => [...prev, result])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Video upload failed')
    } finally {
      setUploading(false)
      if (videoInputRef.current) videoInputRef.current.value = ''
    }
  }

  const removeMedia = (index: number) => {
    setMedia(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!rating) {
      setError('Please select a star rating')
      return
    }
    if (!name.trim()) {
      setError('Please enter your name')
      return
    }
    if (!text.trim() || text.trim().length < 10) {
      setError('Please write at least a few words about your experience')
      return
    }

    setSubmitting(true)
    try {
      const videoMedia = media.find(m => m.type === 'video')
      const imageUrls = media.filter(m => m.type === 'image').map(m => m.url)

      const res = await fetch('/api/reviews/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim() || undefined,
          rating,
          text: text.trim(),
          service_type: serviceType || undefined,
          neighborhood: neighborhood.trim() || undefined,
          cleaner_name: cleanerName.trim() || undefined,
          images: imageUrls,
          video_url: videoMedia?.url || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Something went wrong')
      }

      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-8 md:p-12 mt-8 text-center">
        <div className="w-16 h-16 bg-[#A8F0DC] rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-[#1E2A4A]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#1E2A4A] tracking-wide mb-4">
          Thank You for Your Review
        </h2>
        <p className="text-gray-600 text-lg mb-2">
          Your feedback means the world to us and our team.
        </p>
        <p className="text-gray-400 text-sm mb-8">
          Your review will be published shortly after a quick review.
        </p>
        <Link href="/reviews" className="inline-block bg-[#1E2A4A] text-white px-8 py-3.5 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#243352] transition-colors">
          Read Other Reviews
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl overflow-hidden mt-8">
      {/* Header */}
      <div className="px-6 md:px-8 py-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#1E2A4A] rounded-full flex items-center justify-center">
            <span className="text-white text-lg font-bold">M</span>
          </div>
          <div>
            <h2 className="text-gray-900 font-semibold text-lg">The NYC Maid</h2>
            <p className="text-gray-400 text-sm">Verified Business &middot; NYC Since 2018</p>
          </div>
        </div>
      </div>

      <div className="px-6 md:px-8 py-8 space-y-6">
        {/* Star Rating */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-3">Your Rating</label>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="p-0.5 transition-transform hover:scale-110"
              >
                <svg
                  className={`w-10 h-10 ${star <= (hoverRating || rating) ? 'text-yellow-400' : 'text-gray-200'} transition-colors`}
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </button>
            ))}
            {rating > 0 && (
              <span className="ml-3 text-sm text-gray-500 font-medium">
                {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][rating]}
              </span>
            )}
          </div>
        </div>

        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-semibold text-gray-900 mb-1.5">Your Name *</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="First and last name"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1E2A4A] focus:border-transparent"
            required
          />
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-semibold text-gray-900 mb-1.5">
            Email <span className="text-gray-400 font-normal">(optional — earns verified badge)</span>
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1E2A4A] focus:border-transparent"
          />
        </div>

        {/* Review Text */}
        <div>
          <label htmlFor="review" className="block text-sm font-semibold text-gray-900 mb-1.5">Your Review *</label>
          <textarea
            id="review"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Tell us about your experience — the cleaning, your cleaner, anything that stood out..."
            rows={5}
            maxLength={2000}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1E2A4A] focus:border-transparent resize-none"
            required
          />
          <p className="text-xs text-gray-400 mt-1">{text.length}/2000</p>
        </div>

        {/* Media Upload */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-3">Photos &amp; Video <span className="text-gray-400 font-normal">(optional)</span></label>

          {/* Uploaded previews */}
          {media.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-4">
              {media.map((m, i) => (
                <div key={i} className="relative group">
                  {m.type === 'image' ? (
                    <img src={m.url} alt="" className="w-24 h-24 object-cover rounded-xl border border-gray-200" />
                  ) : (
                    <div className="w-24 h-24 bg-gray-900 rounded-xl border border-gray-200 flex items-center justify-center">
                      <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeMedia(i)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    X
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            {/* Image upload button */}
            {imageCount < 5 && (
              <label className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 font-medium cursor-pointer hover:bg-gray-50 transition-colors">
                <svg className="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
                Add Photos
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            )}

            {/* Video upload button */}
            {!hasVideo && (
              <label className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 font-medium cursor-pointer hover:bg-gray-50 transition-colors">
                <svg className="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="23 7 16 12 23 17 23 7" />
                  <rect x="1" y="5" width="15" height="14" rx="2" />
                </svg>
                Add Video Review
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/mp4,video/quicktime,video/webm"
                  onChange={handleVideoUpload}
                  className="hidden"
                />
              </label>
            )}

            {uploading && (
              <span className="inline-flex items-center gap-2 text-sm text-gray-400">
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity="0.25" /><path d="M12 2a10 10 0 019.95 9" /></svg>
                Uploading...
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-2">Up to 5 photos (10MB each) and 1 video (100MB max). JPEG, PNG, WebP, MP4, MOV, or WebM.</p>
        </div>

        {/* Optional fields row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="service" className="block text-sm font-medium text-gray-700 mb-1.5">Service Type</label>
            <select
              id="service"
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1E2A4A] focus:border-transparent bg-white"
            >
              {SERVICE_TYPES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="neighborhood" className="block text-sm font-medium text-gray-700 mb-1.5">Neighborhood</label>
            <input
              id="neighborhood"
              type="text"
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              placeholder="e.g. Hell's Kitchen"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1E2A4A] focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="cleaner" className="block text-sm font-medium text-gray-700 mb-1.5">Cleaner Name</label>
            <input
              id="cleaner"
              type="text"
              value={cleanerName}
              onChange={(e) => setCleanerName(e.target.value)}
              placeholder="e.g. Karina"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1E2A4A] focus:border-transparent"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting || uploading}
          className="w-full bg-[#1E2A4A] text-white py-4 rounded-xl font-bold text-sm tracking-widest uppercase hover:bg-[#243352] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Submitting...' : 'Submit Your Review'}
        </button>

        <p className="text-xs text-gray-400 text-center">
          By submitting, you confirm this review is based on a real experience with The NYC Maid.
        </p>
      </div>
    </form>
  )
}
