import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * WITNESS — cross-member IDOR on PUT /api/team-portal/notifications.
 *
 * The mark-single-notification-read branch (`body.id`) only scoped the
 * update to `tenant_id`, with no check that the notification's
 * `recipient_id` actually belonged to the calling team member (or was a
 * tenant-wide broadcast, recipient_id IS NULL). Any authenticated team
 * member could silently mark ANY other member's personal notification as
 * read within the same tenant by guessing/enumerating its id — suppressing
 * their unread badge for e.g. a "you've been reassigned" alert. Fixed by
 * adding an `.or('recipient_id.eq.<caller>,recipient_id.is.null')` ownership
 * check, mirroring the GET branch's existing filter.
 */

process.env.TEAM_PORTAL_SECRET = 'test-team-portal-secret'

const h = vi.hoisted(() => ({
  notifications: [] as Array<Record<string, unknown>>,
}))

// Minimal hand-rolled chain that actually implements `.or()` semantics
// (the shared fake-supabase.ts explicitly no-ops `.or()`, which would make
// this regression test pass identically before and after the fix).
function parseOr(filter: string): Array<{ col: string; op: string; val: string }> {
  return filter.split(',').map((clause) => {
    const [col, op, val] = clause.split('.')
    return { col, op, val }
  })
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
          const clauses = parseOr(filter)
          filters.push((row) =>
            clauses.some((c) => {
              if (c.op === 'eq') return row[c.col] === c.val
              if (c.op === 'is') return c.val === 'null' ? row[c.col] === null || row[c.col] === undefined : false
              return false
            })
          )
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
    { id: 'notif-mine', tenant_id: TENANT_A, recipient_id: MEMBER_A, read: false },
    { id: 'notif-broadcast', tenant_id: TENANT_A, recipient_id: null, read: false },
    { id: 'notif-someone-elses', tenant_id: TENANT_A, recipient_id: MEMBER_B, read: false },
  ]
})

describe('PUT /api/team-portal/notifications — recipient ownership', () => {
  it("marks the caller's OWN notification read", async () => {
    const token = createToken(MEMBER_A, TENANT_A)
    await PUT(putReq({ id: 'notif-mine' }, token))
    expect(h.notifications.find((n) => n.id === 'notif-mine')?.read).toBe(true)
  })

  it('marks a tenant-wide broadcast (recipient_id IS NULL) read', async () => {
    const token = createToken(MEMBER_A, TENANT_A)
    await PUT(putReq({ id: 'notif-broadcast' }, token))
    expect(h.notifications.find((n) => n.id === 'notif-broadcast')?.read).toBe(true)
  })

  it("IDOR PROBE: does NOT mark another team member's personal notification read", async () => {
    const token = createToken(MEMBER_A, TENANT_A)
    await PUT(putReq({ id: 'notif-someone-elses' }, token))
    expect(h.notifications.find((n) => n.id === 'notif-someone-elses')?.read).toBe(false)
  })
})
