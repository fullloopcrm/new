/**
 * Regression tests for the one-time ComHub lead follow-up cron (Jeff,
 * 2026-08-07): "they reached out, we reviewed it, they didn't respond" ->
 * one nudge, ever, 24h+ after the thread went quiet.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

const h = vi.hoisted(() => {
  const store: Record<string, any[]> = {}
  const table = (n: string) => (store[n] ||= [])
  const reset = () => { for (const k of Object.keys(store)) delete store[k] }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function builder(name: string): any {
    const preds: Array<(r: any) => boolean> = []
    let patch: any = null
    let mode: 'select' | 'update' = 'select'
    let sortCol: string | null = null
    let sortAsc = true
    let lim: number | null = null
    const match = () => {
      let rows = table(name).filter((r) => preds.every((p) => p(r)))
      if (sortCol) rows = [...rows].sort((a, b) => (sortAsc ? 1 : -1) * (new Date(a[sortCol!]).getTime() - new Date(b[sortCol!]).getTime()))
      if (lim != null) rows = rows.slice(0, lim)
      return rows
    }
    const api: any = {
      select: () => api,
      eq: (c: string, v: unknown) => (preds.push((r) => r[c] === v), api),
      in: (c: string, vs: unknown[]) => (preds.push((r) => vs.includes(r[c])), api),
      is: (c: string, v: null) => (preds.push((r) => (v === null ? r[c] == null : r[c] === v)), api),
      order: (c: string, opts?: { ascending?: boolean }) => ((sortCol = c), (sortAsc = opts?.ascending ?? true), api),
      limit: (n: number) => ((lim = n), api),
      update: (p: any) => ((patch = p), (mode = 'update'), api),
      maybeSingle: () => Promise.resolve({ data: match()[0] ?? null, error: null }),
      single: () => Promise.resolve({ data: match()[0] ?? null, error: null }),
      then: (onF: any, onR: any) => {
        if (mode === 'update') {
          const rows = match()
          for (const r of rows) Object.assign(r, patch)
          return Promise.resolve({ data: rows, error: null }).then(onF, onR)
        }
        return Promise.resolve({ data: match(), error: null }).then(onF, onR)
      },
    }
    return api
  }

  const admin = { from: (n: string) => builder(n) }
  const sendComhubMessage = vi.fn(async () => ({ status: 200, json: { ok: true } }))
  return { store, admin, reset, sendComhubMessage }
})

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: h.admin }))
vi.mock('@/lib/comhub-send', () => ({ sendComhubMessage: h.sendComhubMessage }))
vi.mock('@/lib/cron-auth', () => ({ verifyCronSecret: () => null }))
vi.mock('@/lib/comhub-contact-resolve', () => ({ isPlaceholderName: () => false }))

import { GET } from './route'

const NYCMAID = '00000000-0000-0000-0000-000000000001'
const FLORIDA = '56490a6b-820c-49e6-8c14-cb4e54ffcb06'
const OTHER_TENANT = 'some-other-tenant'
const now = new Date('2026-08-07T18:00:00Z')
const hoursAgo = (h: number) => new Date(now.getTime() - h * 60 * 60 * 1000).toISOString()

function seedTenant(id: string) {
  h.store.tenants ||= []
  h.store.tenants.push({ id, name: 'Test Tenant', telnyx_api_key: 'k', telnyx_phone: '+15550001111', resend_api_key: 'r', email_from: 'a@b.com' })
}

function seedThread(overrides: Partial<{ id: string; tenant_id: string; contact_id: string; channel: string; last_message_at: string; archived_at: string | null }>) {
  h.store.comhub_threads ||= []
  const row = { id: `thread-${h.store.comhub_threads.length + 1}`, channel: 'sms', archived_at: null, ...overrides }
  h.store.comhub_threads.push(row)
  return row
}

function seedMessage(overrides: Partial<{ tenant_id: string; thread_id: string; direction: string; read_at: string | null; created_at: string }>) {
  h.store.comhub_messages ||= []
  h.store.comhub_messages.push({ direction: 'in', read_at: null, created_at: now.toISOString(), ...overrides })
}

function seedContact(overrides: Partial<{ id: string; tenant_id: string; name: string | null; phone: string | null; email: string | null; client_id: string | null; tag: string; followup_sent_at: string | null }>) {
  h.store.comhub_contacts ||= []
  const row = { id: `contact-${h.store.comhub_contacts.length + 1}`, name: 'Jane Lead', phone: '+15551234567', email: null, client_id: null, tag: 'lead', followup_sent_at: null, ...overrides }
  h.store.comhub_contacts.push(row)
  return row
}

beforeEach(() => {
  h.reset()
  vi.clearAllMocks()
  vi.useFakeTimers()
  vi.setSystemTime(now)
})

describe('comhub-lead-followup cron', () => {
  it('sends the nudge for a reviewed, 24h-quiet, never-converted contact', async () => {
    seedTenant(NYCMAID)
    const contact = seedContact({ tenant_id: NYCMAID })
    const thread = seedThread({ tenant_id: NYCMAID, contact_id: contact.id, last_message_at: hoursAgo(30) })
    seedMessage({ tenant_id: NYCMAID, thread_id: thread.id, direction: 'in', read_at: hoursAgo(29), created_at: hoursAgo(30) })

    const res = await GET(new Request('http://x'))
    const json = await res.json()

    expect(json.sent).toBe(1)
    expect(h.sendComhubMessage).toHaveBeenCalledTimes(1)
    const call = h.sendComhubMessage.mock.calls[0] as any
    expect(call[0]).toBe(NYCMAID)
    expect(call[2].channel).toBe('sms')
    expect(call[2].body).toMatch(/just following up/i)
    expect((h.store.comhub_contacts.find((c: any) => c.id === contact.id)).followup_sent_at).toBeTruthy()
  })

  it('does NOT send before 24 hours have passed', async () => {
    seedTenant(NYCMAID)
    const contact = seedContact({ tenant_id: NYCMAID })
    const thread = seedThread({ tenant_id: NYCMAID, contact_id: contact.id, last_message_at: hoursAgo(5) })
    seedMessage({ tenant_id: NYCMAID, thread_id: thread.id, direction: 'in', read_at: hoursAgo(4), created_at: hoursAgo(5) })

    const res = await GET(new Request('http://x'))
    expect((await res.json()).sent).toBe(0)
    expect(h.sendComhubMessage).not.toHaveBeenCalled()
  })

  it('does NOT send while their inbound message is still unread ("not reviewed yet")', async () => {
    seedTenant(NYCMAID)
    const contact = seedContact({ tenant_id: NYCMAID })
    const thread = seedThread({ tenant_id: NYCMAID, contact_id: contact.id, last_message_at: hoursAgo(48) })
    seedMessage({ tenant_id: NYCMAID, thread_id: thread.id, direction: 'in', read_at: null, created_at: hoursAgo(48) })

    const res = await GET(new Request('http://x'))
    expect((await res.json()).sent).toBe(0)
    expect(h.sendComhubMessage).not.toHaveBeenCalled()
  })

  it('does NOT re-send to a contact already followed up (idempotency)', async () => {
    seedTenant(NYCMAID)
    const contact = seedContact({ tenant_id: NYCMAID, followup_sent_at: hoursAgo(2) })
    const thread = seedThread({ tenant_id: NYCMAID, contact_id: contact.id, last_message_at: hoursAgo(48) })
    seedMessage({ tenant_id: NYCMAID, thread_id: thread.id, direction: 'in', read_at: hoursAgo(47), created_at: hoursAgo(48) })

    const res = await GET(new Request('http://x'))
    expect((await res.json()).sent).toBe(0)
    expect(h.sendComhubMessage).not.toHaveBeenCalled()
  })

  it('does NOT send once they became a client (client_id set)', async () => {
    seedTenant(NYCMAID)
    // client_id is set -> the `.is('client_id', null)` filter excludes them entirely
    seedContact({ tenant_id: NYCMAID, client_id: 'client-1' })

    const res = await GET(new Request('http://x'))
    expect((await res.json()).sent).toBe(0)
    expect(h.sendComhubMessage).not.toHaveBeenCalled()
  })

  it('skips a tenant not on the NYC Maid / Florida Maid allowlist', async () => {
    seedTenant(OTHER_TENANT)
    const contact = seedContact({ tenant_id: OTHER_TENANT })
    const thread = seedThread({ tenant_id: OTHER_TENANT, contact_id: contact.id, last_message_at: hoursAgo(48) })
    seedMessage({ tenant_id: OTHER_TENANT, thread_id: thread.id, direction: 'in', read_at: hoursAgo(47), created_at: hoursAgo(48) })

    const res = await GET(new Request('http://x'))
    expect((await res.json()).sent).toBe(0)
    expect(h.sendComhubMessage).not.toHaveBeenCalled()
  })

  it('works for Florida Maid too', async () => {
    seedTenant(FLORIDA)
    const contact = seedContact({ tenant_id: FLORIDA })
    const thread = seedThread({ tenant_id: FLORIDA, contact_id: contact.id, last_message_at: hoursAgo(48) })
    seedMessage({ tenant_id: FLORIDA, thread_id: thread.id, direction: 'in', read_at: hoursAgo(47), created_at: hoursAgo(48) })

    const res = await GET(new Request('http://x'))
    expect((await res.json()).sent).toBe(1)
  })

  it('skips a contact tagged spam/vendor/client (not lead/potential_lead)', async () => {
    seedTenant(NYCMAID)
    const contact = seedContact({ tenant_id: NYCMAID, tag: 'spam' })
    const thread = seedThread({ tenant_id: NYCMAID, contact_id: contact.id, last_message_at: hoursAgo(48) })
    seedMessage({ tenant_id: NYCMAID, thread_id: thread.id, direction: 'in', read_at: hoursAgo(47), created_at: hoursAgo(48) })

    const res = await GET(new Request('http://x'))
    expect((await res.json()).sent).toBe(0)
    expect(h.sendComhubMessage).not.toHaveBeenCalled()
  })

  it('is fine sending when WE sent the last message and they went quiet', async () => {
    seedTenant(NYCMAID)
    const contact = seedContact({ tenant_id: NYCMAID })
    const thread = seedThread({ tenant_id: NYCMAID, contact_id: contact.id, last_message_at: hoursAgo(30) })
    seedMessage({ tenant_id: NYCMAID, thread_id: thread.id, direction: 'out', read_at: null, created_at: hoursAgo(30) })

    const res = await GET(new Request('http://x'))
    expect((await res.json()).sent).toBe(1)
  })

  it('skips an archived thread', async () => {
    seedTenant(NYCMAID)
    const contact = seedContact({ tenant_id: NYCMAID })
    seedThread({ tenant_id: NYCMAID, contact_id: contact.id, last_message_at: hoursAgo(48), archived_at: hoursAgo(1) })

    const res = await GET(new Request('http://x'))
    expect((await res.json()).sent).toBe(0)
    expect(h.sendComhubMessage).not.toHaveBeenCalled()
  })
})
