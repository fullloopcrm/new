import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/require-permission'
import { AuthError } from '@/lib/tenant-query'

interface TravelPair {
  from_address: string
  to_address: string
}

// Estimate transit time from straight-line distance (Haversine)
// ~10 min base + ~5 min per mile (urban estimate)
function estimateTransitMinutes(distanceMiles: number): number {
  if (distanceMiles < 0.3) return 5
  return Math.round(10 + distanceMiles * 5)
}

function toRad(deg: number): number {
  return deg * Math.PI / 180
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959 // Earth radius in miles
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Simple geocoding via Nominatim (free, no API key needed)
async function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`, {
      headers: { 'User-Agent': 'FullLoopCRM/1.0' },
    })
    const data = await res.json()
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
    }
  } catch { /* geocoding failed */ }
  return null
}

export async function POST(request: Request) {
  const { error: authError } = await requirePermission('bookings.view')
  if (authError) return authError

  try {
    const { pairs } = await request.json() as { pairs: TravelPair[] }
    if (!pairs || !Array.isArray(pairs) || pairs.length === 0) {
      return NextResponse.json({ error: 'pairs array required' }, { status: 400 })
    }

    // Limit to 10 pairs per request
    const limitedPairs = pairs.slice(0, 10)

    const results = await Promise.all(
      limitedPairs.map(async (pair) => {
        const [fromGeo, toGeo] = await Promise.all([
          geocode(pair.from_address),
          geocode(pair.to_address),
        ])

        if (!fromGeo || !toGeo) {
          return { from_address: pair.from_address, to_address: pair.to_address, duration_minutes: null }
        }

        const distance = haversineDistance(fromGeo.lat, fromGeo.lng, toGeo.lat, toGeo.lng)
        const minutes = estimateTransitMinutes(distance)

        return { from_address: pair.from_address, to_address: pair.to_address, duration_minutes: minutes, distance_miles: Math.round(distance * 10) / 10 }
      })
    )

    return NextResponse.json({ results })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
}
