import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createFakeSupabase } from '@/test/fake-supabase'

/**
 * Prior bugs (all confirmed against supabase/schema.sql, every migration
 * touching tenant_members, and getCurrentTenant()/tenantAuth() in
 * src/lib/tenant.ts + src/lib/tenant-query.ts):
 *
 * 1. user.deleted wrote `status: 'inactive'` to tenant_members -- a column
 *    that has never existed on that table. The update silently no-op'd
 *    (uncaught error) on every Clerk-side user deletion; the local
 *    tenant_members row was never cleaned up. Fixed: delete the row(s),
 *    matching the removal semantics the app's own admin DELETE endpoints
 *    already use.
 * 2. user.updated took email_addresses[0] as "the" email, but Clerk does
 *    not guarantee index 0 is the primary address -- primary_email_address_id
 *    is the field that identifies it. Fixed: match on that id.
 * 3. No Svix redelivery dedup (Clerk delivers via Svix, same class already
 *    fixed on Telnyx/Telegram/Resend this session) -- an out-of-order retry
 *    of a stale user.updated could revert a newer email/name.
 */

const h = { fake: null as ReturnType<typeof createFakeSupabase> | null }

vi.mock('@/lib/supabase', () => ({
  get supabaseAdmin() {
    return h.fake
  },
}))
vi.mock('@/lib/webhook-verify', () => ({ verifySvix: () => ({ valid: true }) }))

import { POST } from './route'

function event(type: string, data: Record<string, unknown>, svixId?: string) {
  const headers: Record<string, string> = {}
  if (svixId !== undefined) headers['svix-id'] = svixId
  return new Request('http://x/api/webhooks/clerk', { method: 'POST', headers, body: JSON.stringify({ type, data }) })
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.CLERK_WEBHOOK_VERIFY = 'off'
  h.fake = createFakeSupabase({ tenant_members: [] })
  h.fake!._addUniqueConstraint('clerk_webhook_events', 'event_id')
})

describe('POST /api/webhooks/clerk — user.deleted', () => {
  it('removes the tenant_members row for a Clerk user deleted directly in Clerk', async () => {
    h.fake!._seed('tenant_members', [
      { id: 'm1', tenant_id: 't1', clerk_user_id: 'user_1', role: 'admin', email: 'a@x.com', name: 'A' },
    ])

    const res = await POST(event('user.deleted', { id: 'user_1' }, 'msg_1'))
    expect((await res.json()).received).toBe(true)
    expect(h.fake!._all('tenant_members')).toHaveLength(0)
  })

  it('only removes the deleted user\'s own membership rows, leaving others intact', async () => {
    h.fake!._seed('tenant_members', [
      { id: 'm1', tenant_id: 't1', clerk_user_id: 'user_1', role: 'admin', email: 'a@x.com', name: 'A' },
      { id: 'm2', tenant_id: 't1', clerk_user_id: 'user_2', role: 'staff', email: 'b@x.com', name: 'B' },
    ])

    await POST(event('user.deleted', { id: 'user_1' }, 'msg_1'))

    const remaining = h.fake!._all('tenant_members')
    expect(remaining).toHaveLength(1)
    expect(remaining[0].clerk_user_id).toBe('user_2')
  })
})

describe('POST /api/webhooks/clerk — user.updated primary email selection', () => {
  it('syncs the address matching primary_email_address_id, not email_addresses[0]', async () => {
    h.fake!._seed('tenant_members', [
      { id: 'm1', tenant_id: 't1', clerk_user_id: 'user_1', role: 'admin', email: 'old@x.com', name: 'Old Name' },
    ])

    await POST(
      event(
        'user.updated',
        {
          id: 'user_1',
          primary_email_address_id: 'idn_primary',
          email_addresses: [
            { id: 'idn_secondary', email_address: 'secondary@x.com' },
            { id: 'idn_primary', email_address: 'primary@x.com' },
          ],
          first_name: 'New',
          last_name: 'Name',
        },
        'msg_2'
      )
    )

    const member = h.fake!._all('tenant_members')[0]
    expect(member.email).toBe('primary@x.com')
    expect(member.name).toBe('New Name')
  })

  it('falls back to email_addresses[0] when primary_email_address_id is absent', async () => {
    h.fake!._seed('tenant_members', [{ id: 'm1', tenant_id: 't1', clerk_user_id: 'user_1', role: 'admin', email: 'old@x.com', name: 'Old' }])

    await POST(event('user.updated', { id: 'user_1', email_addresses: [{ email_address: 'only@x.com' }] }, 'msg_3'))

    expect(h.fake!._all('tenant_members')[0].email).toBe('only@x.com')
  })
})

describe('POST /api/webhooks/clerk — redelivery dedup', () => {
  it('a redelivered (same svix-id) stale user.updated does not re-apply after a newer one already landed', async () => {
    h.fake!._seed('tenant_members', [{ id: 'm1', tenant_id: 't1', clerk_user_id: 'user_1', role: 'admin', email: 'old@x.com', name: 'Old' }])

    // Stale event processed once already (its own claim already consumed).
    await POST(event('user.updated', { id: 'user_1', email_addresses: [{ email_address: 'stale@x.com' }] }, 'msg_stale'))
    // A newer event with a different svix-id lands after.
    await POST(event('user.updated', { id: 'user_1', email_addresses: [{ email_address: 'fresh@x.com' }] }, 'msg_fresh'))

    expect(h.fake!._all('tenant_members')[0].email).toBe('fresh@x.com')

    // The stale event gets redelivered (same svix-id as the first call) --
    // must be rejected as a duplicate, not re-applied over the fresher state.
    const redelivery = await POST(event('user.updated', { id: 'user_1', email_addresses: [{ email_address: 'stale@x.com' }] }, 'msg_stale'))
    expect((await redelivery.json()).action).toBe('duplicate_delivery')
    expect(h.fake!._all('tenant_members')[0].email).toBe('fresh@x.com')
  })

  it('two different svix-ids both process normally', async () => {
    h.fake!._seed('tenant_members', [{ id: 'm1', tenant_id: 't1', clerk_user_id: 'user_1', role: 'admin', email: 'old@x.com', name: 'Old' }])

    await POST(event('user.updated', { id: 'user_1', email_addresses: [{ email_address: 'a@x.com' }] }, 'msg_a'))
    await POST(event('user.updated', { id: 'user_1', email_addresses: [{ email_address: 'b@x.com' }] }, 'msg_b'))

    expect(h.fake!._all('tenant_members')[0].email).toBe('b@x.com')
  })

  it('an event with no svix-id header still processes -- dedup is best-effort, not a hard requirement', async () => {
    h.fake!._seed('tenant_members', [{ id: 'm1', tenant_id: 't1', clerk_user_id: 'user_1', role: 'admin', email: 'old@x.com', name: 'Old' }])

    const res = await POST(event('user.updated', { id: 'user_1', email_addresses: [{ email_address: 'noheader@x.com' }] }))
    expect((await res.json()).received).toBe(true)
    expect(h.fake!._all('tenant_members')[0].email).toBe('noheader@x.com')
  })
})

describe('POST /api/webhooks/clerk — unaffected paths', () => {
  it('user.created is a no-op', async () => {
    const res = await POST(event('user.created', { id: 'user_9' }, 'msg_9'))
    expect((await res.json()).received).toBe(true)
    expect(h.fake!._all('tenant_members')).toHaveLength(0)
  })

  it('missing signature verification rejects when CLERK_WEBHOOK_VERIFY is not off', async () => {
    process.env.CLERK_WEBHOOK_VERIFY = 'on'
    const verify = await import('@/lib/webhook-verify')
    vi.spyOn(verify, 'verifySvix').mockReturnValueOnce({ valid: false, reason: 'bad sig' })

    const res = await POST(event('user.updated', { id: 'user_1' }, 'msg_bad'))
    expect(res.status).toBe(401)
  })
})
