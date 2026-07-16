/**
 * Tenant-scoped purge of test-generated clients/bookings/conversations.
 * Ported from nycmaid. Phone/name/email patterns are tenant-agnostic.
 * Supports ?dry=true for preview. Auth: settings.edit.
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { tenantDb } from '@/lib/tenant-db'
import { requirePermission } from '@/lib/require-permission'

const TEST_PHONE_PATTERNS = ['2125550', '917555', '7185550']
// Anchored to the start of the local-part: the unanchored `test\d*@` also
// matched any real email merely containing that substring (latest@,
// protest@, contest@, attest@, clientest@, ...), which would permanently
// delete the matching real client (plus their bookings/payments/
// notifications) on a non-dry-run purge.
export const TEST_EMAIL_PATTERN = /@e\.com$|^test\d*@/i
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
  const db = tenantDb(tenantId)

  const summary = {
    dryRun,
    testClientsFound: 0,
    testClientIds: [] as string[],
    bookingsToDelete: 0,
    bookingIds: [] as string[],
    conversationsToDelete: 0,
    conversationIds: [] as string[],
  }

  // tenantDb's select() takes a non-literal `columns` param, which widens
  // supabase-js's column-string type inference — cast to the shape actually selected.
  const phoneFilter = TEST_PHONE_PATTERNS.map(p => `phone.ilike.%${p}%`).join(',')
  const { data: byPhone } = (await db
    .from('clients')
    .select('id, name, phone, email')
    .or(phoneFilter)) as { data: { id: string; name: string; phone: string | null; email: string | null }[] | null }

  const { data: byName } = (await db
    .from('clients')
    .select('id, name, phone, email')
    .in('name', TEST_NAME_PATTERNS)) as { data: { id: string; name: string; phone: string | null; email: string | null }[] | null }

  const testClients = new Map<string, { id: string }>()
  for (const c of [...(byPhone || []), ...(byName || [])]) testClients.set(c.id, c)

  const { data: all } = (await db
    .from('clients')
    .select('id, email')) as { data: { id: string; email: string | null }[] | null }
  for (const c of all || []) {
    if (c.email && TEST_EMAIL_PATTERN.test(c.email)) testClients.set(c.id, c)
  }

  summary.testClientsFound = testClients.size
  summary.testClientIds = Array.from(testClients.keys())

  if (testClients.size === 0) return NextResponse.json(summary)

  const { data: bookings } = (await db
    .from('bookings')
    .select('id')
    .in('client_id', summary.testClientIds)) as { data: { id: string }[] | null }
  summary.bookingIds = (bookings || []).map(b => b.id)
  summary.bookingsToDelete = summary.bookingIds.length

  const { data: convos } = (await db
    .from('sms_conversations')
    .select('id')
    .in('client_id', summary.testClientIds)) as { data: { id: string }[] | null }
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

  // sms_conversation_messages has no tenant_id column (scoped only via its
  // sms_conversations parent), so it stays on supabaseAdmin — tenantDb's
  // delete() would filter on a column that doesn't exist on this table.
  if (summary.conversationIds.length) {
    await tryDelete('sms_conversation_messages', supabaseAdmin.from('sms_conversation_messages').delete({ count: 'exact' }).in('conversation_id', summary.conversationIds).select())
  }
  if (summary.bookingIds.length) {
    await tryDelete('notifications_by_booking', db.from('notifications').delete().in('booking_id', summary.bookingIds).select())
    await tryDelete('payments_by_booking', db.from('payments').delete().in('booking_id', summary.bookingIds).select())
    await tryDelete('team_member_payouts', db.from('team_member_payouts').delete().in('booking_id', summary.bookingIds).select())
  }
  if (summary.conversationIds.length) {
    await tryDelete('sms_conversations', db.from('sms_conversations').delete().in('id', summary.conversationIds).select())
  }
  if (summary.bookingIds.length) {
    await tryDelete('bookings', db.from('bookings').delete().in('id', summary.bookingIds).select())
  }
  if (summary.testClientIds.length) {
    await tryDelete('selena_memory', db.from('selena_memory').delete().in('client_id', summary.testClientIds).select())
    await tryDelete('payments_by_client', db.from('payments').delete().in('client_id', summary.testClientIds).select())
    await tryDelete('sms_conversations_by_client', db.from('sms_conversations').delete().in('client_id', summary.testClientIds).select())
    await tryDelete('recurring_schedules', db.from('recurring_schedules').delete().in('client_id', summary.testClientIds).select())
    await tryDelete('notifications_by_client', db.from('notifications').delete().in('client_id', summary.testClientIds).select())
    await tryDelete('clients', db.from('clients').delete().in('id', summary.testClientIds).select())
  }

  return NextResponse.json({ ...summary, deleteResults })
}
