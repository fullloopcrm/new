/**
 * SELENA (Yinez) — an internal error during askSelenaCore never notified
 * admin, despite the catch block's own comment claiming "Surface error to
 * admin (notify is best-effort)".
 *
 * Every per-tenant clone's own Selena (src/app/site/*​/_lib/selena.ts) fires
 * a 'selena_error' notification on catch. This global agent — the one every
 * non-cloned tenant actually runs on, including the platform's most-used AI
 * booking assistant — never did; the comment was aspirational, not backed by
 * a real notify() call. The admin monitoring dashboard's own 24h
 * selena_error count (api/admin/monitoring/status) was silently blind to
 * every crash here as a result.
 *
 * This suite proves a real internal error (Anthropic client resolution
 * failing, standing in for any failure after tenant resolution — the LLM
 * call, a tool, etc.) now fires a tenant-scoped 'selena_error' notification,
 * still returns an empty result (never a canned dead-end), and never throws
 * out to the caller even if notify() itself fails.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase, Row } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

const TENANT_ID = 'tenant-selena-error'
const CONVERSATION_ID = 'convo-1'

vi.mock('@/lib/anthropic-client', () => ({
  resolveAnthropic: async () => {
    throw new Error('boom: anthropic key resolution failed')
  },
}))

const notifyCalls: Array<Record<string, unknown>> = []
let notifyShouldFail = false
vi.mock('@/lib/notify', () => ({
  notify: async (opts: Record<string, unknown>) => {
    notifyCalls.push(opts)
    if (notifyShouldFail) throw new Error('notify itself failed')
    return { success: true }
  },
}))

import { supabaseAdmin } from '@/lib/supabase'
import { askSelena } from './agent'

const fake = supabaseAdmin as unknown as FakeSupabase

function seed(overrides: Partial<Row> = {}) {
  fake._store.clear()
  fake._seed('sms_conversations', [
    { id: CONVERSATION_ID, tenant_id: TENANT_ID, ...overrides },
  ])
}

beforeEach(() => {
  seed()
  notifyCalls.length = 0
  notifyShouldFail = false
})

describe('askSelena — internal errors notify admin', () => {
  it('fires a tenant-scoped selena_error notification when a downstream call throws', async () => {
    const result = await askSelena('sms', 'hi', CONVERSATION_ID, '+15551234567')

    expect(result.text).toBe('')
    expect(notifyCalls.length).toBe(1)
    expect(notifyCalls[0]).toMatchObject({
      tenantId: TENANT_ID,
      type: 'selena_error',
    })
    expect(String(notifyCalls[0].message)).toContain(CONVERSATION_ID)
  })

  it('never throws out of the catch block even when notify() itself fails', async () => {
    notifyShouldFail = true
    const result = await askSelena('sms', 'hi', CONVERSATION_ID, '+15551234567')
    expect(result.text).toBe('')
    expect(notifyCalls.length).toBe(1)
  })
})
