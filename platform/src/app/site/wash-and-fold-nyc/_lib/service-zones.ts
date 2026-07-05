export const SERVICE_ZONES = [
  { id: 'manhattan_downtown', label: 'Manhattan — Downtown (below 34th)', labelES: 'Manhattan — Centro (debajo de 34th)', car_required: false },
  { id: 'manhattan_midtown', label: 'Manhattan — Midtown (34th to 90th)', labelES: 'Manhattan — Midtown (34th a 90th)', car_required: false },
  { id: 'manhattan_uptown', label: 'Manhattan — Uptown (above 90th)', labelES: 'Manhattan — Uptown (arriba de 90th)', car_required: false },
  { id: 'brooklyn', label: 'Brooklyn', labelES: 'Brooklyn', car_required: false },
  { id: 'queens', label: 'Queens', labelES: 'Queens', car_required: false },
  { id: 'bronx', label: 'Bronx', labelES: 'Bronx', car_required: false },
  { id: 'staten_island', label: 'Staten Island', labelES: 'Staten Island', car_required: true },
  { id: 'long_island', label: 'Long Island', labelES: 'Long Island', car_required: true },
  { id: 'nj_hudson', label: 'NJ — Hoboken / Jersey City / Weehawken', labelES: 'NJ — Hoboken / Jersey City / Weehawken', car_required: false },
] as const

export type ServiceZoneId = typeof SERVICE_ZONES[number]['id']

// Given an address, guess the zone (used for smart suggestions)
export function guessZoneFromAddress(address: string): ServiceZoneId | null {
  const a = address.toLowerCase()

  // NJ
  if (a.includes('hoboken') || a.includes('jersey city') || a.includes('weehawken')) return 'nj_hudson'

  // Long Island
  if (a.includes('long island') || a.includes('nassau') || a.includes('suffolk') || a.includes(', li ')) return 'long_island'

  // Staten Island
  if (a.includes('staten island') || /\b1030[1-4]\b/.test(a)) return 'staten_island'

  // Bronx
  if (a.includes('bronx') || /\b104[0-7]\d\b/.test(a)) return 'bronx'

  // Queens
  if (a.includes('queens') || a.includes('flushing') || a.includes('astoria') || a.includes('long island city') || a.includes('lic') || a.includes('rego park') || a.includes('jackson heights') || a.includes('woodhaven') || a.includes('elmhurst') || a.includes('middle village') || a.includes('forest hills') || a.includes('jamaica') || a.includes('ridgewood') || /\b11[1-4]\d{2}\b/.test(a)) return 'queens'

  // Brooklyn
  if (a.includes('brooklyn') || a.includes('williamsburg') || a.includes('bushwick') || a.includes('bed-stuy') || a.includes('park slope') || a.includes('prospect') || a.includes('flatbush') || a.includes('greenpoint') || /\b112[0-3]\d\b/.test(a) || /\b112[0-9]{2}\b/.test(a)) return 'brooklyn'

  // Manhattan by zip
  const zipMatch = a.match(/\b(100\d{2})\b/)
  if (zipMatch) {
    const zip = parseInt(zipMatch[1])
    if (zip >= 10001 && zip <= 10013) return 'manhattan_downtown'
    if (zip >= 10014 && zip <= 10019) return 'manhattan_midtown' // west side midtown
    if (zip >= 10020 && zip <= 10022) return 'manhattan_midtown'
    if (zip >= 10023 && zip <= 10028) return 'manhattan_midtown' // UWS/UES
    if (zip >= 10029 && zip <= 10040) return 'manhattan_uptown'
    if (zip >= 10044 && zip <= 10048) return 'manhattan_midtown'
    if (zip >= 10065 && zip <= 10075) return 'manhattan_midtown' // UES
    if (zip >= 10128) return 'manhattan_uptown'
  }

  // Manhattan street number heuristic
  const stMatch = a.match(/(\d+)\s*(e|w|east|west)?\s*(\d+)\s*(st|th|nd|rd)/i)
  if (stMatch) {
    const streetNum = parseInt(stMatch[3])
    if (streetNum < 34) return 'manhattan_downtown'
    if (streetNum <= 90) return 'manhattan_midtown'
    return 'manhattan_uptown'
  }

  // Fallback keywords
  if (a.includes('gramercy') || a.includes('village') || a.includes('soho') || a.includes('tribeca') || a.includes('lower east') || a.includes('financial') || a.includes('chinatown') || a.includes('fulton')) return 'manhattan_downtown'
  if (a.includes('midtown') || a.includes('murray hill') || a.includes('hell') || a.includes('chelsea') || a.includes('flatiron') || a.includes('times square')) return 'manhattan_midtown'
  if (a.includes('harlem') || a.includes('washington heights') || a.includes('inwood')) return 'manhattan_uptown'

  return null
}

// Check if a zone requires a car
export function zoneRequiresCar(zoneId: string): boolean {
  return SERVICE_ZONES.find(z => z.id === zoneId)?.car_required ?? false
}
