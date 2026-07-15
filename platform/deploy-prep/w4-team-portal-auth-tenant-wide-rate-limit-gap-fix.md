# W4 — team-portal/auth missing tenant-wide rate limit (distributed PIN-spray gap)

**Severity:** Medium
**Status:** Fixed (file-only, not deployed)

## Finding

`POST /api/team-portal/auth` (team member PIN login) rate-limited guesses
per `(tenant_slug, IP)` only — 5 attempts / 15 min. Team member PINs are
4-digit (`1000`-`9999`, generated via `crypto.randomInt` in
`src/app/api/team/route.ts`), a 9,000-value space.

A per-IP-only cap does nothing against a distributed or rotating-IP spray:
an attacker who fans guesses across many source IPs gets a fresh 5-guess
budget per IP, with no ceiling on total guesses against a given tenant.

The sibling route `/api/client/login` had already closed this exact gap for
client PIN logins by adding a tenant-wide bucket alongside the per-IP one
(see the comment there: "a per-tenant cap ... locks out distributed
PIN-spraying that rotates IPs, which the per-IP bucket alone can't see").
`team-portal/auth` never got the same treatment — same PIN-auth pattern,
same missing protection.

Impact: a successful guess yields a signed team-member token
(`createToken`) with the member's role and pay rate, granting team-portal
access (clock in/out, job/schedule data) as that employee.

## Fix

`src/app/api/team-portal/auth/route.ts`: added a tenant-wide rate-limit
bucket (`team_portal_auth_tenant:<slug>`, 30 attempts / 15 min,
`failClosed: true`) alongside the existing per-IP bucket. Both are checked;
either tripping returns 429.

Updated the two existing PIN-enumeration test files
(`pin-enumeration.test.ts`, `pin-enumeration.isolation.test.ts`) to reflect
the new two-bucket key set, and added a new regression case proving a spray
across many distinct IPs against one tenant now trips the tenant-wide
bucket even though each individual IP still has budget.

## Verification

- `npx tsc --noEmit` — 0 errors.
- `npx vitest run src/app/api/team-portal src/app/api/client` — 78 files /
  253 passed, 1 skipped (pre-existing skip, unrelated).
- New test: 31 guesses from 31 distinct IPs against tenant `acme` → first 30
  return 401 (wrong PIN), 31st returns 429 — proving the tenant-wide bucket
  catches what the per-IP bucket structurally cannot.

## Not done (out of scope for this pass)

- Did not change the 4-digit PIN format itself or add per-tenant lockout
  alerting. The tenant-wide cap slows distributed brute force by orders of
  magnitude but doesn't make it information-theoretically infeasible the
  way client-login's 6-digit-PIN + 100/10min cap does. Flagging in case the
  leader wants PIN length increased for team logins too.
