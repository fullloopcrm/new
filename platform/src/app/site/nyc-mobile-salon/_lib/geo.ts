import { supabaseAdmin } from '@/app/site/nyc-mobile-salon/_lib/supabase'
// Re-export the global geocoder (Census server-side + Nominatim, CORS-safe in
// the browser) instead of this clone's own Radar-based implementation, which
// silently returned null on every call — RADAR_API_KEY was never configured
// for this tenant, so every geocodeClient/geocodeCleaner call below was a
// no-op. Matches the platform's GLOBAL RULE: one geocoder, not one per clone.
import { geocodeAddress } from '@/lib/geo'
export { geocodeAddress } from '@/lib/geo'

export const MAX_DISTANCE_MILES = 0.1

export function calculateDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 3958.8 // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Estimate NYC transit time from straight-line distance
export function estimateTransitMinutes(distanceMiles: number): number {
  if (distanceMiles < 0.3) return 5
  return Math.round(10 + distanceMiles * 5)
}

// Geocode and cache lat/lng on a client record
export async function geocodeClient(clientId: string, address: string): Promise<{ lat: number; lng: number } | null> {
  const coords = await geocodeAddress(address)
  if (coords) {
    await supabaseAdmin.from('clients').update({ latitude: coords.lat, longitude: coords.lng }).eq('id', clientId)
  }
  return coords
}

// Geocode and cache lat/lng on a stylist record. Was writing to a `cleaners`
// table that doesn't exist in this schema (real table: team_members) — every
// call silently no-op'd via Supabase's error-swallowing .update() pattern.
export async function geocodeCleaner(cleanerId: string, address: string): Promise<{ lat: number; lng: number } | null> {
  const coords = await geocodeAddress(address)
  if (coords) {
    await supabaseAdmin.from('team_members').update({ home_latitude: coords.lat, home_longitude: coords.lng }).eq('id', cleanerId)
  }
  return coords
}
