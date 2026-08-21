/**
 * Per-tenant service area model.
 *
 * Drives the team-page coverage heat map. A tenant's scope comes from its own
 * profile (set in onboarding / Settings), never from hardcoded defaults:
 *   - local    → operates in one metro / set of zones (e.g. NYC Maid).
 *   - regional → operates across a bounded set of states / metros (e.g. the
 *                tri-state area). Shown state-by-state like national, but the
 *                state set is finite (no "ALL").
 *   - national → operates across many states, up to all 50 (e.g. we-pay-you-junk).
 *
 * Stored in `tenants.selena_config.service_area` (jsonb) so no schema migration
 * is needed.
 *
 * - local            → map shows the tenant's zones (borough/neighborhood) + pins.
 * - regional/national → map shows US-state coverage of where team lives,
 *                       highlighting the tenant's service-area states and
 *                       flagging states with no / thin coverage.
 */

export type BusinessScope = 'local' | 'regional' | 'national'

export interface ServiceZone {
  id: string
  label: string
  /** Whether reaching this zone requires a car (informational). */
  car_required?: boolean
}

export interface ServiceArea {
  scope: BusinessScope
  /**
   * Two-letter state codes the tenant serves. For `national` with full reach,
   * use ['ALL']. For `regional`, a finite set of states ('ALL' is not allowed).
   */
  states: string[]
  /** Local-scope zones (boroughs / neighborhoods / suburbs). Empty for regional/national. */
  zones: ServiceZone[]
}

/** True when the tenant's map is state-based (regional or national) vs zone-based (local). */
export function isStateScoped(scope: BusinessScope): boolean {
  return scope === 'regional' || scope === 'national'
}

export const US_STATES: ReadonlyArray<{ code: string; name: string }> = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'DC', name: 'District of Columbia' },
  { code: 'FL', name: 'Florida' }, { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' }, { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' }, { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' }, { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' }, { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' }, { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' }, { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' }, { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' }, { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' }, { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' }, { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' }, { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' }, { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' }, { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' },
]

const STATE_CODES = new Set(US_STATES.map((s) => s.code))

// Directly-bordering states, both directions -- what "regional" should mean
// (e.g. a NY business's regional picker shows NY/NJ/CT/PA/MA/VT, not all 50).
// DC has no state neighbors of its own; MD/VA list it explicitly instead.
const STATE_BORDERS: Record<string, string[]> = {
  AL: ['FL', 'GA', 'MS', 'TN'], AK: [], AZ: ['CA', 'NV', 'NM', 'UT'],
  AR: ['LA', 'MS', 'MO', 'OK', 'TN', 'TX'], CA: ['AZ', 'NV', 'OR'],
  CO: ['AZ', 'KS', 'NE', 'NM', 'OK', 'UT', 'WY'], CT: ['MA', 'NY', 'RI'],
  DE: ['MD', 'NJ', 'PA'], DC: ['MD', 'VA'], FL: ['AL', 'GA'],
  GA: ['AL', 'FL', 'NC', 'SC', 'TN'], HI: [], ID: ['MT', 'NV', 'OR', 'UT', 'WA', 'WY'],
  IL: ['IN', 'IA', 'KY', 'MO', 'WI'], IN: ['IL', 'KY', 'MI', 'OH'],
  IA: ['IL', 'MN', 'MO', 'NE', 'SD', 'WI'], KS: ['CO', 'MO', 'NE', 'OK'],
  KY: ['IL', 'IN', 'MO', 'OH', 'TN', 'VA', 'WV'], LA: ['AR', 'MS', 'TX'],
  ME: ['NH'], MD: ['DC', 'DE', 'PA', 'VA', 'WV'], MA: ['CT', 'NH', 'NY', 'RI', 'VT'],
  MI: ['IN', 'OH', 'WI'], MN: ['IA', 'ND', 'SD', 'WI'], MS: ['AL', 'AR', 'LA', 'TN'],
  MO: ['AR', 'IL', 'IA', 'KS', 'KY', 'NE', 'OK', 'TN'], MT: ['ID', 'ND', 'SD', 'WY'],
  NE: ['CO', 'IA', 'KS', 'MO', 'SD', 'WY'], NV: ['AZ', 'CA', 'ID', 'OR', 'UT'],
  NH: ['ME', 'MA', 'VT'], NJ: ['DE', 'NY', 'PA'], NM: ['AZ', 'CO', 'OK', 'TX', 'UT'],
  NY: ['CT', 'MA', 'NJ', 'PA', 'VT'], NC: ['GA', 'SC', 'TN', 'VA'], ND: ['MN', 'MT', 'SD'],
  OH: ['IN', 'KY', 'MI', 'PA', 'WV'], OK: ['AR', 'CO', 'KS', 'MO', 'NM', 'TX'],
  OR: ['CA', 'ID', 'NV', 'WA'], PA: ['DE', 'MD', 'NJ', 'NY', 'OH', 'WV'],
  RI: ['CT', 'MA'], SC: ['GA', 'NC'], SD: ['IA', 'MN', 'MT', 'ND', 'NE', 'WY'],
  TN: ['AL', 'AR', 'GA', 'KY', 'MS', 'MO', 'NC', 'VA'], TX: ['AR', 'LA', 'NM', 'OK'],
  UT: ['AZ', 'CO', 'ID', 'NV', 'NM', 'WY'], VT: ['MA', 'NH', 'NY'],
  VA: ['DC', 'KY', 'MD', 'NC', 'TN', 'WV'], WA: ['ID', 'OR'], WV: ['KY', 'MD', 'OH', 'PA', 'VA'],
  WI: ['IL', 'IA', 'MI', 'MN'], WY: ['CO', 'ID', 'MT', 'NE', 'SD', 'UT'],
}

/** Home state + its direct neighbors — the default "regional" set. */
export function neighboringStates(homeState: string | null | undefined): string[] {
  const code = (homeState || '').toUpperCase()
  if (!STATE_CODES.has(code)) return []
  return [code, ...(STATE_BORDERS[code] || [])]
}

export function isValidStateCode(code: string): boolean {
  return STATE_CODES.has(code.toUpperCase())
}

export function stateName(code: string): string {
  return US_STATES.find((s) => s.code === code.toUpperCase())?.name ?? code
}

/** The 5 NYC boroughs, plain — the auto-detected default for a "local" NYC
 *  tenant. Distinct from NYC_DEFAULT_ZONES above (9 zones incl. Manhattan
 *  split 3 ways, Long Island, NJ Hudson): that's the manual "quick add"
 *  preset for a tenant who wants finer detail; this is the simple 5-borough
 *  set that address-based auto-detection fills in by default. */
export const NYC_FIVE_BOROUGHS: ServiceZone[] = [
  { id: 'manhattan', label: 'Manhattan' },
  { id: 'brooklyn', label: 'Brooklyn' },
  { id: 'queens', label: 'Queens' },
  { id: 'bronx', label: 'Bronx' },
  { id: 'staten_island', label: 'Staten Island', car_required: true },
]

const NYC_BOROUGH_NAMES = new Set(['manhattan', 'brooklyn', 'queens', 'bronx', 'staten island'])

/** True when Radar resolved this address to one of the 5 NYC boroughs —
 *  AddressAutocomplete.tsx already puts the borough name in `city` for a NYC
 *  address (addr.borough || addr.city), so this is a plain string check, no
 *  separate borough field needs to be threaded through. */
export function isNycAddress(city: string | null | undefined, state: string | null | undefined): boolean {
  return (state || '').toUpperCase() === 'NY' && NYC_BOROUGH_NAMES.has((city || '').trim().toLowerCase())
}

/**
 * Auto-fill for a verified address, per scope (2026-08-02 — Jeff, explicit
 * rule): a NYC address gets a real default instead of an empty map the
 * tenant has to build by hand. Returns null when nothing to auto-fill (no
 * verified address yet, or an address outside the one case we have real
 * preset data for) — caller should leave the existing area untouched, never
 * silently guess for a metro we don't have data on.
 */
export function deriveServiceAreaForAddress(
  scope: BusinessScope,
  city: string | null | undefined,
  state: string | null | undefined,
): Pick<ServiceArea, 'states' | 'zones'> | null {
  if (scope === 'national') return { states: ['ALL'], zones: [] }
  if (!isNycAddress(city, state)) return null
  if (scope === 'local') return { states: ['NY'], zones: NYC_FIVE_BOROUGHS }
  return { states: ['NY', 'CT', 'NJ'], zones: [] } // regional
}

/** Default zones for a NYC-metro local tenant (the NYC Maid preset). */
export const NYC_DEFAULT_ZONES: ServiceZone[] = [
  { id: 'manhattan_downtown', label: 'Manhattan — Downtown (below 34th)' },
  { id: 'manhattan_midtown', label: 'Manhattan — Midtown (34th to 90th)' },
  { id: 'manhattan_uptown', label: 'Manhattan — Uptown (above 90th)' },
  { id: 'brooklyn', label: 'Brooklyn' },
  { id: 'queens', label: 'Queens' },
  { id: 'bronx', label: 'Bronx' },
  { id: 'staten_island', label: 'Staten Island', car_required: true },
  { id: 'long_island', label: 'Long Island', car_required: true },
  { id: 'nj_hudson', label: 'NJ — Hoboken / Jersey City / Weehawken' },
]

/** The NYC-metro local preset (NYC Maid). A CHOOSABLE preset — never a silent default. */
export const DEFAULT_SERVICE_AREA: ServiceArea = {
  scope: 'local',
  states: ['NY'],
  zones: NYC_DEFAULT_ZONES,
}

/**
 * Neutral fallback for a tenant that has NOT configured a service area yet.
 * Local scope with NO zones → the map plots team pins only, with no false
 * borough overlay. This is what an unconfigured national/regional tenant like
 * we-pay-you-junk gets until its profile sets the real scope.
 */
export const NEUTRAL_SERVICE_AREA: ServiceArea = {
  scope: 'local',
  states: [],
  zones: [],
}

/**
 * Narrow unknown jsonb into a valid ServiceArea.
 *
 * This respects exactly what was stored — it does NOT inject NYC zones or a
 * default state. Empty stays empty so a tenant only ever shows the coverage it
 * actually configured. Non-object input falls back to NEUTRAL (not NYC).
 */
export function parseServiceArea(raw: unknown): ServiceArea {
  if (!raw || typeof raw !== 'object') return NEUTRAL_SERVICE_AREA
  const r = raw as Record<string, unknown>
  const scope: BusinessScope =
    r.scope === 'national' ? 'national' : r.scope === 'regional' ? 'regional' : 'local'
  const parsedStates = Array.isArray(r.states)
    ? r.states.filter((s): s is string => typeof s === 'string' && (s === 'ALL' || isValidStateCode(s))).map((s) => s.toUpperCase())
    : []
  // 'ALL' is only meaningful for national; regional is a finite state set.
  const states = scope === 'regional' ? parsedStates.filter((s) => s !== 'ALL') : parsedStates
  const zones = Array.isArray(r.zones)
    ? r.zones.filter((z): z is ServiceZone => !!z && typeof z === 'object' && typeof (z as ServiceZone).id === 'string')
    : []
  // Only local scope carries zones.
  return { scope, states, zones: scope === 'local' ? zones : [] }
}

/**
 * Read a tenant's service area from its `selena_config` jsonb.
 * `selenaConfig` is the raw column value (object or null).
 *
 * Resolution order: explicit `service_area` → legacy NYC `service_zones`
 * back-compat → NEUTRAL (pins only). Never silently returns the NYC preset for
 * a tenant that didn't configure it.
 */
export function getServiceArea(selenaConfig: unknown): ServiceArea {
  const cfg = (selenaConfig && typeof selenaConfig === 'object') ? (selenaConfig as Record<string, unknown>) : {}
  if (cfg.service_area) return parseServiceArea(cfg.service_area)
  // Back-compat: a tenant with legacy NYC service_zones is a local NYC tenant.
  if (Array.isArray(cfg.service_zones) && cfg.service_zones.length) return DEFAULT_SERVICE_AREA
  return NEUTRAL_SERVICE_AREA
}

/** Merge an updated service area back into a selena_config object (immutably). */
export function withServiceArea(selenaConfig: unknown, area: ServiceArea): Record<string, unknown> {
  const base = (selenaConfig && typeof selenaConfig === 'object') ? (selenaConfig as Record<string, unknown>) : {}
  return { ...base, service_area: area }
}

/**
 * Whether a submitted booking address is allowed under a tenant's configured
 * service area. Fails OPEN (returns true) whenever the tenant hasn't actually
 * configured enforcement, or when the configured zones aren't ones we can
 * verify yet (see below) — this only ever tightens booking for a tenant that
 * explicitly set a checkable area, never silently blocks an unconfigured or
 * partially-configured one.
 *
 * Only local-scope zones drawn entirely from the 5 NYC boroughs are checked
 * against the address today (isNycAddress) — that's the one case with a
 * reliable city-name check (Radar puts the borough name straight in `city`
 * for a NYC address). A zone list that also includes non-borough zones
 * (Long Island, NJ Hudson, custom neighborhoods) can't be verified this way
 * yet, so it's left unenforced rather than risk falsely rejecting a real
 * customer — see The NYC Exterminator / Southampton incident, 2026-08-21.
 */
export function isWithinServiceArea(
  area: ServiceArea,
  city: string | null | undefined,
  state: string | null | undefined,
): boolean {
  if (area.scope !== 'local') {
    if (!area.states.length) return true
    return area.states.includes('ALL') || area.states.includes((state || '').toUpperCase())
  }
  if (!area.zones.length) return true
  const allBoroughZones = area.zones.every((z) => NYC_FIVE_BOROUGHS.some((b) => b.id === z.id))
  if (!allBoroughZones) return true
  return isNycAddress(city, state)
}
