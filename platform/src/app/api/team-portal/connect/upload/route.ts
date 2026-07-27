import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { tenantDb } from '@/lib/tenant-db'
import { verifyToken } from '../../auth/token'
import { notifyConnectDM } from '@/lib/connect-notify'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
const MAX_BYTES = 5 * 1024 * 1024

export async function POST(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = verifyToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const channelId = formData.get('channel_id') as string | null
    const caption = (formData.get('body') as string | null)?.trim() || ''

    if (!channelId) return NextResponse.json({ error: 'channel_id required' }, { status: 400 })
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: 'Only JPEG, PNG, WebP, or HEIC allowed' }, { status: 400 })
    if (file.size > MAX_BYTES) return NextResponse.json({ error: 'File must be under 5MB' }, { status: 400 })

    // Same channel-ownership rule as team-portal/connect POST: general, or this
    // team member's own DM — never another member's DM or a client channel.
    // Checked in application code, not `.or()` — see route.ts for why.
    const { data: candidate } = await supabaseAdmin
      .from('connect_channels')
      .select('id, type, team_member_id')
      .eq('id', channelId)
      .eq('tenant_id', auth.tid)
      .single()
    const isOwnDm = candidate?.type === 'dm' && candidate.team_member_id === auth.id
    if (!candidate || !(candidate.type === 'general' || isOwnDm)) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
    }
    const channel = candidate

    const { data: member } = await tenantDb(auth.tid)
      .from('team_members')
      .select('name')
      .eq('id', auth.id)
      .single()

    const rawExt = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const ext = rawExt.replace(/[^a-z0-9]/g, '').slice(0, 8) || 'jpg'
    const path = `connect/${auth.tid}/${channelId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await supabaseAdmin.storage
      .from('uploads')
      .upload(path, buffer, { contentType: file.type, upsert: false })
    if (uploadError) return NextResponse.json({ error: 'Upload failed' }, { status: 500 })

    const { data: urlData } = supabaseAdmin.storage.from('uploads').getPublicUrl(path)
    const senderName = member?.name || 'Team Member'

    const { data, error } = await tenantDb(auth.tid)
      .from('connect_messages') // tenant-scope-ok: tenantDb() stamps tenant_id on insert
      .insert({
        channel_id: channelId,
        sender_type: 'team',
        sender_id: auth.id,
        sender_name: senderName,
        body: caption,
        attachments: [urlData.publicUrl],
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await tenantDb(auth.tid)
      .from('connect_read_cursors') // tenant-scope-ok: tenantDb() stamps tenant_id on upsert
      .upsert(
        { channel_id: channelId, reader_type: 'team', reader_id: auth.id, last_read_at: new Date().toISOString() },
        { onConflict: 'channel_id,reader_type,reader_id' }
      )

    if (channel.type === 'dm') {
      notifyConnectDM({
        tenantId: auth.tid,
        direction: 'to_owner',
        teamMemberId: auth.id,
        senderName,
        body: caption || 'Sent a photo',
      }).catch(err => console.error('[team-portal/connect/upload] notify failed:', err))
    }

    return NextResponse.json({ message: data }, { status: 201 })
  } catch (e) {
    console.error('[team-portal/connect/upload] error:', e)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
