/**
 * Global public file upload (tenant resolved from host). Direct multipart
 * passthrough to Supabase storage — used by every tenant form that posts a
 * `FormData` with a `file` field to `/api/upload` and expects
 * `{ success, url }` back (we-pay-you-junk job application + booking photos,
 * nyc-classifieds listing/account images). This route never existed before,
 * so every one of those forms 404'd on upload.
 */
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { rateLimitDb } from '@/lib/rate-limit-db'
import { getTenantFromHeaders } from '@/lib/tenant-site'

const ALLOWED_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-m4v',
])
const MAX_SIZE = 100 * 1024 * 1024

// FormData entries from multipart parsers can be constructed by different
// File/Blob implementations depending on runtime (Node, Edge, test harness) —
// duck-typing avoids `instanceof File` failing across those realms.
function isUploadedFile(value: FormDataEntryValue | null): value is File {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as File).arrayBuffer === 'function' &&
    typeof (value as File).size === 'number' &&
    typeof (value as File).name === 'string'
  )
}

export async function POST(request: NextRequest) {
  const tenant = await getTenantFromHeaders()
  if (!tenant) return NextResponse.json({ error: 'Unknown tenant' }, { status: 400 })

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = await rateLimitDb(`upload:${tenant.id}:${ip}`, 20, 10 * 60 * 1000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many uploads. Try again later.' }, { status: 429 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file')

    if (!isUploadedFile(file)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    if (!ALLOWED_MIMES.has(file.type)) {
      return NextResponse.json({ error: `Unsupported file type: ${file.type || 'unknown'}` }, { status: 400 })
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large (max 100MB)' }, { status: 400 })
    }

    const rawExt = (file.name.split('.').pop() || 'bin').toLowerCase()
    const ext = rawExt.replace(/[^a-z0-9]/g, '').slice(0, 8) || 'bin'
    const path = `${tenant.id}/uploads/${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`

    const buffer = Buffer.from(await file.arrayBuffer())

    const { error } = await supabaseAdmin.storage
      .from('uploads')
      .upload(path, buffer, { contentType: file.type, upsert: false })

    if (error) {
      console.error('[api/upload] storage error:', error)
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
    }

    const { data: urlData } = supabaseAdmin.storage.from('uploads').getPublicUrl(path)

    return NextResponse.json({ success: true, url: urlData.publicUrl })
  } catch (err) {
    console.error('[api/upload] error:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
