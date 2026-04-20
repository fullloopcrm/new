/**
 * Direct file upload for management application attachments (photo/video/resume).
 * Public — tenant from host header. Writes to tenant-namespaced path in uploads bucket.
 */
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { rateLimitDb } from '@/lib/rate-limit-db'
import { getTenantFromHeaders } from '@/lib/tenant-site'

export async function POST(request: NextRequest) {
  const tenant = await getTenantFromHeaders()
  if (!tenant) return NextResponse.json({ error: 'Unknown tenant' }, { status: 400 })

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = await rateLimitDb(`mgmt_app_upload:${tenant.id}:${ip}`, 5, 10 * 60 * 1000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many uploads. Try again later.' }, { status: 429 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const type = formData.get('type') as string | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const maxSize = type === 'video' ? 100 * 1024 * 1024 : 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({ error: `File must be under ${type === 'video' ? '100MB' : '10MB'}` }, { status: 400 })
    }

    const rawExt = (file.name.split('.').pop() || 'bin').toLowerCase()
    const ext = rawExt.replace(/[^a-z0-9]/g, '').slice(0, 8) || 'bin'
    const timestamp = Date.now()
    const randomId = crypto.randomBytes(4).toString('hex')

    const subfolder = type === 'photo' ? 'photos'
      : type === 'video' ? 'videos'
      : type === 'resume' ? 'resumes'
      : 'other'
    const path = `${tenant.id}/management-applications/${subfolder}/${timestamp}-${randomId}.${ext}`

    const buffer = Buffer.from(await file.arrayBuffer())
    const { error } = await supabaseAdmin.storage
      .from('uploads')
      .upload(path, buffer, { contentType: file.type || 'application/octet-stream', upsert: false })

    if (error) {
      console.error('[mgmt-app upload] storage error:', error)
      return NextResponse.json({ error: error.message || 'Storage upload failed' }, { status: 500 })
    }

    const { data: urlData } = supabaseAdmin.storage.from('uploads').getPublicUrl(path)
    return NextResponse.json({ url: urlData.publicUrl })
  } catch (err) {
    console.error('[mgmt-app upload] error:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
