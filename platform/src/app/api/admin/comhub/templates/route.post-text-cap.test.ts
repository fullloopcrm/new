import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * WITNESS — POST /api/admin/comhub/templates stored `name`/`body`/`channel`/
 * `hotkey` raw into comhub_templates with no type/length cap, same class as
 * admin/comhub/channels' name/description gap. Worse here: `payload.name.trim()`
 * was called directly on the raw value (the `!payload?.name` check only catches
 * falsy values, not e.g. a number), so a non-string name would throw an
 * uncaught TypeError (500) instead of a clean 400 — same crash class as
 * admin/comhub/yinez/send's `.body.trim()`.
 *
 * FIXED: capString(name, 200) / capString(body, 5000) / capString(channel, 20)
 * / capString(hotkey, 20) — truncate rather than reject; non-string or empty
 * name/body coerces to null and is rejected by the existing "name and body
 * required" check.
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
  return new NextRequest('http://t/api/admin/comhub/templates', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('admin/comhub/templates POST — name/body/channel/hotkey cap', () => {
  it('LOCK: an oversized name is truncated to 200 chars before insert', async () => {
    const oversized = 'x'.repeat(300)
    const res = await POST(req({ name: oversized, body: 'hi' }))
    expect(res.status).toBe(200)
    const insert = h.capture.inserts.find((i) => i.table === 'comhub_templates')
    expect(insert?.rows[0].name).toHaveLength(200)
    expect(insert?.rows[0].name).toBe(oversized.slice(0, 200))
  })

  it('LOCK: an oversized body is truncated to 5000 chars before insert', async () => {
    const oversized = 'z'.repeat(6000)
    const res = await POST(req({ name: 'Greeting', body: oversized }))
    expect(res.status).toBe(200)
    const insert = h.capture.inserts.find((i) => i.table === 'comhub_templates')
    expect(insert?.rows[0].body).toHaveLength(5000)
    expect(insert?.rows[0].body).toBe(oversized.slice(0, 5000))
  })

  it('CONTROL: a non-string name is rejected (400) instead of crashing on .trim()', async () => {
    const res = await POST(req({ name: 12345, body: 'hi' }))
    expect(res.status).toBe(400)
    expect(h.capture.inserts.find((i) => i.table === 'comhub_templates')).toBeUndefined()
  })

  it('CONTROL: a non-string body is rejected (400) instead of being stored raw', async () => {
    const res = await POST(req({ name: 'Greeting', body: { evil: 'payload' } }))
    expect(res.status).toBe(400)
    expect(h.capture.inserts.find((i) => i.table === 'comhub_templates')).toBeUndefined()
  })

  it('CONTROL: an oversized channel/hotkey is truncated to 20 chars before insert', async () => {
    const oversizedChannel = 'a'.repeat(30)
    const oversizedHotkey = 'b'.repeat(30)
    const res = await POST(req({ name: 'Greeting', body: 'hi', channel: oversizedChannel, hotkey: oversizedHotkey }))
    expect(res.status).toBe(200)
    const insert = h.capture.inserts.find((i) => i.table === 'comhub_templates')
    expect(insert?.rows[0].channel).toHaveLength(20)
    expect(insert?.rows[0].hotkey).toHaveLength(20)
  })

  it('CONTROL: a normal-length name/body passes through untouched', async () => {
    const res = await POST(req({ name: 'Greeting', body: 'Hi there!', channel: 'sms' }))
    expect(res.status).toBe(200)
    const insert = h.capture.inserts.find((i) => i.table === 'comhub_templates')
    expect(insert?.rows[0].name).toBe('Greeting')
    expect(insert?.rows[0].body).toBe('Hi there!')
    expect(insert?.rows[0].channel).toBe('sms')
  })
})
