import { supabaseAdmin } from '@/lib/supabase'

const RADAR_API_KEY = process.env.RADAR_API_KEY || process.env.NEXT_PUBLIC_RADAR_API_KEY || ''

export const MAX_DISTANCE_MILES = 0.1

// Two-tier check-in geofence (NYC Maid parity). A cleaner beyond CLEAN radius
// but within HARD_BLOCK is allowed but flagged (NYC GPS drift); beyond HARD_BLOCK
// is a hard block. GPS can be toggled off via env for incident recovery.
export const CHECK_IN_MAX_MILES = Number(process.env.CHECK_IN_MAX_MILES) || 0.5
export const CHECK_IN_HARD_BLOCK_MILES = Number(process.env.CHECK_IN_HARD_BLOCK_MILES) || 2
export const CHECK_IN_GPS_ENABLED = process.env.CHECK_IN_GPS_ENABLED !== 'off'

export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(
      `https://api.radar.io/v1/geocode/forward?query=${encodeURIComponent(address)}`,
      { headers: { 'Authorization': RADAR_API_KEY } }
    )
    const data = await res.json()
    if (data.addresses && data.addresses.length > 0) {
      return { lat: data.addresses[0].latitude, lng: data.addresses[0].longitude }
    }
  } catch (e) {
    console.error('Geocode error:', e)
  }
  return null
}

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

// Estimate travel time from straight-line distance
// Transit: subway/bus — avg ~12mph effective speed in NYC
// Driving: car — avg ~15mph effective speed in NYC (traffic)
// +20% buffer on both for real-world delays
export function estimateTransitMinutes(distanceMiles: number, hasCar = false): number {
  let base: number
  if (distanceMiles < 0.3) {
    base = hasCar ? 5 : 8 // walking vs driving short distance
  } else if (hasCar) {
    // Driving in NYC: ~15mph avg including parking
    base = Math.round(5 + distanceMiles * 4)
  } else {
    // Subway/bus: ~12mph avg including wait time
    base = Math.round(10 + distanceMiles * 5)
  }
  return Math.round(base * 1.2) // +20% buffer
}

// Geocode and cache lat/lng on a client record
export async function geocodeClient(clientId: string, address: string): Promise<{ lat: number; lng: number } | null> {
  const coords = await geocodeAddress(address)
  if (coords) {
    await supabaseAdmin.from('clients').update({ latitude: coords.lat, longitude: coords.lng }).eq('id', clientId)
  }
  return coords
}

// Geocode and cache lat/lng on a cleaner record
export async function geocodeCleaner(cleanerId: string, address: string): Promise<{ lat: number; lng: number } | null> {
  const coords = await geocodeAddress(address)
  if (coords) {
    await supabaseAdmin.from('cleaners').update({ home_latitude: coords.lat, home_longitude: coords.lng }).eq('id', cleanerId)
  }
  return coords
}
