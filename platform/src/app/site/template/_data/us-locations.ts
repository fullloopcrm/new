/**
 * US location dataset for national programmatic SEO (virtual-assistant vertical
 * and any future national/remote tenant). 50 states + top 100 cities = 150
 * location pages; crossed with the service list this drives the geo×service
 * matrix. Data-only — no tenant coupling, so it stays inside the GLOBAL RULE.
 */

export interface USLocation {
  /** URL slug, e.g. "california" or "chicago-il" */
  slug: string
  /** Display name, e.g. "California" or "Chicago, IL" */
  name: string
  /** Short display name without state, e.g. "Chicago" */
  shortName: string
  /** 'state' | 'city' */
  type: 'state' | 'city'
  /** Two-letter state code, e.g. "CA" */
  stateCode: string
  /** Full state name, e.g. "California" */
  stateName: string
}

const STATE_DEFS: [name: string, code: string][] = [
  ['Alabama', 'AL'], ['Alaska', 'AK'], ['Arizona', 'AZ'], ['Arkansas', 'AR'],
  ['California', 'CA'], ['Colorado', 'CO'], ['Connecticut', 'CT'], ['Delaware', 'DE'],
  ['Florida', 'FL'], ['Georgia', 'GA'], ['Hawaii', 'HI'], ['Idaho', 'ID'],
  ['Illinois', 'IL'], ['Indiana', 'IN'], ['Iowa', 'IA'], ['Kansas', 'KS'],
  ['Kentucky', 'KY'], ['Louisiana', 'LA'], ['Maine', 'ME'], ['Maryland', 'MD'],
  ['Massachusetts', 'MA'], ['Michigan', 'MI'], ['Minnesota', 'MN'], ['Mississippi', 'MS'],
  ['Missouri', 'MO'], ['Montana', 'MT'], ['Nebraska', 'NE'], ['Nevada', 'NV'],
  ['New Hampshire', 'NH'], ['New Jersey', 'NJ'], ['New Mexico', 'NM'], ['New York', 'NY'],
  ['North Carolina', 'NC'], ['North Dakota', 'ND'], ['Ohio', 'OH'], ['Oklahoma', 'OK'],
  ['Oregon', 'OR'], ['Pennsylvania', 'PA'], ['Rhode Island', 'RI'], ['South Carolina', 'SC'],
  ['South Dakota', 'SD'], ['Tennessee', 'TN'], ['Texas', 'TX'], ['Utah', 'UT'],
  ['Vermont', 'VT'], ['Virginia', 'VA'], ['Washington', 'WA'], ['West Virginia', 'WV'],
  ['Wisconsin', 'WI'], ['Wyoming', 'WY'],
]

// Top 100 US cities by population. [city, stateCode]
const CITY_DEFS: [city: string, code: string][] = [
  ['New York', 'NY'], ['Los Angeles', 'CA'], ['Chicago', 'IL'], ['Houston', 'TX'],
  ['Phoenix', 'AZ'], ['Philadelphia', 'PA'], ['San Antonio', 'TX'], ['San Diego', 'CA'],
  ['Dallas', 'TX'], ['San Jose', 'CA'], ['Austin', 'TX'], ['Jacksonville', 'FL'],
  ['Fort Worth', 'TX'], ['Columbus', 'OH'], ['Charlotte', 'NC'], ['Indianapolis', 'IN'],
  ['San Francisco', 'CA'], ['Seattle', 'WA'], ['Denver', 'CO'], ['Washington', 'DC'],
  ['Nashville', 'TN'], ['Oklahoma City', 'OK'], ['El Paso', 'TX'], ['Boston', 'MA'],
  ['Portland', 'OR'], ['Las Vegas', 'NV'], ['Detroit', 'MI'], ['Memphis', 'TN'],
  ['Louisville', 'KY'], ['Baltimore', 'MD'], ['Milwaukee', 'WI'], ['Albuquerque', 'NM'],
  ['Tucson', 'AZ'], ['Fresno', 'CA'], ['Sacramento', 'CA'], ['Mesa', 'AZ'],
  ['Kansas City', 'MO'], ['Atlanta', 'GA'], ['Omaha', 'NE'], ['Colorado Springs', 'CO'],
  ['Raleigh', 'NC'], ['Long Beach', 'CA'], ['Virginia Beach', 'VA'], ['Miami', 'FL'],
  ['Oakland', 'CA'], ['Minneapolis', 'MN'], ['Tulsa', 'OK'], ['Bakersfield', 'CA'],
  ['Wichita', 'KS'], ['Arlington', 'TX'], ['Aurora', 'CO'], ['Tampa', 'FL'],
  ['New Orleans', 'LA'], ['Cleveland', 'OH'], ['Honolulu', 'HI'], ['Anaheim', 'CA'],
  ['Lexington', 'KY'], ['Stockton', 'CA'], ['Corpus Christi', 'TX'], ['Henderson', 'NV'],
  ['Riverside', 'CA'], ['Newark', 'NJ'], ['Saint Paul', 'MN'], ['Santa Ana', 'CA'],
  ['Cincinnati', 'OH'], ['Irvine', 'CA'], ['Orlando', 'FL'], ['Pittsburgh', 'PA'],
  ['St. Louis', 'MO'], ['Greensboro', 'NC'], ['Jersey City', 'NJ'], ['Anchorage', 'AK'],
  ['Lincoln', 'NE'], ['Plano', 'TX'], ['Durham', 'NC'], ['Buffalo', 'NY'],
  ['Chandler', 'AZ'], ['Chula Vista', 'CA'], ['Toledo', 'OH'], ['Madison', 'WI'],
  ['Gilbert', 'AZ'], ['Reno', 'NV'], ['Fort Wayne', 'IN'], ['North Las Vegas', 'NV'],
  ['St. Petersburg', 'FL'], ['Lubbock', 'TX'], ['Irving', 'TX'], ['Laredo', 'TX'],
  ['Winston-Salem', 'NC'], ['Chesapeake', 'VA'], ['Glendale', 'AZ'], ['Garland', 'TX'],
  ['Scottsdale', 'AZ'], ['Norfolk', 'VA'], ['Boise', 'ID'], ['Fremont', 'CA'],
  ['Spokane', 'WA'], ['Santa Clarita', 'CA'], ['Baton Rouge', 'LA'], ['Richmond', 'VA'],
]

function kebab(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export const STATES: USLocation[] = STATE_DEFS.map(([name, code]) => ({
  slug: kebab(name),
  name,
  shortName: name,
  type: 'state',
  stateCode: code,
  stateName: name,
}))

const STATE_NAME_BY_CODE: Record<string, string> = Object.fromEntries(
  STATE_DEFS.map(([name, code]) => [code, name]),
)
// DC is a city-level entry with no state row; give it a display name.
STATE_NAME_BY_CODE['DC'] = 'District of Columbia'

export const CITIES: USLocation[] = CITY_DEFS.map(([city, code]) => ({
  slug: `${kebab(city)}-${code.toLowerCase()}`,
  name: `${city}, ${code}`,
  shortName: city,
  type: 'city',
  stateCode: code,
  stateName: STATE_NAME_BY_CODE[code] ?? code,
}))

/** All 150 locations (50 states + 100 cities). */
export const ALL_LOCATIONS: USLocation[] = [...STATES, ...CITIES]

const LOCATION_BY_SLUG: Record<string, USLocation> = Object.fromEntries(
  ALL_LOCATIONS.map((l) => [l.slug, l]),
)

export function getLocationBySlug(slug: string): USLocation | null {
  return LOCATION_BY_SLUG[slug] ?? null
}
