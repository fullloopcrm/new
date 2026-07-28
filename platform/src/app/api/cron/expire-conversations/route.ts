/**
 * Auto-expires stale sms_conversations across all tenants.
 *
 * A conversation only ever closes today via a completed booking, an admin
 * manually marking it expired, or the client texting START OVER/RESET —
 * there was no time-based path. Confirmed live 2026-07-27: 0 of the last 37
 * NYC Maid conversations opened in 7 days were completed or expired; 290
 * new ones piled up open in the last 30 days alone. Runs daily and expires
 * any conversation with no activity (by last_message_at, falling back to
 * created_at) in STALE_DAYS, so a client texting in months later starts a
 * fresh conversation instead of resuming ancient checklist state.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { trackError } from '@/lib/error-tracking'
import { safeEqual } from '@/lib/secret-compare'

const STALE_DAYS = 7

export async function GET(request: Request) {
  const auth = request.headers.get('authorization') || ''
  const secret = process.env.CRON_SECRET
  if (!secret || !safeEqual(auth, `Bearer ${secret}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const cutoff = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000).toISOString()

    const { data: stale } = await supabaseAdmin
      .from('sms_conversations')  // tenant-scope-ok: cron job runs platform-wide across all tenants by design
      .select('id')
      .eq('expired', false)
      .is('completed_at', null)
      .lt('created_at', cutoff)
      .or(`last_message_at.lt.${cutoff},last_message_at.is.null`)
      .limit(500)

    if (!stale || stale.length === 0) {
      return NextResponse.json({ success: true, expired: 0 })
    }

    const { error } = await supabaseAdmin
      .from('sms_conversations')  // tenant-scope-ok: updating by own id list gathered above, no cross-tenant write
      .update({ expired: true })
      .in('id', stale.map(c => c.id))

    if (error) throw error

    return NextResponse.json({ success: true, expired: stale.length })
  } catch (err) {
    await trackError(err, { source: 'cron/expire-conversations', severity: 'medium' })
    return NextResponse.json({ error: 'expire-conversations failed' }, { status: 500 })
  }
}
