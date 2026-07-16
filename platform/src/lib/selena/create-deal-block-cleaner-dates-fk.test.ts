import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * handleCreateDeal + handleBlockCleanerDates (Yinez engine's owner-only AI
 * tools, tools.ts) inserted `deals.client_id` / `cleaner_blocks.cleaner_id`
 * straight from the model's tool-call input with NO tenant-ownership check
 * -- same FK-injection class already closed on handleCreateManualBooking,
 * handleAssignCleaner, and handleUpdateBooking in this same file.
 * handleListDeals joins clients(name, phone) straight off deals.client_id,
 * so a foreign client_id here would leak another tenant's client PII into
 * this tenant's own deal pipeline. cleaner_blocks has no read path anywhere
 * in the codebase today, so that half is defense-in-depth rather than a
 * demonstrated live leak.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})
vi.mock('@anthropic-ai/sdk', () => ({ default: class {} }))
vi.mock('@/lib/anthropic-client', () => ({ resolveAnthropic: vi.fn() }))
vi.mock('@/lib/nycmaid/smart-schedule', () => ({ scoreCleanersForBooking: vi.fn() }))
vi.mock('@/lib/nycmaid/notify', () => ({ notify: async () => {} }))
vi.mock('@/lib/nycmaid/sms', () => ({ sendSMS: async () => {} }))
vi.mock('@/lib/nycmaid/admin-contacts', () => ({ smsAdmins: async () => {} }))
vi.mock('@/lib/nycmaid/email', () => ({ sendEmail: async () => {} }))
vi.mock('@/lib/nycmaid/email-templates', () => ({ emailWrapper: (s: string) => s }))

import type { FakeSupabase } from '@/test/fake-supabase'
import { supabaseAdmin } from '@/lib/supabase'
import { runTool } from '@/lib/selena/tools'
import type { YinezResult } from '@/lib/selena/agent'

const fake = supabaseAdmin as unknown as FakeSupabase

const TENANT_A = 'tenant-a'
const TENANT_B = 'tenant-b'
const OWNER_PHONE = '3105559999'

const emptyResult = (): YinezResult => ({ text: '', toolsCalled: [] })

beforeEach(() => {
  fake._store.clear()
  fake._seed('tenants', [
    { id: TENANT_A, owner_phone: OWNER_PHONE },
    { id: TENANT_B, owner_phone: '4155558888' },
  ])
  fake._seed('clients', [
    { id: 'client-A', tenant_id: TENANT_A, name: 'Tenant A Client', phone: '2125550001' },
    { id: 'client-B-victim', tenant_id: TENANT_B, name: 'Tenant B Victim Client', phone: '2125550002' },
  ])
  fake._seed('cleaners', [
    { id: 'cleaner-A', tenant_id: TENANT_A, name: 'Tenant A Cleaner', phone: '2125550003' },
    { id: 'cleaner-B-victim', tenant_id: TENANT_B, name: 'Tenant B Victim Cleaner', phone: '2125550004' },
  ])
})

describe('create_deal (Yinez owner tool) — client_id FK ownership', () => {
  it('rejects a foreign (Tenant B) client_id and inserts no deal', async () => {
    const out = await runTool(
      'create_deal',
      { client_id: 'client-B-victim', value_dollars: 100 },
      'convo-1', OWNER_PHONE, emptyResult(), TENANT_A, true,
    )
    expect(JSON.parse(out).error).toBe('client not found')
    expect((fake._store.get('deals') || []).length).toBe(0)
  })

  it('CONTROL: accepts a same-tenant client_id', async () => {
    const out = await runTool(
      'create_deal',
      { client_id: 'client-A', value_dollars: 100 },
      'convo-1', OWNER_PHONE, emptyResult(), TENANT_A, true,
    )
    expect(JSON.parse(out).ok).toBe(true)
    const rows = fake._store.get('deals') || []
    expect(rows.length).toBe(1)
    expect(rows[0].client_id).toBe('client-A')
  })
})

describe('block_cleaner_dates (Yinez owner tool) — cleaner_id FK ownership', () => {
  it('rejects a foreign (Tenant B) cleaner_id and inserts no block', async () => {
    const out = await runTool(
      'block_cleaner_dates',
      { cleaner_id: 'cleaner-B-victim', from_date: '2026-08-01', to_date: '2026-08-05' },
      'convo-1', OWNER_PHONE, emptyResult(), TENANT_A, true,
    )
    expect(JSON.parse(out).error).toBe('cleaner not found')
    expect((fake._store.get('cleaner_blocks') || []).length).toBe(0)
  })

  it('CONTROL: accepts a same-tenant cleaner_id', async () => {
    const out = await runTool(
      'block_cleaner_dates',
      { cleaner_id: 'cleaner-A', from_date: '2026-08-01', to_date: '2026-08-05' },
      'convo-1', OWNER_PHONE, emptyResult(), TENANT_A, true,
    )
    expect(JSON.parse(out).ok).toBe(true)
    const rows = fake._store.get('cleaner_blocks') || []
    expect(rows.length).toBe(1)
    expect(rows[0].cleaner_id).toBe('cleaner-A')
  })
})
