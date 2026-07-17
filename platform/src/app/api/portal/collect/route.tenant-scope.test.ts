import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { NextRequest } from 'next/server'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Defense-in-depth — POST /api/portal/collect, Selena conversation handoff.
 *
 * `convo_id` arrives in the (unauthenticated, public) request body. The
 * handler's existence check
 * (`.eq('id', convo_id).eq('tenant_id', tenant.id).is('completed_at', null)`)
 * already gates this route: the conversation is only ever mutated after being
 * confirmed to belong to the host-resolved tenant, so this was never a live
 * cross-tenant bug on the real UUID-PK schema (`sms_conversations.id` is a
 * globally-unique PK — no two tenants can ever share one). But the follow-up
 * `sms_conversations.update({ client_id, state, ... })` filtered only
 * `.eq('id', convo_id)` — the redundant tenant scope on the WRITE itself was
 * missing, unlike the tenant-scoped `clients` UPDATE two cases up in this
 * same file (`.eq('id', existingClient.id).eq('tenant_id', tenant.id)`).
 * Hardened to match the codebase's stated invariant (see documents/[id]/void
 * and finance/bank-transactions/[id]/match's identical fix). This test seeds
 * a synthetic id collision across tenants (impossible on the real schema,
 * documented inline) to make the WRITE's own scope observable, not just the
 * read that precedes it.
 */

const TENANT = 'tid-a'
const OTHER_TENANT = 'tid-b'
const SHARED_CONVO_ID = 'convo-shared'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: vi.fn(async () => ({
    id: TENANT, name: 'Acme', domain: 'acme.example', primary_color: null, logo_url: null, timezone: 'America/New_York',
    telnyx_api_key: null, telnyx_phone: null,
  })),
  tenantSiteUrl: () => 'https://acme.example',
}))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: vi.fn(async () => ({ allowed: true })) }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/admin-contacts', () => ({ emailAdmins: vi.fn(async () => {}) }))
vi.mock('@/lib/email-templates', () => ({ adminNewClientEmail: () => ({ subject: 's', html: 'h' }) }))
vi.mock('@/lib/attribution', () => ({ attributeCollectForm: vi.fn(async () => {}) }))
vi.mock('@/lib/error-tracking', () => ({ trackError: vi.fn(async () => {}) }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => ({ ok: true })) }))
vi.mock('@/lib/sms-messages', () => ({ insertConversationMessage: vi.fn(async () => {}) }))

import { POST } from './route'

function seed() {
  return {
    clients: [],
    referrers: [],
    notifications: [],
    portal_leads: [],
    // Same `id` on two rows only exists to make the query's own tenant filter
    // observable in this in-memory harness — see file header.
    sms_conversations: [
      { id: SHARED_CONVO_ID, tenant_id: TENANT, phone: '3005551111', completed_at: null },
      { id: SHARED_CONVO_ID, tenant_id: OTHER_TENANT, phone: '3005552222', completed_at: null },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

function post(body: Record<string, unknown>) {
  return POST(new Request('http://t/api/portal/collect', { method: 'POST', body: JSON.stringify(body) }) as unknown as NextRequest)
}

describe('portal/collect POST — sms_conversations write-side tenant scope', () => {
  it("hands off the caller's own tenant's conversation and leaves the other tenant's same-id conversation untouched", async () => {
    const res = await post({ name: 'Jane Doe', phone: '5551234567', convo_id: SHARED_CONVO_ID })
    expect(res.status).toBe(200)

    const mine = h.seed.sms_conversations.find((c) => c.tenant_id === TENANT)!
    const theirs = h.seed.sms_conversations.find((c) => c.tenant_id === OTHER_TENANT)!
    expect(mine.state).toBe('form_received')
    expect(theirs.state).toBeUndefined()
  })
})
