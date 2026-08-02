import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { resolveOnboardingTenantId } from '@/lib/onboarding-auth'

// Bumped from 5MB -> 15MB (2026-07-29) to cover real client/tenant documents
// (signed proposals, insurance certs, multi-page scans) added via the new
// client_documents feature -- 5MB was fine for avatars/photos but too narrow
// for a scanned PDF. Kept well short of Supabase's per-file Storage ceiling.
// NOTE: this is an app-level check only -- Vercel's own ~4.5MB request-body
// ceiling for standard Node.js serverless functions still applies underneath
// this route, so a file between ~4.5MB and this cap may still fail at the
// platform layer with a raw 413 before this check ever runs. True large-file
// support (this route can't reach) already exists elsewhere in this codebase
// as a direct-to-Storage signed-upload-URL pattern (see e.g.
// api/apply/signed-url, api/lead-media/signed-url) -- not wired up here to
// keep this change minimal, per the "reuse /api/uploads, don't rewrite it"
// scope for this feature.
const MAX_SIZE = 15 * 1024 * 1024 // 15MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

export async function POST(request: NextRequest) {
  const formData = await request.formData()

  // Dual auth, same as /api/tenant-profile: a real dashboard session wins;
  // otherwise fall back to the signed /onboard/[token] link so a
  // not-yet-activated tenant can upload compliance docs (insurance cert,
  // license scan, W-9) during onboarding, before they've ever logged in.
  let tenantId: string
  try {
    const session = await getTenantForRequest()
    tenantId = session.tenantId
  } catch (err) {
    if (!(err instanceof AuthError)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const resolved = await resolveOnboardingTenantId(formData.get('token') as string | null)
    if (!resolved) return NextResponse.json({ error: err.message }, { status: err.status })
    tenantId = resolved
  }

  const file = formData.get('file') as File | null
  const rawFolder = (formData.get('folder') as string) || 'general'
  // Caller-supplied path segments — never splice them into the storage key
  // raw. A value like `../other-tenant-id` (folder) or a crafted filename
  // (ext) can escape this tenant's prefix in the shared `uploads` bucket
  // (same class as public-upload's 7c17cb47 fix). Strip to a safe charset
  // instead of hardcoding a single folder, since this route is genuinely
  // multi-purpose (avatars, documents, etc across the dashboard).
  const folder = rawFolder.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || 'general'

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  if (file.size > MAX_SIZE) return NextResponse.json({ error: 'File too large (max 15MB)' }, { status: 400 })
  if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: 'File type not allowed' }, { status: 400 })

  const rawExt = (file.name.split('.').pop() || 'bin').toLowerCase()
  const ext = rawExt.replace(/[^a-z0-9]/g, '').slice(0, 8) || 'bin'
  const path = `${tenantId}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const buffer = Buffer.from(await file.arrayBuffer())

  const { error } = await supabaseAdmin.storage
    .from('uploads')
    .upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: urlData } = supabaseAdmin.storage.from('uploads').getPublicUrl(path)

  return NextResponse.json({ url: urlData.publicUrl, path })
}
