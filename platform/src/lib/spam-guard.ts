/**
 * Shared bot defense for public lead/contact/application forms.
 * Pairs with the frontend `useSpamGuard` hook + `<Honeypot />` field
 * (src/components/spam-guard.tsx). Two independent signals; either one
 * triggers rejection:
 *  - `_hp` (honeypot) non-empty — a bot that blindly fills every input
 *  - `_ts` (render timestamp) missing/too-fast/stale — a script posting
 *    directly to the API without ever rendering the real form, or replaying
 *    an old page load
 *
 * A spam verdict returns a plausible `{ success: true }` from the caller's
 * route rather than an error, so a scripted bot has no signal to adapt to.
 */

const MIN_FILL_MS = 1800
const MAX_TOKEN_AGE_MS = 6 * 60 * 60 * 1000 // 6h — stale token, likely a replayed/cached page

export interface SpamGuardBody {
  _hp?: unknown
  _ts?: unknown
}

export function isSpamSubmission(body: SpamGuardBody): boolean {
  const honeypot = typeof body._hp === 'string' ? body._hp.trim() : ''
  if (honeypot) return true

  const renderedAt = Number(body._ts)
  if (!Number.isFinite(renderedAt) || renderedAt <= 0) return true

  const elapsed = Date.now() - renderedAt
  if (elapsed < MIN_FILL_MS) return true
  if (elapsed > MAX_TOKEN_AGE_MS) return true

  return false
}

// Guard-only keys that must never leak into a saved lead/application's notes
// when a route folds unrecognized body fields into a free-text notes column.
export const SPAM_GUARD_KEYS: ReadonlySet<string> = new Set(['_hp', '_ts'])
