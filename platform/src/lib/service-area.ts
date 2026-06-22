/**
 * Per-tenant service area model.
 *
 * Drives the team-page coverage heat map: a tenant is either `local` (operates
 * in one metro / set of zones — e.g. NYC Maid) or `national` (operates across
 * states). Stored in `tenants.selena_config.service_area` (jsonb) so no schema
 * migration is needed.
 *
 * - local    → map shows the tenant's zones (city/borough granularity) + pins.
 * - national → map shows a US-state density choropleth of where team lives,
 *              highlighting the tenant's selected service-area states and
 *              flagging states with no / thin coverage.
 */

export type BusinessScope = 'local' | 'national'

export interface ServiceZone {
  id: string
  label: string
  /** Whether reaching this zone requires a car (informational). */
  car_required?: boolean
}

export interface ServiceArea {
  scope: BusinessScope
  /** Two-letter state codes the tenant serves. For `national` with full reach, use ['ALL']. */
  states: string[]
  /** Local-scope zones (boroughs / neighborhoods / suburbs). Empty for national. */
  zones: ServiceZone[]
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

export function isValidStateCode(code: string): boolean {
  return STATE_CODES.has(code.toUpperCase())
}

export function stateName(code: string): string {
  return US_STATES.find((s) => s.code === code.toUpperCase())?.name ?? code
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

export const DEFAULT_SERVICE_AREA: ServiceArea = {
  scope: 'local',
  states: ['NY'],
  zones: NYC_DEFAULT_ZONES,
}

/** Narrow unknown jsonb into a valid ServiceArea, falling back to defaults. */
export function parseServiceArea(raw: unknown): ServiceArea {
  if (!raw || typeof raw !== 'object') return DEFAULT_SERVICE_AREA
  const r = raw as Record<string, unknown>
  const scope: BusinessScope = r.scope === 'national' ? 'national' : 'local'
  const states = Array.isArray(r.states)
    ? r.states.filter((s): s is string => typeof s === 'string' && (s === 'ALL' || isValidStateCode(s))).map((s) => s.toUpperCase())
    : DEFAULT_SERVICE_AREA.states
  const zones = Array.isArray(r.zones)
    ? r.zones.filter((z): z is ServiceZone => !!z && typeof z === 'object' && typeof (z as ServiceZone).id === 'string')
    : []
  return {
    scope,
    states: states.length ? states : DEFAULT_SERVICE_AREA.states,
    zones: scope === 'local' && zones.length === 0 ? NYC_DEFAULT_ZONES : zones,
  }
}

/**
 * Read a tenant's service area from its `selena_config` jsonb.
 * `selenaConfig` is the raw column value (object or null).
 */
export function getServiceArea(selenaConfig: unknown): ServiceArea {
  const cfg = (selenaConfig && typeof selenaConfig === 'object') ? (selenaConfig as Record<string, unknown>) : {}
  if (cfg.service_area) return parseServiceArea(cfg.service_area)
  // Back-compat: a tenant with legacy NYC service_zones is a local NYC tenant.
  if (Array.isArray(cfg.service_zones) && cfg.service_zones.length) return DEFAULT_SERVICE_AREA
  return DEFAULT_SERVICE_AREA
}

/** Merge an updated service area back into a selena_config object (immutably). */
export function withServiceArea(selenaConfig: unknown, area: ServiceArea): Record<string, unknown> {
  const base = (selenaConfig && typeof selenaConfig === 'object') ? (selenaConfig as Record<string, unknown>) : {}
  return { ...base, service_area: area }
}
