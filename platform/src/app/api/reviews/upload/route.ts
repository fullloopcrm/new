/**
 * Public image/video upload for client review submissions.
 * Writes to the tenant's namespaced path in the `uploads` storage bucket.
 * Tenant resolved via the request host (x-tenant-id header).
 */
import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantFromHeaders } from '@/lib/tenant-site'

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
const VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm']
const MAX_IMAGE_SIZE = 10 * 1024 * 1024
const MAX_VIDEO_SIZE = 100 * 1024 * 1024
const SAFE_IMAGE_EXT = new Set(['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'])
const SAFE_VIDEO_EXT = new Set(['mp4', 'mov', 'webm'])

export async function POST(request: Request) {
  const tenant = await getTenantFromHeaders()
  if (!tenant) {
    return NextResponse.json({ error: 'Unknown tenant' }, { status: 400 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const isImage = IMAGE_TYPES.includes(file.type)
    const isVideo = VIDEO_TYPES.includes(file.type)
    if (!isImage && !isVideo) {
      return NextResponse.json({ error: 'Only images (JPEG/PNG/WebP/HEIC) and videos (MP4/MOV/WebM) accepted' }, { status: 400 })
    }
    if (isImage && file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json({ error: 'Images must be under 10MB' }, { status: 400 })
    }
    if (isVideo && file.size > MAX_VIDEO_SIZE) {
      return NextResponse.json({ error: 'Videos must be under 100MB' }, { status: 400 })
    }

    const rawExt = (file.name.split('.').pop() || '').toLowerCase()
    const ext = SAFE_IMAGE_EXT.has(rawExt) || SAFE_VIDEO_EXT.has(rawExt)
      ? rawExt
      : (isImage ? 'jpg' : 'mp4')

    const timestamp = Date.now()
    const randomId = crypto.randomBytes(4).toString('hex')
    const folder = isVideo ? 'review-videos' : 'review-images'
    const path = `${tenant.id}/${folder}/${timestamp}-${randomId}.${ext}`

    const buffer = Buffer.from(await file.arrayBuffer())
    const { error: uploadError } = await supabaseAdmin.storage
      .from('uploads')
      .upload(path, buffer, { contentType: file.type, upsert: false })

    if (uploadError) {
      console.error('[reviews/upload] error:', uploadError.message)
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
    }

    const { data: urlData } = supabaseAdmin.storage.from('uploads').getPublicUrl(path)

    return NextResponse.json({
      url: urlData.publicUrl,
      type: isVideo ? 'video' : 'image',
    })
  } catch (err) {
    console.error('[reviews/upload] exception:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
