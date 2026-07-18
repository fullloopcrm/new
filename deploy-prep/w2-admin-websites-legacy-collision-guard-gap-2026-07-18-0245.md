# W2 gap/fluidity refresh — 2026-07-18 02:45

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). Continues from `w2-sim-harness-divergence-guard-wrong-module-2026-07-18-0234.md`.

Leader's instruction this round (02:41 LEADER->W2): "Good judgment routing the prod-write-posture question to the gap doc rather than the urgent queue. Fresh 3-deep queue (file-only, no push/deploy/DB each): (1) new fresh-ground surface. (2) continue whichever surface (1) opens up. (3) keep gap/fluidity current."

## (1) — new fresh-ground surface: `POST /api/admin/websites` (the ONE write site to `tenant_domains`) had no check against the LEGACY `tenants.domain` column — the exact gap a prior round explicitly checked for and dismissed as already covered

**Bug found:** `tenant_domains.domain` is `UNIQUE NOT NULL` at the DB level (migrations/043_tenant_domains.sql), so `admin/websites` POST naturally 23505s on a collision with another `tenant_domains` row, and an earlier round gave that collision a friendly 409 message. But that constraint is scoped to `tenant_domains` alone — it has zero relationship to `tenants.domain` (the resolver's documented FALLBACK source, `getTenantByDomain` in `tenant-lookup.ts`/`tenant.ts`), which carries no unique constraint at all. `domains.ts`'s `findDomainOwner(domain, excludeTenantId?)` helper exists specifically to check BOTH sources before a write reaches the DB, and a prior round (`w2-tenant-domain-collision-guard-gap-2026-07-18-0038.md`) wired it into the three write sites for the legacy column (`admin/businesses` POST, `admin/businesses/[id]` PUT, `admin/tenants/[id]` PUT) — but that same round's own sweep explicitly inspected `admin/websites` POST and concluded: *"Confirmed `admin/websites` POST (`tenant_domains` insert) already has its own protection — the DB's own UNIQUE constraint plus an existing friendly-409 handler... Not touched."* That conclusion missed the asymmetry: the DB constraint only protects `tenant_domains` against itself, not against the OTHER table.

**Concrete failure mode:** tenant A has a live site resolving via legacy `tenants.domain = 'acme.com'` (never migrated to `tenant_domains`). An admin, working a DIFFERENT tenant B's onboarding, mistypes/pastes `acme.com` into `admin/websites` POST. The insert into `tenant_domains` succeeds cleanly (201) — no 23505, because no `tenant_domains` row for `acme.com` exists yet to collide with. From that request onward, EVERY visitor to `acme.com` hits the resolver's TRANSITION ASSERT-AND-REFUSE divergence guard: `tenant_domains` says tenant B, legacy `tenants.domain` says tenant A — different tenants — guard throws `TENANT_DIVERGENCE` and refuses to serve ANYONE. Tenant A's previously-working live site goes dark in production, discovered as an outage rather than caught as a validation error at the point of the actual admin mistake. This is the identical failure class the prior round fixed for the other three write sites — just the fourth, unguarded direction.

**Fixed:** wired `findDomainOwner(cleanDomain, tenant_id)` into `admin/websites` POST, called after domain normalization and before the `is_primary` demote/insert logic. Filtered to only reject on `owner.source === 'tenants.domain'` — a same-table (`tenant_domains`-vs-`tenant_domains`) match is deliberately left to fall through unchanged into the existing insert + 23505 handler below (which already gives the richer "already registered to this tenant" / "already registered to another tenant, here's who" messaging and is covered by `route.duplicate-domain.test.ts`), so this fix is additive and doesn't touch previously-tested behavior. `excludeTenantId=tenant_id` means a tenant registering its OWN already-set legacy domain into `tenant_domains` (the intended migration path — exactly what `activate-tenant.ts`'s own writer does automatically) is never flagged as a false-positive collision against itself.

## (2) — swept for sibling instances — confirmed this was the only gap of its class

Re-examined every other write site that inserts into `tenant_domains`:
- `activate-tenant.ts`'s own upsert (carrying domain + custom domain) already has thorough tenant_domains-vs-tenant_domains collision handling (read-back + `landedDomains`/`contestedDomains`, fixed in an earlier round). It does NOT separately check the legacy column, but its domain values are derived from the SAME tenant's own `tenant.domain`/`domain_name` field — not arbitrary admin-typed input — so it can't introduce a NEW cross-tenant collision the way a free-text admin form can; any collision there would mean two tenants already share a legacy `tenants.domain` value, a pre-existing data issue outside this write site's own blast radius.
- No other admin/API write site inserts into `tenant_domains` from free-text operator input; onboarding scripts (`scripts/onboard-tenant-site.ts`, `scripts/sim-all-trades.ts`) are one-shot operator tooling, not live admin-facing surfaces reachable by a mistyped form value (same conclusion the prior round reached for the same sweep).

Confirmed clean — `admin/websites` POST was the sole gap; nothing else "opens up" from this surface.

## (3) — gap/fluidity kept current

Carried-forward NOTICED items, unchanged (see prior rounds' docs for full list):
1. `tenant_domains` DELETE/reactivate gap — still open, still gated on Jeff's product call.
2. `lib/tenant-schema.ts` — still confirmed dead code.
3. `platformFallback` compliance question (JEFF-MORNING-QUEUE.md) — still open.
4. `bookings/batch/route.ts`'s platform-fallback anomaly — still gated on #3.
5. `finance/upload/route.ts`'s MIME gap — fixed elsewhere (`p1-w4`), pending merge into `p1-w2`. No change.
6. Existing referrers' `commission_rate` rows stuck at signup-time value — product decision, not acted on.
7. `tenant_domains_single_primary` DB migration — prepared as a file, not yet run. Gated on Jeff's approval.
8. `src/lib/lead-filters.ts` — ~90% dead code; 3 bespoke tenant clones each hardcode their own `OWNED_HOSTS`. Open product/architecture question.
9. `tenants.domain` still has no DB-level unique constraint. Flagged as a DB migration candidate, not acting.
10. `cron/tenant-health/route.ts`'s tie-break among 2+ non-primary active `tenant_domains` rows is non-deterministic — low value, not acted on.
11. `src/lib/nycmaid/sms.ts`'s best-effort auto-opt-out tenant-by-phone lookup — deliberately best-effort, not escalating.
12. Stripe webhook's other `.update()` calls not checking returned `error` — out of this lane's scope, flagging not acting.
13. `invoice.paid`/`invoice.payment_failed` resolve by `owner_email` with `.maybeSingle()` — no DB unique constraint on that column. Not acting.
14. `customers.retrieve()`'s best-effort swallow — external Stripe API resilience decision, not touching.
15. `activateTenant()`'s `ownerPin` never read by `admin/sales/LeadsPanel.tsx` — UX-friction, not acting without a product/UX call.
16. HIGH SEVERITY, structural — `webhooks/stripe/route.ts`'s full-loop-signup branch never calls `activateTenant()`. Still gated on Jeff's product/eng call. Unchanged.
21. Whether `sim-all-trades.ts`'s divergence-guard probe should keep injecting real conflicting rows into prod vs. adopting a mocked-only philosophy — flagged last round, not decided unilaterally.

CLOSED this round:
22. ~~`admin/websites` POST could silently create a `tenant_domains` row colliding with another tenant's legacy `tenants.domain`, triggering the resolver's divergence guard and darkening that tenant's live site~~ — fixed above (1): wired `findDomainOwner` into the write path, same guard pattern as the other three `tenants.domain` write sites.

NEW this round:
23. This round's own root cause — a sweep concluding "already protected" without checking BOTH directions of a two-table collision — is itself worth a process note: `findDomainOwner`'s doc comment in `domains.ts` doesn't explicitly call out that it needs to be wired into `tenant_domains` write sites too, not just `tenants.domain` ones, which likely contributed to the prior round's miss. Not touching the comment unilaterally this round (scope discipline — this round's job was the code fix, not a doc-comment pass), but flagging for whoever next touches `domains.ts`.

## MISSING-FEATURE GAPS / UX-FRICTION

Carried forward, unchanged: items 18–20 (referrals-tab copy overpromise, `ownerPin` display gap, full-loop-signup `activateTenant()` bypass as missing-feature gap).

## Verification this round

- `npx tsc --noEmit` clean (repo-wide).
- `npx eslint src/app/api/admin/websites/route.ts src/app/api/admin/websites/route.legacy-domain-collision-guard.test.ts` — 0 errors, 0 warnings.
- 4 new tests in `src/app/api/admin/websites/route.legacy-domain-collision-guard.test.ts`: cross-tenant probe (rejects, 409, names the real owner, never inserts), normalization-then-collision probe (mixed-case/protocol input still collides), self-migration probe (tenant registering its own legacy domain succeeds, not a false positive), free-domain control case (still succeeds normally).
- Ran the full existing suite for this write path + siblings together (`admin/websites`, `admin/businesses`, `admin/tenants`, `domains.reconcile-primary`, `tenant-lookup`, `tenant`) — 28 files, 160 tests, all passed unchanged; the new check is additive and doesn't alter previously-tested tenant_domains-vs-tenant_domains or normalization behavior.
- Full repo suite: 702 files, 2987 passed, 37 skipped (pre-existing), 0 failed.
- Fixed 1 file (`src/app/api/admin/websites/route.ts`) + 1 new test file. No migration, no prod write.

File-only, no push/deploy/DB write from this worker. 1 code commit this round (fix + tests) + 1 docs commit (this file).
