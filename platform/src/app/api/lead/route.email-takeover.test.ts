import { describe, it, expect, vi } from 'vitest'

/**
 * POST /api/lead is a public, unauthenticated lead-capture form. When the
 * submitted phone number matches an EXISTING client, the route updates that
 * client row with the submitted `email` unconditionally — including
 * overwriting an email the client already has on file.
 *
 * clients.email doubles as the client-portal login identifier: POST
 * /api/client/verify-code matches a client by phone first, and by
 * `ilike('email', ...)` as a fallback. Chain: an attacker who merely knows a
 * client's phone number (not secret — often discoverable) submits this form
 * with that phone + the attacker's own email, silently repointing the
 * client's email of record. The attacker then requests a login code sent to
 * that email (/api/client/send-code accepts any address, no ownership check)
 * and verifies it (/api/client/verify-code matches by email) — landing a
 * full 30-day client-portal session for the victim's account. Knowing a
 * phone number should never be sufficient to redirect a client's login
 * email; matching by phone must never let the form silently reassign email.
 */

const TENANT = { id: 'tenant-1', name: 'Canary', slug: 'canary', timezone: 'America/New_York' }
const VICTIM_PHONE = '5551234567'
const VICTIM_EMAIL = 'victim@example.com'
const ATTACKER_EMAIL = 'attacker@evil.example'

let capturedClientsUpdate: Record<string, unknown> | null = null

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'clients') {
        return {
          select: () => ({
            eq: () => Promise.resolve({
              data: [{ id: 'client-victim', phone: VICTIM_PHONE, email: VICTIM_EMAIL }],
              error: null,
            }),
          }),
          update: (payload: Record<string, unknown>) => {
            capturedClientsUpdate = payload
            return {
              eq: function () { return this },
              select: () => ({ single: async () => ({ data: { id: 'client-victim' }, error: null }) }),
            }
          },
        }
      }
      // Every other table (portal_leads, deals, deal_activities, ...) —
      // permissive no-op chain, not under test here.
      const chain = {
        select: () => chain,
        eq: () => chain,
        in: () => chain,
        order: () => chain,
        limit: () => chain,
        maybeSingle: async () => ({ data: null, error: null }),
        single: async () => ({ data: { id: 'row-1' }, error: null }),
        insert: () => ({
          select: () => ({ single: async () => ({ data: { id: 'row-1' }, error: null }) }),
          then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => resolve({ data: null, error: null }),
        }),
        update: () => chain,
        then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => resolve({ data: null, error: null }),
      }
      return chain
    },
  },
}))
vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: async () => TENANT,
  tenantSiteUrl: () => 'https://canary.example.com',
}))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: async () => ({ allowed: true, remaining: 1 }) }))
vi.mock('@/lib/notify', () => ({ notify: async () => {} }))
vi.mock('@/lib/error-tracking', () => ({ trackError: async () => {} }))
vi.mock('@/lib/admin-contacts', () => ({ emailAdmins: async () => {} }))
vi.mock('@/lib/email-templates', () => ({ adminNewClientEmail: () => ({ subject: 's', html: 'h' }) }))
vi.mock('@/lib/email', () => ({ sendEmail: async () => {} }))
vi.mock('@/lib/messaging/shell', () => ({ emailShell: () => '<div></div>' }))
vi.mock('@/lib/comms-prefs', () => ({ isCommEnabled: async () => false }))

import { POST } from './route'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NextRequest = any

function req(body: Record<string, unknown>): NextRequest {
  return new Request('https://canary.example.com/api/lead', {
    method: 'POST',
    headers: { 'x-forwarded-for': `198.51.100.${Math.floor(Math.random() * 250)}` },
    body: JSON.stringify(body),
  }) as unknown as NextRequest
}

describe('POST /api/lead — phone match must not reassign an existing client email', () => {
  it('does not overwrite the client email on file when a phone match is found', async () => {
    const res = await POST(req({
      name: 'Attacker Name',
      email: ATTACKER_EMAIL,
      phone: VICTIM_PHONE,
    }))
    expect(res.status).toBe(200)
    expect(capturedClientsUpdate).not.toBeNull()
    expect(capturedClientsUpdate?.email).not.toBe(ATTACKER_EMAIL)
  })
})
