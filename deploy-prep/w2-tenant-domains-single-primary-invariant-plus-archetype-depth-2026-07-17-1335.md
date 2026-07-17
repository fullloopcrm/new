# W2 gap/fluidity refresh — 2026-07-17 13:35

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). No master file (per W4's confirmed pattern) — continues directly from `w2-invoice-quote-document-sendlink-domain-fallback-gap-plus-archetype-depth-2026-07-17-1330.md`.

Leader's fresh 3-deep queue this round (13:25 LEADER->W2): (1) continue project archetype depth. (2) continue fresh-ground hunting on a new surface, resolver-precedence class exhausted after 5 rounds. (3) keep gap/fluidity current.

## (1) Fresh-ground — new bug class: the WRITE side, not the read side

The resolver-precedence class ("does resolver X fall back to tenant_domains") is genuinely exhausted per the leader's read — 5a-49 through 5a-54 swept every read-side caller. This round swept the WRITE side of `tenant_domains` instead, and found a different failure shape entirely.

**Bug:** `POST /api/admin/websites` — the only route an admin uses to add a domain to a tenant after activation — let `is_primary: true` be set on a brand-new row without ever demoting the tenant's existing primary. No app-level check, and no DB constraint (migration 043's `CREATE TABLE tenant_domains` has no unique/partial-unique index on `is_primary`). Two other write sites in the codebase already guard the equivalent single-primary invariant for their own tables (`client_contacts.is_primary`, `client_properties.is_primary` — both demote-then-set in the same call), but `tenant_domains` never got the same treatment.

**Blast radius:** `getPrimaryTenantDomain()` (domains.ts) is the single choke point that feeds `tenantSiteUrl()`, `tenantBrand()`, the SELENA agent's `buildBrandOverride()`/`applyBrandRewrite()`, and `resolveOrigin()` — every resolver this session spent 5a-49 through 5a-54 fixing. It ran an **unordered** select and picked `rows.find(d => d.is_primary)`. Once a tenant had two active `is_primary=true` rows (trivially reachable: add a second domain via admin/websites and check the "primary" box), which domain "won" for every one of those downstream call sites — invoice/quote/document send links, client SMS branding, the SELENA chat agent's brand override, the site-readiness audit's origin — depended on whatever order an unordered Postgres scan happened to return on a given request, not on which the admin most recently intended. Non-deterministic, not just wrong: could flip between requests, deploys, or query-plan changes.

**Fixed on both ends:**
1. **Write path** (`app/api/admin/websites/route.ts`): now demotes any existing primary (`.update({is_primary:false}).eq('tenant_id',...).eq('is_primary',true)`) before inserting a new one — same demote-then-set pattern already used for `client_contacts`/`client_properties`. Prevents new duplicates going forward.
2. **Read path** (`lib/domains.ts`'s `getPrimaryTenantDomain()`): now explicitly orders by `created_at ascending` as defense-in-depth, so even a row that predates the fix (or a future bug that slips past it) resolves deterministically — the OLDEST `is_primary` row consistently wins instead of an arbitrary one.
3. **DB constraint prepared as a FILE ONLY** — `lib/migrations/2026_07_17_tenant_domains_single_primary.sql` — a one-time dedup (keeps the oldest primary per tenant, demotes the rest) followed by a partial unique index `(tenant_id) WHERE is_primary AND active`. **Not executed** by this worker — leader runs after Jeff approves, per standing convention.

**Regression caught while wiring the fix:** adding `.order()` to `getPrimaryTenantDomain()`'s query broke 5 existing test files whose local Supabase mocks modeled that query as ending on a bare `.eq()` chain with no `.order()` method (`site-readiness.test.ts`, `messaging/brand.test.ts`, `messaging/client-sms.test.ts`, `selena/agent.test.ts`, `selena/agent-config-loader.test.ts`) — 18 tests failed silently-wrong (assertions on resolved text, not thrown errors) until caught by re-running the full suite, not just the new files. `agent-config-loader.test.ts` was the trickier one: its `order()` was already doing double duty for the unrelated `service_types` query, resolving a hardcoded `serviceRows` value regardless of table — made it table-aware (`tenant_domains` falls through to the real thenable chain; every other table keeps the old behavior) rather than just adding a second no-op. All 5 mocks fixed; full repo suite (588 files / 2569 tests) reverified green after.

9 new vitest cases across 2 files (`domains.test.ts`: a determinism probe with two conflicting `is_primary` rows plus an assertion the query's `.order()` call itself is `created_at`/ascending; `route.normalization.test.ts`: demote-before-insert, a wrong-tenant probe proving the demote never touches a DIFFERENT tenant's primary, and a non-primary-insert-is-a-no-op probe), plus the 5 mock fixes above. `npx tsc --noEmit` clean repo-wide throughout.

**NOTICED:** none new this round beyond the regression already caught and fixed above.

## (2) Archetype depth — 5a-55

Added **5a-55** to `platform/scripts/sim-all-trades.ts` (after 5a-54, before `5b. CHANGE ORDER`). Seeds two genuinely conflicting active `is_primary=true` rows for the shared tenant with explicit, out-of-order `created_at` values (one backdated to 2020, one at default/now), calls `getPrimaryTenantDomain()` directly, and confirms the OLDEST wins — against the real live schema, not a mock. Plus a wrong-tenant probe: a second real tenant's own (even older) `is_primary` row must never leak into the first tenant's resolution. Restores tenant state and deletes the throwaway second tenant afterward, matching this session's established probe shape.

**Leader: please run `SIM_ONLY=roofing npx tsx scripts/sim-all-trades.ts` (or a full run) to confirm 5a-55 (and the still-pending 5a-35 through 5a-54) pass before relying on them.**

## (3) NOTICED — not fixed, flagging for the leader/Jeff

Carried forward unchanged from the prior round (items 1-30). No new items this round.

## MISSING-FEATURE GAPS

Carried forward unchanged from the prior round's list, items 1-26 (gap #18 stays open on `reviews/request`, unchanged, still Jeff's product call). Item #28 (dead neighborhood-attribution feature) still straddles both tracks per last round's note.

One new observation worth a line, not yet promoted to a numbered gap: `app/api/admin/websites/route.ts` has no PATCH/DELETE — an admin can add a domain and mark it primary, but can never demote/deactivate/remove one after the fact except by direct DB access. Not fixed here (out of scope for this bug), flagging since it's adjacent to the code just touched.

## UX-FRICTION

Carried forward unchanged from the prior round's list.

## Verification this round

- `npx tsc --noEmit` clean, repo-wide.
- `npx vitest run` — full repo suite: **588 test files, 2569 tests passed, 37 skipped, 0 failed** (re-run after fixing the 5 regressed mocks caught mid-round).
- File-only, no push/deploy/DB write. The DB migration (`2026_07_17_tenant_domains_single_primary.sql`) and `sim-all-trades.ts` probe are both prepared but not executed/run by this worker — leader-run-only, per standing convention.

File-only, no push/deploy/DB write from this worker.
