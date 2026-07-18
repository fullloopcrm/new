# W2 gap/fluidity refresh — 2026-07-18 00:58

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). Continues from `w2-tenant-domain-collision-guard-gap-2026-07-18-0038.md`.

Leader's instruction this round (00:46 LEADER->W2): fresh 3-deep queue -- (1) new fresh-ground surface. (2) continue whichever surface (1) opens up. (3) keep gap/fluidity current.

## (1) — new fresh-ground surface: six resolver-twins never inherited the canonical resolver's case-normalization + masked-error hardening

**Bug found:** `getTenantBySlug` in `tenant.ts`/`tenant-lookup.ts` lowercases the incoming slug before matching (slugs are always generated lowercase — `slugify()`/`toSlug()` in every tenant-creation path) and uses `maybeSingle()` with an explicit error check, so a genuine DB failure surfaces loud instead of masquerading as "not found." Six other call sites resolve a tenant by `tenants.slug` with their OWN hand-rolled query instead of going through that shared resolver, so none of them ever inherited either fix:

1. `POST /api/portal/auth` (`send_code` + `verify_code`) — client portal phone login, the customer-facing auth surface for every tenant's clients.
2. `POST /api/team-portal/auth` — team member PIN login.
3. `POST /api/sales-applications` — public commission-sales-partner application form.
4. `POST /api/team-applications` — public job application form.
5. `GET /api/tenant-sitemap` — sitemap generator (`?slug=` query param, reachable directly by any external caller, not just middleware's rewrite).
6. `POST /api/webhooks/telegram/[tenant]` — per-tenant Telegram bot webhook (slug from the URL path segment).

Each did `.eq('slug', tenant_slug)` with the caller-supplied value used verbatim, then `.single()` with the error silently discarded (only `data` destructured). Two independent, compounding problems:

- **Case-sensitivity:** a mixed-case `tenant_slug` (any caller other than the routes' own first-party clients — which happen to lowercase client-side today, but that's not a contract the API enforces) silently resolved to "Business not found" / "Tenant not found" for a real, active tenant instead of resolving it. The `x-tenant-slug` header fallback several of these routes also accept is always lowercase (middleware sets it from `tenant.slug`), so this only bit the direct-body/query/path-param path — but that path is exactly what a public API client, integration, or the routes' own request body field is documented to accept.
- **Masked DB errors:** `.single()`'s error was discarded, so a genuine Supabase outage on the tenant lookup was indistinguishable from "unknown business" — a real incident would have looked like a wave of ordinary 404s instead of throwing loud, the same masked-error class already fixed across the canonical resolver (`tenant.ts`, `tenant-lookup.ts`, `tenant-query.ts`) and `domains.ts` in prior rounds, just never applied to these six independent lookups.

**Fixed:** all six now lowercase the caller-supplied slug/path-segment before the query (matching the resolver's normalization contract) and use `maybeSingle()` + an explicit error check that logs and returns a distinct 500 ("Unable to verify business" / "Unable to submit application" / etc.) instead of silently falling through to the generic "not found" 404.

## (2) — swept for further sibling instances

- Grepped every other raw `.eq('slug', ...)` tenant lookup in the repo (`jefe/actions.ts`, `create-tenant-from-lead.ts`, `admin/businesses/route.ts`, `tenants/public/route.ts`, `tenants/route.ts`): all either already lowercase, already route through the shared resolver, or are internal/admin-only tools where the caller-supplied value is operator-typed (much lower mixed-case risk) and not customer/applicant-facing. Not touched — flagging `jefe/actions.ts`'s exact-slug-then-name-fallback as already resilient to a case-typo (falls through to its own name-contains search) rather than hard-404ing.
- Confirmed `admin/businesses`'s tenant-creation slug uniqueness check and slug generation both already produce/compare lowercase-only slugs — no case-mismatch surface there.
- Confirmed the tenant-health cron's (`cron/tenant-health/route.ts`) `tenant_domains`-first/`tenants.domain`-fallback union already has its error-checking hardened from a prior round (`ff7d25ec`); its only remaining non-determinism (which of 2+ *non-primary* active domains wins when none is flagged primary) is a pre-existing, low-value edge case orthogonal to this round's slug-normalization gap — not acted on.

## (3) — gap/fluidity kept current

Carried-forward NOTICED items, unchanged:
1. `tenant_domains` DELETE/reactivate gap — still open, still gated on Jeff's product call.
2. `lib/tenant-schema.ts` — still confirmed dead code.
3. `platformFallback` compliance question (JEFF-MORNING-QUEUE.md) — still open.
4. `bookings/batch/route.ts`'s platform-fallback anomaly — still gated on #3.
5. `finance/upload/route.ts`'s MIME gap — fixed elsewhere (`p1-w4`, commit `5af092d2`), pending merge into `p1-w2`. No change.
6. Existing referrers' `commission_rate` rows stuck at signup-time value; no PUT/PATCH to edit post-signup. Product/business decision, not acted on.
7. `tenant_domains_single_primary` DB migration (partial unique index) — prepared as a file, not yet run. Gated on Jeff's approval.
8. `src/lib/lead-filters.ts` — ~90% dead code; 3 bespoke tenant clones each hardcode their own `OWNED_HOSTS`. Open product/architecture question, not acted on.
9. `tenants.domain` still has no DB-level unique constraint. Flagged as a DB migration candidate last round, not acting — gated on Jeff's approval.

NEW this round:
10. `cron/tenant-health/route.ts`'s tie-break among 2+ *non-primary* active `tenant_domains` rows for the same tenant (none flagged `is_primary`) is non-deterministic (no `.order()`), unlike `getPrimaryTenantDomain()`'s defense-in-depth `created_at`-ascending order. Low value — only matters if a tenant somehow has multiple active domains with none marked primary, and the consequence is just "the health cron may check/persist a different one of that tenant's own live domains across runs," not a correctness or cross-tenant issue. Flagging, not acting.

## MISSING-FEATURE GAPS / UX-FRICTION

Carried forward, unchanged:
11. `dashboard/referrals/page.tsx`'s referrals-tab copy overpromises per-referrer rate control that doesn't exist.

## Verification this round

- `npx tsc --noEmit` clean (repo-wide).
- Fixed 6 route files: `portal/auth/route.ts`, `team-portal/auth/route.ts`, `sales-applications/route.ts`, `team-applications/route.ts`, `tenant-sitemap/route.ts`, `webhooks/telegram/[tenant]/route.ts`.
- 6 pre-existing test files needed a `maybeSingle` stub added to their local Supabase-chain mocks (their builders only implemented `.single()`) — `team-portal/auth/route.rate-limit.test.ts`, `team-portal/auth/route.terminated-crew-guard.test.ts`, `portal/auth/route.test.ts`, `tenant-sitemap/route.domain-fallback.test.ts`, `webhooks/telegram/[tenant]/route.secret-token.test.ts` — purely mechanical (mirror `.single()`'s resolved value / translate its PGRST116 "not found" shape into `maybeSingle()`'s null-error contract), no behavior assertions changed. All still pass.
- 6 new test files added (one per fixed route), 22 new tests total: mixed-case slug now resolves to the correct tenant, an unknown-but-correctly-cased slug still 404s (no false positive), a genuine tenant-lookup DB failure now surfaces as a distinct 500 instead of a masked "not found," and a wrong-tenant probe on `portal/auth` (two tenants with similar slugs — `tenant-a` / `tenant-ab` — confirming case-normalization never collides a mixed-case slug onto the WRONG tenant's OTP bucket).
- Full repo suite: 689 files, 2963 passed, 37 skipped, 0 failed.

File-only, no push/deploy/DB write from this worker. 1 code commit this round (6 route fixes + 6 mechanical test-mock updates + 6 new test files) + 1 docs commit.
