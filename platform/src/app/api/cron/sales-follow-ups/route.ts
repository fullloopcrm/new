/**
 * Sales follow-ups cron — daily at 10am.
 * Finds deals whose follow_up_at fell due in the last hour and notifies
 * each tenant's admin. Tenant-aware port from nycmaid.
 */
import { NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/cron-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { notify } from '@/lib/notify'
import { isNycMaid } from '@/lib/nycmaid/tenant'
import { smsAdmins as nmSmsAdmins } from '@/lib/nycmaid/admin-contacts'
import { verifyCronSecret } from '@/lib/cron-auth'

export const maxDuration = 60

export async function GET(request: Request) {
  const cronAuthError = verifyCronSecret(request)
  if (cronAuthError) return cronAuthError

  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

  const { data: deals, error } = await supabaseAdmin
    .from('deals')
    .select('id, tenant_id, follow_up_at, follow_up_note, clients(name, phone)')
    .eq('status', 'active')
    .lte('follow_up_at', now.toISOString())
    .gte('follow_up_at', oneHourAgo.toISOString())

  if (error) {
    console.error('[sales-follow-ups] query failed:', error.message)
    return NextResponse.json({ error: 'Query failed' }, { status: 500 })
  }
  if (!deals || deals.length === 0) {
    return NextResponse.json({ success: true, reminded: 0 })
  }

  // Dedup: skip deals already notified this hour.
  const dealIds = deals.map(d => d.id)
  const { data: existing } = await supabaseAdmin
    .from('notifications')  // tenant-scope-ok: cron job runs platform-wide across all tenants by design
    .select('metadata')
    .eq('type', 'follow_up')
    .gte('created_at', oneHourAgo.toISOString())

  const notifiedDealIds = new Set(
    (existing || [])
      .map(n => (n.metadata as Record<string, unknown> | null)?.deal_id as string | undefined)
      .filter((x): x is string => !!x)
  )

  let reminded = 0
  for (const deal of deals) {
    if (notifiedDealIds.has(deal.id as string)) continue

    const clientName = (deal.clients as unknown as { name?: string } | null)?.name || 'Unknown'
    const note = (deal.follow_up_note as string | null) || 'Follow up now'

    await notify({
      tenantId: deal.tenant_id as string,
      type: 'follow_up',
      title: 'Sales Follow-Up Due',
      message: `${clientName} — ${note}`,
      channel: 'email',
      recipientType: 'admin',
      metadata: { deal_id: deal.id, client_name: clientName },
    })

    // NYC Maid parity: also text admins (nycmaid SMSes the follow-up, FL emailed only).
    if (isNycMaid(deal.tenant_id as string)) {
      await nmSmsAdmins(`Sales follow-up: ${clientName} — ${note}`).catch(() => {})
    }

    reminded++
  }

  return NextResponse.json({ success: true, reminded })
}
