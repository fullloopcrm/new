// ---------------------------------------------------------------------------
// SERP client — the one external eye SIGNAL has on the competition.
//
// GSC only reports YOUR OWN property. To answer "who is outranking me for my
// money keywords, and what are they doing?" the engine needs live Google SERPs.
// This wraps Serper.dev (google.serper.dev/search): one POST, JSON back, cheap
// (~$0.001/query), ToS-clean. Everything downstream consumes the normalized
// SerpResult, so a different provider could be dropped in behind fetchSerp
// without touching the engine.
// ---------------------------------------------------------------------------

export type SerpOrganic = {
  position: number
  domain: string
  url: string
  title: string
  snippet: string
}

export type SerpResult = {
  query: string
  organic: SerpOrganic[]
}

/** 'https://www.foo.com/bar' -> 'foo.com'. Best-effort; returns input on parse fail. */
export function urlToDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return url.toLowerCase()
  }
}

const SERPER_ENDPOINT = 'https://google.serper.dev/search'

/**
 * Fetch the top organic results for one query. `num` caps how many results
 * (Serper bills per query, not per result). gl/hl default to US/English —
 * these are US local-service businesses.
 */
export async function fetchSerp(
  query: string,
  opts?: { num?: number; gl?: string; hl?: string; location?: string },
): Promise<SerpResult> {
  const key = process.env.SERPER_API_KEY
  if (!key) {
    throw new Error('SERPER_API_KEY is not set — competitor SERP scanning is disabled until it is configured.')
  }

  const res = await fetch(SERPER_ENDPOINT, {
    method: 'POST',
    headers: { 'X-API-KEY': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      q: query,
      num: opts?.num ?? 10,
      gl: opts?.gl ?? 'us',
      hl: opts?.hl ?? 'en',
      ...(opts?.location ? { location: opts.location } : {}),
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Serper ${res.status}: ${body.slice(0, 300)}`)
  }

  const json = (await res.json()) as {
    organic?: Array<{ position?: number; link?: string; title?: string; snippet?: string }>
  }

  const organic: SerpOrganic[] = (json.organic ?? [])
    .filter((o) => typeof o.link === 'string')
    .map((o, i) => ({
      position: o.position ?? i + 1,
      domain: urlToDomain(o.link as string),
      url: o.link as string,
      title: o.title?.trim() ?? '',
      snippet: o.snippet?.trim() ?? '',
    }))

  return { query, organic }
}

/** True when the SERP provider is configured — lets callers skip gracefully. */
export function serpEnabled(): boolean {
  return !!process.env.SERPER_API_KEY
}
