/**
 * Opaque per-browser id for the management-application draft endpoint, so
 * concurrent applicants behind the same IP (CGNAT, office wifi, VPN) don't
 * collide on the same draft row. Persisted in localStorage; regenerated if
 * missing or malformed.
 */
const STORAGE_KEY = 'mgmt_apply_client_id'
const VALID_RE = /^[A-Za-z0-9-]{8,64}$/

export function getOrCreateApplyClientId(): string {
  if (typeof window === 'undefined') return ''
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY)
    if (existing && VALID_RE.test(existing)) return existing
    const id = crypto.randomUUID()
    window.localStorage.setItem(STORAGE_KEY, id)
    return id
  } catch {
    return ''
  }
}
