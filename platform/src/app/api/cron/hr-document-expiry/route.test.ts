/**
 * Fresh-ground fix, continuing (150)'s surface: lib/hr.ts's own
 * HR_REMINDER_MILESTONES ("for the (future) auto-nudge engine") and the
 * hr_document_reminders table (UNIQUE(document_id, milestone) — "making the
 * auto-nudge engine idempotent by construction") existed since the HR
 * foundation migration with zero code ever reading or writing either. This
 * cron is that engine for the four day-based milestones. Proves: a document
 * inside a milestone window fires notify()+ownerAlert() and claims the
 * reminder row; a second run for the same document+milestone does not
 * double-send; a document outside any window, already past due (owned by
 * (150)'s lazy on-visit check instead), or in a non-renewal status
 * ('rejected'/'expired') never fires.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

vi.mock('@/lib/cron-auth', () => ({ verifyCronSecret: () => null }))

const notifyMock = vi.fn(async (..._args: unknown[]) => ({ success: true }))
vi.mock('@/lib/notify', () => ({ notify: (...args: unknown[]) => notifyMock(...args) }))

const ownerAlertMock = vi.fn(async (..._args: unknown[]) => {})
vi.mock('@/lib/messaging/owner-alerts', () => ({ ownerAlert: (...args: unknown[]) => ownerAlertMock(...args) }))

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  fake._addUniqueConstraint('hr_document_reminders', 'document_id')
  return { supabaseAdmin: fake }
})

import { supabaseAdmin } from '@/lib/supabase'
import { GET } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase
const TENANT_ID = 'tenant-hr-1'
const NOW = new Date('2026-07-20T12:00:00.000Z')
const DAY_MS = 24 * 60 * 60 * 1000
const dateOffset = (days: number) => new Date(NOW.getTime() + days * DAY_MS).toISOString().slice(0, 10)

function doc(over: Record<string, unknown>) {
  return {
    id: 'doc-default', tenant_id: TENANT_ID, team_member_id: 'tm-1', doc_type: 'id',
    label: 'Driver License', status: 'approved', expires_on: null,
    team_members: { name: 'Alex Rivera' },
    ...over,
  }
}

function req() {
  return new Request('http://x/api/cron/hr-document-expiry')
}

beforeEach(() => {
  fake._store.clear()
  notifyMock.mockClear()
  ownerAlertMock.mockClear()
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  fake._seed('tenants', [{ id: TENANT_ID, status: 'active' }])
})

afterEach(() => {
  vi.useRealTimers()
})

describe('cron/hr-document-expiry', () => {
  it('fires the tightest milestone for a document expiring in 5 days and claims the reminder row', async () => {
    fake._seed('hr_documents', [doc({ id: 'doc-1', expires_on: dateOffset(5) })])

    const res = await GET(req())
    expect(res.status).toBe(200)

    expect(notifyMock).toHaveBeenCalledTimes(1)
    expect(notifyMock.mock.calls[0][0]).toMatchObject({
      type: 'hr_document_expiring', tenantId: TENANT_ID, recipientType: 'admin',
    })
    expect(ownerAlertMock).toHaveBeenCalledTimes(1)
    expect(ownerAlertMock.mock.calls[0][0]).toMatchObject({ tenantId: TENANT_ID })

    const reminders = fake._all('hr_document_reminders')
    expect(reminders).toHaveLength(1)
    expect(reminders[0]).toMatchObject({ document_id: 'doc-1', milestone: 'expiry_7d' })
  })

  it('does not re-fire the same milestone on a second run', async () => {
    fake._seed('hr_documents', [doc({ id: 'doc-2', expires_on: dateOffset(5) })])

    await GET(req())
    notifyMock.mockClear()
    ownerAlertMock.mockClear()

    const res2 = await GET(req())
    expect(res2.status).toBe(200)
    expect(notifyMock).not.toHaveBeenCalled()
    expect(ownerAlertMock).not.toHaveBeenCalled()
    expect(fake._all('hr_document_reminders')).toHaveLength(1)
  })

  it('does not fire for a document expiring outside every milestone window', async () => {
    fake._seed('hr_documents', [doc({ id: 'doc-3', expires_on: dateOffset(90) })])

    const res = await GET(req())
    expect(res.status).toBe(200)
    expect(notifyMock).not.toHaveBeenCalled()
    expect(fake._all('hr_document_reminders')).toHaveLength(0)
  })

  it('does not fire for a document already past its expiry — that transition belongs to the on-visit check', async () => {
    fake._seed('hr_documents', [doc({ id: 'doc-4', expires_on: dateOffset(-3) })])

    const res = await GET(req())
    expect(res.status).toBe(200)
    expect(notifyMock).not.toHaveBeenCalled()
  })

  it("does not fire for a 'rejected' document even inside a milestone window", async () => {
    fake._seed('hr_documents', [doc({ id: 'doc-5', status: 'rejected', expires_on: dateOffset(5) })])

    const res = await GET(req())
    expect(res.status).toBe(200)
    expect(notifyMock).not.toHaveBeenCalled()
  })
})
