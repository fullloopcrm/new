/**
 * CRON campaign-dispatch — the missing read for scheduled campaigns.
 *
 * POST /api/campaigns writes campaigns.scheduled_at and (as of this same
 * fix) status: 'scheduled', but until this route existed nothing ever read
 * either back — a scheduled campaign sat forever unless someone opened it
 * and clicked "Send Now" by hand once the date arrived (see
 * EMERGENCY-24-7-ARCHETYPE-GAPS-AND-FRICTION-2026-07-16.md item (1)).
 *
 * This suite proves: a due scheduled campaign gets sent, a not-yet-due one
 * is left alone, and non-scheduled campaigns (draft/sent) are never touched
 * by this cron.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase, Row } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

vi.mock('@/lib/settings', () => ({
  getSettings: async () => ({ campaign_approval_required: false, campaign_auto_unsubscribe: false }),
}))

let emailsSent = 0
vi.mock('@/lib/email', () => ({
  sendEmail: async () => {
    emailsSent++
  },
}))
vi.mock('@/lib/sms', () => ({ sendSMS: async () => {} }))
vi.mock('@/lib/audit', () => ({ audit: async () => {} }))

import { supabaseAdmin } from '@/lib/supabase'
import { GET } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

const TENANT_ID = 'tenant-1'
const PAST = new Date(Date.now() - 60 * 60 * 1000).toISOString()
const FUTURE = new Date(Date.now() + 60 * 60 * 1000).toISOString()

function seed(campaigns: Row[]) {
  fake._store.clear()
  fake._seed('campaigns', campaigns)
  fake._seed('clients', [
    { id: 'client-1', tenant_id: TENANT_ID, name: 'Alice', email: 'alice@test.com', phone: null, status: 'active', email_marketing_opt_out: false, sms_marketing_opt_out: false, sms_consent: true },
  ])
  fake._seed('tenants', [
    { id: TENANT_ID, name: 'Test Tenant', resend_api_key: 'test-resend-key', resend_domain: null, email_from: null, telnyx_api_key: null, telnyx_phone: null, address: null },
  ])
}

function req() {
  return new Request('http://x/api/cron/campaign-dispatch', {
    headers: { authorization: 'Bearer test-cron-secret' },
  })
}

beforeEach(() => {
  process.env.CRON_SECRET = 'test-cron-secret'
  emailsSent = 0
})

describe('GET /api/cron/campaign-dispatch', () => {
  it('sends a due scheduled campaign and flips it to sent', async () => {
    seed([
      { id: 'camp-due', tenant_id: TENANT_ID, status: 'scheduled', scheduled_at: PAST, type: 'email', name: 'Due', subject: 'Due', body: 'Hi {name}', recipient_count: null, sent_at: null },
    ])

    const res = await GET(req())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.processed).toBe(1)
    expect(body.results[0].ok).toBe(true)
    expect(body.results[0].sent).toBe(1)
    expect(emailsSent).toBe(1)

    const row = fake._all('campaigns').find((c) => c.id === 'camp-due')
    expect(row?.status).toBe('sent')
  })

  it('leaves a not-yet-due scheduled campaign untouched', async () => {
    seed([
      { id: 'camp-future', tenant_id: TENANT_ID, status: 'scheduled', scheduled_at: FUTURE, type: 'email', name: 'Future', subject: 'Future', body: 'Hi', recipient_count: null, sent_at: null },
    ])

    const res = await GET(req())
    const body = await res.json()
    expect(body.processed).toBe(0)
    expect(emailsSent).toBe(0)

    const row = fake._all('campaigns').find((c) => c.id === 'camp-future')
    expect(row?.status).toBe('scheduled')
  })

  it('never touches draft or already-sent campaigns', async () => {
    seed([
      { id: 'camp-draft', tenant_id: TENANT_ID, status: 'draft', scheduled_at: null, type: 'email', name: 'Draft', subject: 'Draft', body: 'Hi', recipient_count: null, sent_at: null },
      { id: 'camp-sent', tenant_id: TENANT_ID, status: 'sent', scheduled_at: PAST, type: 'email', name: 'Already sent', subject: 'x', body: 'Hi', recipient_count: 3, sent_at: PAST },
    ])

    const res = await GET(req())
    const body = await res.json()
    expect(body.processed).toBe(0)
    expect(emailsSent).toBe(0)
  })

  it('rejects requests without a valid cron secret', async () => {
    const res = await GET(new Request('http://x/api/cron/campaign-dispatch'))
    expect(res.status).toBe(401)
  })
})
