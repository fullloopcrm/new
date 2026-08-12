import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { tenantDb } from '@/lib/tenant-db'
import { verifyToken } from '../../auth/token'
import { translateToEnEs } from '@/lib/connect-translate'
import { resolveTeamConnectChannel } from '@/lib/connect-team-channel'
import { corsPreflight, withMobileCors } from '@/lib/mobile-cors'

export const OPTIONS = corsPreflight

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
const MAX_BYTES = 5 * 1024 * 1024

export const POST = withMobileCors(async function POST(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = verifyToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const requestedChannelId = formData.get('channel_id') as string | null
    const caption = (formData.get('body') as string | null)?.trim() || ''

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: 'Only JPEG, PNG, WebP, or HEIC allowed' }, { status: 400 })
    if (file.size > MAX_BYTES) return NextResponse.json({ error: 'File must be under 5MB' }, { status: 400 })

    const { data: member } = await tenantDb(auth.tid)
      .from('team_members')
      .select('name')
      .eq('id', auth.id)
      .single()

    const channel = await resolveTeamConnectChannel(auth, requestedChannelId || null)
    if (!channel) return NextResponse.json({ error: 'No channel' }, { status: 400 })

    const rawExt = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const ext = rawExt.replace(/[^a-z0-9]/g, '').slice(0, 8) || 'jpg'
    const path = `connect/${auth.tid}/${channel.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await supabaseAdmin.storage
      .from('uploads')
      .upload(path, buffer, { contentType: file.type, upsert: false })
    if (uploadError) return NextResponse.json({ error: 'Upload failed' }, { status: 500 })

    const { data: urlData } = supabaseAdmin.storage.from('uploads').getPublicUrl(path)

    const { data: tenant } = await supabaseAdmin.from('tenants').select('anthropic_api_key').eq('id', auth.tid).single()
    const translated = caption ? await translateToEnEs(caption, tenant?.anthropic_api_key) : null

    const { data, error } = await tenantDb(auth.tid)
      .from('connect_messages') // tenant-scope-ok: tenantDb() stamps tenant_id on insert
      .insert({
        channel_id: channel.id,
        sender_type: 'team',
        sender_id: auth.id,
        sender_name: member?.name || 'Team Member',
        body: caption,
        attachments: [urlData.publicUrl],
        ...(translated ? { body_en: translated.en, body_es: translated.es } : {}),
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: 'Failed to send' }, { status: 500 })

    await tenantDb(auth.tid)
      .from('connect_read_cursors') // tenant-scope-ok: tenantDb() stamps tenant_id on upsert
      .upsert(
        { channel_id: channel.id, reader_type: 'team', reader_id: auth.id, last_read_at: new Date().toISOString() },
        { onConflict: 'channel_id,reader_type,reader_id' }
      )

    return NextResponse.json({ message: { ...data, display_body: data.body_es || data.body } }, { status: 201 })
  } catch (e) {
    console.error('[team-portal/connect/upload] error:', e)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
})
