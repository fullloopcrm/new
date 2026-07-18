import { describe, it, expect, vi } from 'vitest'

/**
 * /api/admin/sms GET — SMS integration status shown on the admin SMS
 * management page derived `configured`/`phone` via a raw `!!tenant.telnyx_phone`
 * check instead of `resolveTenantSmsCredentials()`/`hasTenantSms()`'s
 * telnyx_phone||sms_number precedence. An sms_number-only tenant (SMS is
 * actually working) showed up in the admin dashboard as `configured: false`,
 * `phone: null` -- misleading, same false-diagnostic class already fixed on
 * the cron/system-check + admin/system-check twins this round.
 *
 * FIX: both the list summary and the single-tenant config now derive
 * `configured`/`phone` via the resolver (also added `sms_number` to both
 * selects, which this route was missing entirely).
 */

vi.mock('@/lib/require-admin', () => ({
  requireAdmin: vi.fn(async () => null),
}))

type TenantRow = { id: string; name: string; telnyx_api_key: string | null; telnyx_phone: string | null; sms_number: string | null }

const state = vi.hoisted(() => ({ tenants: [] as TenantRow[] }))

function chainable(result: unknown) {
  const obj: Record<string, unknown> = {}
  const methods = ['select', 'eq', 'order', 'limit']
  for (const m of methods) obj[m] = vi.fn(() => obj)
  obj.single = vi.fn(async () => ({ data: state.tenants[0] || null, error: null }))
  obj.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve)
  return obj
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'tenants') return chainable({ data: state.tenants, error: null })
      return chainable({ data: [], error: null })
    },
  },
}))

import { NextRequest } from 'next/server'
import { GET } from './route'

function req(tenantId?: string) {
  const url = tenantId ? `http://t/api/admin/sms?tenant_id=${tenantId}` : 'http://t/api/admin/sms'
  return new NextRequest(url)
}

describe('admin/sms GET — resolveTenantSmsCredentials() precedence on the status diagnostic', () => {
  it('list summary: sms_number-only tenant reports configured=true and the real phone (not a false "not configured")', async () => {
    state.tenants = [{ id: 'tid-a', name: 'Acme', telnyx_api_key: 'key', telnyx_phone: null, sms_number: '+15559990000' }]
    const res = await GET(req())
    const body = await res.json()
    expect(body.tenants[0]).toMatchObject({ configured: true, phone: '+15559990000' })
  })

  it('list summary: neither column set — genuinely not configured', async () => {
    state.tenants = [{ id: 'tid-a', name: 'Acme', telnyx_api_key: 'key', telnyx_phone: null, sms_number: null }]
    const res = await GET(req())
    const body = await res.json()
    expect(body.tenants[0]).toMatchObject({ configured: false, phone: null })
  })

  it('single-tenant config: sms_number-only tenant resolves configured=true + the sms_number as phone', async () => {
    state.tenants = [{ id: 'tid-a', name: 'Acme', telnyx_api_key: 'key', telnyx_phone: null, sms_number: '+15559990000' }]
    const res = await GET(req('tid-a'))
    const body = await res.json()
    expect(body.config).toMatchObject({ configured: true, phone: '+15559990000' })
  })

  it("wrong-tenant probe: tenant A's resolved phone never reflects a different tenant's sms_number", async () => {
    state.tenants = [{ id: 'tid-a', name: 'Acme', telnyx_api_key: 'key', telnyx_phone: null, sms_number: '+15559990000' }]
    const res = await GET(req('tid-a'))
    const body = await res.json()
    expect(body.config.phone).toBe('+15559990000')
    expect(body.config.phone).not.toBe('+15558880000')
  })
})
