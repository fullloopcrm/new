import { NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/cron-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { notify } from '@/lib/notify'
import { trackError } from '@/lib/error-tracking'
import { sweepTenant } from '@/lib/client-dedupe'

export const maxDuration = 300

// Daily background sweep for the 2026-08-13 automated client dedupe (see
// src/lib/client-dedupe.ts for the full rule set). Per tenant: auto-merges
// pairs matching on both phone AND email (unless a name-mismatch or
// job_seq-collision guard trips), and queues everything else
// (phone-only/email-only matches) into client_dedupe_queue for a human at
// /dashboard/clients "Duplicates" tab. Only ever combines records -- the
// merge itself never hard-deletes (see client-merge.ts).
export async function GET(request: Request) {
  const cronAuthError = verifyCronSecret(request)
  if (cronAuthError) return cronAuthError

  const { data: tenants } = await supabaseAdmin
    .from('tenants')
    .select('id, name')
    .eq('status', 'active')
    .limit(1000)

  let totalMerged = 0
  let totalQueued = 0

  for (const tenant of tenants || []) {
    try {
      const result = await sweepTenant(tenant.id)
      totalMerged += result.merged
      totalQueued += result.queued
      if (result.merged > 0 || result.queued > 0) {
        await notify({
          tenantId: tenant.id,
          type: result.merged > 0 ? 'client_dedupe_merged' : 'client_dedupe_queued',
          title: 'Duplicate client sweep',
          message: `Auto-merged ${result.merged} duplicate client pair(s). ${result.queued} more need review — see Clients > Duplicates.`,
          recipientType: 'admin',
        })
      }
    } catch (err) {
      await trackError(err, { source: 'cron/dedupe-clients', severity: 'high', tenantId: tenant.id })
    }
  }

  return NextResponse.json({ success: true, merged: totalMerged, queued: totalQueued })
}
