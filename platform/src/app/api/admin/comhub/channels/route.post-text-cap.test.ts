import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * WITNESS — POST /api/admin/comhub/channels stored `name`/`description` raw
 * into `comhub_threads` with no type/length cap, same class as
 * comhub/messages/[id]/flag's flagged_reason (capString, src/lib/validate.ts).
 *
 * FIXED: capString(name, 200), capString(description, 2000) — truncate
 * rather than reject; non-string coerces to null (description) or falls
 * back to the default `#slug` name.
 */

const TENANT_A = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('@/lib/require-admin', () => ({ requireAdmin: vi.fn(async () => null) }))
vi.mock('@/lib/tenant', () => ({ getCurrentTenantId: vi.fn(async () => TENANT_A) }))

import { POST } from './route'

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness({})
  holder.from = h.from
})

function req(body: Record<string, unknown>) {
  return new NextRequest('http://t/api/admin/comhub/channels', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('admin/comhub/channels POST — name/description cap', () => {
  it('LOCK: an oversized name is truncated to 200 chars before insert', async () => {
    const oversized = 'x'.repeat(300)
    const res = await POST(req({ slug: 'crew-chat', name: oversized }))
    expect(res.status).toBe(200)
    const insert = h.capture.inserts.find((i) => i.table === 'comhub_threads')
    expect(insert?.rows[0].name).toHaveLength(200)
    expect(insert?.rows[0].name).toBe(oversized.slice(0, 200))
  })

  it('LOCK: an oversized description is truncated to 2000 chars before insert', async () => {
    const oversized = 'z'.repeat(2500)
    const res = await POST(req({ slug: 'crew-chat', description: oversized }))
    expect(res.status).toBe(200)
    const insert = h.capture.inserts.find((i) => i.table === 'comhub_threads')
    expect(insert?.rows[0].description).toHaveLength(2000)
  })

  it('CONTROL: a non-string name falls back to the default #slug name instead of crashing', async () => {
    const res = await POST(req({ slug: 'crew-chat', name: { evil: 'payload' } }))
    expect(res.status).toBe(200)
    const insert = h.capture.inserts.find((i) => i.table === 'comhub_threads')
    expect(insert?.rows[0].name).toBe('#crew-chat')
  })

  it('CONTROL: a normal-length name/description passes through untouched', async () => {
    const res = await POST(req({ slug: 'crew-chat', name: 'Crew Chat', description: 'General crew channel' }))
    expect(res.status).toBe(200)
    const insert = h.capture.inserts.find((i) => i.table === 'comhub_threads')
    expect(insert?.rows[0].name).toBe('Crew Chat')
    expect(insert?.rows[0].description).toBe('General crew channel')
  })
})
