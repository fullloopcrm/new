import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * cron/rating-prompt — cross-tenant admin-alert leak (wrong-tenant probe).
 *
 * BUG (fixed here): the CAP-exceeded bulk-block alert imported emailAdmins/
 * smsAdmins from '@/lib/nycmaid/admin-contacts' — the legacy, un-tenant-scoped
 * helper that sends to whatever is in the global `admin_users` table (NYC
 * Maid's own admin accounts), with no `isNycMaid()` gate (contrast
 * cron/sales-follow-ups.ts, which gates the exact same legacy helper). Any
 * OTHER tenant that tripped the CAP would have its tenant name + booking
 * volume disclosed via email/SMS to NYC Maid's admins.
 *
 * FIX: use the tenant-aware '@/lib/admin-contacts' (emailAdmins(tenantId, ...),
 * smsAdmins(tenantId, ...)), which resolves each tenant's own admins.
 */

process.env.CRON_SECRET = 'test-cron-secret'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('@/lib/nycmaid/client-contacts', () => ({ sendClientSMS: vi.fn(async () => ({ sent: 1, skipped: 0 })) }))
vi.mock('@/lib/messaging/client-sms', () => ({
  clientSmsTemplatesFor: vi.fn(async () => ({ ratingQ1: () => 'How was your service today?' })),
}))

const tenantScopedCalls = vi.hoisted(() => ({ email: [] as unknown[], sms: [] as unknown[] }))
vi.mock('@/lib/admin-contacts', () => ({
  emailAdmins: vi.fn(async (...args: unknown[]) => { tenantScopedCalls.email.push(args) }),
  smsAdmins: vi.fn(async (...args: unknown[]) => { tenantScopedCalls.sms.push(args) }),
}))

const legacyGlobalCalls = vi.hoisted(() => ({ email: [] as unknown[], sms: [] as unknown[] }))
vi.mock('@/lib/nycmaid/admin-contacts', () => ({
  emailAdmins: vi.fn(async (...args: unknown[]) => { legacyGlobalCalls.email.push(args) }),
  smsAdmins: vi.fn(async (...args: unknown[]) => { legacyGlobalCalls.sms.push(args) }),
}))

import { GET } from './route'

const CAP = 10
const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

function dueBooking(id: string, tenantId: string) {
  return {
    id,
    tenant_id: tenantId,
    client_id: `client-${id}`,
    cleaner_id: 'cleaner-1',
    start_time: oneHourAgo,
    status: 'completed',
    check_out_time: oneHourAgo,
    rating_prompt_sent_at: null,
    clients: { name: `Client ${id}` },
    cleaners: { name: 'Cleaner' },
  }
}

let h: Harness
beforeEach(() => {
  tenantScopedCalls.email.length = 0
  tenantScopedCalls.sms.length = 0
  legacyGlobalCalls.email.length = 0
  legacyGlobalCalls.sms.length = 0

  const overCapBookings = Array.from({ length: CAP + 1 }, (_, i) => dueBooking(`b${i}`, 'tenant-other'))

  h = createTenantDbHarness({
    tenants: [
      { id: 'tenant-other', name: 'Some Other Tenant', status: 'active' },
    ],
    bookings: overCapBookings,
  })
  holder.from = h.from
})

function req() {
  return new Request('http://t/api/cron/rating-prompt', {
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
  })
}

describe('cron/rating-prompt — CAP-exceeded admin alert stays tenant-scoped', () => {
  it('wrong-recipient probe: the legacy nycmaid-global admin-contacts helper is never invoked', async () => {
    const res = await GET(req())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.capped).toBe(true)

    expect(legacyGlobalCalls.email).toHaveLength(0)
    expect(legacyGlobalCalls.sms).toHaveLength(0)
  })

  it('positive control: the tenant-scoped admin-contacts helper is invoked with that tenant\'s id', async () => {
    await GET(req())

    expect(tenantScopedCalls.email).toHaveLength(1)
    expect(tenantScopedCalls.sms).toHaveLength(1)
    expect((tenantScopedCalls.email[0] as unknown[])[0]).toBe('tenant-other')
    expect((tenantScopedCalls.sms[0] as unknown[])[0]).toBe('tenant-other')

    const [, subject, html] = tenantScopedCalls.email[0] as [string, string, string]
    expect(subject).toContain('Some Other Tenant')
    expect(html).toContain('Some Other Tenant')
  })
})
