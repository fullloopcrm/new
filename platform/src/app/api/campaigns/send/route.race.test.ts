/**
 * CAMPAIGN SEND (bulk, recipient-tracked) ROUTE RACE — POST /api/campaigns/send
 * atomic claim.
 *
 * Same TOCTOU shape as ../[id]/send/route.race.test.ts: a plain
 * select-then-branch on `campaigns.status !== 'draft'` let two concurrent
 * requests both pass the guard and both proceed to insert campaign_recipients
 * rows and dispatch notifications for every eligible client -- a double send
 * plus duplicate recipient-tracking rows.
 *
 * Fix: CAS the status transition (`update ... where status = 'draft'`) so
 * only one concurrent request can claim the send.
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

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT_ID }, error: null }),
}))

let notifyCount = 0
vi.mock('@/lib/notify', () => ({
  notify: async () => {
    notifyCount++
  },
}))

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
      body: 'Hello',
      recipient_filter: 'all',
      ...overrides,
    },
  ])
  fake._seed('clients', [
    { id: 'client-1', tenant_id: TENANT_ID, name: 'Alice', email: 'alice@test.com', phone: null, status: 'active', email_marketing_opt_out: false, sms_marketing_opt_out: false, sms_consent: true },
  ])
  fake._seed('tenants', [
    { id: TENANT_ID, resend_api_key: 'test-resend-key', telnyx_api_key: null, telnyx_phone: null },
  ])
}

function sendRequest(body: Record<string, unknown> = {}) {
  return new Request('http://x/api/campaigns/send', {
    method: 'POST',
    body: JSON.stringify({ campaign_id: CAMPAIGN_ID, ...body }),
  })
}

beforeEach(() => {
  seedCampaign()
  notifyCount = 0
})

describe('POST /api/campaigns/send — concurrent send race', () => {
  it('two concurrent requests send exactly once, not twice', async () => {
    const results = await Promise.allSettled([POST(sendRequest()), POST(sendRequest())])

    // Exactly one request should have notified the one eligible client.
    expect(notifyCount).toBe(1)

    const bodies: Array<Record<string, unknown>> = await Promise.all(
      results
        .filter((r) => r.status === 'fulfilled')
        .map((r) => (r as PromiseFulfilledResult<Response>).value.json()),
    )
    const failed = bodies.filter((b) => 'error' in b)
    expect(failed.length).toBe(1)
    expect(failed[0].error).toBe('Campaign has already been sent')

    // No duplicate campaign_recipients rows from the losing request.
    expect(fake._all('campaign_recipients').length).toBe(1)

    const campaignRow = fake._all('campaigns').find((c) => c.id === CAMPAIGN_ID)
    expect(campaignRow?.status).toBe('sent')
  })

  it('a sequential retry after the winner lands is rejected, not re-sent', async () => {
    const first = await (await POST(sendRequest())).json()
    expect(first.sent).toBe(1)

    const second = await POST(sendRequest())
    expect(second.status).toBe(400)
    expect(notifyCount).toBe(1)
  })
})
