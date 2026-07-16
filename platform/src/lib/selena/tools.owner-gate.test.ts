/**
 * CRITICAL fix (2026-07-16) — Yinez owner-tool auth bypass via spoofed phone.
 *
 * The public, unauthenticated /api/chat and /api/yinez web widgets pass
 * `phone` straight from the caller-supplied JSON body into askSelena(), which
 * fed it directly into isOwner(phone) to decide whether the caller could use
 * every owner-only tool (refunds, broadcasts, client PII, revenue, cleaner
 * management, settings). Since a business's own contact number is typically
 * public (website, Google Business Profile), anyone could claim it in the
 * request body and get treated as the owner — a full auth bypass requiring
 * no secret, just the business's own publicly-known phone number.
 *
 * Fix: isOwner() now requires an explicit `verified` flag (default false —
 * fail closed) that only trusted channels (Telnyx-signature-verified SMS,
 * Telegram chat_id allowlist, or an authenticated admin route deriving the
 * number itself) may set true. runTool()'s owner gate takes the same flag.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})
vi.mock('@/lib/nycmaid/sms', () => ({ sendSMS: vi.fn() }))
vi.mock('@/lib/nycmaid/admin-contacts', () => ({ smsAdmins: vi.fn() }))
vi.mock('@/lib/nycmaid/email', () => ({ sendEmail: vi.fn() }))
vi.mock('@/lib/nycmaid/notify', () => ({ notify: vi.fn() }))
vi.mock('@/lib/tenant', () => ({ getCurrentTenantId: vi.fn().mockResolvedValue('tenant-1') }))

import { supabaseAdmin } from '@/lib/supabase'
import { runTool } from './tools'
import { isOwner } from './agent'

const fake = supabaseAdmin as unknown as FakeSupabase
const TENANT_ID = 'tenant-1'
const OWNER_PHONE = '+12125551234'

beforeEach(() => {
  fake._store.clear()
  process.env.OWNER_PHONES = OWNER_PHONE
  fake._seed('payments', [
    { id: 'p1', tenant_id: TENANT_ID, amount: 10000, tip: 0, created_at: new Date().toISOString() },
  ])
})

describe('isOwner phone-verification gate', () => {
  it('never asserts owner without an explicit verified=true, even for a matching phone', () => {
    expect(isOwner(OWNER_PHONE)).toBe(false)
    expect(isOwner(OWNER_PHONE, false)).toBe(false)
  })

  it('asserts owner only when the phone matches AND is verified', () => {
    expect(isOwner(OWNER_PHONE, true)).toBe(true)
    expect(isOwner('+19995551234', true)).toBe(false)
  })
})

describe('runTool owner-only gate respects phoneVerified', () => {
  it('blocks an owner-only tool for a caller-supplied phone even when it matches OWNER_PHONES, if unverified', async () => {
    const result = { text: '', toolsCalled: [] as string[] }
    const out = JSON.parse(
      await runTool('get_revenue', { period: 'today' }, 'convo-1', OWNER_PHONE, result, TENANT_ID, false),
    )
    expect(out.error).toBe('owner_only_tool')
  })

  it('defaults to unverified (blocked) when phoneVerified is omitted entirely', async () => {
    const result = { text: '', toolsCalled: [] as string[] }
    const out = JSON.parse(
      await runTool('get_revenue', { period: 'today' }, 'convo-1', OWNER_PHONE, result, TENANT_ID),
    )
    expect(out.error).toBe('owner_only_tool')
  })

  it('allows the same owner-only tool once the caller vouches the phone is verified', async () => {
    const result = { text: '', toolsCalled: [] as string[] }
    const out = JSON.parse(
      await runTool('get_revenue', { period: 'today' }, 'convo-1', OWNER_PHONE, result, TENANT_ID, true),
    )
    expect(out.error).toBeUndefined()
    expect(out.period).toBe('today')
  })
})
