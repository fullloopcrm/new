import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/ingest/lead is gated by a shared INGEST_SECRET, but the actual
 * `name`/extra-field content originates from a satellite marketing site's own
 * public form — attacker-controlled. Zero length cap let it flow unbounded
 * into the resulting clients/portal_leads rows and, downstream, into
 * admin/team-member SMS built from a later booking (see smsJobAssignment /
 * smsLateCheckInAdmin). Verifies the fix: name capped at 200, notes at 2000.
 */

const TENANT = { id: 'tenant-1', name: 'Canary', slug: 'canary' }
const SECRET = 'shared-ingest-secret'

let capturedClientsInsert: Record<string, unknown> | null = null

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'clients') {
        return {
          select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
          insert: (row: Record<string, unknown>) => {
            capturedClientsInsert = row
            return { select: () => ({ single: async () => ({ data: { id: 'new-client' }, error: null }) }) }
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

beforeEach(() => {
  process.env.INGEST_SECRET = SECRET
  capturedClientsInsert = null
})

describe('POST /api/ingest/lead — name/notes length cap', () => {
  it('caps an oversized name at 200 chars before the clients insert', async () => {
    const res = await POST(req({ tenant_slug: 'canary', name: 'A'.repeat(5000), phone: '5551234567' }))
    expect(res.status).toBe(200)
    expect((capturedClientsInsert!.name as string).length).toBeLessThanOrEqual(200)
  })

  it('caps oversized folded-in extra fields at 2000 chars in notes', async () => {
    const res = await POST(req({ tenant_slug: 'canary', name: 'Real Name', phone: '5559876543', vehicle: 'X'.repeat(50000) }))
    expect(res.status).toBe(200)
    expect((capturedClientsInsert!.notes as string).length).toBeLessThanOrEqual(2000)
  })
})
