/**
 * Team member photo upload — legacy nycmaid path.
 * Writes to storage bucket `team-photos` (per-tenant namespaced), updates
 * team_members.photo_url / avatar_url. Admin path OR cleaner_id self-upload.
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePermission } from '@/lib/require-permission'
import { rateLimitDb } from '@/lib/rate-limit-db'
import { getTenantFromHeaders } from '@/lib/tenant-site'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
const SAFE_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif']

export async function POST(request: NextRequest) {
  // Admin path or tenant-scoped public upload
  let tenantId: string | null = null
  let isAdmin = false

  const adminResult = await requirePermission('team.edit')
  if (!adminResult.error) {
    tenantId = adminResult.tenant.tenantId
    isAdmin = true
  } else {
    const publicTenant = await getTenantFromHeaders()
    tenantId = publicTenant?.id || null
    if (!tenantId) return NextResponse.json({ error: 'Tenant not found for host' }, { status: 404 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const memberId = (formData.get('team_member_id') || formData.get('cleaner_id')) as string | null

    if (!isAdmin) {
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
      const limit = await rateLimitDb(`upload:${tenantId}:${ip}`, 3, 10 * 60 * 1000)
      if (!limit.allowed) return NextResponse.json({ error: 'Too many uploads. Try again later.' }, { status: 429 })

      if (memberId) {
        const { data: member } = await supabaseAdmin
          .from('team_members')
          .select('id')
          .eq('id', memberId)
          .eq('tenant_id', tenantId)
          .eq('status', 'active')
          .single()
        if (!member) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: `File type "${file.type}" not allowed.` }, { status: 400 })
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File must be under 5MB' }, { status: 400 })
    }

    const rawExt = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const ext = SAFE_EXTS.includes(rawExt) ? rawExt : 'jpg'
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 8)
    const filename = `${tenantId}/team-photos/${timestamp}-${randomId}.${ext}`

    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await supabaseAdmin.storage
      .from('team-photos')
      .upload(filename, buffer, { contentType: file.type, upsert: false })

    if (uploadError) {
      console.error('[cleaners/upload] storage error:', uploadError)
      return NextResponse.json({ error: uploadError.message || 'Storage upload failed' }, { status: 500 })
    }

    const { data: urlData } = supabaseAdmin.storage.from('team-photos').getPublicUrl(filename)
    const photoUrl = urlData.publicUrl

    if (memberId) {
      await supabaseAdmin
        .from('team_members')
        .update({ photo_url: photoUrl, avatar_url: photoUrl })
        .eq('id', memberId)
        .eq('tenant_id', tenantId)
    }

    return NextResponse.json({ success: true, url: photoUrl })
  } catch (err) {
    console.error('[cleaners/upload] error:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
