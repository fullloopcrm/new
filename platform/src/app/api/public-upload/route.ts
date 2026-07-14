import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantFromHeaders } from '@/lib/tenant-site'
import { rateLimitDb } from '@/lib/rate-limit-db'

// Public, tenant-aware file upload for marketing-site forms (e.g. a photo of
// the vehicle on a roadside booking form). Tenant is resolved from the signed
// x-tenant-id header injected by middleware on the tenant host — NOT admin
// auth, so it is safe to expose to anonymous site visitors. Size/type limited
// to keep it from being abused as open storage. Writes to the shared `uploads`
// bucket under <tenantId>/lead-media/.
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

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  // Generous: a single booking can legitimately include many photos (mirrors lead-media/signed-url).
  const rl = await rateLimitDb(`public_upload:${tenant.id}:${ip}`, 60, 10 * 60 * 1000)
  if (!rl.allowed) {
    return NextResponse.json({ success: false, error: 'Too many uploads. Try again later.' }, { status: 429 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 })
  if (file.size > MAX_SIZE) return NextResponse.json({ success: false, error: 'File too large (max 25MB)' }, { status: 400 })
  if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ success: false, error: 'File type not allowed' }, { status: 400 })

  // folder is NOT caller-controlled: no caller passes it, and letting a
  // formData field flow into a storage key allowed a "../<other-tenant-id>"
  // segment to escape this tenant's prefix in the shared `uploads` bucket
  // (URL dot-segment normalization resolves it before the storage API sees a
  // key). Hardcoded, matching the sibling lead-media/signed-url route.
  const rawExt = (file.name.split('.').pop() || 'bin').toLowerCase()
  const ext = rawExt.replace(/[^a-z0-9]/g, '').slice(0, 8) || 'bin'
  const path = `${tenant.id}/lead-media/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const buffer = Buffer.from(await file.arrayBuffer())

  const { error } = await supabaseAdmin.storage
    .from('uploads')
    .upload(path, buffer, { contentType: file.type, upsert: false })

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })

  const { data: urlData } = supabaseAdmin.storage.from('uploads').getPublicUrl(path)

  return NextResponse.json({ success: true, url: urlData.publicUrl, path })
}
