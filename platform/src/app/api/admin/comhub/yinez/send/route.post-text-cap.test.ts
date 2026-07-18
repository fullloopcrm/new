import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * WITNESS — POST /api/admin/comhub/yinez/send stored `body` raw into
 * comhub_messages and forwarded it uncapped to the Selena AI call, same
 * class as admin/comhub/send's body gap. Worse here:
 * `(payload?.body || '').trim()` threw an uncaught TypeError on any truthy
 * non-string body (objects/numbers lack .trim()) instead of a clean 400.
 *
 * FIXED: capString(body, 5000) — truncate rather than reject; non-string
 * or empty body coerces to null and is rejected by the existing
 * "body required" check.
 */

const TENANT_A = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (t: string) => holder.from!(t),
    rpc: async (fn: string) => {
      if (fn === 'comhub_get_or_create_contact_by_phone') return { data: 'contact-yinez', error: null }
      if (fn === 'comhub_get_or_create_thread') return { data: 'thread-yinez', error: null }
      return { data: null, error: { message: 'unexpected rpc' } }
    },
  },
}))
vi.mock('@/lib/require-admin', () => ({ requireAdmin: vi.fn(async () => null) }))
vi.mock('@/lib/tenant', () => ({ getCurrentTenantId: vi.fn(async () => TENANT_A) }))
vi.mock('@/lib/selena/agent', () => ({
  askSelena: vi.fn(async (_channel: string, message: string) => ({
    text: `echo:${message.length}`,
    toolsCalled: [],
  })),
}))

import { askSelena } from '@/lib/selena/agent'
import { POST } from './route'

function seed() {
  return {
    comhub_messages: [] as Record<string, unknown>[],
    comhub_threads: [{ id: 'thread-yinez', tenant_id: TENANT_A }],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  vi.mocked(askSelena).mockClear()
})

function req(body: Record<string, unknown>) {
  return new NextRequest('http://t/api/admin/comhub/yinez/send', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('admin/comhub/yinez/send POST — body cap', () => {
  it('LOCK: an oversized body is truncated to 5000 chars before storage and the AI call', async () => {
    const oversized = 'x'.repeat(6000)
    const res = await POST(req({ body: oversized }))
    expect(res.status).toBe(200)
    expect(vi.mocked(askSelena).mock.calls[0][1]).toHaveLength(5000)
    const stored = h.seed.comhub_messages.find((m) => m.direction === 'out')
    expect(stored?.body).toHaveLength(5000)
  })

  it('CONTROL: a non-string body is rejected (400) instead of crashing on .trim()', async () => {
    const res = await POST(req({ body: { evil: 'payload' } }))
    expect(res.status).toBe(400)
    expect(askSelena).not.toHaveBeenCalled()
    expect(h.seed.comhub_messages.length).toBe(0)
  })

  it('CONTROL: a numeric body is rejected (400) instead of crashing on .trim()', async () => {
    const res = await POST(req({ body: 12345 }))
    expect(res.status).toBe(400)
    expect(askSelena).not.toHaveBeenCalled()
  })

  it('CONTROL: a whitespace-only body is rejected', async () => {
    const res = await POST(req({ body: '   ' }))
    expect(res.status).toBe(400)
    expect(askSelena).not.toHaveBeenCalled()
  })

  it('CONTROL: a normal-length body passes through untouched', async () => {
    const res = await POST(req({ body: 'What jobs are on today?' }))
    expect(res.status).toBe(200)
    expect(vi.mocked(askSelena).mock.calls[0][1]).toBe('What jobs are on today?')
  })
})
