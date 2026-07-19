// Team-to-team DM conversation list -- the roster shown below the pinned
// Full Loop thread on /dashboard/messages. Every active team_members row for
// the tenant (minus the caller) is a valid DM target, whether or not a
// thread with them exists yet.
import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { resolveActorTeamMemberId } from '@/lib/team-messages'

interface ConversationSummary {
  team_member_id: string
  name: string
  role: string | null
  last_message: string | null
  last_message_at: string | null
  unread_count: number
}

export async function GET() {
  try {
    const ctx = await getTenantForRequest()
    const meId = await resolveActorTeamMemberId(ctx)
    const db = tenantDb(ctx.tenantId)

    const { data: roster, error: rosterError } = await db
      .from('team_members')
      .select('id, name, role')
      .eq('status', 'active')
      .order('name', { ascending: true })
    if (rosterError) return NextResponse.json({ error: rosterError.message }, { status: 500 })

    const others = (roster || []).filter((m: { id: string }) => m.id !== meId)

    if (!meId) {
      // No resolvable team_members identity for this session -- still show
      // the roster (read-only browsing), just no thread data.
      const empty: ConversationSummary[] = others.map((m: { id: string; name: string; role: string | null }) => ({
        team_member_id: m.id,
        name: m.name,
        role: m.role,
        last_message: null,
        last_message_at: null,
        unread_count: 0,
      }))
      return NextResponse.json({ conversations: empty, me: null })
    }

    const { data: messages, error: msgError } = await db
      .from('team_direct_messages')
      .select('sender_team_member_id, recipient_team_member_id, body, created_at, read_at')
      .or(`sender_team_member_id.eq.${meId},recipient_team_member_id.eq.${meId}`)
      .order('created_at', { ascending: false })
      .limit(1000)
    if (msgError) return NextResponse.json({ error: msgError.message }, { status: 500 })

    const byCounterpart = new Map<string, { body: string; created_at: string }>()
    const unreadByCounterpart = new Map<string, number>()
    for (const m of messages || []) {
      const counterpart = m.sender_team_member_id === meId ? m.recipient_team_member_id : m.sender_team_member_id
      if (!byCounterpart.has(counterpart)) byCounterpart.set(counterpart, { body: m.body, created_at: m.created_at })
      if (m.recipient_team_member_id === meId && !m.read_at) {
        unreadByCounterpart.set(counterpart, (unreadByCounterpart.get(counterpart) || 0) + 1)
      }
    }

    const conversations: ConversationSummary[] = others
      .map((m: { id: string; name: string; role: string | null }) => {
        const last = byCounterpart.get(m.id)
        return {
          team_member_id: m.id,
          name: m.name,
          role: m.role,
          last_message: last?.body ?? null,
          last_message_at: last?.created_at ?? null,
          unread_count: unreadByCounterpart.get(m.id) || 0,
        }
      })
      .sort((a, b) => {
        if (!a.last_message_at && !b.last_message_at) return a.name.localeCompare(b.name)
        if (!a.last_message_at) return 1
        if (!b.last_message_at) return -1
        return b.last_message_at.localeCompare(a.last_message_at)
      })

    return NextResponse.json({ conversations, me: meId })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    return NextResponse.json({ error: 'unexpected error' }, { status: 500 })
  }
}
