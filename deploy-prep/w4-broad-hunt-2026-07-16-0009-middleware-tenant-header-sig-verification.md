# W4 Broad-Hunt — 2026-07-16 00:09 order

## Scope
Continue broad-hunt, lower-risk surface, file-only, no push/deploy/DB. Per leader's 00:09
note: the public-reviews-GET question is a product decision for Jeff, left flagged and
not built.

## Carryover: committed prior session's uncommitted fix
`platform/src/app/api/reviews/submit/route.ts` and `platform/src/app/api/team-applications/route.ts`
had a complete, verified URL-validation fix (images/video_url/photo_url storage-prefix
checks) sitting uncommitted from the 00:02 report. Re-verified `npx tsc --noEmit` clean
(only the known pre-existing unrelated `bookings/broadcast/route.xss.test.ts` mock-typing
failure) and committed as `ff921b96`.

## This pass's hunt: fresh angle — middleware.ts + tenant-header signing
`src/middleware.ts` had not been explicitly named in any of the ~30 prior broad-hunt
reports this session, so I read it end-to-end plus its downstream consumers, looking for
a header-spoofing / cross-tenant-impersonation gap (the same bug class the file's own
comments say it was built to prevent).

Checked:
- **`x-tenant-id` / `x-tenant-sig` trust chain.** Middleware strips any caller-supplied
  `x-tenant-sig` before minting its own via `signTenantHeader()` (HMAC-SHA256, Edge-Runtime-safe
  pure-JS implementation) in every `rewriteToSite()` branch (sitemap, robots, `/admin`→`/dashboard`
  rewrite, app-root passthrough, site rewrite). Verified `verifyTenantHeaderSig()` uses a
  constant-time comparison.
- **Every direct reader of `x-tenant-id`** outside the two central helpers
  (`getTenantFromHeaders()` in tenant-site.ts, `getTenantForRequest()` in tenant-query.ts,
  both of which already gate on `verifyTenantHeaderSig()`): grepped all of `src/app/api` for
  raw `headers().get('x-tenant-id')` reads. Found 6 call sites (admin-auth, chat, errors,
  pin-reset, yinez, client/login) — all 6 independently call `verifyTenantHeaderSig()` before
  trusting the id, with explicit comments noting this was deliberately added to block
  main-host header-spoofing. No bypass found.
- **Canonical-www redirect logic** (Host-header-driven 301). Redirect target is always
  `www.<same-host-the-request-came-in-on>` — never reflects to a different attacker-chosen
  domain, and nothing in this middleware uses the Host header to build a link sent to a
  *different* user (no password-reset/magic-link generation here), so no exploitable Host-header
  poisoning path.
- **`STATIC_TENANT_MAP` hardcoded custom-domain fallback** (thefloridamaid.com) — informational
  id only, still routed through the same `signTenantHeader()` mint. No bypass.
- **SEO cron surface** (`src/lib/seo/enrich.ts`, `remediate.ts`, `technical.ts`, `health.ts`) —
  all external fetches go through `safeFetch()` (SSRF-guarded), and all 5 cron routes that
  invoke them (`seo-technical`, `seo-propose`, `seo-enrich`, `seo-health`, `seo-improve`) use
  `safeEqual()` for their `CRON_SECRET` bearer check — confirms these were correctly covered by
  the earlier session-wide timing-safe-compare sweep (commit `c28b4a36`) and the two prior
  "fresh SEO-manager surface" spot-checks (20:59, 23:18 reports). No new gap.
- **`/api/auth/login` brute-force protection** — re-verified `rateLimitDb('auth_login:${ip}', 5,
  5min, { failClosed: true })` is in place with a security notification on lockout. Matches the
  22:35 report's "PIN brute-force ... clean" finding; this is the separate Clerk-adjacent
  bcrypt login path and is independently hardened.

## Result
No new exploitable gap found this pass. The tenant-header-signing architecture is sound:
every code path that trusts `x-tenant-id` verifies its `x-tenant-sig` first, with no
unguarded reader. This was worth checking explicitly since middleware.ts itself was
previously unaudited surface, but it turned out to already be correctly built (with
comments showing the header-spoofing threat was already designed against).

## Verification
- `npx tsc --noEmit`: clean (1 known pre-existing unrelated failure, unaffected by anything
  touched this pass).
- No code changes this pass beyond the carryover commit.

File-only, no push/deploy/DB.
