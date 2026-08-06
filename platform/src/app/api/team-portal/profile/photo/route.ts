/**
 * Team member profile-photo upload — mobile app's Profile screen
 * (components/team-avatar-upload.tsx). That component was written against
 * this exact contract (POST multipart 'file' -> { avatar_url }) as a
 * documented ASSUMPTION before this route existed; it did not exist on
 * `main` and did not exist on this reconciliation branch as of the
 * component's own comment. This is the real implementation closing that gap.
 *
 * Storage/DB logic is the same battle-tested path as the legacy admin/public
 * upload endpoint (/api/cleaners/upload, bucket `team-photos`) — reused
 * here rather than re-invented, just gated by the team-portal bearer token
 * instead of admin session / anonymous tenant-scoped lookup. Deliberately a
 * separate route rather than extending /api/cleaners/upload with a bearer
 * branch: the mobile app's frontend already targets this exact path, and
 * splitting keeps the legacy route's admin/public-anonymous auth surface
 * untouched.
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { tenantDb } from '@/lib/tenant-db'
import { verifyToken } from '../../auth/token'
import { corsPreflight, withMobileCors } from '@/lib/mobile-cors'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
const SAFE_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif']

export const OPTIONS = corsPreflight

export const POST = withMobileCors(async function POST(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const auth = verifyToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  // Instant revocation: the token carries the member id/tenant it was minted
  // for, but a fired/suspended member's access must die immediately, not at
  // the token's (mobile: 10-year) natural expiry. Mirrors
  // requirePortalPermission's per-request status re-check
  // (lib/team-portal-auth.ts) and /api/cleaners/upload's own mobile-bearer
  // branch — re-read the CURRENT status from team_members on every request
  // instead of trusting the signed claim. Checked as `=== 'active'`
  // (allow-list), not a deny-list — team_members.status also has 'pending'/
  // 'suspended' values, and a deny-list would silently miss those.
  const { data: member } = await tenantDb(auth.tid)
    .from('team_members')
    .select('status')
    .eq('id', auth.id)
    .single<{ status: string | null }>()
  if (!member || member.status !== 'active') {
    return NextResponse.json({ error: 'Account inactive' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
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
    const filename = `${auth.tid}/team-photos/${timestamp}-${randomId}.${ext}`

    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await supabaseAdmin.storage
      .from('team-photos')
      .upload(filename, buffer, { contentType: file.type, upsert: false })

    if (uploadError) {
      console.error('[team-portal/profile/photo] storage error:', uploadError)
      return NextResponse.json({ error: uploadError.message || 'Storage upload failed' }, { status: 500 })
    }

    const { data: urlData } = supabaseAdmin.storage.from('team-photos').getPublicUrl(filename)
    const photoUrl = urlData.publicUrl

    // Self-upload only — a mobile bearer token may only ever write ITS OWN
    // member row (auth.id), never a caller-supplied id, unlike the legacy
    // admin/public route which trusts a form field for who's being updated.
    await tenantDb(auth.tid)
      .from('team_members')
      .update({ photo_url: photoUrl, avatar_url: photoUrl })
      .eq('id', auth.id)

    return NextResponse.json({ avatar_url: photoUrl })
  } catch (err) {
    console.error('[team-portal/profile/photo] error:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
})
