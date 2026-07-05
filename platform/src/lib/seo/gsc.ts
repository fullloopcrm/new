// ---------------------------------------------------------------------------
// Google Search Console client — zero-dependency service-account auth.
//
// Signs a JWT with the SA private key (node:crypto, RS256), exchanges it for an
// access token, and calls the Search Console REST API. No googleapis / google-
// auth-library dependency — keeps the bundle lean and the auth path auditable.
//
// Credentials resolution (in order):
//   1. GSC_SERVICE_ACCOUNT_JSON  — inline JSON string (use on Vercel; no file)
//   2. GSC_SERVICE_ACCOUNT_PATH  — path to a JSON key file
//   3. ./.gsc-service-account.json (local dev fallback, gitignored)
//
// Multi-tenant by design: listSites() returns EVERY property the SA has been
// granted, so the SEO system iterates all tenants uniformly. Adding a tenant is
// a Search Console grant, not a code change.
// ---------------------------------------------------------------------------
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import crypto from 'node:crypto'

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const API_BASE = 'https://www.googleapis.com/webmasters/v3'
const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly'

type ServiceAccount = {
  client_email: string
  private_key: string
  project_id?: string
}

export type GscSite = {
  siteUrl: string // e.g. "sc-domain:homeservicesbusinesscrm.com"
  permissionLevel: string
}

export type SearchAnalyticsRow = {
  keys?: string[]
  clicks: number
  impressions: number
  ctr: number
  position: number
}

export type SearchAnalyticsQuery = {
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
  dimensions?: Array<'query' | 'page' | 'country' | 'device' | 'date' | 'searchAppearance'>
  rowLimit?: number
  startRow?: number
  dimensionFilterGroups?: unknown[]
  dataState?: 'final' | 'all'
}

// ---------------------------------------------------------------------------
// Credentials + auth
// ---------------------------------------------------------------------------
function loadServiceAccount(): ServiceAccount {
  const inline = process.env.GSC_SERVICE_ACCOUNT_JSON
  if (inline) return JSON.parse(inline)

  const path =
    process.env.GSC_SERVICE_ACCOUNT_PATH ||
    join(process.cwd(), '.gsc-service-account.json')
  const raw = readFileSync(path, 'utf8')
  return JSON.parse(raw)
}

const b64url = (buf: Buffer | string) =>
  Buffer.from(buf)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

// Cache the token in-process; SA tokens last 1h, refresh with 5-min headroom.
let cachedToken: { token: string; expiresAt: number } | null = null

async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  if (cachedToken && cachedToken.expiresAt - 300 > now) return cachedToken.token

  const sa = loadServiceAccount()
  const header = { alg: 'RS256', typ: 'JWT' }
  const claim = {
    iss: sa.client_email,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  }
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claim))}`
  const signature = crypto.sign('RSA-SHA256', Buffer.from(signingInput), sa.private_key)
  const assertion = `${signingInput}.${b64url(signature)}`

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  })
  const json = (await res.json()) as { access_token?: string; expires_in?: number }
  if (!res.ok || !json.access_token) {
    throw new Error(`GSC token exchange failed: ${res.status} ${JSON.stringify(json)}`)
  }
  cachedToken = { token: json.access_token, expiresAt: now + (json.expires_in ?? 3600) }
  return json.access_token
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getAccessToken()
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(`GSC API ${path} failed: ${res.status} ${JSON.stringify(json)}`)
  }
  return json as T
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Every property the service account can read — the tenant discovery list. */
export async function listSites(): Promise<GscSite[]> {
  const data = await apiFetch<{ siteEntry?: GscSite[] }>('/sites')
  return data.siteEntry ?? []
}

// ---------------------------------------------------------------------------
// Technical SEO — Sitemaps API + URL Inspection API. Same service-account auth;
// URL Inspection lives on a different host (searchconsole.googleapis.com/v1),
// so it gets its own token-authed fetch.
// ---------------------------------------------------------------------------
const INSPECT_URL = 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect'

export type SitemapEntry = {
  path?: string
  isPending?: boolean
  errors?: string
  warnings?: string
  lastDownloaded?: string
  contents?: unknown[]
}

/** Submitted sitemaps + their health for a property. */
export async function listSitemaps(siteUrl: string): Promise<SitemapEntry[]> {
  const enc = encodeURIComponent(siteUrl)
  const data = await apiFetch<{ sitemap?: SitemapEntry[] }>(`/sites/${enc}/sitemaps`)
  return data.sitemap ?? []
}

export type UrlInspection = {
  verdict?: string // PASS | PARTIAL | FAIL | NEUTRAL
  coverageState?: string // "Submitted and indexed", "Crawled - currently not indexed", ...
  robotsTxtState?: string
  indexingState?: string
  lastCrawlTime?: string
  googleCanonical?: string
  userCanonical?: string
  richResults?: unknown
}

/** Inspect one URL's index status (URL Inspection API). Quota ~2k/day/property. */
export async function inspectUrl(siteUrl: string, inspectionUrl: string): Promise<UrlInspection> {
  const token = await getAccessToken()
  const res = await fetch(INSPECT_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ inspectionUrl, siteUrl, languageCode: 'en-US' }),
  })
  const json = (await res.json().catch(() => ({}))) as {
    inspectionResult?: { indexStatusResult?: Record<string, unknown>; richResultsResult?: unknown }
  }
  if (!res.ok) {
    throw new Error(`URL inspect failed: ${res.status} ${JSON.stringify(json).slice(0, 200)}`)
  }
  const r = json.inspectionResult?.indexStatusResult ?? {}
  return {
    verdict: r.verdict as string | undefined,
    coverageState: r.coverageState as string | undefined,
    robotsTxtState: r.robotsTxtState as string | undefined,
    indexingState: r.indexingState as string | undefined,
    lastCrawlTime: r.lastCrawlTime as string | undefined,
    googleCanonical: r.googleCanonical as string | undefined,
    userCanonical: r.userCanonical as string | undefined,
    richResults: json.inspectionResult?.richResultsResult,
  }
}

/**
 * Query Search Analytics for one property. Paginates automatically up to
 * `maxRows` (GSC caps a single request at 25,000 rows).
 */
export async function querySearchAnalytics(
  siteUrl: string,
  query: SearchAnalyticsQuery,
  maxRows = 25000,
): Promise<SearchAnalyticsRow[]> {
  const encoded = encodeURIComponent(siteUrl)
  const pageSize = Math.min(query.rowLimit ?? 25000, 25000)
  const rows: SearchAnalyticsRow[] = []
  let startRow = query.startRow ?? 0

  // Default to 'final' data (stable) unless caller opts into 'all' (fresher,
  // partial). Search Analytics data lags ~2-3 days for 'final'.
  const body = { dataState: 'final' as const, ...query }

  for (;;) {
    const batch = await apiFetch<{ rows?: SearchAnalyticsRow[] }>(
      `/sites/${encoded}/searchAnalytics/query`,
      { method: 'POST', body: JSON.stringify({ ...body, rowLimit: pageSize, startRow }) },
    )
    const got = batch.rows ?? []
    rows.push(...got)
    if (got.length < pageSize || rows.length >= maxRows) break
    startRow += got.length
  }

  return rows.slice(0, maxRows)
}
