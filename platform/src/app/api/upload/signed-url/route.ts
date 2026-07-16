/**
 * Pre-signed upload URL for public file uploads (photo/media, tenant resolved
 * from host). Mirrors /api/apply/signed-url's pattern so browsers can PUT
 * directly to Supabase storage — avoids Vercel's 4.5MB request body limit,
 * which a direct multipart-through-serverless route would hit.
 *
 * Used by: we-pay-you-junk job application photo + booking photos/videos,
 * nyc-classifieds listing/account images.
 */
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { rateLimitDb } from '@/lib/rate-limit-db'
import { getTenantFromHeaders } from '@/lib/tenant-site'

const ALLOWED_TYPES: Record<string, { mimes: string[]; maxSize: number; folder: string }> = {
  photo: {
    mimes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'],
    maxSize: 10 * 1024 * 1024,
    folder: 'photos',
  },
  media: {
    mimes: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/heic',
      'image/heif',
      'video/mp4',
      'video/quicktime',
      'video/webm',
      'video/x-m4v',
    ],
    maxSize: 100 * 1024 * 1024,
    folder: 'media',
  },
}

export async function POST(request: NextRequest) {
  const tenant = await getTenantFromHeaders()
  if (!tenant) return NextResponse.json({ error: 'Unknown tenant' }, { status: 400 })

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = await rateLimitDb(`upload_signed:${tenant.id}:${ip}`, 20, 10 * 60 * 1000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 })
  }

  try {
    const { type, filename, contentType } = await request.json()

    const config = ALLOWED_TYPES[type as string]
    if (!config) return NextResponse.json({ error: 'Invalid upload type' }, { status: 400 })
    if (!contentType || !config.mimes.includes(contentType)) {
      return NextResponse.json({ error: `Invalid file type for ${type}` }, { status: 400 })
    }

    const rawExt = (String(filename || '').split('.').pop() || 'bin').toLowerCase()
    const ext = rawExt.replace(/[^a-z0-9]/g, '').slice(0, 8) || 'bin'
    const timestamp = Date.now()
    const randomId = crypto.randomBytes(4).toString('hex')
    const path = `${tenant.id}/uploads/${config.folder}/${timestamp}-${randomId}.${ext}`

    const { data, error } = await supabaseAdmin.storage
      .from('uploads')
      .createSignedUploadUrl(path)

    if (error || !data) {
      console.error('[upload signed-url] error:', error)
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
    console.error('[upload signed-url] error:', err)
    return NextResponse.json({ error: 'Failed to create upload URL' }, { status: 500 })
  }
}
