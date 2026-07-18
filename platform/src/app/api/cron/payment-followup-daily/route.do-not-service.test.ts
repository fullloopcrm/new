import { describe, it, expect, vi } from 'vitest'

/**
 * GET /api/cron/payment-followup-daily texted the client directly with no
 * sms_consent or do_not_service check -- the same class fixed for the
 * booking-lifecycle SMS pipeline this session (89c2cdd9/14fa0888). Per this
 * route's own docstring, today it only chases nycmaid (the only tenant with
 * both a Telnyx key and a payment_link), and it bypasses the nycmaid-legacy
 * getClientContacts() fan-out helper entirely (calls sendSMS() directly), so
 * even that tenant's DNS-flagged / opted-out clients still got a thrice-daily
 * payment-balance text.
 */

const TENANT = 'tenant-A'

type Row = Record<string, unknown>

function naive(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}
const recentEndTime = naive(new Date(Date.now() - 24 * 60 * 60 * 1000))

const tenants: Row[] = [
  { id: TENANT, name: 'Acme Cleaning', telnyx_api_key: 'tk_test', telnyx_phone: '+15551234567', payment_link: 'https://pay.example/acme', owner_phone: null, phone: null, status: 'active' },
]

const bookings: Row[] = [
  { id: 'bk-dns', tenant_id: TENANT, client_id: 'c-dns', price: 12000, end_time: recentEndTime, payment_status: 'unpaid', payment_method: null, status: 'completed', clients: { name: 'Dana', phone: '+15559990001', sms_consent: true, do_not_service: true } },
  { id: 'bk-optout', tenant_id: TENANT, client_id: 'c-optout', price: 9000, end_time: recentEndTime, payment_status: 'unpaid', payment_method: null, status: 'completed', clients: { name: 'Oscar', phone: '+15559990002', sms_consent: false, do_not_service: false } },
  { id: 'bk-ok', tenant_id: TENANT, client_id: 'c-ok', price: 5000, end_time: recentEndTime, payment_status: 'unpaid', payment_method: null, status: 'completed', clients: { name: 'Olivia', phone: '+15559990003', sms_consent: true, do_not_service: false } },
]

const smsLogs: Row[] = []

const sendSMS = vi.fn(async (_args: { to: string; body: string }) => ({}))
const notify = vi.fn(async (_args: Record<string, unknown>) => ({}))

vi.mock('@/lib/sms', () => ({ sendSMS: (args: { to: string; body: string }) => sendSMS(args) }))
vi.mock('@/lib/notify', () => ({ notify: (args: Record<string, unknown>) => notify(args) }))

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const filters: Array<{ col: string; op: string; val: unknown }> = []
    let countMode = false
    const c: Record<string, unknown> = {
      select: (_cols: unknown, opts?: { count?: string }) => { if (opts?.count) countMode = true; return c },
      eq: (col: string, val: unknown) => { filters.push({ col, op: 'eq', val }); return c },
      in: (col: string, vals: unknown[]) => { filters.push({ col, op: 'in', val: vals }); return c },
      not: (col: string, op: string, val: unknown) => { filters.push({ col, op: `not-${op}`, val }); return c },
      is: (col: string, val: unknown) => { filters.push({ col, op: 'is', val }); return c },
      gt: (col: string, val: unknown) => { filters.push({ col, op: 'gt', val }); return c },
      gte: (col: string, val: unknown) => { filters.push({ col, op: 'gte', val }); return c },
      insert: () => Promise.resolve({ error: null }),
      then: (resolve: (v: { data?: unknown; count?: number; error: null }) => unknown) => {
        const source = table === 'tenants' ? tenants : table === 'bookings' ? bookings : table === 'sms_logs' ? smsLogs : []
        const rows = source.filter((row) =>
          filters.every((f) => {
            const rowVal = row[f.col]
            if (f.op === 'eq') return rowVal === f.val
            if (f.op === 'in') return Array.isArray(f.val) && f.val.includes(rowVal)
            if (f.op === 'is') return rowVal === f.val
            if (f.op === 'gt') return rowVal != null && (rowVal as number) > (f.val as number)
            if (f.op === 'gte') return rowVal != null && String(rowVal) >= String(f.val)
            if (f.op === 'not-is') return rowVal !== f.val
            if (f.op === 'not-in') {
              const excluded = String(f.val).replace(/[()"]/g, '').split(',')
              return !excluded.includes(String(rowVal))
            }
            return true
          }),
        )
        const payload = countMode ? { count: rows.length, error: null } : { data: rows, error: null }
        return Promise.resolve(payload).then(resolve)
      },
    }
    return c
  }
  const client = { from: (table: string) => chain(table) }
  return { supabaseAdmin: client }
})

import { GET } from './route'

describe('GET /api/cron/payment-followup-daily — do_not_service / sms_consent gate', () => {
  it('does not text a client flagged do_not_service', async () => {
    sendSMS.mockClear()
    await GET(new Request('https://app.fullloop.example/api/cron/payment-followup-daily?force=1', {
      headers: { 'x-vercel-cron': '1' },
    }))
    const texted = sendSMS.mock.calls.map((c) => c[0].to)
    expect(texted).not.toContain('+15559990001')
  })

  it('does not text a client who opted out of sms_consent', async () => {
    sendSMS.mockClear()
    await GET(new Request('https://app.fullloop.example/api/cron/payment-followup-daily?force=1', {
      headers: { 'x-vercel-cron': '1' },
    }))
    const texted = sendSMS.mock.calls.map((c) => c[0].to)
    expect(texted).not.toContain('+15559990002')
  })

  it('still texts an eligible client', async () => {
    sendSMS.mockClear()
    await GET(new Request('https://app.fullloop.example/api/cron/payment-followup-daily?force=1', {
      headers: { 'x-vercel-cron': '1' },
    }))
    const texted = sendSMS.mock.calls.map((c) => c[0].to)
    expect(texted).toContain('+15559990003')
  })
})
