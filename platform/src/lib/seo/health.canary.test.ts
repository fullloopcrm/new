import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Canary-page health check (2026-08-01 incident follow-up): checkFleetHealth
 * only ever pinged tenant HOMEPAGES, so it never noticed when a commit
 * deleted the /location, /industry, and /crm-for- legacy-redirect block from
 * middleware.ts — the marketing homepage kept returning 200 while the site's
 * #1-ranked keyword page 404'd for over a day. This proves checkCanaryPages
 * actually surfaces a down deep page, and runCanaryHealth persists +
 * self-heals seo_issues the same way runFleetHealth already does for
 * site_down.
 */

const insertedIssues: Array<Record<string, unknown>> = []
const deletedTypes: string[] = []

function builder(table: string) {
  const chain = {
    delete: () => ({
      eq: (col: string, val: unknown) => {
        if (table === 'seo_issues' && col === 'type') deletedTypes.push(String(val))
        return Promise.resolve({ data: null, error: null })
      },
    }),
    insert: (rows: Record<string, unknown>[]) => {
      if (table === 'seo_issues') insertedIssues.push(...rows)
      return Promise.resolve({ data: null, error: null })
    },
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (table: string) => builder(table) },
}))

let responses: Record<string, { status: number } | Error>

vi.mock('@/lib/ssrf', () => ({
  safeFetch: async (url: string) => {
    const path = new URL(url).pathname
    const r = responses[path]
    if (r instanceof Error) throw r
    if (!r) throw new Error(`unmocked canary path: ${path}`)
    return { status: r.status, headers: { get: () => null } }
  },
}))

beforeEach(() => {
  insertedIssues.length = 0
  deletedTypes.length = 0
  responses = {}
})

describe('checkCanaryPages / runCanaryHealth', () => {
  it('marks a 404 canary page as down', async () => {
    const { checkCanaryPages, CANARY_PAGES } = await import('./health')
    for (const c of CANARY_PAGES) responses[c.path] = { status: 200 }
    responses['/location/home-service-crm-in-seattle'] = { status: 404 }

    const results = await checkCanaryPages()
    const seattle = results.find((r) => r.path === '/location/home-service-crm-in-seattle')
    expect(seattle?.ok).toBe(false)
    expect(seattle?.status).toBe(404)
  })

  it('all canary pages healthy -> nothing persisted as down, prior issues still cleared', async () => {
    const { runCanaryHealth, CANARY_PAGES } = await import('./health')
    for (const c of CANARY_PAGES) responses[c.path] = { status: 200 }

    const summary = await runCanaryHealth()
    expect(summary.down).toHaveLength(0)
    expect(deletedTypes).toContain('canary_page_down')
    expect(insertedIssues).toHaveLength(0)
  })

  it('a down canary page is persisted as a critical, open seo_issues row', async () => {
    const { runCanaryHealth, CANARY_PAGES } = await import('./health')
    for (const c of CANARY_PAGES) responses[c.path] = { status: 200 }
    responses['/location/home-service-crm-in-seattle'] = { status: 404 }

    const summary = await runCanaryHealth()
    expect(summary.down).toHaveLength(1)
    expect(insertedIssues).toHaveLength(1)
    expect(insertedIssues[0]).toMatchObject({
      type: 'canary_page_down',
      severity: 'critical',
      status: 'open',
      target_url: 'https://www.homeservicecrm.ai/location/home-service-crm-in-seattle',
    })
  })

  it('a fetch failure (thrown error) also counts as down, not silently ignored', async () => {
    const { checkCanaryPages, CANARY_PAGES } = await import('./health')
    for (const c of CANARY_PAGES) responses[c.path] = { status: 200 }
    responses['/'] = new Error('ECONNRESET')

    const results = await checkCanaryPages()
    const home = results.find((r) => r.path === '/')
    expect(home?.ok).toBe(false)
    expect(home?.error).toBe('ECONNRESET')
  })
})
