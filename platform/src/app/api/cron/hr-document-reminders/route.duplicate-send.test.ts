/**
 * GET /api/cron/hr-document-reminders sends an expiry nudge for a document
 * whose expires_on lands on a milestone date (30/14/7/1 days out), and relies
 * on hr_document_reminders' UNIQUE(document_id, milestone) constraint as the
 * sole idempotency guard — an insert-as-claim, not a read-then-write. Two
 * overlapping cron invocations (a slow run + a scheduled retrigger) racing
 * the same document must still only send once, and a document already
 * reminded for a milestone must never be re-nudged on a later run.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

process.env.CRON_SECRET = 'test-secret'

const { TENANT_ID, MEMBER_ID, DOC_ID } = vi.hoisted(() => ({
  TENANT_ID: 'tenant-A',
  MEMBER_ID: 'member-1',
  DOC_ID: 'doc-1',
}))

function daysFromNowIso(days: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  // Composite UNIQUE(document_id, milestone) collapses to a document_id-only
  // constraint for this test: every scenario below only ever matches a single
  // milestone (expiry_7d) per document, so a single-column claim on
  // document_id exercises the same race the real composite index guards.
  fake._addUniqueConstraint('hr_document_reminders', 'document_id')
  return { supabaseAdmin: fake, __fake: fake }
})

const smsSends: string[] = []
const emailSends: string[] = []
vi.mock('@/lib/sms', () => ({
  sendSMS: vi.fn(async ({ to }: { to: string }) => { smsSends.push(to) }),
}))
vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn(async ({ to }: { to: string }) => { emailSends.push(to) }),
  tenantSender: () => 'Acme <acme@fullloopcrm.com>',
}))

import { supabaseAdmin } from '@/lib/supabase'
import { GET } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase
const req = () => new Request('http://x', { headers: { authorization: 'Bearer test-secret' } })

describe('GET /api/cron/hr-document-reminders — duplicate-send guard', () => {
  beforeEach(() => {
    smsSends.length = 0
    emailSends.length = 0
    // The fake's `_seed` appends rather than replaces, so each test needs a
    // clean store — otherwise a prior test's claim row (or stale document)
    // leaks into the next test's assertions.
    fake._store.clear()
    fake._seed('tenants', [
      { id: TENANT_ID, name: 'Acme', slug: 'acme', telnyx_api_key: 'key', telnyx_phone: '+15551234567', resend_api_key: 'rkey', email_from: null },
    ])
    fake._seed('team_members', [
      { id: MEMBER_ID, tenant_id: TENANT_ID, name: 'Jane Cleaner', email: 'jane@example.com', phone: '+15559998888', status: 'active', sms_consent: true, notification_preferences: {} },
    ])
    fake._seed('hr_documents', [
      { id: DOC_ID, tenant_id: TENANT_ID, team_member_id: MEMBER_ID, doc_type: 'cdl', label: 'CDL', status: 'approved', expires_on: daysFromNowIso(7) },
    ])
  })

  it('sends once for a normal single run', async () => {
    const res = await GET(req())
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.reminded).toBe(1)
    expect(smsSends).toEqual(['+15559998888'])
    expect(fake._all('hr_document_reminders')).toHaveLength(1)
    expect(fake._all('hr_document_reminders')[0]).toMatchObject({ document_id: DOC_ID, milestone: 'expiry_7d' })
  })

  it('does not double-send when two overlapping cron invocations race the same document', async () => {
    const [resA, resB] = await Promise.all([GET(req()), GET(req())])
    const [jsonA, jsonB] = await Promise.all([resA.json(), resB.json()])

    expect(jsonA.reminded + jsonB.reminded).toBe(1)
    expect(smsSends).toEqual(['+15559998888'])
    expect(fake._all('hr_document_reminders')).toHaveLength(1)
  })

  it('does not re-send on a later run once the milestone has been reminded', async () => {
    await GET(req())
    smsSends.length = 0

    const res = await GET(req())
    const json = await res.json()
    expect(json.reminded).toBe(0)
    expect(smsSends).toEqual([])
    expect(fake._all('hr_document_reminders')).toHaveLength(1)
  })

  it('skips a document belonging to an inactive team member', async () => {
    fake._all('team_members')[0].status = 'inactive'
    const res = await GET(req())
    const json = await res.json()
    expect(json.reminded).toBe(0)
    expect(smsSends).toEqual([])
    expect(fake._all('hr_document_reminders')).toHaveLength(0)
  })
})
