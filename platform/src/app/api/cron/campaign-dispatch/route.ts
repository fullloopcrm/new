import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyCronSecret } from '@/lib/cron-auth'
import { sendCampaign } from '@/lib/campaign-send'
import type { Tenant } from '@/lib/tenant'

export const maxDuration = 300

// Dispatches campaigns an admin scheduled for a future send time.
// POST /api/campaigns (with a scheduled_at) now writes status: 'scheduled',
// but nothing ever read that back — a scheduled campaign sat forever unless
// someone opened it and clicked "Send Now" by hand once the date arrived.
// This is that missing read: pick up every campaign whose scheduled_at has
// passed and run it through the same send path "Send Now" uses.
export async function GET(request: Request) {
  const cronAuthError = verifyCronSecret(request)
  if (cronAuthError) return cronAuthError

  const { data: due } = await supabaseAdmin
    .from('campaigns')
    .select('id, tenant_id')
    .eq('status', 'scheduled')
    .lte('scheduled_at', new Date().toISOString())
    .limit(200)

  const results: { campaign_id: string; tenant_id: string; ok: boolean; sent?: number; error?: string }[] = []

  for (const row of due || []) {
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('*')
      .eq('id', row.tenant_id)
      .single()

    if (!tenant) {
      results.push({ campaign_id: row.id, tenant_id: row.tenant_id, ok: false, error: 'Tenant not found' })
      continue
    }

    const result = await sendCampaign(row.id, row.tenant_id, tenant as Tenant)
    results.push(
      result.ok
        ? { campaign_id: row.id, tenant_id: row.tenant_id, ok: true, sent: result.sent }
        : { campaign_id: row.id, tenant_id: row.tenant_id, ok: false, error: result.error }
    )
  }

  return NextResponse.json({ success: true, processed: results.length, results })
}
