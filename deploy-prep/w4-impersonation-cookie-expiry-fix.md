# W4 broad-hunt: impersonation cookie missing embedded expiry (fixed)

## Round context
16:31 LEADER->W4: "Continue broad-hunt, lower-risk surface. File-only, no push/deploy/DB."

Swept: AI-chat `dangerouslySetInnerHTML` (escapes `<`/`>`/`&` before injecting
fixed `<strong>`/`<br />` tags — safe), OAuth/social-connect redirect flows
(fixed baseUrl + fixed path, `error` param never rendered unsanitized
downstream — no open redirect / reflected XSS), cookie security attributes
across all `cookies().set(...)` call sites (admin_token, admin_session,
admin_role, client session, impersonation — all correctly
httpOnly/secure/sameSite where appropriate), CORS wildcard usage (`/api/track`,
`/api/leads/visits` POST — both write-only tracking beacons returning no
data, intentional and safe; GET is `requirePermission`-gated), `public-upload`
route (already hardened: fixed MIME allowlist excluding SVG/HTML, folder/ext
sanitized against path traversal), `seo/verify-file/[file]` (regex-guarded
`google[\w-]+\.html`, only serves self-minted tokens — safe by design),
`admin/seo/apply` bearer-CRON_SECRET compare (not constant-time, but a
32+ char random secret over the network — same low-value class W3 already
flagged for ADMIN_PIN, not fixing), `the-home-services-company` admin-auth
scaffold (static-string session cookie, but confirmed **unreachable** — no
`admin/` route directory exists under that site tree, `AdminShell` is
imported nowhere; dead scaffold code, not a live gap).

## Found + fixed: 1 real gap

`src/lib/impersonation.ts` — the `fl_impersonate` cookie (admin/super-admin
"view as this tenant" feature) is HMAC-signed (`<tenantId>.<hmac>`) but the
signed payload carried **no expiry**. The cookie's `maxAge: 3600` (1 hour) on
`admin/impersonate/route.ts` is a client-enforced `Set-Cookie` attribute only
— nothing server-side re-checked how old the signature was.

Compare to its sibling tokens in the same auth system
(`admin-auth/route.ts`): `createAdminToken()`/`verifyAdminToken()` for the
super-admin session, and `createTenantAdminToken()` for per-tenant-member
PINs, both embed `exp` in the signed JSON payload and verify
`data.exp > Date.now()` server-side. The impersonation cookie was the one
signed token in this system that never actually expired cryptographically.

Impact: the PIN-admin impersonation path
(`getAdminImpersonatedTenant()` in `src/lib/tenant.ts` /
`getTenantForRequest()` in `src/lib/tenant-query.ts`) accepts the
impersonation cookie whenever it's paired with a *currently valid*
`admin_token`. Since `admin_token` for `super_admin` legitimately lasts 24h
(`createAdminToken`), a captured `fl_impersonate` value older than its
intended 1-hour window — e.g. from a proxy/access-log capture, a shared
machine's devtools Application tab (httpOnly blocks JS/XSS reads but not
local device inspection), or a synced browser profile — could be replayed to
resume impersonation of that tenant for up to 24h after the impersonation was
supposed to have ended, with **no server-side control actually enforcing the
1-hour boundary**. Ending impersonation via the `DELETE` handler also only
clears the cookie client-side; it doesn't revoke the token, so any
already-captured value kept working regardless.

### Fix
Embedded `exp` in the signed payload: `<tenantId>.<exp>.<hmac>` where hmac
covers `<tenantId>.<exp>`, matching the `createAdminToken` pattern exactly.
`verifyImpersonationCookie` now rejects the token if `exp <= Date.now()`, and
also rejects the old 2-part pre-expiry format outright (fail-closed — forces
one re-impersonation click after deploy, no bigger cost given the 1hr window
these cookies already had).

New exported `IMPERSONATE_TTL_MS` constant is the single source of truth for
both the embedded `exp` and the cookie's `Max-Age`
(`admin/impersonate/route.ts`), so the two can't drift apart again.

### Verification
- Mutation-verified via `cp`-based backup/restore (not `git stash`): reverted
  `impersonation.ts` to pre-fix (`git show HEAD:...`), ran the new
  `impersonation.test.ts` — the "rejects a pre-expiry legacy signed cookie"
  assertion went RED (pre-fix code returned the tenantId instead of `null`,
  i.e. accepted a never-expiring signed cookie), confirming the vulnerability
  was real. Restored the fix — all 9 tests GREEN.
- `npx tsc --noEmit` clean.
- Full suite: 348/349 files, 1463 passed + 1 pre-existing unrelated expected
  fail (Fortress `status-coverage-divergence` baseline, untouched) + 1
  skipped — matches the standing baseline other workers have reported today.
- `audit-tenant-scope.mjs`: pre-existing 43-finding baseline drift in this
  worktree (unrelated files — waitlist, portal, selena, client/collect,
  etc.), confirmed none of my 3 touched files (`impersonation.ts`,
  `impersonation.test.ts`, `admin/impersonate/route.ts`) appear in the
  output. `audit-supabase-admin-gate.mjs` doesn't exist in this worktree
  (only merged on p1-w1 per earlier reports), skipped.

Commit `70eef561`. File-only, no push/deploy/DB.
