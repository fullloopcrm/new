// seomgr — WRITE-scoped Google calls for auto-onboarding (site verification +
// Search Console sites.add). Separate from the read-only ingest path in gsc.ts.
//
// GUARDRAIL — SCOPE: these require the service account to hold write scopes
// (`webmasters` + `siteverification`) AND the Site Verification API enabled in
// the GCP project. It is currently read-only, so every call here NO-OPS until
// that is granted. Nothing here runs unless the caller (auto-verify.ts) has
// already passed the flag + allowlist gates.
//
// DNS CONSTRAINT: domain properties (`sc-domain:`) require DNS-TXT verification,
// which seomgr must never do. So we verify URL-PREFIX properties
// (`https://www.<domain>/`) via the FILE method, which needs no DNS — we serve a
// token file from the site we already control.
import { getAccessTokenForScope } from './gsc'

export const SEO_WRITE_SCOPES =
  'https://www.googleapis.com/auth/webmasters https://www.googleapis.com/auth/siteverification'

const SITEVERIFY_BASE = 'https://www.googleapis.com/siteVerification/v1'
const SEARCHCONSOLE_BASE = 'https://www.googleapis.com/webmasters/v3'

/** URL-prefix identifier we verify (the public www origin). */
export function urlPrefixIdentifier(domain: string): string {
  return `https://www.${domain}/`
}

async function writeFetch<T>(url: string, init: RequestInit): Promise<T> {
  const token = await getAccessTokenForScope(SEO_WRITE_SCOPES)
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`${url} -> ${res.status} ${JSON.stringify(json)}`)
  return json as T
}

export type FileToken = { method: 'FILE'; token: string }

/**
 * Ask Google for a FILE verification token for the URL-prefix property. Returns
 * the filename token; the site must then serve `/<token>` containing
 * `google-site-verification: <token>` before {@link verifyUrlPrefix} succeeds.
 */
export async function getFileToken(domain: string): Promise<FileToken> {
  const body = { verificationMethod: 'FILE', site: { type: 'SITE', identifier: urlPrefixIdentifier(domain) } }
  const r = await writeFetch<{ method: string; token: string }>(`${SITEVERIFY_BASE}/token`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return { method: 'FILE', token: r.token }
}

/** Verify ownership of the URL-prefix property (token file must already be live). */
export async function verifyUrlPrefix(domain: string): Promise<boolean> {
  const body = { site: { type: 'SITE', identifier: urlPrefixIdentifier(domain) } }
  await writeFetch(`${SITEVERIFY_BASE}/webResource?verificationMethod=FILE`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return true
}

/** Add the verified URL-prefix property to Search Console so ingest discovers it. */
export async function addSearchConsoleSite(domain: string): Promise<void> {
  const siteUrl = encodeURIComponent(urlPrefixIdentifier(domain))
  await writeFetch(`${SEARCHCONSOLE_BASE}/sites/${siteUrl}`, { method: 'PUT' })
}
