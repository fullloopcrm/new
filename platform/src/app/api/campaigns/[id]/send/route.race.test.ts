/**
 * CAMPAIGN SEND ROUTE RACE — POST /api/campaigns/[id]/send atomic claim.
 *
 * This route guarded re-sending with a plain select-then-branch on
 * `campaigns.status` (the same TOCTOU shape closed on quotes/[id]/convert,
 * 2026-07-13): two concurrent send requests both read status 'draft', both
 * pass the guard, and both proceed to blast every active client before
 * either write landed -- a double send. The "mark as sending immediately"
 * comment in the pre-fix code narrowed the window but never closed it.
 *
 * Fix: CAS the status transition (`update ... where status = <seen status>`)
 * so only one concurrent request can claim the send. This suite proves the
 * race is closed: only one of two concurrent requests actually sends.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase, Row } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

const TENANT_ID = 'tenant-1'
const CAMPAIGN_ID = 'campaign-1'

const TENANT_ROW = {
  tenantId: TENANT_ID,
  name: 'Test Tenant',
  resend_api_key: 'test-resend-key',
  resend_domain: null,
  email_from: null,
  telnyx_api_key: null,
  telnyx_phone: null,
  address: null,
}

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT_ID, tenant: TENANT_ROW }, error: null }),
}))

vi.mock('@/lib/settings', () => ({
  getSettings: async () => ({ campaign_approval_required: false, campaign_auto_unsubscribe: false }),
}))

let sendCount = 0
vi.mock('@/lib/email', () => ({
  sendEmail: async () => {
    sendCount++
  },
}))
vi.mock('@/lib/sms', () => ({ sendSMS: async () => {} }))
vi.mock('@/lib/audit', () => ({ audit: async () => {} }))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

function seedCampaign(overrides: Partial<Row> = {}) {
  fake._store.clear()
  fake._seed('campaigns', [
    {
      id: CAMPAIGN_ID,
      tenant_id: TENANT_ID,
      status: 'draft',
      type: 'email',
      name: 'Spring Sale',
      subject: 'Spring Sale',
      body: 'Hello {name}',
      recipient_count: null,
      sent_at: null,
      ...overrides,
    },
  ])
  fake._seed('clients', [
    { id: 'client-1', tenant_id: TENANT_ID, name: 'Alice', email: 'alice@test.com', phone: null, status: 'active', sms_marketing_opt_out: false, email_marketing_opt_out: false, sms_consent: true },
  ])
}

function sendRequest() {
  return new Request(`http://x/api/campaigns/${CAMPAIGN_ID}/send`, { method: 'POST' })
}

beforeEach(() => {
  seedCampaign()
  sendCount = 0
})

describe('POST /api/campaigns/[id]/send — concurrent send race', () => {
  it('two concurrent requests send exactly once, not twice', async () => {
    const results = await Promise.allSettled([
      POST(sendRequest(), { params: Promise.resolve({ id: CAMPAIGN_ID }) }),
      POST(sendRequest(), { params: Promise.resolve({ id: CAMPAIGN_ID }) }),
    ])

    // Exactly one request should have delivered the email to the one client.
    expect(sendCount).toBe(1)

    const bodies: Array<Record<string, unknown>> = await Promise.all(
      results
        .filter((r) => r.status === 'fulfilled')
        .map((r) => (r as PromiseFulfilledResult<Response>).value.json()),
    )
    const failed = bodies.filter((b) => 'error' in b)
    expect(failed.length).toBe(1)
    expect(failed[0].error).toBe('Campaign has already been sent')

    const campaignRow = fake._all('campaigns').find((c) => c.id === CAMPAIGN_ID)
    expect(campaignRow?.status).toBe('sent')
  })

  it('a sequential retry after the winner lands is rejected, not re-sent', async () => {
    const first = await (await POST(sendRequest(), { params: Promise.resolve({ id: CAMPAIGN_ID }) })).json()
    expect(first.sent).toBe(1)

    const second = await POST(sendRequest(), { params: Promise.resolve({ id: CAMPAIGN_ID }) })
    expect(second.status).toBe(400)
    expect(sendCount).toBe(1)
  })
})
