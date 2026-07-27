import { tenantDb } from '@/lib/tenant-db'

// Resolves which connect_channels row a team-portal request may read/write:
// the worker's own 1:1 'team' channel (implicit ownership via team_member_id,
// no membership row needed), or an admin-created group/broadcast channel
// they're an explicit connect_channel_members recipient of. Shared by
// team-portal/connect/route.ts and team-portal/connect/upload/route.ts so
// both enforce the exact same ownership rule.
export async function resolveTeamConnectChannel(
  auth: { tid: string; id: string },
  requestedChannelId: string | null,
): Promise<{ id: string } | null> {
  if (requestedChannelId) {
    const { data: ownChannel } = await tenantDb(auth.tid)
      .from('connect_channels') // tenant-scope-ok: tenantDb() scopes the select
      .select('id')
      .eq('id', requestedChannelId)
      .eq('type', 'team')
      .eq('team_member_id', auth.id)
      .maybeSingle()
    if (ownChannel) return ownChannel

    const { data: membership } = await tenantDb(auth.tid)
      .from('connect_channel_members') // tenant-scope-ok: tenantDb() scopes the select
      .select('channel_id')
      .eq('channel_id', requestedChannelId)
      .eq('team_member_id', auth.id)
      .maybeSingle()
    if (!membership) return null
    const { data: channel } = await tenantDb(auth.tid)
      .from('connect_channels') // tenant-scope-ok: tenantDb() scopes the select
      .select('id')
      .eq('id', requestedChannelId)
      .single()
    return channel || null
  }

  let { data: channel } = await tenantDb(auth.tid)
    .from('connect_channels') // tenant-scope-ok: tenantDb() scopes the select; audit heuristic doesn't parse the wrapper
    .select('id')
    .eq('type', 'team')
    .eq('team_member_id', auth.id)
    .single()

  if (!channel) {
    const { data: member } = await tenantDb(auth.tid)
      .from('team_members')
      .select('name')
      .eq('id', auth.id)
      .single()
    const { data: created } = await tenantDb(auth.tid)
      .from('connect_channels') // tenant-scope-ok: tenantDb() stamps tenant_id on insert
      .insert({ type: 'team', name: member?.name || 'Team Member', team_member_id: auth.id })
      .select('id')
      .single()
    channel = created
  }

  return channel || null
}
