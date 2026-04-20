/**
 * Sales follow-ups cron — daily at 10am.
 * Finds deals whose follow_up_at fell due in the last hour and notifies
 * each tenant's admin. Tenant-aware port from nycmaid.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { notify } from '@/lib/notify'

export const maxDuration = 60

export async function GET(request: Request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

  const { data: deals, error } = await supabaseAdmin
    .from('deals')
    .select('id, tenant_id, follow_up_at, follow_up_note, clients(name, phone)')
    .eq('stage', 'active')
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
    .from('notifications')
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

    reminded++
  }

  return NextResponse.json({ success: true, reminded })
}
