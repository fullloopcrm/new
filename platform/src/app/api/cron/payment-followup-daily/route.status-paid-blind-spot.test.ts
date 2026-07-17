import { describe, it, expect, vi } from 'vitest'

/**
 * GET /api/cron/payment-followup-daily only queried bookings.status='completed',
 * but POST /api/finance/payroll (bulk payroll) flips a booking's own `status`
 * straight to 'paid' the moment the TEAM MEMBER is paid -- independent of
 * whether the CLIENT ever paid (payment_status, gated separately by this
 * route's own `.not('payment_status', 'in', ...)` filter). So the instant
 * payroll ran on a completed-but-unpaid booking, this cron silently stopped
 * chasing that client's real debt forever, even though the query already
 * exists specifically to find unpaid-by-client bookings. Same root cause
 * already fixed this session in ar-aging/route.ts and pending/route.ts.
 * Fixed to also include status='paid' bookings.
 */

const TENANT = 'tenant-A'

type Row = Record<string, unknown>

function naive(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}
const recentEndTime = naive(new Date(Date.now() - 24 * 60 * 60 * 1000)) // 1 day ago, well inside the 14-day recency floor

const tenants: Row[] = [
  { id: TENANT, name: 'Acme Cleaning', telnyx_api_key: 'tk_test', telnyx_phone: '+15551234567', payment_link: 'https://pay.example/acme', owner_phone: null, phone: null, status: 'active' },
]

const bookings: Row[] = [
  // Team paid via bulk payroll (status flipped to 'paid'); client never paid -- must still be chased.
  { id: 'bk-team-paid-client-owes', tenant_id: TENANT, client_id: 'c1', price: 12000, end_time: recentEndTime, payment_status: 'unpaid', payment_method: null, status: 'paid', clients: { name: 'Alice', phone: '+15559990001' } },
  // Never touched by payroll, still genuinely completed+unpaid -- regression guard, must keep working.
  { id: 'bk-completed-unpaid', tenant_id: TENANT, client_id: 'c2', price: 9000, end_time: recentEndTime, payment_status: 'unpaid', payment_method: null, status: 'completed', clients: { name: 'Bob', phone: '+15559990002' } },
  // Not completed at all -- correctly excluded.
  { id: 'bk-scheduled', tenant_id: TENANT, client_id: 'c3', price: 5000, end_time: recentEndTime, payment_status: 'unpaid', payment_method: null, status: 'scheduled', clients: { name: 'Cara', phone: '+15559990003' } },
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

describe('GET /api/cron/payment-followup-daily — status/payment_status are independent', () => {
  it('still chases a booking whose team pay is settled but the client still owes money', async () => {
    sendSMS.mockClear()
    const res = await GET(new Request('https://app.fullloop.example/api/cron/payment-followup-daily?force=1', {
      headers: { 'x-vercel-cron': '1' },
    }))
    expect(res.status).toBe(200)
    const texted = sendSMS.mock.calls.map((c) => c[0].to)
    expect(texted).toContain('+15559990001') // Alice: team-paid-but-client-owes -- must not have gone dark
  })

  it('regression: still chases an ordinary completed-and-unpaid booking untouched by payroll', async () => {
    sendSMS.mockClear()
    const res = await GET(new Request('https://app.fullloop.example/api/cron/payment-followup-daily?force=1', {
      headers: { 'x-vercel-cron': '1' },
    }))
    void res
    const texted = sendSMS.mock.calls.map((c) => c[0].to)
    expect(texted).toContain('+15559990002') // Bob
  })

  it('does not chase a booking that was never completed', async () => {
    sendSMS.mockClear()
    const res = await GET(new Request('https://app.fullloop.example/api/cron/payment-followup-daily?force=1', {
      headers: { 'x-vercel-cron': '1' },
    }))
    void res
    const texted = sendSMS.mock.calls.map((c) => c[0].to)
    expect(texted).not.toContain('+15559990003') // Cara: still scheduled
  })
})
