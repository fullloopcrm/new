import { NextRequest, NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { tenantDb } from '@/lib/tenant-db'
import { supabaseAdmin } from '@/lib/supabase'
import { translateToEnEs } from '@/lib/connect-translate'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
const MAX_BYTES = 5 * 1024 * 1024

export async function POST(request: NextRequest) {
  try {
    const { tenantId, tenant, userId } = await getTenantForRequest()
    const db = tenantDb(tenantId)

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const channelId = formData.get('channel_id') as string | null
    const caption = (formData.get('body') as string | null)?.trim() || ''

    if (!channelId) return NextResponse.json({ error: 'channel_id required' }, { status: 400 })
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: 'Only JPEG, PNG, WebP, or HEIC allowed' }, { status: 400 })
    if (file.size > MAX_BYTES) return NextResponse.json({ error: 'File must be under 5MB' }, { status: 400 })

    // Verify channel belongs to tenant -- same reasoning as messages/route.ts.
    const { data: channel } = await db
      .from('connect_channels')
      .select('id')
      .eq('id', channelId)
      .single()
    if (!channel) return NextResponse.json({ error: 'Channel not found' }, { status: 404 })

    const rawExt = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const ext = rawExt.replace(/[^a-z0-9]/g, '').slice(0, 8) || 'jpg'
    const path = `connect/${tenantId}/${channelId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await supabaseAdmin.storage
      .from('uploads')
      .upload(path, buffer, { contentType: file.type, upsert: false })
    if (uploadError) return NextResponse.json({ error: 'Upload failed' }, { status: 500 })

    const { data: urlData } = supabaseAdmin.storage.from('uploads').getPublicUrl(path)

    // Every Loop Connect message is auto-translated -- skip the Claude call
    // entirely for a caption-less photo, there's nothing to translate.
    const translated = caption ? await translateToEnEs(caption, tenant.anthropic_api_key) : null

    const { data, error } = await db
      .from('connect_messages')
      .insert({
        channel_id: channelId,
        sender_type: 'owner',
        sender_id: userId,
        sender_name: tenant.owner_name || tenant.name || 'Owner',
        body: caption,
        attachments: [urlData.publicUrl],
        ...(translated ? { body_en: translated.en, body_es: translated.es } : {}),
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await db
      .from('connect_read_cursors')
      .upsert(
        { channel_id: channelId, reader_type: 'owner', reader_id: userId, last_read_at: new Date().toISOString() },
        { onConflict: 'channel_id,reader_type,reader_id' }
      )

    return NextResponse.json({ message: data }, { status: 201 })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error('[connect/messages/upload] error:', e)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
