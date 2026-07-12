import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { purgeDueDeletions } from '@/lib/gdpr'

// Daily cron: hard-purge (anonymize) any client whose right-to-be-forgotten
// grace period elapsed uncancelled. See src/lib/gdpr.ts for the anonymize-
// in-place model that preserves aggregate/financial history.
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { purged, failed } = await purgeDueDeletions()

  // Health-monitor marker — mirrors cron/generate-recurring's pattern.
  await supabaseAdmin.from('notifications').insert({  // tenant-scope-ok: cron job runs platform-wide across all tenants by design
    type: 'gdpr_purge_completed',
    title: 'cron:gdpr-purge',
    message: `purged=${purged.length} failed=${failed.length}`,
    channel: 'system',
    recipient_type: 'admin',
  }).then(() => {}, () => {})

  return NextResponse.json({ purged: purged.length, failed: failed.length })
}
