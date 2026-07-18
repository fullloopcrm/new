import { describe, it, expect, vi } from 'vitest'

/**
 * POST /api/ingest/lead is gated by a shared INGEST_SECRET (server-to-server,
 * shared across every satellite marketing site in a business group) rather
 * than fully anonymous. When the submitted phone number matches an EXISTING
 * client, the route still updates that client row with the submitted `email`
 * unconditionally — including overwriting an email the client already has on
 * file. Same class as the identical bug fixed in /api/lead, /api/contact,
 * /api/portal/collect, and /api/client/collect — see /api/lead's fix comment
 * for the full account-takeover chain. Fixed here too for consistency: a
 * compromised or misbehaving satellite site holding the shared secret should
 * not be able to hijack a client's portal login by knowing only their phone
 * number.
 */

const TENANT = { id: 'tenant-1', name: 'Canary', slug: 'canary' }
const VICTIM_PHONE = '5551234567'
const VICTIM_EMAIL = 'victim@example.com'
const ATTACKER_EMAIL = 'attacker@evil.example'
const SECRET = 'shared-ingest-secret'

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
      const chain = {
        select: () => chain,
        eq: () => chain,
        limit: () => chain,
        maybeSingle: async () => ({ data: null, error: null }),
        single: async () => ({ data: { id: 'row-1' }, error: null }),
        insert: () => ({
          select: () => ({ single: async () => ({ data: { id: 'row-1' }, error: null }) }),
          then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => resolve({ data: null, error: null }),
        }),
        then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => resolve({ data: null, error: null }),
      }
      return chain
    },
  },
}))
vi.mock('@/lib/tenant-lookup', () => ({ getTenantBySlug: async () => TENANT }))
vi.mock('@/lib/tenant-site', () => ({ tenantSiteUrl: () => 'https://canary.example.com' }))
vi.mock('@/lib/notify', () => ({ notify: async () => {} }))
vi.mock('@/lib/error-tracking', () => ({ trackError: async () => {} }))
vi.mock('@/lib/admin-contacts', () => ({ emailAdmins: async () => {} }))
vi.mock('@/lib/email-templates', () => ({ adminNewClientEmail: () => ({ subject: 's', html: 'h' }) }))

import { POST } from './route'

function req(body: Record<string, unknown>): Request {
  return new Request('https://app.example.com/api/ingest/lead', {
    method: 'POST',
    headers: { 'x-ingest-secret': SECRET, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/ingest/lead — phone match must not reassign an existing client email', () => {
  it('does not overwrite the client email on file when a phone match is found', async () => {
    process.env.INGEST_SECRET = SECRET
    const res = await POST(req({
      tenant_slug: 'canary',
      name: 'Attacker Name',
      email: ATTACKER_EMAIL,
      phone: VICTIM_PHONE,
    }))
    expect(res.status).toBe(200)
    expect(capturedClientsUpdate).not.toBeNull()
    expect(capturedClientsUpdate?.email).not.toBe(ATTACKER_EMAIL)
  })
})
