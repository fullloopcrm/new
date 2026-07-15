import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * handleRecall(phone, tid) (Yinez engine's 'recall' tool, src/lib/selena/
 * tools.ts) is a SELF_TOOL -- callable by ANY client on the SMS/web/telegram
 * channels, NOT owner-gated (see runTool's gate: SELF_TOOLS bypasses the
 * isOwnerOfTenant check) -- meant per its own comment to return "the CURRENT
 * client's own memory only". It had NO length floor at all before
 * ilike-substring-matching `clients.phone` -- a short/garbage phone let an
 * unrelated client's saved yinez_memory (preferences/notes/observations)
 * leak to an anonymous caller who never owned that memory.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})
vi.mock('@/lib/nycmaid/sms', () => ({ sendSMS: async () => {} }))
vi.mock('@/lib/nycmaid/admin-contacts', () => ({ smsAdmins: async () => {} }))
vi.mock('@/lib/nycmaid/email', () => ({ sendEmail: async () => {} }))
vi.mock('@/lib/nycmaid/notify', () => ({ notify: async () => {} }))
vi.mock('@/lib/tenant', () => ({ getCurrentTenantId: async () => 'tenant-A' }))

import type { FakeSupabase } from '@/test/fake-supabase'
import { supabaseAdmin } from '@/lib/supabase'
import { runTool } from '@/lib/selena/tools'
import type { YinezResult } from '@/lib/selena/agent'

const fake = supabaseAdmin as unknown as FakeSupabase

const TENANT = 'tenant-A'
const VICTIM_CLIENT = { id: 'client-victim', tenant_id: TENANT, phone: '2125551234' }
const VICTIM_MEMORY = { id: 'mem-1', tenant_id: TENANT, client_id: 'client-victim', type: 'preference', content: 'victim private preference', source: null, created_at: new Date().toISOString() }

const emptyResult = (): YinezResult => ({ text: '', toolsCalled: [] })

beforeEach(() => {
  fake._store.clear()
  fake._seed('clients', [{ ...VICTIM_CLIENT }])
  fake._seed('yinez_memory', [{ ...VICTIM_MEMORY }])
})

describe("recall tool (Yinez engine, SELF_TOOL) — phone match floor", () => {
  it('does NOT leak an unrelated client\'s memory for a 1-digit phone', async () => {
    const out = await runTool('recall', {}, 'convo-1', '1', emptyResult(), TENANT)
    expect(out).not.toContain('victim private preference')
  })

  it('does NOT leak for a still-too-short 8-digit phone that IS a real substring of the victim number', async () => {
    const out = await runTool('recall', {}, 'convo-1', '21255512', emptyResult(), TENANT)
    expect(out).not.toContain('victim private preference')
  })

  it('CONTROL: still surfaces the real client\'s own memory on an exact 10-digit match', async () => {
    const out = await runTool('recall', {}, 'convo-1', '2125551234', emptyResult(), TENANT)
    expect(out).toContain('victim private preference')
  })
})
