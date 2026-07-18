import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const bookingId = formData.get('booking_id') as string
    const authorType = formData.get('author_type') as string
    const authorName = formData.get('author_name') as string
    const content = formData.get('content') as string | null
    const imageUrlsRaw = formData.get('image_urls') as string | null

    if (!bookingId) return NextResponse.json({ error: 'Missing booking_id' }, { status: 400 })

    const { tenant: ctx, error: authError } = await requirePermission('bookings.edit')
    if (authError) return authError

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']

    // MODE 1: URLs already uploaded
    if (imageUrlsRaw) {
      const parsedUrls = JSON.parse(imageUrlsRaw)
      // These are expected to come from this route's own MODE 2 upload
      // (the client always uploads each file first, then re-POSTs the
      // returned URLs here to batch them into one note — see
      // components/BookingNotes.tsx). Nothing stops a direct caller from
      // POSTing arbitrary image_urls instead, and note.images renders
      // unsanitized as <img src> in both the admin dashboard
      // (BookingsAdmin.tsx) and the client-portal booking dashboard — same
      // unvalidated-URL-storage class already fixed for
      // team_applications.photo_url and reviews.images/video_url. Restrict
      // to this route's own bucket/folder prefix, matching what MODE 2
      // actually writes (this upload path isn't tenant-scoped, so the check
      // is bucket/folder-level here too, consistent with those fixes).
      const { data: notesPrefix } = supabaseAdmin.storage.from('uploads').getPublicUrl('booking-notes/')
      if (!Array.isArray(parsedUrls) || parsedUrls.some(u => typeof u !== 'string' || !u.startsWith(notesPrefix.publicUrl))) {
        return NextResponse.json({ error: 'Invalid image_urls' }, { status: 400 })
      }
      const imageUrls = parsedUrls as string[]
      const { data, error } = await supabaseAdmin
        .from('booking_notes')
        .insert({
          tenant_id: ctx.tenantId,
          booking_id: bookingId,
          author_type: authorType || 'admin',
          author_name: authorName || 'Admin',
          content: content?.trim() || null,
          images: imageUrls,
        })
        .select().single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json(data)
    }

    // MODE 2: single file upload
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (!allowedTypes.includes(file.type)) return NextResponse.json({ error: 'Only JPEG, PNG, WebP, or HEIC allowed' }, { status: 400 })
    if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'File must be under 5MB' }, { status: 400 })

    // bookingId reaches this point as a raw client-supplied string (see MODE 1
    // above — no format check before it's used as-is). It gets spliced
    // straight into the storage object path below, same unvalidated-string-in-
    // storage-path class already fixed for `folder` in /api/uploads: restrict
    // to a safe slug charset and cap length so an oversized or control-
    // character bookingId can't produce a malformed/huge storage key in this
    // public bucket.
    const safeBookingId = bookingId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) || 'unknown'
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) || 'jpg'
    const path = `booking-notes/${safeBookingId}/${Date.now()}-${randomBytes(6).toString('hex')}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await supabaseAdmin.storage
      .from('uploads')
      .upload(path, buffer, { contentType: file.type, upsert: false })

    if (uploadError) return NextResponse.json({ error: 'Upload failed' }, { status: 500 })

    const { data: urlData } = supabaseAdmin.storage.from('uploads').getPublicUrl(path)

    // Single image: create note directly
    const { data, error } = await supabaseAdmin
      .from('booking_notes')
      .insert({
        tenant_id: ctx.tenantId,
        booking_id: bookingId,
        author_type: authorType || 'admin',
        author_name: authorName || 'Admin',
        content: content?.trim() || null,
        images: [urlData.publicUrl],
      })
      .select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('Note upload error:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
