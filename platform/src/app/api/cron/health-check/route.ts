import { NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/cron-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { notify } from '@/lib/notify'
import { trackError } from '@/lib/error-tracking'

export const maxDuration = 120

/**
 * Self-healing health check — runs once daily (vercel.json: `0 12 * * *`).
 * Doesn't just detect problems — it fixes them.
 *
 * 1. Retry failed notifications (up to 3 attempts)
 * 2. Detect tenants with broken integrations
 * 3. Clean up stale data
 * 4. Alert on error spikes
 * 5. Verify system connectivity
 */
export async function GET(request: Request) {
  const cronAuthError = verifyCronSecret(request)
  if (cronAuthError) return cronAuthError

  const issues: string[] = []
  const fixes: string[] = []

  // =============================================
  // 1. RETRY FAILED NOTIFICATIONS (self-healing)
  // =============================================
  try {
    // vercel.json actually schedules this cron once daily (`0 12 * * *`),
    // not "every 15 minutes" as this file's docstring assumes. A 1-hour
    // lookback only ever caught failures from the ~1hr before each day's
    // single run -- everything else aged out of a backward-looking window
    // before the next run could see it, and never got a single retry
    // attempt despite the retry_count<3 cap implying up to three. Widen to
    // cover a full day plus drift margin so any failure from the last cron
    // cycle is still picked up on the very next run; the 7-day expiry in
    // section 3 below remains the real backstop against runaway staleness.
    const retryWindowStart = new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString()
    const { data: failedNotifs } = await supabaseAdmin
      .from('notifications')
      .select('id, tenant_id, type, title, message, channel, recipient_type, recipient_id, booking_id, metadata, retry_count')
      .eq('status', 'failed')
      .gte('created_at', retryWindowStart)
      .lt('retry_count', 3) // max 3 retries
      .order('created_at', { ascending: true })
      .limit(50) // process up to 50 per run

    let retried = 0
    let retrySuccess = 0

    for (const notif of failedNotifs || []) {
      if (!notif.tenant_id) continue

      // Increment retry count first to prevent infinite loops
      await supabaseAdmin
        .from('notifications')
        .update({ retry_count: (notif.retry_count || 0) + 1, status: 'retrying' })
        .eq('id', notif.id)

      retried++

      try {
        const result = await notify({
          tenantId: notif.tenant_id,
          type: notif.type,
          title: `[Retry] ${notif.title}`,
          message: notif.message,
          channel: notif.channel || 'email',
          recipientType: notif.recipient_type || 'admin',
          recipientId: notif.recipient_id || undefined,
          bookingId: notif.booking_id || undefined,
          metadata: { ...(notif.metadata as Record<string, unknown> || {}), _retryOf: notif.id },
        })

        if (result.success) {
          // Mark original as resolved
          await supabaseAdmin
            .from('notifications')
            .update({ status: 'retry_success' })
            .eq('id', notif.id)
          retrySuccess++
        } else {
          // Still failing — update with latest error
          await supabaseAdmin
            .from('notifications')
            .update({
              status: 'failed',
              metadata: { ...(notif.metadata as Record<string, unknown> || {}), _lastRetryError: result.error },
            })
            .eq('id', notif.id)
        }
      } catch (retryErr) {
        await supabaseAdmin
          .from('notifications')
          .update({ status: 'failed' })
          .eq('id', notif.id)
      }
    }

    if (retried > 0) {
      fixes.push(`Retried ${retried} failed notifications, ${retrySuccess} succeeded`)
    }
  } catch (e) {
    issues.push(`Retry engine error: ${e instanceof Error ? e.message : String(e)}`)
  }

  // =============================================
  // 2. DETECT BROKEN TENANT INTEGRATIONS
  // =============================================
  try {
    const { data: tenants } = await supabaseAdmin
      .from('tenants')
      .select('id, name, resend_api_key, telnyx_api_key, telnyx_phone, stripe_api_key')
      .eq('status', 'active')

    const missingIntegrations: string[] = []

    for (const t of tenants || []) {
      const missing: string[] = []
      if (!t.resend_api_key) missing.push('email')
      if (!t.telnyx_api_key || !t.telnyx_phone) missing.push('sms')
      if (!t.stripe_api_key) missing.push('payments')

      // Only flag if they have clients (active business, not just onboarding)
      if (missing.length > 0) {
        const { count } = await supabaseAdmin
          .from('clients')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', t.id)

        if ((count || 0) > 0) {
          missingIntegrations.push(`${t.name}: missing ${missing.join(', ')}`)
        }
      }
    }

    if (missingIntegrations.length > 0) {
      issues.push(`${missingIntegrations.length} active tenants with missing integrations`)
    }
  } catch {
    // Non-critical
  }

  // =============================================
  // 3. CLEAN UP STALE DATA
  // =============================================
  try {
    // Mark notifications older than 30 days as archived
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { data: archivedRows } = await supabaseAdmin
      .from('notifications')  // tenant-scope-ok: cron job runs platform-wide across all tenants by design
      .update({ status: 'archived' })
      .in('status', ['sent', 'retry_success'])
      .lt('created_at', thirtyDaysAgo)
      .select('id')
    const archived = archivedRows?.length || 0

    if (archived && archived > 0) {
      fixes.push(`Archived ${archived} old notifications`)
    }

    // Clear failed notifications older than 7 days that exhausted retries
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: clearedRows } = await supabaseAdmin
      .from('notifications')  // tenant-scope-ok: cron job runs platform-wide across all tenants by design
      .update({ status: 'expired' })
      .eq('status', 'failed')
      .gte('retry_count', 3)
      .lt('created_at', sevenDaysAgo)
      .select('id')
    const cleared = clearedRows?.length || 0

    if (cleared && cleared > 0) {
      fixes.push(`Expired ${cleared} unrecoverable failed notifications`)
    }
  } catch {
    // Non-critical
  }

  // =============================================
  // 4. ERROR SPIKE DETECTION + ALERT
  // =============================================
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { data: recentErrors } = await supabaseAdmin
      .from('notifications')
      .select('id, tenant_id, title, message')
      .eq('type', 'error')
      .gte('created_at', oneHourAgo)

    if (recentErrors && recentErrors.length >= 10) {
      issues.push(`Error spike: ${recentErrors.length} errors in the last hour`)

      // Group by source to identify the culprit
      const bySource: Record<string, number> = {}
      for (const e of recentErrors) {
        const src = e.title || 'unknown'
        bySource[src] = (bySource[src] || 0) + 1
      }

      const topSources = Object.entries(bySource)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([src, count]) => `${src} (${count})`)
        .join(', ')

      await trackError(
        new Error(`Error spike detected: ${recentErrors.length} errors. Top sources: ${topSources}`),
        { source: 'cron/health-check', severity: 'high' }
      )
    }
  } catch {
    // Non-critical
  }

  // =============================================
  // 5. BOOKINGS WITH STALE STATUS
  // =============================================
  try {
    // Find bookings that are "in_progress" but end_time was 4+ hours ago
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
    const { data: staleBookings } = await supabaseAdmin
      .from('bookings')
      .select('id, tenant_id, notes')
      .eq('status', 'in_progress')
      .lt('end_time', fourHoursAgo)
      .limit(100)

    if (staleBookings && staleBookings.length > 0) {
      // Auto-complete them one at a time, not a bulk `.in('id', ids)` update:
      // (1) the old bulk update set `notes` to a fixed literal, silently
      // WIPING any real notes already on the booking (arrival details, GPS
      // flags, damage reports) -- every other write path on this column
      // (e.g. team-portal/checkin's GPS flag) appends, never overwrites, so
      // this needs each row's own current notes to append onto. (2) the
      // update now re-asserts `.eq('status', 'in_progress')` in its own
      // WHERE instead of trusting the SELECT snapshot, so a team member who
      // genuinely checks out in the gap between the SELECT and this write
      // can't have their real completion silently reverted back to
      // 'completed' with a fabricated system note stapled on.
      let completedCount = 0
      for (const b of staleBookings) {
        const { data: claimed } = await supabaseAdmin
          .from('bookings')
          .update({
            status: 'completed',
            notes: `${b.notes || ''}\n\n[Auto-completed by system — end time passed]`.trim(),
          })
          .eq('id', b.id)
          .eq('tenant_id', b.tenant_id)
          .eq('status', 'in_progress')
          .select('id')
          .maybeSingle()
        if (claimed) completedCount++
      }

      if (completedCount > 0) fixes.push(`Auto-completed ${completedCount} stale in-progress bookings`)
    }
  } catch {
    // Non-critical
  }

  // =============================================
  // 6. SYSTEM CONNECTIVITY
  // =============================================
  try {
    const { error } = await supabaseAdmin.from('tenants').select('id', { count: 'exact', head: true })
    if (error) issues.push(`Supabase query failed: ${error.message}`)
  } catch (e) {
    issues.push(`Supabase unreachable: ${e instanceof Error ? e.message : String(e)}`)
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) issues.push('SUPABASE_URL missing')
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) issues.push('SUPABASE_SERVICE_ROLE_KEY missing')
  if (!process.env.CRON_SECRET) issues.push('CRON_SECRET missing')

  // =============================================
  // REPORT
  // =============================================
  const healthy = issues.length === 0

  if (!healthy) {
    await supabaseAdmin.from('notifications').insert({  // tenant-scope-ok: cron job runs platform-wide across all tenants by design
      type: 'error',
      title: 'Health Check Issues',
      message: issues.join('; ').slice(0, 500),
      channel: 'system',
      recipient_type: 'admin',
    })
  }

  return NextResponse.json({
    healthy,
    issues,
    fixes,
    timestamp: new Date().toISOString(),
  })
}
