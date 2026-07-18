import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

const { alertOwnerMock } = vi.hoisted(() => ({
  alertOwnerMock: vi.fn(async (_subject: string, _detail?: string) => null),
}))

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})
vi.mock('@/lib/telegram', () => ({ alertOwner: alertOwnerMock }))

import { supabaseAdmin } from '@/lib/supabase'
import { sendSeoAlertDigest } from './alert-digest'

const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  fake._store.clear()
  alertOwnerMock.mockClear()
})

describe('sendSeoAlertDigest', () => {
  it('does nothing and does not alert when there are no un-notified open issues', async () => {
    fake._seed('seo_issues', [
      { id: 'i1', property: 'sc-domain:thenycmaid.com', status: 'open', type: 'not_indexed', target_url: '/a', detail: {}, notified_at: '2026-07-17T00:00:00Z' },
      { id: 'i2', property: 'sc-domain:thenycmaid.com', status: 'resolved', type: 'not_indexed', target_url: '/b', detail: {}, notified_at: null },
    ])

    const result = await sendSeoAlertDigest()

    expect(result).toEqual({ sent: false, issueCount: 0, propertyCount: 0 })
    expect(alertOwnerMock).not.toHaveBeenCalled()
  })

  it('alerts once for every un-notified open not_indexed issue, grouped by property', async () => {
    fake._seed('seo_issues', [
      { id: 'i1', property: 'sc-domain:thenycmaid.com', status: 'open', type: 'not_indexed', target_url: '/a', detail: { coverage_state: 'Discovered - currently not indexed' }, notified_at: null },
      { id: 'i2', property: 'sc-domain:thenycmaid.com', status: 'open', type: 'not_indexed', target_url: '/b', detail: {}, notified_at: null },
      { id: 'i3', property: 'sc-domain:otherdomain.com', status: 'open', type: 'not_indexed', target_url: '/c', detail: {}, notified_at: null },
    ])

    const result = await sendSeoAlertDigest()

    expect(result).toEqual({ sent: true, issueCount: 3, propertyCount: 2 })
    expect(alertOwnerMock).toHaveBeenCalledTimes(1)
    const [subject, body] = alertOwnerMock.mock.calls[0]
    expect(subject).toContain('3 pages not indexed')
    expect(body).toContain('sc-domain:thenycmaid.com (2)')
    expect(body).toContain('sc-domain:otherdomain.com (1)')
    expect(body).toContain('/a')
    expect(body).toContain('Discovered - currently not indexed')
  })

  it('marks reported issues as notified so a re-run does not re-alert them', async () => {
    fake._seed('seo_issues', [
      { id: 'i1', property: 'sc-domain:thenycmaid.com', status: 'open', type: 'not_indexed', target_url: '/a', detail: {}, notified_at: null },
    ])

    await sendSeoAlertDigest()
    const stored = fake._all('seo_issues').find((r) => r.id === 'i1')
    expect(stored?.notified_at).toBeTruthy()

    alertOwnerMock.mockClear()
    const second = await sendSeoAlertDigest()

    expect(second).toEqual({ sent: false, issueCount: 0, propertyCount: 0 })
    expect(alertOwnerMock).not.toHaveBeenCalled()
  })

  it('ignores open issues of other seo_issues types (not part of the minimum bar)', async () => {
    fake._seed('seo_issues', [
      { id: 'i1', property: 'sc-domain:thenycmaid.com', status: 'open', type: 'striking_distance', target_url: '/a', detail: {}, notified_at: null },
      { id: 'i2', property: 'sc-domain:thenycmaid.com', status: 'open', type: 'competitor_gap', target_url: '/b', detail: {}, notified_at: null },
    ])

    const result = await sendSeoAlertDigest()

    expect(result).toEqual({ sent: false, issueCount: 0, propertyCount: 0 })
    expect(alertOwnerMock).not.toHaveBeenCalled()
  })
})
