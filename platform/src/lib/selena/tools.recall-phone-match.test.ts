/**
 * The 'recall' tool's phone->client lookup (handleRecall) matched an
 * existing client via `ilike('phone', '%'+last10digits+'%')` gated only by
 * a truthy check (`if (last10)`), not a length floor. A short or malformed
 * phone (e.g. a single digit from an anonymous web-chat visitor) matched an
 * ARBITRARY unrelated client and leaked their private yinez_memory notes
 * into this conversation when the model called `recall`. 'recall' is a
 * SELF_TOOLS entry -- reachable on any client channel, not just by the
 * owner. Same bug class already fixed elsewhere (getClientProfile,
 * loadContext). Fixed to require a full, exact 10-digit match.
 */
import { describe, it, expect, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake, __fake: fake }
})

vi.mock('@/lib/nycmaid/notify', () => ({ notify: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/nycmaid/sms', () => ({ sendSMS: vi.fn().mockResolvedValue({ success: true }) }))
vi.mock('@/lib/nycmaid/email', () => ({ sendEmail: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/nycmaid/admin-contacts', () => ({ smsAdmins: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/tenant', () => ({ getCurrentTenantId: vi.fn().mockResolvedValue('tenant-1') }))

import { supabaseAdmin } from '@/lib/supabase'
import { runTool } from './tools'
import type { YinezResult } from './agent'

const fake = supabaseAdmin as unknown as FakeSupabase

const TENANT = 'tenant-1'

function seed() {
  fake._seed('clients', [
    { id: 'unrelated-client', tenant_id: TENANT, phone: '5551234567', name: 'Unrelated Client' },
  ])
  fake._seed('yinez_memory', [
    { tenant_id: TENANT, client_id: 'unrelated-client', type: 'note', content: 'super private memory', source: 'owner', created_at: new Date().toISOString() },
  ])
}

function freshResult(): YinezResult {
  return { text: '', toolsCalled: [] }
}

describe("recall tool — phone->client match must be exact", () => {
  it('a short malformed phone does NOT leak an unrelated client\'s memories', async () => {
    fake._store.clear()
    seed()
    const out = JSON.parse(await runTool('recall', {}, 'convo-1', '5', freshResult(), TENANT))
    expect(JSON.stringify(out.client_memories || [])).not.toContain('super private memory')
  })

  it('a null phone does NOT leak any client memories', async () => {
    fake._store.clear()
    seed()
    const out = JSON.parse(await runTool('recall', {}, 'convo-1', null, freshResult(), TENANT))
    expect(JSON.stringify(out.client_memories || [])).not.toContain('super private memory')
  })

  it('a full exact phone match still surfaces the real client\'s memories', async () => {
    fake._store.clear()
    seed()
    const out = JSON.parse(await runTool('recall', {}, 'convo-1', '5551234567', freshResult(), TENANT))
    expect(JSON.stringify(out.client_memories || [])).toContain('super private memory')
  })
})
