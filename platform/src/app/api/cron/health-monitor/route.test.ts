import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * health-monitor cron — the `reminders` check watched the wrong table.
 *
 * cron/reminders never writes `email_logs` (only client/book and
 * client/reschedule do) — it writes `notifications` rows (`daily_ops_recap`,
 * `daily_digest`, confirmed at cron/reminders/route.ts:526,575). The old
 * `email_logs` + subject-ILIKE check would find nothing and permanently
 * report "reminders silent," even while reminders fire correctly — a false
 * alarm every 6 hours forever. Fixed to watch the notification types the
 * cron actually produces.
 */

vi.mock('@/lib/telegram', () => ({
  alertOwner: vi.fn(async () => null),
}))
vi.mock('@/lib/error-tracking', () => ({
  trackError: vi.fn(async () => {}),
}))

type Row = Record<string, unknown>

// Rows that exist in the DB for this test run — the reminders cron HAS been
// firing (daily_ops_recap + daily_digest rows exist recently), but
// email_logs has nothing with "reminder" in the subject (as in production).
let notificationsRows: Row[]
let emailLogsRows: Row[]
let cronHealthAlertRows: Row[]

function builder(table: string) {
  const eqs: Record<string, unknown> = {}
  const chain = {
    select: () => chain,
    order: () => chain,
    limit: () => chain,
    eq: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    in: () => chain,
    ilike: () => {
      // The old (buggy) check called .ilike('subject', '%reminder%') on
      // email_logs — simulate the real prod table: no such rows exist.
      return chain
    },
    gte: () => chain,
    insert: () => ({ then: (resolve: (v: { error: null }) => void) => resolve({ error: null }) }),
    then: (resolve: (v: { data: unknown; error: unknown }) => void) => {
      if (table === 'notifications') {
        if (eqs.type === 'cron_health_alert') return resolve({ data: cronHealthAlertRows, error: null })
        const matches = notificationsRows.filter((r) => r.type === eqs.type)
        return resolve({ data: matches, error: null })
      }
      if (table === 'email_logs') {
        return resolve({ data: emailLogsRows, error: null })
      }
      return resolve({ data: [], error: null })
    },
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (table: string) => builder(table) },
}))

import { GET } from './route'

function req() {
  return new Request('http://t/api/cron/health-monitor', {
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
  })
}

beforeEach(() => {
  process.env.CRON_SECRET = 'test-secret'
  const recent = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  notificationsRows = [
    { type: 'daily_ops_recap', created_at: recent },
    { type: 'daily_digest', created_at: recent },
    { type: 'late_check_in', created_at: recent },
    { type: 'recurring_generated', created_at: recent },
    { type: 'daily_summary_sent', created_at: recent },
    { type: 'recurring_expense_posted', created_at: recent },
    { type: 'email_monitor_tick', created_at: recent },
    { type: 'payment_reminder_fired', created_at: recent },
    { type: 'new_lead', created_at: recent },
    { type: 'new_booking', created_at: recent },
  ]
  emailLogsRows = [] // reminders cron never writes here — matches prod reality
  cronHealthAlertRows = []
})

describe('health-monitor cron — reminders check watches the real signal', () => {
  it('does not report reminders.daily_ops_recap / reminders.daily_digest as silent when they just fired', async () => {
    const res = await GET(req())
    expect(res.status).toBe(200)
    const body = await res.json()

    const failingCrons = body.failures.map((f: { cron: string }) => f.cron)
    expect(failingCrons).not.toContain('reminders.daily_ops_recap')
    expect(failingCrons).not.toContain('reminders.daily_digest')
    expect(failingCrons).not.toContain('reminders')

    const okCrons = body.ok.map((o: { cron: string }) => o.cron)
    expect(okCrons).toContain('reminders.daily_ops_recap')
    expect(okCrons).toContain('reminders.daily_digest')
  })
})
