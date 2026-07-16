# W4 broad-hunt — 2026-07-15 23:13 order — npm audit dependency sweep

## Order
23:09 LEADER->W4: Continue broad-hunt, lower-risk surface. File-only, no push/deploy/DB.

## Areas checked, no gap found (fresh angles, distinct from the ~90 prior W4 broad-hunt
passes this session which already exhausted RBAC/IDOR, rate-limiting, XSS/HTML-injection,
mass-assignment, timing-unsafe compares, CSV injection, SSRF, storage-path randomness,
upload MIME/path validation, public-token entropy, OAuth CSRF/state, and PIN brute-force)

- **Open redirect**: every `NextResponse.redirect()` call site in `src/app/api` targets a
  server-controlled `${baseUrl}/...` path, never a caller-supplied URL. No open-redirect
  surface found.
- **Login/auth brute-force protection**: `auth/login`, `admin-auth`, `client/login`,
  `pin-reset` all already have DB-backed `rateLimitDb(..., { failClosed: true })` gates,
  `safeEqual`/`timingSafeEqual` compares, and `httpOnly`/`secure`/`sameSite` cookies. Already
  hardened.
- **Admin impersonation** (`admin/impersonate`): `requireAdmin()`-gated, HMAC-signed cookie
  via `signImpersonation`. Clean.
- **Fresh SEO-manager surface** (`lib/seo/health.ts`, `lib/seo/recipes.ts`,
  `cron/seo-health`): fleet health-check already uses `safeFetch()` (SSRF-guarded, per a
  comment noting it was the one route missed by the original SSRF-guard pass and already
  fixed) and the cron route already uses `safeEqual()` + fail-closed on missing
  `CRON_SECRET` (part of the 41-site sweep in c28b4a36). `seo_changes` insert flagged by
  `audit-tenant-scope.mjs` is a false positive — `tenant_id` is set in the row data itself,
  the linter's heuristic doesn't recognize insert-with-tenant_id-in-payload as scoped.
- **Public tracking endpoints** (`api/track`, `api/leads/visits`): `Access-Control-Allow-Origin: *`
  is intentional (cross-origin beacon calls from tenant marketing sites), both already
  rate-limited per-IP. Not a gap.
- **Test harnesses** (`api/test-emails`, `api/admin/cleanup-test-bookings`): both
  `requirePermission`-gated. `api/test/email-selena` (+ `/cleanup`): gated behind
  `SELENA_TEST_TOKEN` + `safeEqual`, 404s if the env var is unset — already verified clean
  in a prior pass (22:35 report).
- **NEXT_PUBLIC_\* env vars**: swept all usages — every one is a legitimately public value
  (Supabase anon key, Clerk publishable key, Stripe publishable key, VAPID public key, Radar
  public key). No secret leaking through a client-exposed var.

## Found + fixed: outdated dependencies with known CVEs

Ran `npm audit` — 23 advisories (1 critical, 10 high, 9 moderate, 3 low) on flagged
transitive dependencies. `npm audit fix` (no `--force`) resolved 17 of them via
non-breaking transitive bumps:

- **undici** (used transitively) — HTTP header injection via Set-Cookie percent-decoding,
  WebSocket DoS via fragment-count bypass, HTTP response queue poisoning via keep-alive
  socket reuse, Set-Cookie SameSite downgrade via substring matching, cross-user info
  disclosure via shared cache whitespace bypass.
- **vite** (dev dependency) — path traversal in optimized-deps `.map` handling,
  `server.fs.deny` bypass via queries and Windows alternate paths, arbitrary file read via
  dev-server WebSocket.
- **vitest** (dev dependency, CRITICAL) — arbitrary file read/execute when the Vitest UI
  server is listening.
- **ws** — uninitialized memory disclosure, memory-exhaustion DoS from tiny fragments.

Remaining **6 advisories** all require `--force` (breaking upgrades) and were **left
untouched**, flagged here for a dedicated pass:
- Next.js major bump (16.1.6 → 16.2.10) — DoS in Image Optimization API, SSRF via
  WebSocket upgrades, 3 separate middleware/proxy bypass CVEs, RSC cache poisoning.
- postcss (moderate, XSS via unescaped `</style>`) — pinned by the Next.js version above.
- uuid (moderate, buffer bounds check) — pinned by `@telnyx/webrtc`; fixing requires
  bumping `@telnyx/webrtc` to 1.0.9, a breaking change to the voice-calling integration.

These 6 are genuine open CVEs but the fixes carry real blast radius (Next.js major version,
telnyx SDK breaking change) — correctly out of scope for a file-only lower-risk pass. Recommend
a dedicated Jeff-approved upgrade pass, not bundled with routine broad-hunt fixes.

## Verification

- `git diff --stat` confirmed lockfile-only change (`package-lock.json`, no `package.json`
  range edits).
- `tsc --noEmit`: 1 pre-existing unrelated failure (`bookings/broadcast/route.xss.test.ts`
  mock-typing), confirmed identical via `git stash` A/B — same as every prior report this
  session.
- Full suite: 1499/1502 pass, 1 known pre-existing RED invariant
  (`cron/tenant-health/status-coverage-divergence.test.ts`), confirmed identical baseline —
  0 regressions.
- Production build: reaches the identical pre-existing failure point
  (`/site/landscaping-in-nyc/apply` prerender — missing local `supabaseUrl` env var, a
  local-environment issue, not code) before and after, confirmed via `git stash` A/B.

Commit e86fd4af. File-only, no push/deploy/DB.
