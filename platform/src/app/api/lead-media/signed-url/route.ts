/**
 * Pre-signed upload URL for public booking-form photo/video uploads. Tenant
 * resolved from host. Mirrors /api/apply/signed-url so tenant marketing sites
 * can PUT media straight to Supabase storage (bypassing the 4.5 MB serverless
 * request-body cap that broke uploads routed through a function).
 *
 * The mime check below is UX-only, not enforcement: createSignedUploadUrl()
 * takes no mime/size options, so the actual PUT (uploadToSignedUrl, direct
 * browser-to-Supabase, never touching this route) can send any Content-Type/size.
 * Real enforcement is the 'uploads' bucket's allowed_mime_types/file_size_limit —
 * see src/lib/migrations/2026_07_15_uploads_bucket_restrict.sql.
 */
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { rateLimitDb } from '@/lib/rate-limit-db'
import { getTenantFromHeaders } from '@/lib/tenant-site'

const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
const VIDEO_MIMES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v']
const ALLOWED_MIMES = new Set([...IMAGE_MIMES, ...VIDEO_MIMES])

export async function POST(request: NextRequest) {
  const tenant = await getTenantFromHeaders()
  if (!tenant) return NextResponse.json({ error: 'Unknown tenant' }, { status: 400 })

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  // Generous: a single booking can legitimately include 20-30 photos.
  const rl = await rateLimitDb(`lead_media_signed:${tenant.id}:${ip}`, 60, 10 * 60 * 1000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 })
  }

  try {
    const { filename, contentType } = await request.json()

    if (!contentType || !ALLOWED_MIMES.has(contentType)) {
      return NextResponse.json({ error: `Unsupported file type: ${contentType || 'none'}` }, { status: 415 })
    }

    const rawExt = (String(filename || '').split('.').pop() || 'bin').toLowerCase()
    const ext = rawExt.replace(/[^a-z0-9]/g, '').slice(0, 8) || 'bin'
    const timestamp = Date.now()
    const randomId = crypto.randomBytes(4).toString('hex')
    const path = `${tenant.id}/lead-media/${timestamp}-${randomId}.${ext}`

    const { data, error } = await supabaseAdmin.storage.from('uploads').createSignedUploadUrl(path)

    if (error || !data) {
      console.error('[lead-media signed-url] error:', error)
      return NextResponse.json({ error: 'Failed to create upload URL' }, { status: 500 })
    }

    const { data: urlData } = supabaseAdmin.storage.from('uploads').getPublicUrl(path)

    return NextResponse.json({
      signedUrl: data.signedUrl,
      token: data.token,
      path,
      publicUrl: urlData.publicUrl,
    })
  } catch (err) {
    console.error('[lead-media signed-url] error:', err)
    return NextResponse.json({ error: 'Failed to create upload URL' }, { status: 500 })
  }
}
