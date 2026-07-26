import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * WITNESS — cross-member IDOR on PUT /api/team-portal/notifications.
 *
 * The mark-single-notification-read branch (`body.id`) only scoped the
 * update to `tenant_id`, with no check that the notification's
 * `recipient_id` actually belonged to the calling team member (or was a
 * genuine team-wide broadcast, recipient_id IS NULL AND recipient_type
 * 'team_member'). Any authenticated team member could silently mark ANY
 * other member's personal notification as read within the same tenant by
 * guessing/enumerating its id — suppressing their unread badge for e.g. a
 * "you've been reassigned" alert. Fixed by adding an
 * `.or('recipient_id.eq.<caller>,and(recipient_id.is.null,recipient_type.eq.team_member)')`
 * ownership check, mirroring the GET branch's existing filter. The
 * recipient_type leg additionally keeps admin-only/audit rows (which also
 * leave recipient_id unset) out of a cleaner's reach — see
 * fullloop_portal_notifications_scoped_2026_07_23.md.
 */

process.env.TEAM_PORTAL_SECRET = 'test-team-portal-secret'

const h = vi.hoisted(() => ({
  notifications: [] as Array<Record<string, unknown>>,
}))

// Minimal hand-rolled chain that actually implements `.or()` semantics,
// including a top-level `and(...)` group, since PostgREST filters here nest
// one (recipient_id.is.null AND recipient_type.eq.team_member) inside the
// OR. (The shared fake-supabase.ts explicitly no-ops `.or()`, which would
// make this regression test pass identically before and after the fix.)
function splitTopLevel(filter: string): string[] {
  const parts: string[] = []
  let depth = 0
  let current = ''
  for (const ch of filter) {
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (ch === ',' && depth === 0) {
      parts.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  if (current) parts.push(current)
  return parts
}

function matchesClause(clause: string, row: Record<string, unknown>): boolean {
  if (clause.startsWith('and(')) {
    const inner = clause.slice(4, -1)
    return splitTopLevel(inner).every((c) => matchesClause(c, row))
  }
  const [col, op, val] = clause.split('.')
  if (op === 'eq') return row[col] === val
  if (op === 'is') return val === 'null' ? row[col] === null || row[col] === undefined : false
  return false
}

function parseOr(filter: string) {
  const clauses = splitTopLevel(filter)
  return (row: Record<string, unknown>) => clauses.some((c) => matchesClause(c, row))
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table !== 'notifications') throw new Error(`unexpected table ${table}`)
      const filters: Array<(row: Record<string, unknown>) => boolean> = []
      let updatePayload: Record<string, unknown> | null = null
      const chain = {
        update: (payload: Record<string, unknown>) => {
          updatePayload = payload
          return chain
        },
        select: () => chain,
        eq: (col: string, val: unknown) => {
          filters.push((row) => row[col] === val)
          return chain
        },
        or: (filter: string) => {
          filters.push(parseOr(filter))
          return chain
        },
        then: (resolve: (v: { data: unknown; error: null }) => void) => {
          const matched = h.notifications.filter((row) => filters.every((f) => f(row)))
          if (updatePayload) {
            for (const row of matched) Object.assign(row, updatePayload)
          }
          resolve({ data: matched, error: null })
        },
      }
      return chain
    },
  },
}))

import { createToken } from '../auth/token'
import { PUT } from './route'

const TENANT_A = 'tenant-a'
const MEMBER_A = 'member-a1'
const MEMBER_B = 'member-a2' // same tenant, different team member

function putReq(body: unknown, token: string) {
  return new Request('http://x/api/team-portal/notifications', {
    method: 'PUT',
    headers: { authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof PUT>[0]
}

beforeEach(() => {
  h.notifications = [
    { id: 'notif-mine', tenant_id: TENANT_A, recipient_id: MEMBER_A, recipient_type: 'team_member', read: false },
    { id: 'notif-broadcast', tenant_id: TENANT_A, recipient_id: null, recipient_type: 'team_member', read: false },
    { id: 'notif-someone-elses', tenant_id: TENANT_A, recipient_id: MEMBER_B, recipient_type: 'team_member', read: false },
    // Admin-only audit row (e.g. a job-broadcast delivery summary): no
    // recipient_id, and recipient_type is 'admin', not 'team_member'.
    { id: 'notif-admin-only', tenant_id: TENANT_A, recipient_id: null, recipient_type: 'admin', read: false },
  ]
})

describe('PUT /api/team-portal/notifications — recipient ownership', () => {
  it("marks the caller's OWN notification read", async () => {
    const token = createToken(MEMBER_A, TENANT_A)
    await PUT(putReq({ id: 'notif-mine' }, token))
    expect(h.notifications.find((n) => n.id === 'notif-mine')?.read).toBe(true)
  })

  it('marks a tenant-wide broadcast (recipient_id IS NULL, recipient_type team_member) read', async () => {
    const token = createToken(MEMBER_A, TENANT_A)
    await PUT(putReq({ id: 'notif-broadcast' }, token))
    expect(h.notifications.find((n) => n.id === 'notif-broadcast')?.read).toBe(true)
  })

  it("IDOR PROBE: does NOT mark another team member's personal notification read", async () => {
    const token = createToken(MEMBER_A, TENANT_A)
    await PUT(putReq({ id: 'notif-someone-elses' }, token))
    expect(h.notifications.find((n) => n.id === 'notif-someone-elses')?.read).toBe(false)
  })

  it('WITNESS: does NOT mark an admin-only notification (recipient_type=admin) read', async () => {
    const token = createToken(MEMBER_A, TENANT_A)
    await PUT(putReq({ id: 'notif-admin-only' }, token))
    expect(h.notifications.find((n) => n.id === 'notif-admin-only')?.read).toBe(false)
  })
})
