import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * block_client (Selena/Jefe owner tool) — false-success on missing/foreign
 * client_id.
 *
 * handleBlockClient() looked up the client but never checked whether the
 * lookup found anything, then ran the do_not_service update and discarded
 * its error entirely. A wrong or foreign (cross-tenant) client_id silently
 * no-opped -- zero rows updated -- while the tool still returned
 * `{ok: true, status: 'do_not_service'}`. Same false-success bug class
 * already fixed for mark_payment_received's swallowed insert error: the
 * owner asks Yinez to block an abusive/nonpaying client, is told it worked,
 * and the client can keep booking.
 *
 * Fix: return an error when the client isn't found (tenant-scoped lookup),
 * and surface the update's error instead of discarding it.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})
vi.mock('@/lib/nycmaid/sms', () => ({ sendSMS: vi.fn(async () => {}) }))
vi.mock('@/lib/nycmaid/admin-contacts', () => ({ smsAdmins: vi.fn(async () => {}) }))
vi.mock('@/lib/nycmaid/email', () => ({ sendEmail: vi.fn(async () => {}) }))
vi.mock('@/lib/nycmaid/notify', () => ({ notify: vi.fn(async () => {}) }))

import type { FakeSupabase } from '@/test/fake-supabase'
import { supabaseAdmin } from '@/lib/supabase'
import { runTool } from '@/lib/selena/tools'
import type { YinezResult } from '@/lib/selena/agent'

const fake = supabaseAdmin as unknown as FakeSupabase

const TENANT_A = 'tenant-a'
const TENANT_B = 'tenant-b'
const OWNER_PHONE = '3105559999'

function freshResult(): YinezResult {
  return { text: '', toolsCalled: [] }
}

beforeEach(() => {
  fake._store.clear()
  fake._seed('tenants', [
    { id: TENANT_A, owner_phone: OWNER_PHONE },
    { id: TENANT_B, owner_phone: '4155558888' },
  ])
  fake._seed('clients', [
    { id: 'client-A', tenant_id: TENANT_A, name: 'Tenant A Client', notes: null, do_not_service: false },
    { id: 'client-B-victim', tenant_id: TENANT_B, name: 'Tenant B Victim Client', notes: null, do_not_service: false },
  ])
})

describe('block_client — false-success on missing/foreign client_id', () => {
  it('reports an error (not ok:true) for a nonexistent client_id', async () => {
    const out = await runTool(
      'block_client',
      { client_id: 'no-such-client', reason: 'chargeback abuse' },
      'conv-1', OWNER_PHONE, freshResult(), TENANT_A, true,
    )
    expect(JSON.parse(out).error).toBe('client not found')
  })

  it('reports an error (not ok:true) for a foreign (Tenant B) client_id and leaves it unblocked', async () => {
    const out = await runTool(
      'block_client',
      { client_id: 'client-B-victim', reason: 'chargeback abuse' },
      'conv-1', OWNER_PHONE, freshResult(), TENANT_A, true,
    )
    expect(JSON.parse(out).error).toBe('client not found')
    const victim = fake._store.get('clients')?.find((c) => c.id === 'client-B-victim')
    expect(victim?.do_not_service).toBe(false)
  })

  it('CONTROL: blocks a real, same-tenant client_id', async () => {
    const out = await runTool(
      'block_client',
      { client_id: 'client-A', reason: 'chargeback abuse' },
      'conv-1', OWNER_PHONE, freshResult(), TENANT_A, true,
    )
    expect(JSON.parse(out).ok).toBe(true)
    const client = fake._store.get('clients')?.find((c) => c.id === 'client-A')
    expect(client?.do_not_service).toBe(true)
    expect(client?.notes).toMatch(/chargeback abuse/)
  })
})
