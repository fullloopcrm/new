/**
 * PROOF OF CONVERSION — sidebar-counts — NOT WIRED, REVERSIBLE.
 *
 * Low-risk GET read converted to the scoped client:
 *   - src/app/api/sidebar-counts/route.ts  (GET: nav badge counts across four tables)
 *
 * What this route adds: a MULTI-TABLE parallel count fan-out (clients, bookings,
 * website_visits, notifications) via Promise.all, PLUS a best-effort connect-unread sub-block
 * wrapped in try/catch. The conversion is the one-line client swap
 * (`const db = tenantClient(tenantId)`); every `.from()` moves to the scoped client together.
 * Every `.eq('tenant_id', tenantId)` is KEPT verbatim.
 *
 * ⚠ CROSS-TABLE RLS DEPENDENCIES:
 *   - `website_visits` is NOT in the 58-table Tier list and has no policy yet → under an
 *     authenticated token its count default-denies to 0.
 *   - the connect sub-block reads `connect_channels` (tenant-scoped) then `connect_read_cursors`
 *     and `connect_messages` (scoped by reader/channel, NOT tenant) — same child-table policy
 *     dependency as connect/unread.
 *
 * ⚠ SILENT-DEGRADATION HAZARD (called out, not fixed here): the connect sub-block's
 * `try { … } catch {}` swallows ALL errors ("table may not exist yet"). After RLS is enabled,
 * an authenticated token with no policy on the connect_* child tables makes those reads THROW —
 * which this catch swallows, so `connect` silently reports 0 instead of surfacing the misconfig.
 * The fail-closed posture that tenantClient enforces at the factory is defeated here at the
 * call site. When this route is converted for real, narrow the catch to the "table missing"
 * case (or drop it once the connect_* policies land). Flagged for the cutover.
 *
 * The live route is UNCHANGED. Deleting this directory reverts the proof with zero impact.
 *
 * Takes `tenantId` + `userId` directly — auth resolution (`getTenantForRequest`) is unchanged.
 */
import { tenantClient } from '../tenant-client'
import type { SupabaseClient } from '@supabase/supabase-js'

interface ChannelRow {
  id: string
}
interface CursorRow {
  channel_id: string
  last_read_at: string | null
}

export interface SidebarCounts {
  clients: number
  bookings: number
  leads: number
  notifications: number
  connect: number
}

/** Best-effort connect unread tally. Mirrors the live route's swallow — see hazard note above. */
async function connectUnreadCount(db: SupabaseClient, tenantId: string, userId: string): Promise<number> {
  let connectUnread = 0
  try {
    const { data: channels } = await db
      .from('connect_channels')
      .select('id')
      .eq('tenant_id', tenantId)

    if (channels && channels.length > 0) {
      const channelIds = (channels as ChannelRow[]).map((c) => c.id)
      const { data: cursors } = await db
        .from('connect_read_cursors')
        .select('channel_id, last_read_at')
        .eq('reader_type', 'owner')
        .eq('reader_id', userId)
        .in('channel_id', channelIds)

      const cursorMap = new Map(
        (cursors as CursorRow[] | null | undefined ?? []).map((c) => [c.channel_id, c.last_read_at]),
      )

      for (const chId of channelIds) {
        const lastRead = cursorMap.get(chId)
        let q = db
          .from('connect_messages')
          .select('id', { count: 'exact', head: true })
          .eq('channel_id', chId)
        if (lastRead) q = q.gt('created_at', lastRead)
        const { count } = await q
        if (count && count > 0) connectUnread++
      }
    }
  } catch {
    // Table may not exist yet — see SILENT-DEGRADATION HAZARD note in the module header.
  }
  return connectUnread
}

/** Converted read path of GET /api/sidebar-counts (multi-table parallel counts + connect). */
export async function sidebarCountsConverted(tenantId: string, userId: string): Promise<SidebarCounts> {
  const db = tenantClient(tenantId) // was: supabaseAdmin — every .from() below is now scoped

  const [{ count: clientCount }, { count: bookingCount }, { count: leadCount }, { count: notificationCount }] =
    await Promise.all([
      db.from('clients').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
      db
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .in('status', ['scheduled', 'confirmed']),
      db.from('website_visits').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
      db
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('read', false),
    ])

  const connect = await connectUnreadCount(db, tenantId, userId)

  return {
    clients: clientCount || 0,
    bookings: bookingCount || 0,
    leads: leadCount || 0,
    notifications: notificationCount || 0,
    connect,
  }
}
