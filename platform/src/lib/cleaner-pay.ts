import { guessZoneFromAddress } from './service-zones'

// Regional worker pay: a team member assigned to a job in New Jersey, Long
// Island, or Westchester County is paid a FLAT $35/hr for that job — always $35
// in those areas, regardless of the worker's usual rate. Job-location based (not
// the worker's home). Ported global from NYC Maid; applies to tenants whose data
// puts jobs in these NYC-metro premium zones.

export const REGION_PREMIUM_RATE = 35

// Zones that trigger the premium (ids from service-zones.ts).
const PREMIUM_ZONES = new Set(['long_island', 'westchester', 'nj_hudson', 'nj_other'])

// Nassau/Suffolk (Long Island) ZIP ranges: 115xx, 117xx, 118xx, 119xx.
// Deliberately excludes 116xx (Queens / Far Rockaway) and 110xx-114xx (Queens).
// guessZoneFromAddress only catches LI via the words Nassau/Suffolk/Long Island,
// so it misses towns like Hempstead (11550) or Long Beach (11561). For PAY we
// add this ZIP backstop here — NOT in guessZoneFromAddress, which the scheduler
// shares and we don't want to perturb.
const LONG_ISLAND_ZIP = /\b11(5\d\d|7\d\d|8\d\d|9\d\d)\b/

export function isPremiumPayZone(jobAddress: string | null | undefined): boolean {
  if (!jobAddress) return false
  const zone = guessZoneFromAddress(jobAddress)
  if (zone != null && PREMIUM_ZONES.has(zone)) return true
  return LONG_ISLAND_ZIP.test(jobAddress.toLowerCase())
}

// Effective worker $/hr for a job: flat $35 in a premium region, else baseRate.
export function effectiveCleanerRate(baseRate: number, jobAddress: string | null | undefined): number {
  return isPremiumPayZone(jobAddress) ? REGION_PREMIUM_RATE : baseRate
}
