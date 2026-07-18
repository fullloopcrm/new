import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { IndustryKey } from '@/lib/industry-presets'

/**
 * backlinks.ts — citation-directory + editorial cross-mention proposal
 * generator (seo_backlink_opportunities, status='proposed' only). Mocks
 * supabaseAdmin against three tables: tenant_domains, tenants, and
 * seo_backlink_opportunities, mirroring alerts.test.ts's inline chain-builder
 * pattern so the "DB" state is plain in-memory arrays the tests control.
 */

type TenantDomainRow = { domain: string; tenant_id: string; is_primary?: boolean; created_at?: string }
type TenantRow = {
  id: string
  name: string
  phone: string | null
  website_url: string | null
  industry: string | null
  domain?: string | null
  google_business?: { location_name?: string } | null
  status?: string | null
}
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
  let notNullCol: string | undefined

  const chain = {
    select: () => { op = 'select'; return chain },
    delete: () => { op = 'delete'; return chain },
    eq: (col: string, val: unknown) => { eq[col] = val; return chain },
    in: (col: string, vals: unknown[]) => { inCol = col; inVals = vals; return chain },
    not: (col: string, _op: string, _val: unknown) => { notNullCol = col; return chain },
    // loadActiveFleet()'s tenant_domains query orders by created_at ascending
    // -- fixtures below are written in the order they should be returned in
    // (this mock does not itself sort; it's a no-op like domains.test.ts's).
    order: () => chain,
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
        // loadActiveFleet()'s tenants.domain fallback query: select id,domain
        // .not('domain','is',null) -- no .in(), distinguished from the
        // id/name/phone/website/industry metadata lookup by notNullCol.
        if (notNullCol === 'domain') {
          resolve({ data: tenantRows.filter((t) => t.domain != null).map((t) => ({ id: t.id, domain: t.domain })), error: null })
          return
        }
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
  loadActiveFleet,
  manualStepsFor,
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

describe('loadActiveFleet()', () => {
  it('includes a tenant covered only by tenant_domains', async () => {
    tenantDomainRows = [{ domain: 'www.acme.com', tenant_id: 't1' }]
    tenantRows = [{ id: 't1', name: 'Acme', phone: null, website_url: null, industry: 'cleaning', domain: null }]

    const fleet = await loadActiveFleet()

    expect(fleet.map((t) => t.tenant_id)).toEqual(['t1'])
    expect(fleet[0].domain).toBe('acme.com')
  })

  it('falls back to tenants.domain for a tenant with no active tenant_domains row (coverage gap regression)', async () => {
    // tenant_domains registration is best-effort (activate-tenant.ts upsert is
    // try/catch, "never blocks" activation) -- a pre-existing or failed-upsert
    // tenant can have zero tenant_domains rows while still having tenants.domain
    // set. Before the fallback fix, loadActiveFleet() silently dropped this
    // tenant from the entire fleet with no error.
    tenantDomainRows = []
    tenantRows = [{ id: 't2', name: 'Legacy Co', phone: null, website_url: null, industry: 'plumbing', domain: 'www.legacyco.com' }]

    const fleet = await loadActiveFleet()

    expect(fleet.map((t) => t.tenant_id)).toEqual(['t2'])
    expect(fleet[0].domain).toBe('legacyco.com')
  })

  it('prefers the tenant_domains entry over a stale tenants.domain for the same tenant', async () => {
    tenantDomainRows = [{ domain: 'new-domain.com', tenant_id: 't3' }]
    tenantRows = [{ id: 't3', name: 'Migrated Co', phone: null, website_url: null, industry: 'hvac', domain: 'old-dead-domain.com' }]

    const fleet = await loadActiveFleet()

    expect(fleet).toHaveLength(1)
    expect(fleet[0].domain).toBe('new-domain.com')
  })

  it('does not cross-attribute one tenant fallback domain to a different tenant_id', async () => {
    tenantDomainRows = [{ domain: 'covered.com', tenant_id: 't4' }]
    tenantRows = [
      { id: 't4', name: 'Covered Co', phone: null, website_url: null, industry: 'hvac', domain: null },
      { id: 't5', name: 'Fallback Co', phone: null, website_url: null, industry: 'hvac', domain: 'fallback.com' },
    ]

    const fleet = await loadActiveFleet()
    const byId = new Map(fleet.map((t) => [t.tenant_id, t.domain]))

    expect(byId.get('t4')).toBe('covered.com')
    expect(byId.get('t5')).toBe('fallback.com')
  })

  it('picks the row flagged is_primary, not merely the first active tenant_domains row, when a tenant has 2+', async () => {
    // Rows arrive created_at-ascending (query order) -- the OLDER row here is
    // NOT primary (a stale pre-rebrand domain kept active for redirects), the
    // NEWER row IS. Before this fix, loadActiveFleet() took whichever row it
    // saw first per tenant with no is_primary check at all -- it would have
    // picked the stale domain here, exactly the non-deterministic-pick bug
    // class already fixed in referrers/[code] and site-export.
    tenantDomainRows = [
      { domain: 'old-dead-domain.com', tenant_id: 't9', is_primary: false, created_at: '2026-01-01T00:00:00Z' },
      { domain: 'new-primary-domain.com', tenant_id: 't9', is_primary: true, created_at: '2026-02-01T00:00:00Z' },
    ]
    tenantRows = [{ id: 't9', name: 'Rebranded Co', phone: null, website_url: null, industry: 'hvac' }]

    const fleet = await loadActiveFleet()

    expect(fleet).toHaveLength(1)
    expect(fleet[0].domain).toBe('new-primary-domain.com')
  })

  it('falls back to the oldest active row when no row is flagged is_primary (mirrors getPrimaryTenantDomain)', async () => {
    tenantDomainRows = [
      { domain: 'oldest.com', tenant_id: 't10', is_primary: false, created_at: '2026-01-01T00:00:00Z' },
      { domain: 'newer.com', tenant_id: 't10', is_primary: false, created_at: '2026-02-01T00:00:00Z' },
    ]
    tenantRows = [{ id: 't10', name: 'No Primary Flagged Co', phone: null, website_url: null, industry: 'hvac' }]

    const fleet = await loadActiveFleet()

    expect(fleet[0].domain).toBe('oldest.com')
  })

  it('flags googleBusinessConnected true only when tenants.google_business has a location_name', async () => {
    tenantDomainRows = [
      { domain: 'connected.com', tenant_id: 't6' },
      { domain: 'unconnected.com', tenant_id: 't7' },
      { domain: 'empty-object.com', tenant_id: 't8' },
    ]
    tenantRows = [
      { id: 't6', name: 'Connected Co', phone: null, website_url: null, industry: 'hvac', google_business: { location_name: 'locations/123' } },
      { id: 't7', name: 'Unconnected Co', phone: null, website_url: null, industry: 'hvac', google_business: null },
      { id: 't8', name: 'Empty Object Co', phone: null, website_url: null, industry: 'hvac', google_business: {} },
    ]

    const fleet = await loadActiveFleet()
    const byId = new Map(fleet.map((t) => [t.tenant_id, t.googleBusinessConnected]))

    expect(byId.get('t6')).toBe(true)
    expect(byId.get('t7')).toBe(false)
    expect(byId.get('t8')).toBe(false)
  })

  it('excludes a suspended, cancelled, or deleted tenant despite having a resolvable domain (status-gate gap)', async () => {
    // "Active" in this function's name previously meant only "has a
    // resolvable domain" -- it never checked tenants.status, so a dead
    // tenant's site kept getting citation/editorial proposals drafted forever.
    tenantDomainRows = [
      { domain: 'suspended-co.com', tenant_id: 't-susp' },
      { domain: 'cancelled-co.com', tenant_id: 't-cancel' },
      { domain: 'deleted-co.com', tenant_id: 't-del' },
    ]
    tenantRows = [
      { id: 't-susp', name: 'Suspended Co', phone: null, website_url: null, industry: 'hvac', status: 'suspended' },
      { id: 't-cancel', name: 'Cancelled Co', phone: null, website_url: null, industry: 'hvac', status: 'cancelled' },
      { id: 't-del', name: 'Deleted Co', phone: null, website_url: null, industry: 'hvac', status: 'deleted' },
    ]

    const fleet = await loadActiveFleet()

    expect(fleet).toHaveLength(0)
  })

  it('includes a setup/pending tenant (new tenants are servable before full activation)', async () => {
    tenantDomainRows = [
      { domain: 'setup-co.com', tenant_id: 't-setup' },
      { domain: 'pending-co.com', tenant_id: 't-pending' },
    ]
    tenantRows = [
      { id: 't-setup', name: 'Setup Co', phone: null, website_url: null, industry: 'hvac', status: 'setup' },
      { id: 't-pending', name: 'Pending Co', phone: null, website_url: null, industry: 'hvac', status: 'pending' },
    ]

    const fleet = await loadActiveFleet()

    expect(fleet.map((t) => t.tenant_id).sort()).toEqual(['t-pending', 't-setup'])
  })

  it('wrong-tenant probe: a cancelled tenant never suppresses a different, still-serving tenant', async () => {
    tenantDomainRows = [
      { domain: 'dead-co.com', tenant_id: 't-dead' },
      { domain: 'live-co.com', tenant_id: 't-live' },
    ]
    tenantRows = [
      { id: 't-dead', name: 'Dead Co', phone: null, website_url: null, industry: 'hvac', status: 'cancelled' },
      { id: 't-live', name: 'Live Co', phone: null, website_url: null, industry: 'hvac', status: 'active' },
    ]

    const fleet = await loadActiveFleet()

    expect(fleet.map((t) => t.tenant_id)).toEqual(['t-live'])
  })
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
    googleBusinessConnected: false,
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

describe('manualStepsFor()', () => {
  const tenant: TenantFleetRow = {
    tenant_id: 't1',
    domain: 'example-towing.com',
    name: 'Example Towing',
    phone: '555-1212',
    websiteUrl: null,
    industry: 'towing',
    googleBusinessConnected: false,
  }
  const listing = buildCitationListing(tenant)

  it('every source in the catalog produces a non-empty manual-steps checklist ending in the owner-verification note', () => {
    for (const source of CITATION_SOURCES) {
      const steps = manualStepsFor(source, tenant, listing)
      expect(steps.length).toBeGreaterThan(0)
      expect(steps.at(-1)).toContain('cannot be automated by a third party')
    }
  })

  it('warns to stop at the free tier for paid-upsell sources', () => {
    const angi = CITATION_SOURCES.find((s) => s.key === 'angi')!
    const steps = manualStepsFor(angi, tenant, listing)
    expect(steps.some((s) => s.includes('do not purchase leads'))).toBe(true)
  })

  it('does not warn about paid upsells for a free-only source', () => {
    const gbp = CITATION_SOURCES.find((s) => s.key === 'google_business_profile')!
    const steps = manualStepsFor(gbp, tenant, listing)
    expect(steps.some((s) => s.includes('do not purchase leads'))).toBe(false)
  })

  it('adds a BBB-accreditation warning only for the bbb source', () => {
    const bbb = CITATION_SOURCES.find((s) => s.key === 'bbb')!
    const steps = manualStepsFor(bbb, tenant, listing)
    expect(steps.some((s) => s.includes('BBB accredited'))).toBe(true)

    const gbp = CITATION_SOURCES.find((s) => s.key === 'google_business_profile')!
    expect(manualStepsFor(gbp, tenant, listing).some((s) => s.includes('BBB accredited'))).toBe(false)
  })

  it('gives Bing Places a shortcut "Import from Google" step when the tenant already connected GBP', () => {
    const bing = CITATION_SOURCES.find((s) => s.key === 'bing_places')!
    const connectedTenant: TenantFleetRow = { ...tenant, googleBusinessConnected: true }

    const stepsConnected = manualStepsFor(bing, connectedTenant, listing)
    expect(stepsConnected.some((s) => s.includes('Import from Google'))).toBe(true)

    const stepsUnconnected = manualStepsFor(bing, tenant, listing)
    expect(stepsUnconnected.some((s) => s.includes('Import from Google'))).toBe(false)
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

  it('every proposed citation row carries a non-empty manualSteps checklist', async () => {
    tenantDomainRows = [{ domain: 'example-towing.com', tenant_id: 't1' }]
    tenantRows = [{ id: 't1', name: 'Example Towing', phone: '555-1212', website_url: null, industry: 'towing' }]

    await generateBacklinkProposals({ limit: 10 })

    const citationRows = backlinkRows.filter((r) => r.tenant_id === 't1' && r.kind === 'citation')
    expect(citationRows.length).toBeGreaterThan(0)
    for (const row of citationRows) {
      const listing = row.listing as { manualSteps?: string[] }
      expect(listing.manualSteps?.length).toBeGreaterThan(0)
    }
  })

  it('skips proposing google_business_profile when the tenant already has a connected GBP location (closes the previously-unenforced check)', async () => {
    tenantDomainRows = [{ domain: 'example-towing.com', tenant_id: 't1' }]
    tenantRows = [{
      id: 't1', name: 'Example Towing', phone: null, website_url: null, industry: 'towing',
      google_business: { location_name: 'locations/already-connected' },
    }]

    const summary = await generateBacklinkProposals({ limit: 10 })

    const citationKeys = backlinkRows.filter((r) => r.tenant_id === 't1' && r.kind === 'citation').map((r) => r.source_key)
    expect(citationKeys).not.toContain('google_business_profile')
    const universalCount = CITATION_SOURCES.filter((s) => s.appliesTo === 'all').length
    expect(summary.citationProposals).toBe(universalCount - 1)
  })

  it('wrong-tenant probe: one tenant already connecting GBP never suppresses the proposal for a different, unconnected tenant', async () => {
    tenantDomainRows = [
      { domain: 'a-towing.com', tenant_id: 't1' },
      { domain: 'b-towing.com', tenant_id: 't2' },
    ]
    tenantRows = [
      { id: 't1', name: 'A Towing', phone: null, website_url: null, industry: 'towing', google_business: { location_name: 'locations/connected' } },
      { id: 't2', name: 'B Towing', phone: null, website_url: null, industry: 'towing', google_business: null },
    ]

    await generateBacklinkProposals({ limit: 10 })

    const t1Keys = backlinkRows.filter((r) => r.tenant_id === 't1' && r.kind === 'citation').map((r) => r.source_key)
    const t2Keys = backlinkRows.filter((r) => r.tenant_id === 't2' && r.kind === 'citation').map((r) => r.source_key)
    expect(t1Keys).not.toContain('google_business_profile')
    expect(t2Keys).toContain('google_business_profile')
  })

  it('drafts nothing for a cancelled tenant, still drafts for an active one (status-gate)', async () => {
    tenantDomainRows = [
      { domain: 'cancelled-co.com', tenant_id: 't-cancel' },
      { domain: 'active-co.com', tenant_id: 't-active' },
    ]
    tenantRows = [
      { id: 't-cancel', name: 'Cancelled Co', phone: null, website_url: null, industry: 'towing', status: 'cancelled' },
      { id: 't-active', name: 'Active Co', phone: null, website_url: null, industry: 'towing', status: 'active' },
    ]

    const summary = await generateBacklinkProposals({ limit: 10 })

    expect(summary.tenants).toBe(1)
    expect(backlinkRows.some((r) => r.tenant_id === 't-cancel')).toBe(false)
    expect(backlinkRows.some((r) => r.tenant_id === 't-active')).toBe(true)
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
