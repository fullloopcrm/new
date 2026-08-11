// Best-effort IP -> city/region lookup for anonymous Comm Hub webchat
// contacts (2026-08-10). ipinfo.io's free tier needs no token at this
// volume (one lookup per new anonymous contact, not per message). City/region
// only — that's the ceiling of what IP geolocation can ever give you, never
// an exact address or an identity.
export type IpGeo = { city: string | null; region: string | null }

const LOOKUP_TIMEOUT_MS = 2000

export async function lookupIpGeo(ip: string): Promise<IpGeo> {
  if (!ip || ip === 'unknown') return { city: null, region: null }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS)
    const res = await fetch(`https://ipinfo.io/${encodeURIComponent(ip)}/json`, {
      signal: controller.signal,
    })
    clearTimeout(timeout)
    if (!res.ok) return { city: null, region: null }

    const data = await res.json().catch(() => null) as { city?: string; region?: string } | null
    return { city: data?.city || null, region: data?.region || null }
  } catch {
    // Fail open — a slow/unreachable geolocation service should never block
    // the visitor's message from sending.
    return { city: null, region: null }
  }
}
