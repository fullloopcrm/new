// Opaque per-browser id for anonymous form-draft resumption (management
// application drafts). Generated once and persisted in localStorage so a
// draft can be reloaded on refresh WITHOUT being keyed by IP address alone —
// IP-only keying let two applicants behind the same NAT/CGNAT see and
// overwrite each other's in-progress draft (name/email/phone/photo/video).
// Client-side only; safe no-op (returns null) during SSR/no-localStorage.
const STORAGE_KEY = 'ffl_draft_client_id'

export function getOrCreateDraftClientId(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY)
    if (existing) return existing
    const id = crypto.randomUUID().replace(/-/g, '')
    window.localStorage.setItem(STORAGE_KEY, id)
    return id
  } catch {
    // localStorage unavailable (private mode, disabled storage) — draft
    // resumption degrades to IP-only keying server-side, not a hard failure.
    return null
  }
}
