/**
 * PROOF OF CONVERSION — connect/unread — NOT WIRED, REVERSIBLE.
 *
 * Low-risk GET read converted to the scoped client:
 *   - src/app/api/connect/unread/route.ts  (GET: per-channel unread message tally)
 *
 * What this route adds: an N+1 read pattern — one tenant-scoped parent read (connect_channels
 * by tenant_id), a read-cursor read (by reader + channel_id set), then a per-channel count of
 * connect_messages. The conversion is the same one-line swap for the client
 * (`const db = tenantClient(tenantId)`); all reads move to the scoped client together.
 *
 * ⚠ CROSS-TABLE RLS DEPENDENCY (connect_messages / connect_read_cursors): only the PARENT
 * `connect_channels` read is scoped by `tenant_id`. The child reads are scoped by
 * `channel_id` (messages) and `reader_id` (cursors), NOT `tenant_id`. Under RLS those child
 * tables must therefore carry their OWN policies (e.g. join through connect_channels.tenant_id)
 * or the counts default-deny to 0 and unread silently reads 0. `connect_*` tables are not in
 * the 58-table Tier list — converting this route for real requires policies on the child
 * tables first, or keeping the child counts on a KEEP (service_role) path with an explicit
 * tenant/ownership check. Flagged for the cutover — see rls-cutover-master-plan.md
 * §"Cross-table read dependencies".
 *
 * The live route is UNCHANGED. Deleting this directory reverts the proof with zero impact.
 *
 * Takes `tenantId` + `userId` directly — auth resolution (`getTenantForRequest`) is unchanged.
 */
import { tenantClient } from '../tenant-client'

interface ChannelRow {
  id: string
}
interface CursorRow {
  channel_id: string
  last_read_at: string | null
}

/** Converted read path of GET /api/connect/unread (parent scoped + N+1 child counts). */
export async function connectUnreadConverted(tenantId: string, userId: string): Promise<{ unread: number }> {
  const db = tenantClient(tenantId) // was: supabaseAdmin — all reads below are now scoped

  const { data: channels } = await db
    .from('connect_channels')
    .select('id')
    .eq('tenant_id', tenantId)

  if (!channels || channels.length === 0) {
    return { unread: 0 }
  }

  const channelIds = (channels as ChannelRow[]).map((c) => c.id)

  const { data: cursors } = await db
    .from('connect_read_cursors')
    .select('channel_id, last_read_at')
    .eq('reader_type', 'owner')
    .eq('reader_id', userId)
    .in('channel_id', channelIds)

  const cursorMap = new Map((cursors as CursorRow[] | null | undefined ?? []).map((c) => [c.channel_id, c.last_read_at]))

  let totalUnread = 0
  for (const chId of channelIds) {
    const lastRead = cursorMap.get(chId)
    let query = db
      .from('connect_messages')
      .select('id', { count: 'exact', head: true })
      .eq('channel_id', chId)

    if (lastRead) {
      query = query.gt('created_at', lastRead)
    }

    const { count } = await query
    if (count && count > 0) totalUnread++
  }

  return { unread: totalUnread }
}
