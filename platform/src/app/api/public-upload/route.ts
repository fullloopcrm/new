import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantFromHeaders } from '@/lib/tenant-site'
import { rateLimitDb } from '@/lib/rate-limit-db'

// Public, tenant-aware file upload for marketing-site forms (e.g. a photo of
// the vehicle on a roadside booking form). Tenant is resolved from the signed
// x-tenant-id header injected by middleware on the tenant host — NOT admin
// auth, so it is safe to expose to anonymous site visitors. Size/type limited
// to keep it from being abused as open storage. Writes to the shared `uploads`
// bucket under <tenantId>/<folder>/.
const MAX_SIZE = 25 * 1024 * 1024 // 25MB
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'video/mp4',
  'video/quicktime',
]

export async function POST(request: NextRequest) {
  const tenant = await getTenantFromHeaders()
  if (!tenant) {
    return NextResponse.json({ success: false, error: 'Tenant not found for this host' }, { status: 404 })
  }

  // Unauthenticated + no rate limit == an anonymous caller could loop this
  // to write unlimited 25MB objects into the shared `uploads` bucket,
  // burning storage cost/quota against this (or any) tenant. Cap per IP.
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = await rateLimitDb(`public-upload:${ip}`, 20, 60 * 60 * 1000)
  if (!rl.allowed) {
    return NextResponse.json({ success: false, error: 'Too many uploads. Try again later.' }, { status: 429 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const rawFolder = (formData.get('folder') as string) || 'lead-media'
  // Unlike the sibling signed-url routes (apply, management-applications,
  // lead-media), folder here was an unvalidated client string spliced
  // straight into the storage path — a caller could pass e.g. "../<other
  // tenant id>/x" to write outside this tenant's prefix. Restrict to a safe
  // slug charset, same idea as those routes' folder allowlist.
  const folder = rawFolder.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || 'lead-media'

  if (!file) return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 })
  if (file.size > MAX_SIZE) return NextResponse.json({ success: false, error: 'File too large (max 25MB)' }, { status: 400 })
  if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ success: false, error: 'File type not allowed' }, { status: 400 })

  const rawExt = (file.name.split('.').pop() || 'bin').toLowerCase()
  const ext = rawExt.replace(/[^a-z0-9]/g, '').slice(0, 8) || 'bin'
  const path = `${tenant.id}/${folder}/${Date.now()}-${randomBytes(8).toString('hex')}.${ext}`

  const buffer = Buffer.from(await file.arrayBuffer())

  const { error } = await supabaseAdmin.storage
    .from('uploads')
    .upload(path, buffer, { contentType: file.type, upsert: false })

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })

  const { data: urlData } = supabaseAdmin.storage.from('uploads').getPublicUrl(path)

  return NextResponse.json({ success: true, url: urlData.publicUrl, path })
}
