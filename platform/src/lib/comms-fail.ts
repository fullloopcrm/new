// Dedup wrapper for `comms_fail` notification rows — same shape as
// trackError()'s error_logs dedup (src/lib/error-tracking.ts): a repeat of
// the same (tenant_id, dedupKey) within the window bumps
// metadata.occurrence_count + created_at on the existing unread row instead
// of inserting a fresh one, so a persistent real outage alerts once instead
// of flooding notifications/comms-monitor/Telegram every cycle. Added
// 2026-07-27 alongside removing the false-positive comms_fail trace in the
// Telnyx webhook — this handles the case where the failures are real.
//
// dedupKey defaults to `title` (system-level failures — e.g. "Telnyx balance
// low" — should collapse across every affected run). Pass a more specific
// dedupKey (e.g. `${title}:${clientId}`) for per-entity failures so distinct
// clients/bookings don't mask each other under one row.
import { supabaseAdmin } from './supabase'

const DEDUP_WINDOW_MS = 60 * 60 * 1000 // 1h

export interface LogCommsFailInput {
  tenantId?: string | null
  title: string
  message: string
  dedupKey?: string
  channel?: string
  status?: string
  bookingId?: string | null
  metadata?: Record<string, unknown>
}

export async function logCommsFail(input: LogCommsFailInput): Promise<void> {
  const tenantId = input.tenantId ?? null
  const dedupKey = input.dedupKey || input.title

  try {
    const since = new Date(Date.now() - DEDUP_WINDOW_MS).toISOString()
    const { data: existing } = await supabaseAdmin
      .from('notifications')
      .select('id, metadata')
      .eq('type', 'comms_fail')
      .eq('tenant_id', tenantId as string)
      .eq('metadata->>dedup_key', dedupKey)
      .eq('read', false)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existing) {
      const priorCount = (existing.metadata as { occurrence_count?: number } | null)?.occurrence_count || 1
      await supabaseAdmin.from('notifications').update({
        created_at: new Date().toISOString(),
        message: input.message,
        metadata: {
          ...(existing.metadata as object | null),
          ...(input.metadata || {}),
          dedup_key: dedupKey,
          occurrence_count: priorCount + 1,
        },
      }).eq('id', existing.id)
      return
    }

    await supabaseAdmin.from('notifications').insert({
      tenant_id: tenantId,
      type: 'comms_fail',
      title: input.title,
      message: input.message,
      channel: input.channel ?? null,
      status: input.status ?? null,
      booking_id: input.bookingId ?? null,
      recipient_type: 'admin',
      metadata: { ...(input.metadata || {}), dedup_key: dedupKey, occurrence_count: 1 },
    })
  } catch (e) {
    console.error('[comms-fail] failed to log:', e)
  }
}
