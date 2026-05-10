// @ts-nocheck
// Zip code → Neighborhood mapping for NYC Mobile Salon service areas

export const ZIP_TO_NEIGHBORHOOD: Record<string, string> = {
  // Manhattan
  '10021': 'Upper East Side', '10028': 'Upper East Side', '10065': 'Upper East Side',
  '10075': 'Upper East Side', '10128': 'Upper East Side', '10029': 'Upper East Side',
  '10023': 'Upper West Side', '10024': 'Upper West Side', '10025': 'Upper West Side',
  '10017': 'Midtown', '10018': 'Midtown', '10020': 'Midtown', '10022': 'Midtown',
  '10019': 'Hells Kitchen', '10036': 'Hells Kitchen',
  '10001': 'Chelsea', '10011': 'Chelsea',
  '10010': 'Gramercy', '10016': 'Murray Hill',
  '10014': 'West Village', '10012': 'Greenwich Village',
  '10003': 'East Village', '10009': 'East Village',
  '10002': 'Lower East Side',
  '10013': 'Tribeca', '10007': 'Tribeca',
  '10006': 'Financial District', '10005': 'Financial District', '10004': 'Financial District',
  '10280': 'Battery Park', '10282': 'Battery Park',
  '10026': 'Harlem', '10027': 'Harlem', '10030': 'Harlem',
  '10031': 'Washington Heights', '10032': 'Washington Heights',

  // Brooklyn
  '11201': 'Brooklyn Heights', '11205': 'Brooklyn Heights',
  '11217': 'Park Slope', '11215': 'Park Slope',
  '11251': 'DUMBO',

  // Queens
  '11101': 'Long Island City', '11109': 'Long Island City',
  '11102': 'Astoria', '11103': 'Astoria', '11105': 'Astoria', '11106': 'Astoria',
  '11104': 'Sunnyside', '11377': 'Woodside',
  '11372': 'Jackson Heights', '11370': 'Jackson Heights',
}

// Single domain — no multi-domain attribution needed
export const NEIGHBORHOOD_TO_DOMAINS: Record<string, string[]> = {}

export function extractZip(address: string): string | null {
  const match = address.match(/\b(\d{5})(?:-\d{4})?\s*$/)
  if (match) return match[1]
  const anyMatch = address.match(/\b(\d{5})\b/)
  return anyMatch ? anyMatch[1] : null
}

export function getNeighborhood(zip: string): string | null {
  return ZIP_TO_NEIGHBORHOOD[zip] || null
}

export function getDomainsForNeighborhood(neighborhood: string): string[] {
  return NEIGHBORHOOD_TO_DOMAINS[neighborhood] || []
}

// Stub — no multi-domain attribution for single-site salon
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function attributeByAddress(..._args: unknown[]): Promise<null> {
  return null
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function attributeCollectForm(..._args: unknown[]): Promise<null> {
  return null
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function autoAttributeBooking(..._args: unknown[]): Promise<null> {
  return null
}

export function calculateConfidence(minutesAgo: number): number {
  const days = Math.floor(minutesAgo / 1440)
  if (days <= 0) return 100
  if (days >= 10) return 0
  return 100 - (days * 10)
}
