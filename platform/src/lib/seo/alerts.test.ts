import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * seo-alerts (crm-03, 2026-07-31): vercel.json scheduled this cron weekly
 * since before the route existed -- confirmed live it 404'd every run,
 * meaning a critical seo_issues row (e.g. site_down for
 * fladumpsterrentals.com, a real live incident found this session) could
 * sit open indefinitely with zero active notification. Proves runSeoAlerts()
 * selects only open critical/high issues and pages the owner through
 * trackError -- the SAME owner-alert pipeline cron/system-check,
 * cron/tenant-health, and cron/comms-monitor already use unattended. No new
 * alert channel, no client contact.
 */

let issuesRows: Array<{
  id: string; property: string; tenant_id: string | null; type: string
  severity: string; status: string; target_url: string | null; detail: Record<string, unknown> | null
}>

function builder(table: string) {
  const state: { eqs: Record<string, unknown>; ins: Record<string, unknown[]> } = { eqs: {}, ins: {} }
  const chain = {
    select: () => chain,
    eq: (col: string, val: unknown) => { state.eqs[col] = val; return chain },
    in: (col: string, vals: unknown[]) => { state.ins[col] = vals; return chain },
    limit: () => chain,
    then: (onFulfilled: (v: unknown) => void) => {
      if (table === 'seo_issues') {
        const rows = issuesRows.filter((r) => {
          if (state.eqs.status && r.status !== state.eqs.status) return false
          if (state.ins.severity && !state.ins.severity.includes(r.severity)) return false
          return true
        })
        return onFulfilled({ data: rows, error: null })
      }
      return onFulfilled({ data: [], error: null })
    },
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (table: string) => builder(table) },
}))

type TrackErrorContext = { source: string; severity?: string; tenantId?: string; extra?: string }
const trackErrorSpy = vi.hoisted(() => vi.fn(async (_error: unknown, _context: TrackErrorContext) => {}))
vi.mock('@/lib/error-tracking', () => ({ trackError: trackErrorSpy }))

import { runSeoAlerts } from './alerts'

beforeEach(() => {
  trackErrorSpy.mockClear()
  issuesRows = [
    { id: 'i-1', property: 'sc-domain:fladumpsterrentals.com', tenant_id: 'tenant-A', type: 'site_down', severity: 'critical', status: 'open', target_url: 'https://fladumpsterrentals.com/', detail: { http_status: 0 } },
    { id: 'i-2', property: 'sc-domain:other.com', tenant_id: 'tenant-B', type: 'not_indexed', severity: 'high', status: 'open', target_url: 'https://other.com/page', detail: null },
    { id: 'i-3', property: 'sc-domain:low-sev.com', tenant_id: 'tenant-C', type: 'low_ctr', severity: 'low', status: 'open', target_url: null, detail: null },
    { id: 'i-4', property: 'sc-domain:already-resolved.com', tenant_id: 'tenant-D', type: 'site_down', severity: 'critical', status: 'resolved', target_url: null, detail: null },
  ]
})

describe('runSeoAlerts', () => {
  it('alerts on open critical and high issues, not low severity or resolved ones', async () => {
    const result = await runSeoAlerts()
    expect(result.checked).toBe(2)
    expect(result.alerted).toBe(2)
    expect(trackErrorSpy).toHaveBeenCalledTimes(2)
  })

  it('passes severity through to trackError so the owner-alert pipeline routes critical to SMS+Telegram, high to Telegram only', async () => {
    await runSeoAlerts()
    const calls = trackErrorSpy.mock.calls.map((c) => c[1])
    expect(calls).toContainEqual(expect.objectContaining({ source: 'cron/seo-alerts', severity: 'critical', tenantId: 'tenant-A' }))
    expect(calls).toContainEqual(expect.objectContaining({ source: 'cron/seo-alerts', severity: 'high', tenantId: 'tenant-B' }))
  })

  it('includes the property and target_url in the alert message so it is actionable, not just a generic ping', async () => {
    await runSeoAlerts()
    const messages = trackErrorSpy.mock.calls.map((c) => (c[0] as Error).message)
    expect(messages.some((m) => m.includes('fladumpsterrentals.com') && m.includes('site_down'))).toBe(true)
  })

  it('does nothing when there are no open critical/high issues', async () => {
    issuesRows = issuesRows.filter((r) => r.severity === 'low')
    const result = await runSeoAlerts()
    expect(result.checked).toBe(0)
    expect(trackErrorSpy).not.toHaveBeenCalled()
  })
})
