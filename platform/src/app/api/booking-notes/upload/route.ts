import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest } from '@/lib/tenant-query'

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

    const ctx = await getTenantForRequest()
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']

    // MODE 1: URLs already uploaded
    if (imageUrlsRaw) {
      const imageUrls = JSON.parse(imageUrlsRaw) as string[]
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

    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const path = `booking-notes/${bookingId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
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
    console.error('Note upload error:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
