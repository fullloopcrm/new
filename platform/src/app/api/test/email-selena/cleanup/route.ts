/**
 * Purge test-only clients + conversations + messages created by
 * /api/test/email-selena. Tenant-scoped.
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const TEST_TAG = 'selena-email-test'

export async function POST(request: NextRequest) {
  const expectedToken = process.env.SELENA_TEST_TOKEN
  if (!expectedToken) {
    return NextResponse.json({ error: 'test_harness_disabled' }, { status: 404 })
  }

  const body = (await request.json().catch(() => null)) as { key?: string; tenant_id?: string } | null
  if (!body || body.key !== expectedToken) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const tenantId = body.tenant_id || request.nextUrl.searchParams.get('tenant_id')
  if (!tenantId) return NextResponse.json({ error: 'tenant_id required' }, { status: 400 })

  const { data: clients } = await supabaseAdmin
    .from('clients')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('notes', TEST_TAG)

  const ids = (clients || []).map(c => c.id)
  if (ids.length === 0) return NextResponse.json({ deleted_clients: 0, deleted_convos: 0 })

  const { data: convos } = await supabaseAdmin
    .from('sms_conversations')
    .select('id')
    .eq('tenant_id', tenantId)
    .in('client_id', ids)

  const convoIds = (convos || []).map(c => c.id)
  if (convoIds.length > 0) {
    await supabaseAdmin.from('sms_conversation_messages').delete().in('conversation_id', convoIds)
    await supabaseAdmin.from('sms_conversations').delete().in('id', convoIds)
  }
  await supabaseAdmin.from('clients').delete().in('id', ids).eq('tenant_id', tenantId)

  return NextResponse.json({ deleted_clients: ids.length, deleted_convos: convoIds.length })
}
