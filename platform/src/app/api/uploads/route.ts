import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { getPortalAuth } from '@/lib/team-portal-auth'

const MAX_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

export async function POST(request: NextRequest) {
  // Team-portal callers (e.g. the team-member photo-upload in app/team/page.tsx)
  // carry a PIN-portal bearer token, never a Clerk session or admin_token
  // cookie — getTenantForRequest() only recognizes the latter two, so a portal
  // token must be checked first or every portal upload 401s unconditionally.
  let tenantId: string
  const portalAuth = getPortalAuth(request)
  if (portalAuth) {
    tenantId = portalAuth.tid
  } else {
    try {
      const tenant = await getTenantForRequest()
      tenantId = tenant.tenantId
    } catch (err) {
      if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const folder = (formData.get('folder') as string) || 'general'

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  if (file.size > MAX_SIZE) return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 })
  if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: 'File type not allowed' }, { status: 400 })

  const rawExt = (file.name.split('.').pop() || 'bin').toLowerCase()
  const ext = rawExt.replace(/[^a-z0-9]/g, '').slice(0, 8) || 'bin'
  const safeFolder = String(folder).replace(/[^a-zA-Z0-9_-]/g, '') || 'general'
  const path = `${tenantId}/${safeFolder}/${Date.now()}-${randomBytes(8).toString('hex')}.${ext}`

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
