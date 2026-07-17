import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * Item (166): comhub_threads.status's declared 'snoozed' value
 * (2026_05_19_comhub.sql CHECK constraint) was fully typed through the PATCH
 * route and documented as a valid `?status=` filter on the GET route, but no
 * UI ever sent `status:'snoozed'` — the admin inbox's only status-changing
 * control was "Close". snoozed_until existed on the table and was selected
 * by both GET routes, but nothing anywhere ever wrote to it either. Added a
 * Snooze control (comhub/page.tsx) so the value can finally be set.
 *
 * Item (167) continuing (166)'s surface: writing status:'snoozed' without a
 * wake-up path would have been a footgun identical in shape to (161) — a
 * snoozed thread would vanish from the default status=open inbox filter
 * forever, since nothing ever reads snoozed_until to flip it back. Added a
 * lazy wake check (mirrors quotes' valid_until expire-on-view pattern, no
 * cron needed) to both the list and single-thread GET routes, plus
 * stale-field discipline on PATCH so snoozed_until can't linger once status
 * moves off 'snoozed' by any path (matches onboarding's blocked_reason).
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  return { supabaseAdmin: createFakeSupabase() }
})

const TENANT = 'tenant-A'

vi.mock('@/lib/require-admin', () => ({
  requireAdmin: async () => null,
}))
vi.mock('@/lib/tenant', () => ({
  getCurrentTenantId: async () => TENANT,
}))

import { supabaseAdmin } from '@/lib/supabase'
import { GET as listThreads } from './route'
import { GET as getThread, PATCH as patchThread } from './[id]/route'

const fake = supabaseAdmin as unknown as FakeSupabase
const THREAD_ID = '22222222-2222-2222-2222-222222222222'
const CONTACT_ID = '11111111-1111-1111-1111-111111111111'

const PAST = new Date(Date.now() - 60 * 60 * 1000).toISOString()
const FUTURE = new Date(Date.now() + 60 * 60 * 1000).toISOString()

function listReq(qs = 'kind=contact&status=open&channel=all&filter=all'): NextRequest {
  return new NextRequest(`http://x/api/admin/comhub/threads?${qs}`)
}
function patchReq(body: Record<string, unknown>): NextRequest {
  return new NextRequest(`http://x/api/admin/comhub/threads/${THREAD_ID}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}
const ctx = { params: Promise.resolve({ id: THREAD_ID }) }

beforeEach(() => {
  fake._store.clear()
  fake._seed('comhub_contacts', [
    { id: CONTACT_ID, tenant_id: TENANT, name: 'Jane', phone: '5550001111', email: null, client_id: null, team_member_id: null },
  ])
})

describe('comhub_threads status=snoozed — write path (166) and wake path (167)', () => {
  it('PATCH persists status:snoozed with the given snoozed_until', async () => {
    fake._seed('comhub_threads', [
      { id: THREAD_ID, tenant_id: TENANT, contact_id: CONTACT_ID, channel: 'sms', kind: 'contact', status: 'open', snoozed_until: null, disposition: null, bot_paused_until: null, unread_count: 0 },
    ])
    const res = await patchThread(patchReq({ status: 'snoozed', snoozed_until: FUTURE }), ctx)
    expect(res.status).toBe(200)
    expect(fake._all('comhub_threads')[0].status).toBe('snoozed')
    expect(fake._all('comhub_threads')[0].snoozed_until).toBe(FUTURE)
  })

  it('PATCH clears snoozed_until when closing a snoozed thread (stale-field discipline)', async () => {
    fake._seed('comhub_threads', [
      { id: THREAD_ID, tenant_id: TENANT, contact_id: CONTACT_ID, channel: 'sms', kind: 'contact', status: 'snoozed', snoozed_until: FUTURE, disposition: null, bot_paused_until: null, unread_count: 0 },
    ])
    const res = await patchThread(patchReq({ status: 'closed' }), ctx)
    expect(res.status).toBe(200)
    expect(fake._all('comhub_threads')[0].status).toBe('closed')
    expect(fake._all('comhub_threads')[0].snoozed_until).toBeNull()
  })

  it('PATCH clears snoozed_until on manual wake (status:open)', async () => {
    fake._seed('comhub_threads', [
      { id: THREAD_ID, tenant_id: TENANT, contact_id: CONTACT_ID, channel: 'sms', kind: 'contact', status: 'snoozed', snoozed_until: FUTURE, disposition: null, bot_paused_until: null, unread_count: 0 },
    ])
    const res = await patchThread(patchReq({ status: 'open' }), ctx)
    expect(res.status).toBe(200)
    expect(fake._all('comhub_threads')[0].status).toBe('open')
    expect(fake._all('comhub_threads')[0].snoozed_until).toBeNull()
  })

  it('single-thread GET lazily wakes a thread whose snoozed_until has passed', async () => {
    fake._seed('comhub_threads', [
      { id: THREAD_ID, tenant_id: TENANT, contact_id: CONTACT_ID, channel: 'sms', kind: 'contact', status: 'snoozed', snoozed_until: PAST, disposition: null, bot_paused_until: null, last_message_at: PAST, unread_count: 0 },
    ])
    const res = await getThread(new NextRequest(`http://x/api/admin/comhub/threads/${THREAD_ID}`), ctx)
    const json = await res.json()
    expect(json.thread.status).toBe('open')
    expect(json.thread.snoozed_until).toBeNull()
    expect(fake._all('comhub_threads')[0].status).toBe('open')
  })

  it('single-thread GET leaves a still-future snooze alone', async () => {
    fake._seed('comhub_threads', [
      { id: THREAD_ID, tenant_id: TENANT, contact_id: CONTACT_ID, channel: 'sms', kind: 'contact', status: 'snoozed', snoozed_until: FUTURE, disposition: null, bot_paused_until: null, last_message_at: FUTURE, unread_count: 0 },
    ])
    const res = await getThread(new NextRequest(`http://x/api/admin/comhub/threads/${THREAD_ID}`), ctx)
    const json = await res.json()
    expect(json.thread.status).toBe('snoozed')
    expect(json.thread.snoozed_until).toBe(FUTURE)
  })

  it('list GET (default status=open filter) surfaces an overdue snoozed thread after waking it', async () => {
    fake._seed('comhub_threads', [
      { id: THREAD_ID, tenant_id: TENANT, contact_id: CONTACT_ID, channel: 'sms', kind: 'contact', status: 'snoozed', snoozed_until: PAST, disposition: null, bot_paused_until: null, last_message_at: PAST, unread_count: 0 },
    ])
    const res = await listThreads(listReq())
    const json = await res.json()
    expect(json.threads).toHaveLength(1)
    expect(json.threads[0].id).toBe(THREAD_ID)
    expect(fake._all('comhub_threads')[0].status).toBe('open')
  })

  it('list GET (default status=open filter) does not surface a thread still within its snooze window', async () => {
    fake._seed('comhub_threads', [
      { id: THREAD_ID, tenant_id: TENANT, contact_id: CONTACT_ID, channel: 'sms', kind: 'contact', status: 'snoozed', snoozed_until: FUTURE, disposition: null, bot_paused_until: null, last_message_at: FUTURE, unread_count: 0 },
    ])
    const res = await listThreads(listReq())
    const json = await res.json()
    expect(json.threads).toHaveLength(0)
    expect(fake._all('comhub_threads')[0].status).toBe('snoozed')
  })
})
