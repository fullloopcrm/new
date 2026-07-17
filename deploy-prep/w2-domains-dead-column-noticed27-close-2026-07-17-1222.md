# W2 gap/fluidity refresh — 2026-07-17 12:22

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). No master file (per W4's confirmed pattern) — continues directly from `w2-tenantsiteurl-mirror-gap-plus-archetype-depth-2026-07-17-1209.md`.

Leader's fresh 3-deep queue this round (12:11 LEADER->W2): (1) confirm which table domains.ts's neighborhood/zip_codes/type actually targets, using the leader's own live-schema read, (2) continue fresh-ground hunting, (3) keep gap/fluidity current.

## (1) NOTICED #27 — CLOSED this round, with a definitive answer

The prior round couldn't confirm whether `domains.ts`'s `neighborhood`/`zip_codes`/`type` columns were schema.sql-vs-live drift (like NOTICED #19) or a genuinely dead reference, because it required a live-schema check the worker couldn't run itself. The leader ran that check and reported `tenant_domains`'s real columns as `id, tenant_id, domain, active, is_primary, notes, created_at, routing_mode, vercel_project, status, updated_at` — no `neighborhood`/`zip_codes`/`type`.

Verified this independently, two ways:

1. **Direct read-only REST call** against the live table (`select=domain,neighborhood,zip_codes,type`): `{"code":"42703","message":"column tenant_domains.neighborhood does not exist"}`. Same for `type` via `order=type.asc`.
2. **Full migration-history sweep** of every migration that touches `tenant_domains` (`043_tenant_domains.sql` — the original `CREATE TABLE` — plus `046_rls_deny_on_new_tables.sql` and `058_fix_nycmaid_routing.sql`, the only three that reference it): 043's `CREATE TABLE` only ever declared `id, tenant_id, domain, active, is_primary, notes, created_at`. No migration, ever, added `type`, `neighborhood`, or `zip_codes`. Also grepped every `.from('tenant_domains').insert(...)` site in the codebase (`api/admin/websites/route.ts`, `activate-tenant.ts`, `sim-all-trades.ts`) — none of them write these fields either.

**Conclusion: this is not schema drift. It's a feature (`domains.ts`'s `neighborhood`/`zip_codes`/`type` fields, and `attribution.ts`'s entire `attributeByAddress()` neighborhood-based lead/booking-attribution flow) written against a table shape that has never existed, live-broken since inception.** Every call site (`portal/collect`, `client/collect`, `client/book`, `api/attribution`) already wraps the attribution calls in try/catch, so this has never crashed a request — but the "Website → Lead" / "Website → Sale" notifications and `bookings.attributed_domain`/`attribution_confidence` have never once been populated through this path, for any tenant, since the feature was written.

## (2) Fresh-ground — compounding masked-error bug found alongside, fixed this round

While tracing the call chain to confirm blast radius, found that `getTenantDomains()` and `getDomainsForNeighborhood()` (same file) were silently discarding their own query errors — destructuring only `{ data }`, never checking `error` — and returning `[]` on every failure, indistinguishable from the legitimate "no rows" case. This is the exact masked-error anti-pattern this same file already recognized and fixed for its two sibling functions, `getNeighborhoodFromZip()` and `getPrimaryTenantDomain()` (both already have a "MASKED-ERROR PROBE" test) — just never applied to these two.

Currently zero live blast radius: `getDomainsForNeighborhood`/`getTenantDomains` calls inside `attribution.ts`'s `attributeByAddress()` are unreachable in practice (execution never gets past `getNeighborhoodFromZip()`, which already throws first), and `getOwnedDomainSet()` → `isOwnedReferrer()` in `lead-filters.ts` is itself dead code (grepped — `isOwnedReferrer` is exported but never called anywhere). But it's a landmine: if either upstream path is ever "fixed" to degrade gracefully instead of throwing, this silent-`[]` behavior would immediately start masking real DB failures as "tenant owns no domains" / "no neighborhood match."

**Fixed:** both functions now check `error` and throw loud (`TENANT_DOMAINS_LOOKUP_ERROR`, `DOMAINS_FOR_NEIGHBORHOOD_LOOKUP_ERROR`), matching their two siblings exactly. Did **not** touch the underlying dead-column question — the queries still target `neighborhood`/`zip_codes`/`type`, which still don't exist, so both functions still throw on every real call. That's intentional: whether to add a migration (making the feature real) or delete the dead codepath is a product decision, not a masked-error fix, and is flagged below for Jeff.

4 new vitest cases in `domains.test.ts`: 2 existing tests updated to explicitly assert `error: null` for the legitimate no-rows case (previously ambiguous `{data: null}` with no error field), plus 2 new MASKED-ERROR PROBEs mirroring the existing ones for `getNeighborhoodFromZip`/`getPrimaryTenantDomain`.

## (3) Archetype depth — 5a-50, proving the dead-column + fix against the live schema

Added **5a-50** to `platform/scripts/sim-all-trades.ts` (after 5a-49, before `5b. CHANGE ORDER`). Unlike 5a-45–5a-49 (which prove a resolver-precedence *direction*), this proves a structural absence — the columns don't exist, full stop, so no throwaway rows or mock are needed. Imports `getTenantDomains`, `getDomainsForNeighborhood`, `getNeighborhoodFromZip` directly and confirms all three now throw loud (the first two newly, the third pre-existing) against the REAL live schema.

**Leader: please run `SIM_ONLY=roofing npx tsx scripts/sim-all-trades.ts` (or a full run) to confirm 5a-50 (and the still-pending 5a-35 through 5a-49) pass before relying on them.**

## Verification this round

- `npx tsc --noEmit` clean (repo-wide, incl. `sim-all-trades.ts`).
- `npx vitest run` — 580 files, 2516/2516 non-skipped tests passing (37 pre-existing skipped, up from 2514/580 last round — the +2 new `domains.test.ts` cases), zero regressions.
- Live-schema verification done via direct read-only REST calls against `NEXT_PUBLIC_SUPABASE_URL` using the service-role key already present in `.env.local` — no writes, no DDL, no prod mutation. `sim-all-trades.ts` probe added but not run by me (leader-run-only, per standing convention).
- File-only, no push/deploy/DB write.

## NOTICED — not fixed, flagging for the leader/Jeff

Carried forward unchanged from the prior round (items 1-26), plus:

- **#27: CLOSED this round.** See (1) above — confirmed genuinely dead, not schema drift.
- **#28 (new):** The neighborhood-based lead/booking attribution feature (`attributeByAddress()` in `src/lib/attribution.ts`, plus the identical `getDomainsForNeighborhood`/`extractZip` logic duplicated inline in the three site-local `attribution.ts` copies under `src/app/site/*/​_lib/`) has never worked, for any tenant, since it was written — it depends on `tenant_domains.neighborhood`/`zip_codes`/`type`, columns that have never existed. Two paths forward, both Jeff's call, not mine: **(a)** ship a migration adding `type`/`neighborhood`/`zip_codes` to `tenant_domains` plus the missing admin UI to populate them (there is currently no data-entry path anywhere in the codebase — this would be new feature work, not a bug fix), or **(b)** delete the dead codepath (`getDomainsForNeighborhood`, `getNeighborhoodFromZip`, the `type` field/filter, and the three site-local duplicates) since nothing has ever populated it and the "Website → Lead"/"Website → Sale" notifications it was meant to produce have simply never fired. Did not act on either — this is a scope decision beyond a masked-error fix.

## MISSING-FEATURE GAPS

Carried forward unchanged from the prior round's list, items 1-26 (gap #18 stays open on `reviews/request`, unchanged, still Jeff's product call). Item **#28 above could also be read as a missing-feature gap** rather than a bug — cross-referencing here since it straddles both tracks.

## UX-FRICTION

Carried forward unchanged from the prior round's list.

File-only, no push/deploy/DB write from this worker.
