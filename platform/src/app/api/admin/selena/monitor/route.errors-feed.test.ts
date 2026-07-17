/**
 * GET /api/admin/selena/monitor's own doc comment: "so ops monitoring tools
 * can scrape stats without holding an admin session" — its `errors` feed is
 * the actual "something needs human attention" surface external tooling
 * polls. Its type filter only ever included `selena_error`, `escalation`,
 * `review_received` — but the two tools that fire on a real need-a-human
 * event, `request_callback` and `report_issue`
 * (`src/lib/selena/core.ts`), notify with `type: 'callback_requested'` and
 * `type: 'client_issue'` respectively. Neither ever matched the filter, so
 * this feed was silently blind to every callback request and every issue
 * report — the two events it exists to surface — while `escalation` (in the
 * filter) has no call site anywhere and can never appear.
 *
 * Fixed: filter now also includes `callback_requested` and `client_issue`.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import type { FakeSupabase } from '@/test/fake-supabase'

vi.hoisted(() => {
  process.env.ELCHAPO_MONITOR_KEY = 'test-monitor-key'
})

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

import { supabaseAdmin } from '@/lib/supabase'
import { GET } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

function req() {
  return new NextRequest('http://x/api/admin/selena/monitor', {
    headers: { 'x-monitor-key': 'test-monitor-key' },
  })
}

beforeEach(() => {
  fake._store.clear()
  fake._seed('notifications', [
    { id: 'n1', type: 'callback_requested', title: 'Callback — Dana', message: 'wants a human', created_at: '2026-07-17T10:00:00Z', tenant_id: 't1' },
    { id: 'n2', type: 'client_issue', title: 'Issue — Dana (high)', message: 'reported a problem', created_at: '2026-07-17T10:01:00Z', tenant_id: 't1' },
    { id: 'n3', type: 'selena_error', title: 'crash', message: 'boom', created_at: '2026-07-17T10:02:00Z', tenant_id: 't1' },
    { id: 'n4', type: 'sms_opt_out', title: 'unrelated', message: 'noise', created_at: '2026-07-17T10:03:00Z', tenant_id: 't1' },
  ])
})

describe('GET /api/admin/selena/monitor — errors feed type coverage', () => {
  it('surfaces callback_requested and client_issue rows alongside selena_error', async () => {
    const res = await GET(req())
    expect(res.status).toBe(200)
    const body = await res.json()
    const types = (body.errors as Array<{ type: string }>).map(e => e.type).sort()
    expect(types).toEqual(['callback_requested', 'client_issue', 'selena_error'])
  })
})
