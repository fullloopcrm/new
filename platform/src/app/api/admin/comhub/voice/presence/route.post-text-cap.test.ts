import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * WITNESS — POST /api/admin/comhub/voice/presence stored `sip_username`/
 * `sip_address`/`device_label`/`user_agent` raw into comhub_admin_presence
 * with no type/length cap, same class as admin/comhub/templates' name/body
 * gap.
 *
 * FIXED: capString(sip_username,100) / capString(sip_address,200) /
 * capString(device_label,100) / capString(user_agent,300) — truncate rather
 * than reject; non-string/empty sip_username is rejected (400), matching the
 * existing "sip_username required" check.
 */

const TENANT_A = 'tid-a'
const ADMIN_ID = 'admin-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('@/lib/require-admin', () => ({ requireAdmin: vi.fn(async () => null) }))
vi.mock('@/lib/tenant', () => ({ getCurrentTenantId: vi.fn(async () => TENANT_A) }))
vi.mock('@/lib/admin-member', () => ({ getActiveAdminMemberId: vi.fn(async () => ADMIN_ID) }))

import { POST } from './route'

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness({})
  holder.from = h.from
})

function req(body: Record<string, unknown>) {
  return new NextRequest('http://t/api/admin/comhub/voice/presence', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('admin/comhub/voice/presence POST — sip_username/sip_address/device_label/user_agent cap', () => {
  it('LOCK: an oversized sip_username is truncated to 100 chars before upsert', async () => {
    const oversized = 'x'.repeat(200)
    const res = await POST(req({ sip_username: oversized }))
    expect(res.status).toBe(200)
    const insert = h.capture.inserts.find((i) => i.table === 'comhub_admin_presence')
    expect(insert?.rows[0].sip_username).toHaveLength(100)
  })

  it('LOCK: an oversized sip_address/device_label/user_agent is truncated before upsert', async () => {
    const res = await POST(req({
      sip_username: 'user1',
      sip_address: 'a'.repeat(300),
      device_label: 'b'.repeat(200),
      user_agent: 'c'.repeat(500),
    }))
    expect(res.status).toBe(200)
    const insert = h.capture.inserts.find((i) => i.table === 'comhub_admin_presence')
    expect(insert?.rows[0].sip_address).toHaveLength(200)
    expect(insert?.rows[0].device_label).toHaveLength(100)
    expect(insert?.rows[0].user_agent).toHaveLength(300)
  })

  it('CONTROL: a non-string sip_username is rejected (400) instead of being stored raw', async () => {
    const res = await POST(req({ sip_username: 12345 }))
    expect(res.status).toBe(400)
    expect(h.capture.inserts.find((i) => i.table === 'comhub_admin_presence')).toBeUndefined()
  })

  it('CONTROL: a missing sip_address falls back to the default sip: URI instead of storing null', async () => {
    const res = await POST(req({ sip_username: 'user1' }))
    expect(res.status).toBe(200)
    const insert = h.capture.inserts.find((i) => i.table === 'comhub_admin_presence')
    expect(insert?.rows[0].sip_address).toBe('sip:user1@sip.telnyx.com')
  })

  it('CONTROL: a normal-length sip_username/device_label passes through untouched', async () => {
    const res = await POST(req({ sip_username: 'user1', device_label: "Jeff's iPhone" }))
    expect(res.status).toBe(200)
    const insert = h.capture.inserts.find((i) => i.table === 'comhub_admin_presence')
    expect(insert?.rows[0].sip_username).toBe('user1')
    expect(insert?.rows[0].device_label).toBe("Jeff's iPhone")
  })
})
