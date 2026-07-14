/**
 * Fetch-Metadata (Sec-Fetch-Site) guard for cookie-authenticated GET
 * endpoints that also perform a write side effect (mark-as-read, read
 * cursors, etc). SameSite=Lax cookies (admin_token, Clerk) are still
 * attached on a cross-site TOP-LEVEL GET navigation — that exemption is the
 * whole point of "Lax" vs "Strict" — so a forged link/redirect to one of
 * these URLs runs authenticated. Sec-Fetch-Site is sent by every modern
 * browser on every request, fetch and navigation alike, and can't be set by
 * a remote page, unlike Origin/Referer which browsers omit on many GET
 * navigations. An absent header (old browser / non-browser client) is
 * treated as "can't tell" and allowed through — this is defense-in-depth on
 * top of the app's real auth, not the sole guard.
 */
export function isCrossSiteRequest(headers: Headers): boolean {
  return headers.get('sec-fetch-site') === 'cross-site'
}
