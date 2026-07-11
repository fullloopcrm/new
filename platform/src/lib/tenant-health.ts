/**
 * Fortress — per-tenant live health checks.
 *
 * Detects the failure modes that caused the 2026-07-08 template-cutover outage:
 *  1. reachable    — homepage returns a 2xx (not down / 402 / 5xx)
 *  2. routing      — serves its OWN /site/<slug>, NOT the generic /site/template
 *                    (this is the "tenant silently serves the template" auto-detect)
 *  3. noLoop       — no apex<->www (or other) redirect loop
 *  4. formWired    — the lead endpoint exists (GET -> 405, not 404). GET only,
 *                    so the check never creates a row or fires a notification.
 *
 * Pure fetch-based; safe to run from a cron. No DB access here — the caller
 * loads the tenant list and persists results.
 */

import { assertPublicUrl } from './ssrf'

export type HealthStatus = 'pass' | 'fail'

export interface TenantHealth {
  slug: string
  domain: string
  status: HealthStatus
  matchedPath: string | null
  checks: {
    reachable: boolean
    routing: boolean
    noLoop: boolean
    formWired: boolean
  }
  detail: string
}

const MAX_HOPS = 8
const TIMEOUT_MS = 12_000

async function fetchHead(url: string, method: 'GET' | 'HEAD' = 'GET') {
  // SSRF guard: this follows redirects manually (see followFinal), so validate
  // every hop's URL before touching the network.
  await assertPublicUrl(url)
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    return await fetch(url, { method, redirect: 'manual', signal: ctrl.signal, cache: 'no-store' })
  } finally {
    clearTimeout(t)
  }
}

// Follow redirects manually so we can detect a loop (same host seen twice) and
// still read the final response's x-matched-path.
async function followFinal(startUrl: string): Promise<
  | { ok: true; status: number; matchedPath: string | null }
  | { ok: false; reason: 'loop' | 'too-many' | 'error'; status?: number }
> {
  let url = startUrl
  const seen = new Set<string>()
  for (let hop = 0; hop < MAX_HOPS; hop++) {
    let res: Response
    try {
      res = await fetchHead(url)
    } catch {
      return { ok: false, reason: 'error' }
    }
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location')
      if (!loc) return { ok: true, status: res.status, matchedPath: res.headers.get('x-matched-path') }
      const next = new URL(loc, url).toString()
      const key = next.split('?')[0]
      if (seen.has(key)) return { ok: false, reason: 'loop' }
      seen.add(key)
      url = next
      continue
    }
    return { ok: true, status: res.status, matchedPath: res.headers.get('x-matched-path') }
  }
  return { ok: false, reason: 'too-many' }
}

/**
 * @param expectedSlug the slug this tenant should serve, e.g. 'the-nyc-exterminator'.
 *   Pass 'template' for tenants intentionally on the shared template.
 * @param opts.routeGroupHome true for tenants whose homepage lives in a Next route
 *   group (e.g. wash-and-fold's `(marketing)/page.tsx`). Those legitimately report
 *   `x-matched-path: /` for the homepage, so a bare `/` counts as correctly routed
 *   as long as it isn't the template — the darkening failure modes still show
 *   `/site/template`, `/404`, or a loop, which stay caught.
 */
export async function checkTenant(
  slug: string,
  domain: string,
  expectedSlug = slug,
  opts: { routeGroupHome?: boolean } = {},
): Promise<TenantHealth> {
  const base = `https://${domain}`
  const nocache = () => `?cb=${Date.now()}${Math.floor(performance.now())}`

  const checks = { reachable: false, routing: false, noLoop: true, formWired: false }
  let matchedPath: string | null = null
  const notes: string[] = []

  // 1-3: homepage reachability + routing + loop
  const home = await followFinal(base + '/' + nocache())
  if (home.ok) {
    checks.reachable = home.status >= 200 && home.status < 300
    if (!checks.reachable) notes.push(`homepage ${home.status}`)
    matchedPath = home.matchedPath
    const expected = `/site/${expectedSlug}`
    // Route-group-homepage tenants report `/` for the homepage; that's fine as
    // long as it isn't the template (darkening still shows /site/template).
    const routeGroupOk = !!opts.routeGroupHome && matchedPath === '/'
    checks.routing = matchedPath === expected || routeGroupOk
    if (!checks.routing) {
      if (matchedPath === '/site/template') notes.push('SERVING GENERIC TEMPLATE')
      else notes.push(`routes to ${matchedPath || 'unknown'} (want ${expected})`)
    }
  } else {
    checks.noLoop = home.reason !== 'loop'
    notes.push(home.reason === 'loop' ? 'REDIRECT LOOP' : home.reason === 'too-many' ? 'too many redirects' : 'unreachable')
  }

  // 4: lead endpoint wired (GET -> 405 means the route exists; 404 means gone)
  try {
    const lead = await fetchHead(base + '/api/lead' + nocache(), 'GET')
    checks.formWired = lead.status !== 404
    if (!checks.formWired) notes.push('lead endpoint 404')
  } catch {
    notes.push('lead endpoint error')
  }

  const status: HealthStatus =
    checks.reachable && checks.routing && checks.noLoop && checks.formWired ? 'pass' : 'fail'

  return { slug, domain, status, matchedPath, checks, detail: notes.join('; ') || 'ok' }
}
