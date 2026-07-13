import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Regression test for brand leaks in tool handlers that email/text a client
 * directly (bypassing agent.ts's applyBrandRewrite, which only rewrites the
 * LLM's returned chat text — never a side-effect send made mid-handler).
 * Three handlers hardcoded "The NYC Maid" / "thenycmaid.com" into real
 * outbound SMS/email regardless of which tenant's conversation triggered
 * them: send_pin (SMS portal link), resend_confirmation (email subject),
 * get_invoice (email subject + footer). Proves each now derives its
 * business name/domain from the conversation's own tenant.
 */

type Row = Record<string, unknown>
let store: Record<string, Row[]>

function matchesEq(row: Row, eqs: Record<string, unknown>): boolean {
  return Object.entries(eqs).every(([k, v]) => row[k] === v)
}

function builder(table: string) {
  const eqs: Record<string, unknown> = {}
  let order: { col: string; ascending: boolean } | undefined
  let limitN: number | undefined
  let updatedFields: Row | null = null

  const rows = (): Row[] => {
    let r = (store[table] || []).filter((row) => matchesEq(row, eqs))
    if (order) {
      r = [...r].sort((a, b) => {
        const av = a[order!.col] as string
        const bv = b[order!.col] as string
        return order!.ascending ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1)
      })
    }
    if (limitN != null) r = r.slice(0, limitN)
    return r
  }

  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    in: (col: string, vals: unknown[]) => {
      eqs[col] = { __in: vals }
      return chain
    },
    neq: () => chain,
    gte: () => chain,
    order: (col: string, opts?: { ascending?: boolean }) => {
      order = { col, ascending: opts?.ascending !== false }
      return chain
    },
    limit: (n: number) => {
      limitN = n
      return chain
    },
    update: (values: Row) => {
      updatedFields = values
      return chain
    },
    single: () => {
      if (updatedFields) {
        const target = rows()
        const ids = new Set(target.map((r) => r.id))
        store[table] = (store[table] || []).map((r) => (ids.has(r.id) ? { ...r, ...updatedFields } : r))
        return Promise.resolve({ data: store[table].find((r) => ids.has(r.id)) || null, error: null })
      }
      return Promise.resolve({ data: rows()[0] || null, error: null })
    },
    then: (resolve: (v: { data: Row[]; error: null }) => unknown) => {
      if (updatedFields) {
        const target = rows()
        const ids = new Set(target.map((r) => r.id))
        store[table] = (store[table] || []).map((r) => (ids.has(r.id) ? { ...r, ...updatedFields } : r))
        return resolve({ data: store[table].filter((r) => ids.has(r.id)), error: null })
      }
      return resolve({ data: rows().filter((row) =>
        Object.entries(eqs).every(([k, v]) => {
          if (v && typeof v === 'object' && '__in' in (v as object)) return (v as { __in: unknown[] }).__in.includes(row[k])
          return true
        })
      ), error: null })
    },
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (table: string) => builder(table) },
}))

const sendEmailMock = vi.fn(async (_to: string, _subject: string, _html: string) => ({ ok: true }))
const sendSMSMock = vi.fn(async (..._args: unknown[]) => ({ ok: true }))
vi.mock('@/lib/nycmaid/email', () => ({ sendEmail: (...args: [string, string, string]) => sendEmailMock(...args) }))
vi.mock('@/lib/nycmaid/sms', () => ({ sendSMS: (...args: unknown[]) => sendSMSMock(...args) }))
vi.mock('@/lib/nycmaid/admin-contacts', () => ({ smsAdmins: vi.fn(async () => []) }))
vi.mock('@/lib/nycmaid/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/nycmaid/smart-schedule', () => ({ scoreCleanersForBooking: vi.fn(async () => []) }))
vi.mock('@/lib/anthropic-client', () => ({ resolveAnthropic: vi.fn(async () => ({})) }))

import { handleTool, EMPTY_CHECKLIST } from './core'

const NYCMAID = '00000000-0000-0000-0000-000000000001'
const TOWTRUCK = 'tenant-towtruck'

beforeEach(() => {
  sendEmailMock.mockClear()
  sendSMSMock.mockClear()
  store = {
    tenants: [
      { id: NYCMAID, name: 'The NYC Maid', domain: 'thenycmaid.com' },
      { id: TOWTRUCK, name: "Ray's Towing", domain: 'raystowing.com' },
    ],
    sms_conversations: [
      { id: 'convo-nyc', client_id: 'client-nyc', phone: '+15550001111', tenant_id: NYCMAID },
      { id: 'convo-tow', client_id: 'client-tow', phone: '+15550002222', tenant_id: TOWTRUCK },
    ],
    clients: [
      { id: 'client-nyc', tenant_id: NYCMAID, name: 'Alice', email: 'alice@example.com', phone: '+15550001111', pin: '123456' },
      { id: 'client-tow', tenant_id: TOWTRUCK, name: 'Bob', email: 'bob@example.com', phone: '+15550002222', pin: '654321' },
    ],
    bookings: [
      {
        id: 'booking-nyc', tenant_id: NYCMAID, client_id: 'client-nyc', status: 'scheduled',
        start_time: '2099-01-01T10:00:00Z', service_type: 'Standard Clean', hourly_rate: 40,
        clients: { name: 'Alice', email: 'alice@example.com', pin: '123456' },
        cleaners: { name: 'Cleaner Carl' },
      },
      {
        id: 'booking-tow', tenant_id: TOWTRUCK, client_id: 'client-tow', status: 'scheduled',
        start_time: '2099-01-01T10:00:00Z', service_type: 'Tow', hourly_rate: 80,
        clients: { name: 'Bob', email: 'bob@example.com', pin: '654321' },
        cleaners: { name: 'Driver Dan' },
      },
    ],
    payments: [
      { id: 'pay-nyc', tenant_id: NYCMAID, client_id: 'client-nyc', amount: 10000, tip: 0, method: 'card', created_at: '2026-01-01T00:00:00Z' },
      { id: 'pay-tow', tenant_id: TOWTRUCK, client_id: 'client-tow', amount: 20000, tip: 0, method: 'card', created_at: '2026-01-01T00:00:00Z' },
    ],
  }
})

function callTool(name: string, conversationId: string, input: Record<string, unknown> = {}) {
  return handleTool(name, input, conversationId, { text: '', checklist: { ...EMPTY_CHECKLIST } }, undefined)
}

describe('send_pin — SMS portal link is tenant-aware, not hardcoded thenycmaid.com', () => {
  it("uses the nycmaid tenant's own domain for its client", async () => {
    await callTool('send_pin', 'convo-nyc')
    expect(sendSMSMock).toHaveBeenCalledTimes(1)
    const body = sendSMSMock.mock.calls[0][1] as string
    expect(body).toContain('thenycmaid.com/portal')
  })

  it("uses a non-nycmaid tenant's own domain for its client, never thenycmaid.com", async () => {
    await callTool('send_pin', 'convo-tow')
    expect(sendSMSMock).toHaveBeenCalledTimes(1)
    const body = sendSMSMock.mock.calls[0][1] as string
    expect(body).toContain('raystowing.com/portal')
    expect(body).not.toContain('thenycmaid')
  })
})

describe('resend_confirmation — email subject is tenant-aware, not hardcoded "The NYC Maid"', () => {
  it("uses the nycmaid tenant's own name for its client", async () => {
    await callTool('resend_confirmation', 'convo-nyc', { booking_id: 'booking-nyc' })
    expect(sendEmailMock).toHaveBeenCalledTimes(1)
    expect(sendEmailMock.mock.calls[0][1]).toContain('The NYC Maid')
  })

  it("uses a non-nycmaid tenant's own name for its client, never the nycmaid brand", async () => {
    await callTool('resend_confirmation', 'convo-tow', { booking_id: 'booking-tow' })
    expect(sendEmailMock).toHaveBeenCalledTimes(1)
    expect(sendEmailMock.mock.calls[0][1]).toContain("Ray's Towing")
    expect(sendEmailMock.mock.calls[0][1]).not.toContain('NYC Maid')
  })
})

describe('get_invoice — email subject + footer are tenant-aware, not hardcoded "The NYC Maid — thenycmaid.com"', () => {
  it("uses the nycmaid tenant's own name for its client", async () => {
    await callTool('get_invoice', 'convo-nyc')
    expect(sendEmailMock).toHaveBeenCalledTimes(1)
    expect(sendEmailMock.mock.calls[0][1]).toContain('The NYC Maid')
    expect(sendEmailMock.mock.calls[0][2]).toContain('The NYC Maid — thenycmaid.com')
  })

  it("uses a non-nycmaid tenant's own name for its client, never the nycmaid brand", async () => {
    await callTool('get_invoice', 'convo-tow')
    expect(sendEmailMock).toHaveBeenCalledTimes(1)
    expect(sendEmailMock.mock.calls[0][1]).toContain("Ray's Towing")
    expect(sendEmailMock.mock.calls[0][1]).not.toContain('NYC Maid')
    // The receipt-body footer line this fix controls — NOT the shared
    // emailWrapper() chrome (logo/reviews link), which still hardcodes the
    // nycmaid brand for every tenant; that is a separate, out-of-scope leak
    // in src/lib/nycmaid/email-templates.ts, flagged but not fixed here.
    expect(sendEmailMock.mock.calls[0][2]).toContain("Ray's Towing — raystowing.com")
  })
})
