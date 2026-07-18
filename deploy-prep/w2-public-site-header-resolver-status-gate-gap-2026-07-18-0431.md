# W2 gap/fluidity refresh — 2026-07-18 04:31

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). Continues from `w2-dead-resolver-twin-status-drift-gap-2026-07-18-0421.md`.

Leader's instruction this round (04:32 LEADER->W2): fresh 3-deep queue — (1) new fresh-ground surface. (2) continue whichever surface (1) opens up. (3) keep gap/fluidity current.

## (1) — new fresh-ground surface: `tenant-site.ts`'s `getTenantFromHeaders()` — the resolver backing ~35 PUBLIC site/API routes — never gated on `tenantServesSite()`

**Bug found and fixed.** `getTenantFromHeaders()` verifies the same signed `x-tenant-id`/`x-tenant-sig` header contract as `getHeaderTenant()` (`tenant.ts`) and the header branch of `getTenantForRequest()` (`tenant-query.ts`) — but unlike both of those siblings, it never checked `tenantServesSite(data.status)` before returning the tenant row. Its own doc comment says it "backs ~35 public site/API routes' tenant-not-found check" — repo-wide grep of every caller (`/api/client/login`, `/api/client/book`, `/api/lead`, `/api/apply`, `/api/portal/collect`, `/api/reviews/submit`, `/api/referrers`, `/api/waitlist`, `/api/contact`, `/api/tenant/public`, and ~25 more) confirmed none of them independently import or check `tenantServesSite` — every one of them trusted this helper to have already gated status, the same way its two siblings do.

**Concrete failure mode:** middleware's own pre-rewrite `tenantServesSite()` check (the thing that's SUPPOSED to keep a suspended/cancelled/deleted tenant's public surface dark) reads through `tenant-lookup.ts`'s 5-minute-TTL in-isolate cache, not a fresh row. An admin suspending a tenant mid-window left every warm edge isolate still answering "yes, this tenant serves" for up to the rest of that TTL — and this helper's OWN lookup is a fresh, uncached `supabaseAdmin` read that had every opportunity to catch that staleness and refuse, but didn't. Concretely: a tenant just suspended for non-payment could, for up to 5 minutes (per warm isolate), still have their clients log into the client portal (`/api/client/login`), book new appointments (`/api/client/book`), and have their public lead-capture, job-application, and referral forms keep accepting new writes — the exact class of "still transacting after being cut off everywhere else" bug every other `tenantServesSite()` consumer in this codebase (`tenant.ts`, `tenant-query.ts`, `client-auth.ts`, `team-portal-auth.ts`, `portal/auth/token.ts`, `team-portal/auth/token.ts`, middleware itself) already closed.

**Fixed:** `getTenantFromHeaders()` now returns `null` when `!tenantServesSite(data.status)`, matching every sibling resolver. Because this is a *fresh* DB read (not cached), the fix actually closes the staleness window early for these ~35 routes — sooner than middleware's own cached check would — rather than just matching middleware's permissiveness.

**Why fixed outright, not flagged (unlike ComHub / item 30):** this is a pure narrowing correctness fix with a single well-established precedent repeated seven-plus times already in this codebase (PIN-header status gate, tenant-health cron, dead resolver twins, STATIC_TENANT_MAP, `getCurrentTenant`, `getTenantForRequest`'s header branch, the two portal-auth token verifiers). It does not expand any capability, touch cost-bearing sends, or have a plausible alternative reading — `tenant-status.ts`'s own doc comment is unambiguous that suspended/cancelled/deleted tenants must stop serving "site AND ... writes through public, slug/host-resolved entry points," which is exactly what this helper backs.

## (2) — swept for siblings: no other public/host-resolved tenant getter skips this gate

Repo-wide grep for every function name shaped like a tenant-by-header/id/slug/domain resolver, cross-referenced against every `tenantServesSite` import site, turned up exactly the resolvers already covered by this and prior rounds: `tenant.ts` (`getHeaderTenant`, `getCurrentTenant`, `getTenantBySlug`, `getTenantByDomain` — all gated), `tenant-query.ts` (`getTenantForRequest` — gated), `tenant-lookup.ts` (status-agnostic by design, callers gate — confirmed: middleware, `ingest/lead`, `ingest/application` all gate explicitly), `client-auth.ts` / `team-portal-auth.ts` / `portal/auth/token.ts` / `team-portal/auth/token.ts` (all gated), and now `tenant-site.ts`'s `getTenantFromHeaders` (fixed above). No other ungated public tenant getter found.

## (3) — gap/fluidity kept current

Carried-forward NOTICED items 1–23, unchanged (see prior rounds' docs for full list, most recently restated in `w2-dead-resolver-twin-status-drift-gap-2026-07-18-0421.md`).

Carried forward, still flagged not fixed (product/rollout calls, unchanged):
- Item re: `webhooks/stripe` never calling `activateTenant()` (HIGH SEVERITY, flagged 2026-07-18 ~02:10, in `JEFF-MORNING-QUEUE.md`).
- Item 30 (ComHub `requireAdmin()` vs. nav-parity — 20 route files gated Jeff-only while nav exposes ComHub to every operator; needs Jeff's rollout-gating call).

NEW this round:

32. `tenant-site.ts`'s `getTenantFromHeaders()` — the resolver backing ~35 public site/API routes (client portal login/booking, lead capture, job applications, reviews, referrers, waitlist, contact) — never checked `tenantServesSite()`, relying entirely on middleware's own 5-minute-TTL-cached pre-check to keep a suspended/cancelled/deleted tenant's public surface dark. Fixed above (1): now gates on a fresh (uncached) status read, closing the staleness window earlier than middleware's cache would.

## MISSING-FEATURE GAPS / UX-FRICTION

Carried forward, unchanged: items 18–20.

## Verification this round

- `npx tsc --noEmit`: clean.
- `npx vitest run src/lib/tenant-site.test.ts`: 31/31 pass (24 pre-existing + 7 new: a parametrized suspended/cancelled/deleted status-gate probe returning null despite a valid header signature, and a parametrized active/setup/pending regression guard confirming new/onboarding tenants still resolve normally — the same "don't over-gate a servable tenant" check every prior status-gate round added).
- Full repo suite: 706 files, 3033 passed, 37 skipped, 0 failed — confirms no other suite depended on the old (ungated) behavior.

File-only, no push/deploy/DB write from this worker. 1 code commit this round (status-gate fix in `tenant-site.ts` + test updates) + 1 docs commit.
