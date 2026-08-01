import type { NextRequest } from 'next/server'

export const EU_JURISDICTION_COUNTRIES = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU',
  'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES',
  'SE', // EU
  'IS', 'LI', 'NO', // EEA
  'GB', // UK
  'CH', // Switzerland
])

export const EU_REGION_COOKIE = 'fl_region_eu'

/** Vercel sets this header at the edge for every request; absent in local dev. */
export function isEuJurisdiction(req: NextRequest): boolean {
  const country = req.headers.get('x-vercel-ip-country')
  return !!country && EU_JURISDICTION_COUNTRIES.has(country.toUpperCase())
}
