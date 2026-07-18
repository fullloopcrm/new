# W2 gap/fluidity refresh — 2026-07-18 00:38

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). Continues from `w2-owned-domain-set-legacy-fallback-gap-2026-07-18-0024.md`.

Leader's instruction this round (00:31 LEADER->W2): fresh 3-deep queue -- (1) new fresh-ground surface. (2) continue whichever surface (1) opens up. (3) keep gap/fluidity current.

## (1) — new fresh-ground surface: tenant `domain`-column writes had NO collision check, unlike `tenant_domains`

**Bug found:** `tenant_domains.domain` is UNIQUE at the DB level (migrations/043_tenant_domains.sql), so its one write site (`admin/websites` POST) naturally gets a `23505` on a collision and already handles it gracefully (checked in an earlier round). `tenants.domain` — the resolver's documented FALLBACK source (`getTenantByDomain` in `tenant.ts`/`tenant-lookup.ts`) — carries **no unique constraint at all**, and every one of its THREE write sites wrote the caller-supplied value directly with zero check that another tenant doesn't already own that exact host:

1. `POST /api/admin/businesses` (tenant creation) — inserted `domain: cleanDomain` straight into the new row.
2. `PUT /api/admin/businesses/[id]` — wrote `updates.domain` straight into the existing row.
3. `PUT /api/admin/tenants/[id]` — same pattern, second independent write site.

**Why this is worse than a normal duplicate-key error:** the resolver's own TRANSITION ASSERT-AND-REFUSE divergence guard (documented at the top of `getTenantByDomain` in both `tenant.ts` and `tenant-lookup.ts`) is *designed* to throw `TENANT_DIVERGENCE` / `TENANT_DIVERGENCE_AMBIGUOUS` the instant a host resolves ambiguously — that's intentional fail-closed behavior for exactly this kind of data corruption. But because nothing upstream of these three write sites ever checked for the collision, an admin typo (pasting an existing tenant's domain into a new/different tenant's onboarding field) would silently succeed at write time and only surface as a hard 500 on the **next real visitor request to the ALREADY-LIVE tenant's site** — darkening that tenant's site in production, discovered by an outage rather than a validation error at the point of the actual mistake.

**Fixed:** added `findDomainOwner(domain, excludeTenantId?)` to `domains.ts` — checks both an active `tenant_domains` row and the legacy `tenants.domain` column for a claim by a tenant OTHER than `excludeTenantId`, returning `{ tenantId, tenantName, source }` or `null`. Wired into all three write sites: each now rejects with `409` and a message naming the actual owning tenant (mirroring the existing `23505` message pattern in `admin/websites` POST) BEFORE the write reaches the DB, instead of letting the collision land and wait for a live-traffic 500 to surface it.

**Self-exclusion:** the two PUT handlers pass their own tenant id as `excludeTenantId` so re-saving a tenant's own already-registered domain (no-op edit, or editing an unrelated field on a business that already has its domain set) is never flagged as a false-positive collision against itself.

## (2) — swept for sibling instances of the same "no collision check" gap

- Confirmed `admin/websites` POST (`tenant_domains` insert) already has its own protection — the DB's own UNIQUE constraint plus an existing friendly-409 handler (from an earlier round). Not touched.
- Grepped every other write site that sets `tenants.domain` or `domain_name` (`activate-tenant.ts`, onboarding scripts, `scripts/onboard-tenant-site.ts`, `scripts/sim-all-trades.ts`): all either (a) write `tenant_domains` (DB-constraint-protected) or (b) are one-shot operator scripts, not live admin-facing write surfaces reachable by a mistyped form value. No other reachable admin/API write path sets `tenants.domain` without normalization already in place from prior rounds.
- No `[id]`-scoped `tenant_domains` DELETE/PATCH route exists (carried-forward #1 below) — this collision guard is orthogonal to that gap; it protects the FALLBACK column, not tenant_domains lifecycle management.

## (3) — gap/fluidity kept current

Carried-forward NOTICED items, unchanged:
1. `tenant_domains` DELETE/reactivate gap — still open, still gated on Jeff's product call. No `[id]`-scoped route exists for deleting/deactivating/reassigning an individual `tenant_domains` row; `POST` (create) is the only write endpoint.
2. `lib/tenant-schema.ts` — still confirmed dead code.
3. `platformFallback` compliance question (JEFF-MORNING-QUEUE.md) — still open.
4. `bookings/batch/route.ts`'s platform-fallback anomaly — still gated on #3.
5. `finance/upload/route.ts`'s MIME gap — fixed elsewhere (`p1-w4`, commit `5af092d2`), pending merge into `p1-w2`. No change.
6. Existing referrers' `commission_rate` rows stuck at signup-time value; no PUT/PATCH to edit post-signup, no backfill of pre-fix hardcoded-10% rows. Product/business decision, not acted on.
7. `tenant_domains_single_primary` DB migration (partial unique index) — prepared as a file, not yet run. Gated on Jeff's approval; LEADER runs it, not this worker.
8. `src/lib/lead-filters.ts` — ~90% dead code (7 of 8 exports unreferenced); 3 bespoke tenant clones each hardcode their own `OWNED_HOSTS` instead of the shared DB-backed module. Open product/architecture question, not acted on.

NEW this round:
9. `tenants.domain` still has no DB-level unique constraint (unlike `tenant_domains.domain`). This round's fix closes the gap at the application layer (all 3 known write sites now check first), but the column itself remains unconstrained — a write path this sweep didn't find (or a future one) could still reintroduce the same class of bug. A partial unique index on `tenants.domain` (nullable column, so a plain unique index works — no need for a partial index excluding nulls issue since Postgres already treats NULL as distinct in unique indexes) would close this at the schema level permanently. Flagging as a DB migration candidate, not acting — gated on Jeff's approval per this lane's standing practice for schema changes (see carried-forward #7).

## MISSING-FEATURE GAPS / UX-FRICTION

Carried forward, unchanged:
10. `dashboard/referrals/page.tsx`'s referrals-tab copy overpromises per-referrer rate control that doesn't exist. Not changed — copy-only UX call, flagging rather than acting.

## Verification this round

- `npx tsc --noEmit` clean (repo-wide).
- 7 new tests added to `src/lib/domains.test.ts`'s new `findDomainOwner` describe block: no-collision, tenant_domains-match, legacy-tenants.domain-match, self-exclusion probe, cross-tenant probe (collision still reported even when excluding self), and 2 masked-error probes (one per underlying query).
- 13 new route-level tests across 3 new files (`route.domain-collision-guard.test.ts` for `admin/businesses` POST, `admin/businesses/[id]` PUT, `admin/tenants/[id]` PUT), using the existing `tenant-isolation-harness` in-memory DB fake: wrong-tenant probes (rejects a domain owned by another tenant via either source, 409, never writes), self-exclusion (re-saving your own domain succeeds), and free-domain control cases (still succeed normally).
- All existing tests in the 3 modified route files' other test suites (`domain-normalization*`, `domain-negative-cache-bust*`, `vendor-secret-redaction*`, `cache-invalidation*`, `tenant-domains-fresh-ground*`, etc. — 85 tests across 22 files in `admin/businesses` + `admin/tenants`) still pass unchanged; the new collision check is additive and doesn't alter any previously-tested behavior for non-colliding domains.
- Full repo suite: 2943 passed, 37 skipped, 1 failed (`finance-export.test.ts`'s 200k-row pagination test — a 5s timeout under full-suite parallel load, same pre-existing flake documented in the prior round's gap doc, unrelated to this change). Re-ran that file in isolation: 3/3 passed in 1.81s. Confirmed pre-existing flake, not a regression from this round's change.

File-only, no push/deploy/DB write from this worker. 1 code commit this round (the fix + tests, 5 files) + 1 docs commit.
