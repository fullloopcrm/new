/**
 * Test-only harness — drives Selena on the email channel without sending
 * an outbound email. Used for parity testing. Gated by a static token.
 *
 * Tenant resolved via ?tenant_id= query param (since this is a test endpoint,
 * no host-based middleware resolution).
 */
import { NextRequest, NextResponse } from 'next/server'
import { randomInt } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { askSelena, EMPTY_CHECKLIST } from '@/lib/selena'

const TEST_TOKEN = 'selena-email-parity-2026-04-19-xk7p'
const TEST_TAG = 'selena-email-test'

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    email?: string
    message?: string
    key?: string
    reset?: boolean
    tenant_id?: string
  } | null
  if (!body) return NextResponse.json({ error: 'bad_body' }, { status: 400 })
  if (body.key !== TEST_TOKEN) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const tenantId = body.tenant_id || request.nextUrl.searchParams.get('tenant_id')
  if (!tenantId) return NextResponse.json({ error: 'tenant_id required' }, { status: 400 })

  const email = (body.email || '').toLowerCase().trim()
  const message = (body.message || '').trim()
  if (!email || !message) return NextResponse.json({ error: 'email_and_message_required' }, { status: 400 })

  let { data: client } = await supabaseAdmin
    .from('clients')
    .select('id, name, email, phone, do_not_service')
    .eq('tenant_id', tenantId)
    .ilike('email', email)
    .maybeSingle()

  if (!client) {
    const { data: created, error: createErr } = await supabaseAdmin
      .from('clients')
      .insert({
        tenant_id: tenantId,
        email,
        name: `Test ${email.split('@')[0]}`,
        phone: `email-test-${Date.now()}`,
        status: 'potential',
        notes: TEST_TAG,
        pin: randomInt(100000, 1000000).toString(),
      })
      .select('id, name, email, phone, do_not_service')
      .single()
    if (createErr || !created) {
      return NextResponse.json({ error: createErr?.message || 'client_create_failed' }, { status: 500 })
    }
    client = created
  }

  if (client.do_not_service) return NextResponse.json({ error: 'dns_client', reply: null })

  const emailKey = `email-${client.id}`
  let { data: convo } = await supabaseAdmin
    .from('sms_conversations')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('client_id', client.id)
    .eq('phone', emailKey)
    .is('completed_at', null)
    .eq('expired', false)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (convo && body.reset) {
    await supabaseAdmin.from('sms_conversation_messages').delete().eq('conversation_id', convo.id)
    await supabaseAdmin
      .from('sms_conversations')
      .update({ expired: true, completed_at: new Date().toISOString() })
      .eq('id', convo.id)
    convo = null
  }

  if (!convo) {
    const { data: created, error: createErr } = await supabaseAdmin
      .from('sms_conversations')
      .insert({
        tenant_id: tenantId,
        phone: emailKey,
        client_id: client.id,
        state: 'active',
        booking_checklist: {
          ...EMPTY_CHECKLIST,
          phone: client.phone || null,
          name: client.name || null,
          email: client.email || email,
        },
      })
      .select('id')
      .single()
    if (createErr || !created) {
      return NextResponse.json({ error: createErr?.message || 'convo_create_failed' }, { status: 500 })
    }
    convo = created
  }

  await supabaseAdmin.from('sms_conversation_messages').insert({
    conversation_id: convo.id,
    tenant_id: tenantId,
    direction: 'inbound',
    message,
  })

  const result = await askSelena(tenantId, 'email', message, convo.id, client.phone || undefined)
  const reply = result.text || ''

  if (reply) {
    await supabaseAdmin.from('sms_conversation_messages').insert({
      conversation_id: convo.id,
      tenant_id: tenantId,
      direction: 'outbound',
      message: reply.replace(/\[ESCALATE[^\]]*\]/gi, '').trim(),
    })
  }

  interface ResultWithExtras { intent?: string; bookingCreated?: boolean }
  const extras = result as unknown as ResultWithExtras

  return NextResponse.json({
    reply,
    conversationId: convo.id,
    clientId: client.id,
    intent: extras.intent || null,
    bookingCreated: !!extras.bookingCreated,
  })
}
