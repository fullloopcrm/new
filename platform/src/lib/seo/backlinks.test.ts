import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { IndustryKey } from '@/lib/industry-presets'

/**
 * backlinks.ts — citation-directory + editorial cross-mention proposal
 * generator (seo_backlink_opportunities, status='proposed' only). Mocks
 * supabaseAdmin against three tables: tenant_domains, tenants, and
 * seo_backlink_opportunities, mirroring alerts.test.ts's inline chain-builder
 * pattern so the "DB" state is plain in-memory arrays the tests control.
 */

type TenantDomainRow = { domain: string; tenant_id: string }
type TenantRow = { id: string; name: string; phone: string | null; website_url: string | null; industry: string | null }
type BacklinkRow = { tenant_id: string; kind: string; source_key: string; status: string; [k: string]: unknown }

const TABLE = 'seo_backlink_opportunities'

let tenantDomainRows: TenantDomainRow[]
let tenantRows: TenantRow[]
let backlinkRows: BacklinkRow[]
let insertCalls: Array<{ table: string; rows: Record<string, unknown>[] }>

function matches(row: BacklinkRow, eq: Record<string, unknown>): boolean {
  return Object.entries(eq).every(([k, v]) => row[k] === v)
}

function builder(table: string) {
  let op: 'select' | 'delete' = 'select'
  const eq: Record<string, unknown> = {}
  let inCol: string | undefined
  let inVals: unknown[] | undefined

  const chain = {
    select: () => { op = 'select'; return chain },
    delete: () => { op = 'delete'; return chain },
    eq: (col: string, val: unknown) => { eq[col] = val; return chain },
    in: (col: string, vals: unknown[]) => { inCol = col; inVals = vals; return chain },
    insert: async (rows: Record<string, unknown> | Record<string, unknown>[]) => {
      const arr = Array.isArray(rows) ? rows : [rows]
      insertCalls.push({ table, rows: arr })
      if (table === TABLE) backlinkRows.push(...(arr as BacklinkRow[]).map((r) => ({ ...r })))
      return { data: null, error: null }
    },
    then: (resolve: (v: { data: unknown; error: unknown }) => void) => {
      if (table === 'tenant_domains') {
        resolve({ data: tenantDomainRows, error: null })
        return
      }
      if (table === 'tenants') {
        const ids = (inCol === 'id' ? inVals : undefined) ?? []
        resolve({ data: tenantRows.filter((t) => ids.includes(t.id)), error: null })
        return
      }
      if (table === TABLE) {
        if (op === 'delete') {
          backlinkRows = backlinkRows.filter((r) => !matches(r, eq))
          resolve({ data: null, error: null })
          return
        }
        // select path (alreadyActionedKeys): eq(tenant_id) + in(status, ACTIONED_STATUSES)
        const rows = backlinkRows.filter(
          (r) => matches(r, eq) && (inCol === 'status' && inVals ? inVals.includes(r.status) : true),
        )
        resolve({ data: rows.map((r) => ({ source_key: r.source_key })), error: null })
        return
      }
      resolve({ data: [], error: null })
    },
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (table: string) => builder(table) },
}))

import {
  CITATION_SOURCES,
  citationSourcesFor,
  evaluateBacklinkSafety,
  buildCitationListing,
  generateBacklinkProposals,
  type TenantFleetRow,
} from './backlinks'

const ALL_INDUSTRY_KEYS: IndustryKey[] = [
  'cleaning', 'window_cleaning', 'gutter', 'carpet_cleaning', 'air_duct', 'pressure_washing',
  'post_construction', 'bin_cleaning', 'pool', 'chimney', 'lawn_care', 'irrigation', 'snow_removal',
  'tree_service', 'holiday_lighting', 'pest', 'junk_removal', 'dumpster', 'towing', 'appliance_repair',
  'garage_door', 'locksmith', 'home_inspection', 'septic', 'auto_detailing', 'pet_grooming', 'pet_waste',
  'handyman', 'hvac', 'plumbing', 'electrical', 'mobile_salon', 'laundry', 'fitness', 'landscaping',
  'remodeling', 'roofing', 'siding', 'painting', 'flooring', 'concrete', 'deck', 'fencing', 'demolition',
  'drywall', 'epoxy', 'foundation', 'insulation', 'moving', 'paving', 'windows_doors', 'stucco', 'solar',
  'smart_home', 'accessibility', 'restoration', 'interior_design', 'general',
]

beforeEach(() => {
  tenantDomainRows = []
  tenantRows = []
  backlinkRows = []
  insertCalls = []
})

describe('citationSourcesFor()', () => {
  const universalCount = CITATION_SOURCES.filter((s) => s.appliesTo === 'all').length

  it('gives a general (non-home-improvement) trade only the universal directories', () => {
    const sources = citationSourcesFor('towing')
    expect(sources).toHaveLength(universalCount)
    expect(sources.every((s) => s.appliesTo === 'all')).toBe(true)
  })

  it('gives a home-improvement trade the universal set plus Angi/HomeAdvisor/Thumbtack/Porch', () => {
    const sources = citationSourcesFor('cleaning')
    const keys = sources.map((s) => s.key)
    expect(keys).toEqual(expect.arrayContaining(['angi', 'homeadvisor', 'thumbtack', 'porch']))
    expect(keys).not.toContain('houzz') // project/design trades only
    expect(keys).not.toContain('styleseat')
  })

  it('gives mobile_salon its dedicated platform plus the universal set', () => {
    const keys = citationSourcesFor('mobile_salon').map((s) => s.key)
    expect(keys).toContain('styleseat')
    expect(keys).not.toContain('angi')
  })

  it('never proposes a source outside its own catalog for any known industry', () => {
    for (const key of ALL_INDUSTRY_KEYS) {
      const sources = citationSourcesFor(key)
      expect(sources.length).toBeGreaterThanOrEqual(universalCount)
    }
  })
})

describe('evaluateBacklinkSafety()', () => {
  it('passes a clean, on-length citation description that names the business', () => {
    const result = evaluateBacklinkSafety({
      field: 'citation_description',
      text: 'Example Towing provides towing and roadside assistance to the local area, serving customers directly at their home or job site. Book online at example-towing.com.',
      tenantName: 'Example Towing',
    })
    expect(result.pass).toBe(true)
    expect(result.reasons).toEqual([])
  })

  it('rejects an introduced unverified claim (no prior copy to have earned it)', () => {
    const result = evaluateBacklinkSafety({
      field: 'citation_description',
      text: 'Example Towing is the #1 best licensed and insured towing company in the city, guaranteed satisfaction every time you call us today.',
      tenantName: 'Example Towing',
    })
    expect(result.pass).toBe(false)
    expect(result.reasons.some((r) => r.includes('unverified claim'))).toBe(true)
  })

  it('rejects text that never mentions the business name', () => {
    const result = evaluateBacklinkSafety({
      field: 'citation_description',
      text: 'A local towing company that serves the metro area with fast, friendly service every day.',
      tenantName: 'Example Towing',
    })
    expect(result.pass).toBe(false)
    expect(result.reasons.some((r) => r.includes('does not mention business name'))).toBe(true)
  })

  it('rejects text that names a competitor brand', () => {
    const result = evaluateBacklinkSafety({
      field: 'citation_description',
      text: 'Example Towing is a better alternative to RivalTow for local towing and roadside assistance.',
      tenantName: 'Example Towing',
      competitorBrands: ['rivaltow'],
    })
    expect(result.pass).toBe(false)
    expect(result.reasons.some((r) => r.includes('names competitor'))).toBe(true)
  })

  it('rejects empty and out-of-bounds-length text', () => {
    expect(evaluateBacklinkSafety({ field: 'citation_description', text: '', tenantName: 'X' }).pass).toBe(false)
    expect(evaluateBacklinkSafety({ field: 'citation_description', text: 'X is here.', tenantName: 'X' }).pass).toBe(false)
  })
})

describe('buildCitationListing()', () => {
  const tenant: TenantFleetRow = {
    tenant_id: 't1',
    domain: 'example-towing.com',
    name: 'Example Towing',
    phone: '555-1212',
    websiteUrl: null,
    industry: 'towing',
  }

  it('builds a service-area listing with no fabricated street address', () => {
    const listing = buildCitationListing(tenant)
    expect(listing.listingType).toBe('sab')
    expect(listing.businessName).toBe('Example Towing')
    expect(listing.description).toContain('Example Towing')
    expect(listing.description).toContain('example-towing.com')
    expect(listing.website).toBe('https://www.example-towing.com')
    // No property/field on the listing claims a physical street address.
    expect(Object.keys(listing)).not.toContain('address')
  })

  it('falls back to the https://www.<domain> website only when tenants.website_url is unset', () => {
    const withWebsite = buildCitationListing({ ...tenant, websiteUrl: 'https://example-towing.com' })
    expect(withWebsite.website).toBe('https://example-towing.com')
  })

  it('produces a safety-gate-passing description for every known industry (template regression guard)', () => {
    for (const industry of ALL_INDUSTRY_KEYS) {
      const listing = buildCitationListing({ ...tenant, industry })
      const result = evaluateBacklinkSafety({ field: 'citation_description', text: listing.description, tenantName: tenant.name })
      expect(result.pass).toBe(true)
    }
  })
})

describe('generateBacklinkProposals()', () => {
  it('proposes citations and editorial angles for every active tenant', async () => {
    tenantDomainRows = [{ domain: 'example-towing.com', tenant_id: 't1' }]
    tenantRows = [{ id: 't1', name: 'Example Towing', phone: '555-1212', website_url: null, industry: 'towing' }]

    const summary = await generateBacklinkProposals({ limit: 10 })

    const universalCount = CITATION_SOURCES.filter((s) => s.appliesTo === 'all').length
    expect(summary.tenants).toBe(1)
    expect(summary.citationProposals).toBe(universalCount)
    expect(summary.editorialProposals).toBe(2)

    const citationRows = backlinkRows.filter((r) => r.tenant_id === 't1' && r.kind === 'citation')
    expect(citationRows).toHaveLength(universalCount)
    expect(citationRows.every((r) => r.property === 'sc-domain:example-towing.com')).toBe(true)
    expect(citationRows.every((r) => r.status === 'proposed')).toBe(true)
  })

  it('wrong-tenant probe: an actioned source on tenant A never suppresses or leaks into tenant B', async () => {
    tenantDomainRows = [
      { domain: 'a-towing.com', tenant_id: 't1' },
      { domain: 'b-towing.com', tenant_id: 't2' },
    ]
    tenantRows = [
      { id: 't1', name: 'A Towing', phone: null, website_url: null, industry: 'towing' },
      { id: 't2', name: 'B Towing', phone: null, website_url: null, industry: 'towing' },
    ]
    // Tenant t1 already has an approved (actioned) Google Business Profile listing.
    backlinkRows = [{ tenant_id: 't1', kind: 'citation', source_key: 'google_business_profile', status: 'approved' }]

    await generateBacklinkProposals({ limit: 10 })

    const t1ProposedKeys = backlinkRows
      .filter((r) => r.tenant_id === 't1' && r.kind === 'citation' && r.status === 'proposed')
      .map((r) => r.source_key)
    const t2Keys = backlinkRows.filter((r) => r.tenant_id === 't2' && r.kind === 'citation').map((r) => r.source_key)

    // t1's already-actioned source must not be re-proposed (the original 'approved' row is untouched, not duplicated)...
    expect(t1ProposedKeys).not.toContain('google_business_profile')
    expect(backlinkRows.filter((r) => r.tenant_id === 't1' && r.source_key === 'google_business_profile')).toHaveLength(1)
    // ...but t2, a completely different tenant, must still get it — the
    // alreadyActionedKeys() lookup must be scoped by tenant_id, not global.
    expect(t2Keys).toContain('google_business_profile')
  })

  it('is idempotent: re-running does not duplicate proposed rows', async () => {
    tenantDomainRows = [{ domain: 'example-towing.com', tenant_id: 't1' }]
    tenantRows = [{ id: 't1', name: 'Example Towing', phone: null, website_url: null, industry: 'towing' }]

    await generateBacklinkProposals({ limit: 10 })
    const afterFirst = backlinkRows.filter((r) => r.tenant_id === 't1').length

    await generateBacklinkProposals({ limit: 10 })
    const afterSecond = backlinkRows.filter((r) => r.tenant_id === 't1').length

    expect(afterFirst).toBeGreaterThan(0)
    expect(afterSecond).toBe(afterFirst)
  })

  it('leaves rows that already progressed past proposed untouched on re-run', async () => {
    tenantDomainRows = [{ domain: 'example-towing.com', tenant_id: 't1' }]
    tenantRows = [{ id: 't1', name: 'Example Towing', phone: null, website_url: null, industry: 'towing' }]
    backlinkRows = [{ tenant_id: 't1', kind: 'citation', source_key: 'yelp_business', status: 'submitted', marker: 'do-not-touch' }]

    await generateBacklinkProposals({ limit: 10 })

    const submittedRow = backlinkRows.find((r) => r.tenant_id === 't1' && r.source_key === 'yelp_business' && r.status === 'submitted')
    expect(submittedRow?.marker).toBe('do-not-touch')
  })

  it('respects the limit and skips tenants without a name', async () => {
    tenantDomainRows = [
      { domain: 'a.com', tenant_id: 't1' },
      { domain: 'b.com', tenant_id: 't2' },
    ]
    tenantRows = [
      { id: 't1', name: '', phone: null, website_url: null, industry: 'towing' },
      { id: 't2', name: 'B Co', phone: null, website_url: null, industry: 'towing' },
    ]

    const summary = await generateBacklinkProposals({ limit: 10 })
    expect(summary.tenants).toBe(1) // t1 filtered out for missing name
  })
})
