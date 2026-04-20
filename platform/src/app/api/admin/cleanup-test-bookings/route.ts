/**
 * Tenant-scoped purge of test-generated clients/bookings/conversations.
 * Ported from nycmaid. Phone/name/email patterns are tenant-agnostic.
 * Supports ?dry=true for preview. Auth: settings.edit.
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePermission } from '@/lib/require-permission'

const TEST_PHONE_PATTERNS = ['2125550', '917555', '7185550']
const TEST_EMAIL_PATTERN = /@e\.com$|test\d*@/i
const TEST_NAME_PATTERNS = [
  'Test Person', 'Test User', 'Test X', 'Carmen Diaz', 'Sofia Ruiz',
  'Change Mind', 'Price First', 'Mary Jones',
  'Ana Garcia', 'Ben Kim', 'Cara Lee', 'Dan Wu', 'Eva Torres',
  'Felix Chen', 'Gina Park', 'Hugo Diaz', 'Iris Shah', 'Jake Cruz',
  'Kim Patel', 'Leo Singh', 'Mia Brown', 'Nate Ali', 'Olivia Reyes',
  'Pete Huang', 'Quinn Davis', 'Ruby Lopez', 'Sam Nguyen', 'Tina Moore',
]

export async function POST(req: NextRequest) {
  const { tenant, error: authError } = await requirePermission('settings.edit')
  if (authError) return authError

  const tenantId = tenant.tenantId
  const dryRun = req.nextUrl.searchParams.get('dry') === 'true'

  const summary = {
    dryRun,
    testClientsFound: 0,
    testClientIds: [] as string[],
    bookingsToDelete: 0,
    bookingIds: [] as string[],
    conversationsToDelete: 0,
    conversationIds: [] as string[],
  }

  const phoneFilter = TEST_PHONE_PATTERNS.map(p => `phone.ilike.%${p}%`).join(',')
  const { data: byPhone } = await supabaseAdmin
    .from('clients')
    .select('id, name, phone, email')
    .eq('tenant_id', tenantId)
    .or(phoneFilter)

  const { data: byName } = await supabaseAdmin
    .from('clients')
    .select('id, name, phone, email')
    .eq('tenant_id', tenantId)
    .in('name', TEST_NAME_PATTERNS)

  const testClients = new Map<string, { id: string }>()
  for (const c of [...(byPhone || []), ...(byName || [])]) testClients.set(c.id, c)

  const { data: all } = await supabaseAdmin
    .from('clients')
    .select('id, email')
    .eq('tenant_id', tenantId)
  for (const c of all || []) {
    if (c.email && TEST_EMAIL_PATTERN.test(c.email)) testClients.set(c.id, c)
  }

  summary.testClientsFound = testClients.size
  summary.testClientIds = Array.from(testClients.keys())

  if (testClients.size === 0) return NextResponse.json(summary)

  const { data: bookings } = await supabaseAdmin
    .from('bookings')
    .select('id')
    .eq('tenant_id', tenantId)
    .in('client_id', summary.testClientIds)
  summary.bookingIds = (bookings || []).map(b => b.id)
  summary.bookingsToDelete = summary.bookingIds.length

  const { data: convos } = await supabaseAdmin
    .from('sms_conversations')
    .select('id')
    .eq('tenant_id', tenantId)
    .in('client_id', summary.testClientIds)
  summary.conversationIds = (convos || []).map(c => c.id)
  summary.conversationsToDelete = summary.conversationIds.length

  if (dryRun) return NextResponse.json(summary)

  const deleteResults: Record<string, { count: number; error?: string }> = {}
  const tryDelete = async (label: string, query: PromiseLike<unknown>) => {
    try {
      const res = (await query) as { data?: unknown; error?: { message?: string; code?: string } | null }
      const arr = Array.isArray(res?.data) ? res.data : []
      deleteResults[label] = {
        count: arr.length,
        error: res.error ? `${res.error.code || ''} ${res.error.message || ''}`.trim() : undefined,
      }
    } catch (err) {
      deleteResults[label] = { count: 0, error: err instanceof Error ? err.message : String(err) }
    }
  }

  if (summary.conversationIds.length) {
    await tryDelete('sms_conversation_messages', supabaseAdmin.from('sms_conversation_messages').delete({ count: 'exact' }).in('conversation_id', summary.conversationIds).select())
  }
  if (summary.bookingIds.length) {
    await tryDelete('notifications_by_booking', supabaseAdmin.from('notifications').delete({ count: 'exact' }).in('booking_id', summary.bookingIds).select())
    await tryDelete('payments_by_booking', supabaseAdmin.from('payments').delete({ count: 'exact' }).in('booking_id', summary.bookingIds).select())
    await tryDelete('team_member_payouts', supabaseAdmin.from('team_member_payouts').delete({ count: 'exact' }).in('booking_id', summary.bookingIds).select())
  }
  if (summary.conversationIds.length) {
    await tryDelete('sms_conversations', supabaseAdmin.from('sms_conversations').delete({ count: 'exact' }).in('id', summary.conversationIds).select())
  }
  if (summary.bookingIds.length) {
    await tryDelete('bookings', supabaseAdmin.from('bookings').delete({ count: 'exact' }).in('id', summary.bookingIds).select())
  }
  if (summary.testClientIds.length) {
    await tryDelete('selena_memory', supabaseAdmin.from('selena_memory').delete({ count: 'exact' }).in('client_id', summary.testClientIds).select())
    await tryDelete('payments_by_client', supabaseAdmin.from('payments').delete({ count: 'exact' }).in('client_id', summary.testClientIds).select())
    await tryDelete('sms_conversations_by_client', supabaseAdmin.from('sms_conversations').delete({ count: 'exact' }).in('client_id', summary.testClientIds).select())
    await tryDelete('recurring_schedules', supabaseAdmin.from('recurring_schedules').delete({ count: 'exact' }).in('client_id', summary.testClientIds).select())
    await tryDelete('notifications_by_client', supabaseAdmin.from('notifications').delete({ count: 'exact' }).in('client_id', summary.testClientIds).select())
    await tryDelete('clients', supabaseAdmin.from('clients').delete({ count: 'exact' }).in('id', summary.testClientIds).select())
  }

  return NextResponse.json({ ...summary, deleteResults })
}
