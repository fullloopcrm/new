import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { notify } from '@/lib/notify'
import { trackError } from '@/lib/error-tracking'

export const maxDuration = 120

/**
 * Self-healing health check — runs every 15 minutes.
 * Doesn't just detect problems — it fixes them.
 *
 * 1. Retry failed notifications (up to 3 attempts)
 * 2. Detect tenants with broken integrations
 * 3. Clean up stale data
 * 4. Alert on error spikes
 * 5. Verify system connectivity
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const issues: string[] = []
  const fixes: string[] = []

  // =============================================
  // 1. RETRY FAILED NOTIFICATIONS (self-healing)
  // =============================================
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { data: failedNotifs } = await supabaseAdmin
      .from('notifications')
      .select('id, tenant_id, type, title, message, channel, recipient_type, recipient_id, booking_id, metadata, retry_count')
      .eq('status', 'failed')
      .gte('created_at', oneHourAgo)
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
      .from('notifications')
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
      .from('notifications')
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
      .select('id, tenant_id')
      .eq('status', 'in_progress')
      .lt('end_time', fourHoursAgo)
      .limit(100)

    if (staleBookings && staleBookings.length > 0) {
      // Auto-complete them
      const ids = staleBookings.map(b => b.id)
      await supabaseAdmin
        .from('bookings')
        .update({ status: 'completed', notes: '[Auto-completed by system — end time passed]' })
        .in('id', ids)

      fixes.push(`Auto-completed ${staleBookings.length} stale in-progress bookings`)
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
    await supabaseAdmin.from('notifications').insert({
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
