import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { tenantDb } from '@/lib/tenant-db'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const bookingId = (formData.get('booking_id') as string) || null
    const jobId = (formData.get('job_id') as string) || null
    const authorType = formData.get('author_type') as string
    const authorName = formData.get('author_name') as string
    const content = formData.get('content') as string | null
    const imageUrlsRaw = formData.get('image_urls') as string | null

    if (!bookingId && !jobId) return NextResponse.json({ error: 'Missing booking_id or job_id' }, { status: 400 })

    const ctx = await getTenantForRequest()

    // booking_id/job_id are caller-supplied FKs used both as insert values and
    // as a storage path segment below — booking_notes has no cross-tenant FK
    // check, and an unsanitized id would also let a path-traversal payload
    // write outside this tenant's storage prefix. Verify ownership before either.
    let resolvedJobId: string | null = null
    if (bookingId) {
      const { data: owned } = await supabaseAdmin
        .from('bookings')
        .select('id, job_id')
        .eq('id', bookingId)
        .eq('tenant_id', ctx.tenantId)
        .maybeSingle()
      if (!owned) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
      resolvedJobId = (owned.job_id as string | null) ?? null
    } else {
      const { data: owned } = await supabaseAdmin
        .from('jobs')
        .select('id')
        .eq('id', jobId)
        .eq('tenant_id', ctx.tenantId)
        .maybeSingle()
      if (!owned) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
      resolvedJobId = owned.id as string
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
    const storageScope = bookingId || `job-${jobId}`

    // MODE 1: URLs already uploaded
    if (imageUrlsRaw) {
      const imageUrls = JSON.parse(imageUrlsRaw) as string[]
      const { data, error } = await tenantDb(ctx.tenantId)
        .from('booking_notes')
        .insert({
          booking_id: bookingId,
          job_id: resolvedJobId,
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

    // file.name is caller-controlled independent of the (checked) MIME type —
    // an unsanitized extension can inject '/' or '..' segments into the
    // storage key (same class as the public-upload fix). Strip to a plain
    // alnum extension before it reaches the path.
    const rawExt = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const ext = rawExt.replace(/[^a-z0-9]/g, '').slice(0, 8) || 'jpg'
    const path = `booking-notes/${storageScope}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await supabaseAdmin.storage
      .from('uploads')
      .upload(path, buffer, { contentType: file.type, upsert: false })

    if (uploadError) return NextResponse.json({ error: 'Upload failed' }, { status: 500 })

    const { data: urlData } = supabaseAdmin.storage.from('uploads').getPublicUrl(path)

    // Single image: create note directly
    const { data, error } = await tenantDb(ctx.tenantId)
      .from('booking_notes')
      .insert({
        booking_id: bookingId,
        job_id: resolvedJobId,
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
