import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * handleResendConfirmation and handleGetInvoice build their own ad-hoc HTML
 * emails (not one of the escapeHtml-wrapped templates in
 * lib/email-templates.ts / lib/messaging/shell.ts) and send them to a real
 * client's inbox. client.name/booking.service_type are reachable via the
 * public unauthenticated /api/client/book (same class already fixed in
 * campaigns/[id]/send + email-templates.ts, per commit 448d4d51); tenant.name
 * is tenant self-serve free text. Neither was escaped in this file.
 */

const TENANT = 'tenant-a'
const CLIENT = 'client-a'
const PAYLOAD = `<img src=x onerror=alert(1)>`

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}

function chain(table: string) {
  const filters: Array<(r: Row) => boolean> = []
  const rowsOf = (): Row[] => DB[table] || (DB[table] = [])
  const matched = (): Row[] => rowsOf().filter((r) => filters.every((f) => f(r)))
  const c: Record<string, unknown> = {
    select: () => c,
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    in: (col: string, vals: unknown[]) => { filters.push((r) => vals.includes(r[col])); return c },
    gte: () => c,
    lte: () => c,
    order: () => c,
    limit: () => c,
    single: async () => ({ data: matched()[0] ?? null, error: matched()[0] ? null : { message: 'not found' } }),
    then: (resolve: (v: { data: unknown; error: null }) => unknown) => Promise.resolve({ data: matched(), error: null }).then(resolve),
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(() => Promise.resolve()) }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(() => Promise.resolve()) }))

const emailSends: Array<{ to: string; subject: string; html: string }> = []
vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn(async (a: { to: string; subject: string; html: string }) => { emailSends.push(a); return {} }),
}))

import { handleResendConfirmation, handleGetInvoice } from './selena-legacy-handlers'

beforeEach(() => {
  for (const k of Object.keys(DB)) delete DB[k]
  emailSends.length = 0
})

describe('handleResendConfirmation — HTML injection via booking/client/tenant fields', () => {
  it('escapes client.name, service_type, team member name, and tenant.name before emailing the client', async () => {
    DB.sms_conversations = [{ id: 'convo-1', client_id: CLIENT }]
    DB.bookings = [{
      id: 'bk-1', tenant_id: TENANT, client_id: CLIENT, status: 'scheduled',
      start_time: '2026-08-01T14:00:00', service_type: PAYLOAD, hourly_rate: 60,
      clients: { name: PAYLOAD, email: 'client@example.com', pin: '1234' },
      team_members: { name: PAYLOAD },
      tenants: { name: PAYLOAD },
    }]

    const out = await handleResendConfirmation(TENANT, { booking_id: 'bk-1' }, 'convo-1')
    expect(JSON.parse(out).success).toBe(true)

    expect(emailSends).toHaveLength(1)
    const html = emailSends[0].html
    expect(html).not.toContain(PAYLOAD)
    expect(html).not.toContain('<img')
    expect(html).toContain('&lt;img')
  })
})

describe('handleGetInvoice — HTML injection via tenant.name / payment.method', () => {
  it('escapes tenant.name and payment.method before emailing the client', async () => {
    DB.sms_conversations = [{ id: 'convo-1', client_id: CLIENT }]
    DB.clients = [{ id: CLIENT, tenant_id: TENANT, name: 'Jane', email: 'client@example.com' }]
    DB.payments = [{
      tenant_id: TENANT, client_id: CLIENT, amount_cents: 10000, tip_cents: 0,
      method: PAYLOAD, created_at: '2026-08-01T00:00:00Z', booking_id: 'bk-1',
    }]
    DB.tenants = [{ id: TENANT, name: PAYLOAD }]

    const out = await handleGetInvoice(TENANT, {}, 'convo-1')
    expect(JSON.parse(out).success).toBe(true)

    expect(emailSends).toHaveLength(1)
    const html = emailSends[0].html
    expect(html).not.toContain(PAYLOAD)
    expect(html).not.toContain('<img')
    expect(html).toContain('&lt;img')
  })
})
