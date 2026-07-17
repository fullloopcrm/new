import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET /api/cron/post-job-followup — resolver-precedence bug-class probe.
 *
 * BUG (fixed here): the review-request SMS link (sent 2 hours after every
 * completed booking/job, for every active tenant) was built from
 * `tenant.domain ? https://${tenant.domain}/reviews/submit : https://${tenant.slug}.homeservicesbusinesscrm.com/reviews/submit`
 * — the legacy `tenants.domain` column only, never consulting
 * `tenant_domains`. A tenant whose real custom domain lived only in
 * tenant_domains (the normal state — admin/websites writes tenant_domains
 * only, never tenants.domain) got every review-request text pointed at the
 * internal carrying subdomain instead of their own branded domain. Sixth
 * mirror of the resolver-precedence class fixed this session (site-
 * readiness.ts, brand.ts, selena/agent.ts, invoice/quote/document send
 * links). Fixed by routing through the already-tested tenantSiteUrl()
 * helper (tenant_domains PRIMARY -> tenants.domain -> slug subdomain)
 * instead of duplicating ad-hoc resolution inline.
 */

const TENANT_A = 'tid-post-job-followup-a'
const TENANT_B = 'tid-post-job-followup-b'

let tenantsRows: Record<string, unknown>[] = []
let tenantDomainsRows: Record<string, unknown>[] = []
let bookingsRows: Record<string, unknown>[] = []
let jobsRows: Record<string, unknown>[] = []

const sendSMSMock = vi.fn(async (_opts: Record<string, unknown>) => ({ success: true }))
vi.mock('@/lib/sms', () => ({ sendSMS: (opts: Record<string, unknown>) => sendSMSMock(opts) }))

// No google_review_link configured — forces the reviewBaseUrl fallback path
// under test on every send.
vi.mock('@/lib/settings', () => ({
  getSettings: vi.fn(async () => ({
    chatbot_enabled: true,
    review_followup_enabled: true,
    review_followup_delay_hours: 2,
    google_review_link: null,
  })),
}))

type Filter = (row: Record<string, unknown>) => boolean

function makeTable(getRows: () => Record<string, unknown>[]) {
  return () => {
    const filters: Filter[] = []
    let limitN: number | undefined
    let orderCol: string | undefined

    const dateCmp = (col: string, val: unknown, cmp: (a: number, b: number) => boolean): Filter =>
      (r) => cmp(new Date(r[col] as string).getTime(), new Date(val as string).getTime())

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain: any = {
      select: () => chain,
      eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return chain },
      neq: (col: string, val: unknown) => { filters.push((r) => r[col] !== val); return chain },
      in: (col: string, val: unknown[]) => { filters.push((r) => val.includes(r[col])); return chain },
      is: (col: string, val: unknown) => {
        filters.push((r) => (val === null ? r[col] === null || r[col] === undefined : r[col] === val))
        return chain
      },
      gte: (col: string, val: unknown) => { filters.push(dateCmp(col, val, (a, b) => a >= b)); return chain },
      lte: (col: string, val: unknown) => { filters.push(dateCmp(col, val, (a, b) => a <= b)); return chain },
      gt: (col: string, val: unknown) => { filters.push(dateCmp(col, val, (a, b) => a > b)); return chain },
      lt: (col: string, val: unknown) => { filters.push(dateCmp(col, val, (a, b) => a < b)); return chain },
      not: () => chain,
      or: () => chain,
      order: (col: string) => { orderCol = col; return chain },
      limit: (n: number) => { limitN = n; return chain },
      returns: () => chain,
      update: () => ({ eq: () => ({ then: (resolve: (v: unknown) => void) => resolve({ data: null, error: null }) }) }),
      insert: () => ({ then: (resolve: (v: unknown) => void) => resolve({ data: null, error: null }) }),
      then: (resolve: (v: { data: unknown; error: null; count?: number }) => void) => {
        let hit = getRows().filter((r) => filters.every((f) => f(r)))
        if (orderCol) hit = [...hit].sort((a, b) => String(a[orderCol as string]).localeCompare(String(b[orderCol as string])))
        if (limitN != null) hit = hit.slice(0, limitN)
        resolve({ data: hit, error: null, count: hit.length })
      },
    }
    return chain
  }
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'tenants') return makeTable(() => tenantsRows)()
      if (table === 'tenant_domains') return makeTable(() => tenantDomainsRows)()
      if (table === 'bookings') return makeTable(() => bookingsRows)()
      if (table === 'jobs') return makeTable(() => jobsRows)()
      return makeTable(() => [])()
    },
  },
}))

import { GET } from './route'

function req() {
  return new Request('http://t/api/cron/post-job-followup', { headers: { authorization: 'Bearer test-secret' } })
}

function bodyOf(smsIndex: number): string {
  return (sendSMSMock.mock.calls[smsIndex]?.[0] as { body?: string })?.body || ''
}

beforeEach(() => {
  process.env.CRON_SECRET = 'test-secret'
  sendSMSMock.mockClear()
  tenantDomainsRows = []
  jobsRows = []

  const checkOutTime = new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString()

  tenantsRows = [
    {
      id: TENANT_A, name: 'Acme Cleaning', status: 'active', telnyx_api_key: 'tkey-a', telnyx_phone: '+15559990000', domain: null, slug: 'acme',
    },
  ]

  bookingsRows = [
    {
      id: 'bk-control', tenant_id: TENANT_A, client_id: 'c-control', status: 'completed', job_id: null, notes: null, check_out_time: checkOutTime,
      clients: { name: 'Control Client', phone: '3005552222', sms_consent: true, do_not_service: false },
    },
  ]
})

describe('cron/post-job-followup GET — review-link domain-fallback bug-class probe', () => {
  it('domain-fallback: tenants.domain is null but tenant_domains has an active PRIMARY row — review link uses it, not the slug subdomain', async () => {
    tenantDomainsRows = [
      { tenant_id: TENANT_A, domain: 'custom.example.com', is_primary: true, active: true, created_at: '2024-01-01T00:00:00Z' },
    ]
    await GET(req())
    expect(bodyOf(0)).toContain('https://custom.example.com/reviews/submit')
    expect(bodyOf(0)).not.toContain('acme.homeservicesbusinesscrm.com')
  })

  it('falls back to the tenant slug subdomain when neither tenant_domains nor tenants.domain resolve', async () => {
    await GET(req())
    expect(bodyOf(0)).toContain('https://acme.homeservicesbusinesscrm.com/reviews/submit')
  })

  it("wrong-tenant probe: tenant B's tenant_domains row never leaks into tenant A's review link", async () => {
    tenantsRows.push({
      id: TENANT_B, name: 'Other Co', status: 'active', telnyx_api_key: 'tkey-b', telnyx_phone: '+15559991111', domain: null, slug: 'other',
    })
    bookingsRows.push({
      id: 'bk-b', tenant_id: TENANT_B, client_id: 'c-b', status: 'completed', job_id: null, notes: null,
      check_out_time: new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString(),
      clients: { name: 'B Client', phone: '3005557777', sms_consent: true, do_not_service: false },
    })
    tenantDomainsRows = [
      { tenant_id: TENANT_A, domain: 'acme-real.example.com', is_primary: true, active: true, created_at: '2024-01-01T00:00:00Z' },
      { tenant_id: TENANT_B, domain: 'other-tenant.example.com', is_primary: true, active: true, created_at: '2024-01-01T00:00:00Z' },
    ]
    await GET(req())
    const acmeMsg = sendSMSMock.mock.calls.find((c) => (c[0] as { to?: string }).to === '3005552222')?.[0] as { body?: string }
    const otherMsg = sendSMSMock.mock.calls.find((c) => (c[0] as { to?: string }).to === '3005557777')?.[0] as { body?: string }
    expect(acmeMsg?.body).toContain('acme-real.example.com')
    expect(acmeMsg?.body).not.toContain('other-tenant.example.com')
    expect(otherMsg?.body).toContain('other-tenant.example.com')
    expect(otherMsg?.body).not.toContain('acme-real.example.com')
  })

  it('domain-fallback applies to the job-level review link too', async () => {
    bookingsRows = []
    jobsRows = [
      {
        id: 'job-control', tenant_id: TENANT_A, client_id: 'c-job', status: 'completed',
        completed_at: new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString(),
        clients: { name: 'Job Client', phone: '3005558888', sms_consent: true, do_not_service: false },
      },
    ]
    tenantDomainsRows = [
      { tenant_id: TENANT_A, domain: 'job-custom.example.com', is_primary: true, active: true, created_at: '2024-01-01T00:00:00Z' },
    ]
    await GET(req())
    expect(bodyOf(0)).toContain('https://job-custom.example.com/reviews/submit')
  })
})
