import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * runTool()'s owner-only gate (tools.ts) used to be `isOwnerOfTenant(phone,
 * tid)` alone. /api/chat and /api/yinez are fully public, unauthenticated
 * widgets that read `phone` straight from the caller's JSON body with no
 * verification, then pass it into askSelena(..., channel: 'web', phone).
 * Since a tenant's owner_phone is typically the same number listed as the
 * business's own public contact number, ANY anonymous visitor could send
 * `{"phone": "<tenant's public business number>", "message": "..."}` and
 * have Yinez treat them as the owner -- unlocking every owner-only tool
 * (get_revenue, broadcasts, and process_stripe_refund: a real, uncapped
 * Stripe refund) with zero authentication.
 *
 * Fix: runTool() now also requires an explicit `trustedOwnerPhone` flag,
 * true only when phone is server-derived (SMS Telnyx sender / Telegram
 * owner mapping) or the caller is independently authenticated (admin-chat's
 * requirePermission gate) -- never true for the public web-chat body field.
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

import type { FakeSupabase } from '@/test/fake-supabase'
import { supabaseAdmin } from '@/lib/supabase'
import { runTool } from '@/lib/selena/tools'
import type { YinezResult } from '@/lib/selena/agent'

const fake = supabaseAdmin as unknown as FakeSupabase

const TENANT = 'tenant-a'
const OWNER_PHONE = '3105559999'

const emptyResult = (): YinezResult => ({ text: '', toolsCalled: [] })

beforeEach(() => {
  fake._store.clear()
  fake._seed('tenants', [{ id: TENANT, owner_phone: OWNER_PHONE }])
})

it('blocks an owner-only tool when the caller-claimed owner phone is untrusted (public web/email body input)', async () => {
  const out = await runTool(
    'get_today_summary', {}, 'convo-1', OWNER_PHONE, emptyResult(), TENANT,
    // trustedOwnerPhone omitted -> defaults false, matching /api/chat + /api/yinez
  )
  const parsed = JSON.parse(out)
  expect(parsed.error).toBe('owner_only_tool')
})

it('blocks even when trustedOwnerPhone is explicitly false', async () => {
  const out = await runTool('get_today_summary', {}, 'convo-1', OWNER_PHONE, emptyResult(), TENANT, false)
  expect(JSON.parse(out).error).toBe('owner_only_tool')
})

it('allows the SAME owner-only tool + SAME phone once trustedOwnerPhone is true (sms/telegram-derived or authenticated admin-chat)', async () => {
  const out = await runTool('get_today_summary', {}, 'convo-1', OWNER_PHONE, emptyResult(), TENANT, true)
  const parsed = JSON.parse(out)
  expect(parsed.error).toBeUndefined()
})

it('still blocks a non-owner phone even when trustedOwnerPhone is true', async () => {
  const out = await runTool('get_today_summary', {}, 'convo-1', '2125550000', emptyResult(), TENANT, true)
  expect(JSON.parse(out).error).toBe('owner_only_tool')
})
