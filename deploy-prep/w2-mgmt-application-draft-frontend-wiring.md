# W2 — completed frontend wiring for the management-application draft fix

Continuing the broad-hunt (leader order 08:23, "lower-risk surface").

## Context: an existing backend fix was inert

The working tree already had an uncommitted fix in
`platform/src/app/api/management-applications/draft/route.ts` (cross-tenant
leak register + `conflict-risk-p1-w2.md` both note this file's prior
uncommitted state was attributed to a stale duplicate `.worker-driver.sh`
process, PID 2278, running in this same worktree since before this session —
re-confirmed still running, and the file's mtime/diff are unchanged since I
started, so nothing new landed on it this round).

That backend fix closes a real bug: the draft row was keyed by
`(tenant_id, ip_address, position)` alone, so any two applicants sharing a
public IP (CGNAT, office wifi, VPN) collided on the same row — GET returned
the OTHER applicant's name/email/phone/references/photo/video, and POST/DELETE
could overwrite or wipe their in-progress draft. The fix adds a
caller-supplied `client_id` (validated `^[A-Za-z0-9-]{8,64}$`) as the
preferred key, falling back to IP only when none is supplied.

**Gap found: none of the 3 frontend callers sent `client_id`.** All three
`apply/operations-coordinator/page.tsx` variants (base site, wash-and-fold-hoboken,
wash-and-fold-nyc — confirmed via grep these are the only 3 callers of this
endpoint anywhere in the repo) called the draft GET/POST/DELETE with no
`client_id` at all. Without it, `resolveVisitorKey` always falls back to raw
IP and the fix does nothing in practice — the collision the backend change
was written to close was still live.

## Fix (frontend only, additive — did not touch the backend diff)

- Added `platform/src/lib/apply-client-id.ts`: `getOrCreateApplyClientId()`
  generates a `crypto.randomUUID()` once per browser, persists it in
  `localStorage`, reuses it thereafter.
- Wired it into all 3 `page.tsx` callers: GET query param, POST body field,
  DELETE query param.

## Regression lock

New `route.security.test.ts` (6 tests, harness-backed):
- Cross-applicant probe: 2 applicants sharing an IP, different `client_id` —
  applicant 2 does not see applicant 1's draft; each sees their own.
- **Wrong-tenant probe:** same `client_id` under a different tenant sees
  nothing (tenant_id scoping holds independent of the client_id fix).
- Legacy fallback (no `client_id`) still keys by IP — unchanged, documented
  as pre-existing weaker behavior, not a new gap.
- POST/DELETE scoping: applicant 2's actions never touch applicant 1's row.

## Verification

- `npx tsc --noEmit`: clean (0 errors) across all 4 changed/added files.
- `npx vitest run src/app/api/management-applications`: 2 files, 11/11 pass
  (includes the pre-existing `route.rbac.test.ts`, unaffected).

File-only. No push/deploy/DB. Backend route.ts itself left exactly as found
(not mine to claim — flagged for whoever owns that in-flight change to fold
this frontend piece in when they commit it).
