import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * create_client (Selena/Jefe owner tool, tools.ts's handleCreateClient) —
 * clients.pin conflict handling.
 *
 * idx_clients_tenant_pin_unique (2026_07_17_clients_pin_unique.sql) uniquely
 * constrains (tenant_id, pin). This insert minted a fresh random PIN with no
 * collision handling -- same bug class already fixed on client/collect,
 * just missed here since this is a different subsystem (Selena's
 * admin/AI-driven tool layer). A collision failed this admin-facing client
 * creation outright instead of retrying. Fix: regenerate-and-retry on
 * 23505, same pattern as the earlier client/collect fix.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  fake._addUniqueConstraint('clients', 'pin')
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})
vi.mock('@anthropic-ai/sdk', () => ({ default: class {} }))
vi.mock('@/lib/anthropic-client', () => ({ resolveAnthropic: vi.fn() }))
vi.mock('@/lib/nycmaid/smart-schedule', () => ({ scoreCleanersForBooking: vi.fn() }))
vi.mock('@/lib/nycmaid/notify', () => ({ notify: async () => {} }))
vi.mock('@/lib/nycmaid/sms', () => ({ sendSMS: vi.fn(async () => {}) }))
vi.mock('@/lib/nycmaid/admin-contacts', () => ({ smsAdmins: async () => {} }))
vi.mock('@/lib/nycmaid/email', () => ({ sendEmail: vi.fn(async () => {}) }))
vi.mock('@/lib/nycmaid/email-templates', () => ({ emailWrapper: (s: string) => s }))
vi.mock('@/lib/recurring', () => ({ nowNaiveET: vi.fn(() => new Date('2026-07-18T12:00:00Z')) }))

const h = vi.hoisted(() => ({ collisionPin: 'colliding-pin', freshCalls: 0 }))
vi.mock('@/lib/client-auth', () => ({
  randomClientPin: vi.fn(() => {
    h.freshCalls++
    return h.freshCalls <= 2 ? h.collisionPin : `fresh-pin-${h.freshCalls}`
  }),
  MAX_CLIENT_PIN_ATTEMPTS: 5,
}))

import type { FakeSupabase } from '@/test/fake-supabase'
import { supabaseAdmin } from '@/lib/supabase'
import { runTool } from '@/lib/selena/tools'
import type { YinezResult } from '@/lib/selena/agent'

const fake = supabaseAdmin as unknown as FakeSupabase
const TENANT_ID = 'tenant-A'
const OWNER_PHONE = '3105559999'

function freshResult(): YinezResult {
  return { text: '', toolsCalled: [] }
}

beforeEach(() => {
  vi.clearAllMocks()
  fake._store.clear()
  h.freshCalls = 0
  fake._seed('tenants', [{ id: TENANT_ID, owner_phone: OWNER_PHONE }])
  fake._seed('clients', [{ id: 'existing-1', tenant_id: TENANT_ID, name: 'Someone Else', phone: '9998887777', pin: h.collisionPin }])
})

describe('create_client — clients.pin conflict handling', () => {
  it('regenerates and retries when a fresh PIN collides, and still creates the client', async () => {
    const out = await runTool(
      'create_client',
      { name: 'New Client', phone: '2125550000' },
      'conv-1',
      OWNER_PHONE,
      freshResult(),
      TENANT_ID,
      true,
    )
    const parsed = JSON.parse(out)

    expect(parsed.ok).toBe(true)
    const created = fake._store.get('clients')!.find((c) => c.phone === '2125550000')
    expect(created).toBeTruthy()
    expect(created!.pin).toBe('fresh-pin-3')
    expect(h.freshCalls).toBe(3)
  })

  it('gives up after MAX_CLIENT_PIN_ATTEMPTS instead of retrying forever, and surfaces an error', async () => {
    ;(vi.mocked((await import('@/lib/client-auth')).randomClientPin)).mockImplementation(() => {
      h.freshCalls++
      return h.collisionPin
    })

    const out = await runTool(
      'create_client',
      { name: 'Unlucky Client', phone: '2125550001' },
      'conv-1',
      OWNER_PHONE,
      freshResult(),
      TENANT_ID,
      true,
    )
    const parsed = JSON.parse(out)

    expect(parsed.error).toBeTruthy()
    expect(h.freshCalls).toBe(5)
    expect(fake._store.get('clients')!.some((c) => c.phone === '2125550001')).toBe(false)
  })
})
