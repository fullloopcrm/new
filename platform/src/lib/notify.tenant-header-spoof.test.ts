import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

/**
 * W4 — `notify()` header-fallback tenant resolution must verify x-tenant-sig.
 *
 * `notify()` (src/lib/notify.ts) falls back to the request's `x-tenant-id`
 * header when the caller doesn't pass an explicit tenantId (the nycmaid
 * request-scoped pattern, also mirrored in src/lib/nycmaid/notify.ts). Every
 * OTHER tenant-resolution helper in this codebase (getTenantFromHeaders,
 * getCurrentTenant, /api/yinez's own reqTenantId) rejects an x-tenant-id
 * that isn't accompanied by a valid middleware-minted x-tenant-sig — because
 * on a public main-host request (e.g. /api/yinez, which calls notify()
 * without a tenantId), the incoming headers pass through middleware
 * unmodified, so an unauthenticated caller can set x-tenant-id directly.
 *
 * Before the fix, notify()'s fallback trusted x-tenant-id with NO signature
 * check, so a forged header would attribute the notification row (and any
 * Telegram alert it fans out to) to an arbitrary victim tenant. This locks
 * the fix: an unsigned/forged header must resolve to "no tenant" (dropped),
 * and only a correctly-signed header is trusted.
 */

const REAL_TENANT = 'aaaaaaaa-1111-2222-3333-444444444444'
const VICTIM_TENANT = 'cccccccc-9999-8888-7777-666666666666'

const inserts: Array<{ table: string; payload: Record<string, unknown> }> = []

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const c: Record<string, unknown> = {
      select: () => c,
      insert: (payload: Record<string, unknown>) => {
        inserts.push({ table, payload })
        return c
      },
      update: () => c,
      eq: () => c,
      single: async () => ({ data: { id: 'notif-1' }, error: null }),
      then: (res: (v: { data: unknown; error: unknown }) => unknown) => res({ data: null, error: null }),
    }
    return c
  }
  return { supabaseAdmin: { from: (t: string) => chain(t) } }
})

vi.mock('@/lib/email', () => ({
  sendEmail: async () => ({}),
  tenantSender: () => 'Canary <noreply@canary.test>',
}))
vi.mock('@/lib/sms', () => ({ sendSMS: async () => ({}) }))
vi.mock('@/lib/comms-prefs', () => ({ isCommEnabled: async () => true }))
vi.mock('@/lib/email-templates', () => ({
  bookingReminderEmail: () => '<p>x</p>',
  bookingConfirmationEmail: () => '<p>x</p>',
  bookingReceivedEmail: () => '<p>x</p>',
  followUpEmail: () => '<p>x</p>',
  dailySummaryEmail: () => '<p>x</p>',
  dailyOpsRecapEmail: () => '<p>x</p>',
  notificationDigestEmail: () => '<p>x</p>',
  reviewRequestEmail: () => '<p>x</p>',
  paymentReceiptEmail: () => '<p>x</p>',
}))

const requestHeaders = new Map<string, string>()
vi.mock('next/headers', () => ({
  headers: async () => ({
    get: (name: string) => requestHeaders.get(name) ?? null,
  }),
}))

import { notify } from '@/lib/notify'
import { signTenantHeader } from '@/lib/tenant-header-sig'

describe('notify() — header-fallback tenant resolution requires a valid x-tenant-sig', () => {
  beforeEach(() => {
    inserts.length = 0
    requestHeaders.clear()
    vi.stubEnv('TENANT_HEADER_SIG_SECRET', 'canary-test-secret')
  })
  afterEach(() => vi.unstubAllEnvs())

  it('drops an x-tenant-id with NO x-tenant-sig companion (no tenant resolved, nothing persisted)', async () => {
    requestHeaders.set('x-tenant-id', VICTIM_TENANT)
    // no x-tenant-sig set at all

    const res = await notify({ type: 'new_lead', title: 'spoofed', message: 'attacker-controlled' })

    expect(res.success).toBe(false)
    expect(res.error).toBe('no tenant')
    expect(inserts.filter((i) => i.table === 'notifications')).toHaveLength(0)
  })

  it('drops an x-tenant-id whose x-tenant-sig does not verify (forged/garbage signature)', async () => {
    requestHeaders.set('x-tenant-id', VICTIM_TENANT)
    requestHeaders.set('x-tenant-sig', 'deadbeef'.repeat(8)) // wrong length/value, not a real HMAC

    const res = await notify({ type: 'new_lead', title: 'spoofed', message: 'attacker-controlled' })

    expect(res.success).toBe(false)
    expect(res.error).toBe('no tenant')
    expect(inserts.filter((i) => i.table === 'notifications')).toHaveLength(0)
  })

  it('trusts x-tenant-id ONLY when x-tenant-sig is a valid signature minted for that id', async () => {
    requestHeaders.set('x-tenant-id', REAL_TENANT)
    requestHeaders.set('x-tenant-sig', signTenantHeader(REAL_TENANT))

    const res = await notify({ type: 'new_lead', title: 'legit', message: 'from middleware-signed request' })

    // Tenant resolution succeeded (not the "no tenant" short-circuit) — the
    // in-app row was persisted and correctly attributed to the signed tenant.
    // (Send outcome is irrelevant here; this test mocks no real email config.)
    expect(res.error).not.toBe('no tenant')
    const notifInserts = inserts.filter((i) => i.table === 'notifications')
    expect(notifInserts).toHaveLength(1)
    expect(notifInserts[0].payload.tenant_id).toBe(REAL_TENANT)
  })

  it('rejects a victim-tenant id signed for a DIFFERENT tenant (signature/id mismatch)', async () => {
    // Attacker knows a valid signature for their own tenant but pastes the
    // victim's tenant id alongside it — the sig must be bound to the exact id.
    requestHeaders.set('x-tenant-id', VICTIM_TENANT)
    requestHeaders.set('x-tenant-sig', signTenantHeader(REAL_TENANT))

    const res = await notify({ type: 'new_lead', title: 'spoofed', message: 'mismatched sig' })

    expect(res.success).toBe(false)
    expect(res.error).toBe('no tenant')
    expect(inserts.filter((i) => i.table === 'notifications')).toHaveLength(0)
  })
})
