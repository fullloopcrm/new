# W4 broad-hunt (fresh area): push-subscribe identity hijack + 2 sibling unauthenticated-leak fixes

Refilling per LEADER order 01:26 ("continuing broad-hunt, fresh area, file-only").
Excluded per standing instruction: referrers, referral-commissions, team-PIN routes.

## Method

`git log --all --grep="fix(security)"` (316 commits) vs `git rev-list HEAD`
(comm -23) shows **206** security-fix commits on sibling branches that are
NOT ancestors of p1-w4 — the same drift class found last session at the
finance/crews layer, at much larger scale. Triaged by severity, then
verified each candidate by reading this branch's *current* file content
(not just diffing the sibling commit) before touching anything, since prior
sessions found several already independently fixed here.

Two high-severity candidates (`c8e9c625` admin-role self-escalation,
`710dfabd` same) turned out to be **already fixed** on this branch — the
`owner`-only role-grant check is present in both `admin/users/route.ts` and
`admin/users/[id]/route.ts`. No action needed, confirmed by reading current
code.

## Fixed (3 files, all verified still-open gaps)

### 1. `POST /api/push/subscribe` — unauthenticated identity hijack (ported from `27d19c54`)

Route trusted `role`/`team_member_id`/`client_id` straight from the request
body, gated only on `getCurrentTenant()` — which resolves for ANY visitor on
a tenant's own domain via middleware's signed `x-tenant-id` header, not just
logged-in sessions. Any anonymous visitor could `POST {role:'admin'}` and
silently start receiving that tenant's admin push notifications (new-booking
alerts with client names/times/staff), or claim an arbitrary
`team_member_id`/`client_id` to intercept another identity's notifications.

Fix derives `tenant_id`/`team_member_id`/`client_id` **only** from a
verified session — the body can no longer assert an identity:
- `role:'admin'` → `getTenantForRequest()` (real dashboard session)
- `role:'team_member'` → `getPortalAuth()` (team-portal bearer token)
- `role:'client'` → `verifyPortalToken()` (client-portal bearer token) or
  the `client_session` cookie via `verifyClientSessionToken()`

Threaded the real auth token through `PushPrompt` (`team/page.tsx`,
`portal/page.tsx`) so the legitimate subscribe flow keeps working — matches
the sibling branch's fix exactly. Did **not** touch the tenant-clone
`_components/PushPrompt.tsx` copies under `site/wash-and-fold-*`,
`site/nyc-mobile-salon`, etc. (known architecture debt per
`platform/CLAUDE.md` — do not extend) or `site/book/dashboard/page.tsx` /
`the-florida-maid/clients/dashboard/page.tsx`, which already work via the
cookie-fallback path with no token needed.

Two sibling commits fixed this same bug independently (`27d19c54` and
`5656dfaa`); ported `27d19c54`'s approach since it never trusts the body for
identity at all (stricter) and this branch already has all three auth
helpers (`getPortalAuth`, `verifyPortalToken`, `verifyClientSessionToken`)
with matching signatures.

### 2. `GET /api/clients/[id]/activity` — unauthenticated PII leak (ported from `c251dcf3`)

Gated on `getCurrentTenant()`, same header-trust bug as above. An anonymous
website visitor who guessed/obtained a client UUID could pull that client's
full booking history — including check-in/check-out **GPS coordinates** and
**payment amounts** — with zero authentication. Switched to
`requirePermission('clients.view')`, matching the sibling
`clients/[id]/transcript` route's existing pattern on this branch exactly.

`GET /api/team-availability`, flagged by the same upstream commit, was
already independently fixed here (already on `requirePermission`) —
confirmed by reading current file, no action needed.

### 3. `GET /api/social/accounts` — raw OAuth token leak (ported from `d6045727`)

Returned `select('*')` off `social_accounts` directly, including the live
Facebook/Instagram `access_token`. Any authenticated tenant member —
including a read-only role — could read the token via the dashboard
accounts list and use it to post to the connected page outside the app.
Response now strips `access_token`, returning only the metadata fields the
dashboard actually uses.

## Tests added (3 files, all mutation-verified)

- `push/subscribe/route.identity-hijack.test.ts` (7 cases: 3 reject-forged-body
  identity, 4 accept-real-session-identity across admin/team_member/client
  bearer/client cookie-fallback paths)
- `clients/[id]/activity/route.security.test.ts` (2 cases)
- `social/accounts/route.token-leak.test.ts` (2 cases)

Mutation check on all three: reverted each fixed file to pre-fix content via
`git stash`, re-ran its new test file, confirmed it goes RED (push-subscribe:
all 7 fail; activity: both fail, erroring on `next/headers` called outside
request scope since the old code path isn't mocked — a coarser signal, same
caveat the upstream commit's own author noted; social/accounts: the
token-visibility assertion fails with the real secret present in the
response). Restored the fix (`git stash pop`), re-ran green.

## Verification

- `npx tsc --noEmit` — clean.
- `npx vitest run` on the 3 new test files — 11/11 pass.
- Full suite: `npx vitest run` — 276/277 files pass, 1258/1262 tests pass;
  the 1 failure (`cron/tenant-health/status-coverage-divergence.test.ts`) is
  the same pre-existing, explicitly-labeled "RED until fixed" tracked issue
  noted in the prior W4 session report — unrelated to this change.
- File-only: no DB writes, no migrations, no push/deploy.

## Not done (out of scope this pass)

- 206 unmerged sibling-branch security commits total; only the highest-
  severity candidates checked this session (~10 read, 3 real gaps found +
  fixed, 2 already-fixed confirmed). The remaining ~190 are unreviewed —
  flagging again for the leader that this drift class is large and likely
  has more real gaps in it (leads/*, dashboard aggregator, catalog CRUD,
  audit/security-events, notifications, comms-send, social post/publish,
  and several others were named in commit subjects but not checked this
  pass).
- Did not touch referrers, referral-commissions, or team-PIN routes per
  leader instruction.
