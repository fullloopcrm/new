# W2 gap/fluidity refresh — 2026-07-17 08:01

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). No master file (per W4's confirmed pattern) — continues directly from `w2-fresh-ground-sweep-no-new-bug-plus-dead-column-2026-07-17-0747.md`.

Leader's fresh 3-deep queue this round: (1) continue archetype depth, (2) pivot fresh-ground hunting to a new bug class — the field-wiring/pick()-allowlist thread is closed, (3) keep gap/fluidity current. All 3 done — see below.

## Fresh ground — new bug class: write-side tenant-scope hardening (confirmed real, NOT a live bug)

Pivoted off field-wiring per the leader's order. First candidate hunted: routes whose UPDATE mutates a row without a redundant `.eq('tenant_id', …)`, even though the row's existence was already confirmed via a tenant-scoped SELECT immediately above. Swept every `documents/[id]/*` and `finance/…/[id]/*` route's UPDATE/DELETE calls against their own SELECT calls (the same class of check `tenant-db.ts`'s own header comment and `import-staging.ts`'s `undoBatch` comment both call out by name: "cross-tenant isolation currently depends on each route remembering to add `.eq('tenant_id', …)` — one forgotten filter is a data leak").

Found two real instances where the mutation drifted from every sibling in its own file/feature:

- **`POST /api/documents/[id]/void`** — the SELECT confirms `.eq('tenant_id', tenantId).eq('id', id)`, but the follow-up `UPDATE … SET status='voided'` filtered only `.eq('id', id)`. Sibling routes in the same feature (`documents/[id]` PATCH/DELETE, `documents/[id]/send`) already chain `tenantDb`'s auto-tenant-scoped update or an explicit `.eq('tenant_id', …)`.
- **`POST /api/finance/bank-transactions/[id]/match`**, expense branch — the SELECT confirms `.eq('tenant_id', tenantId).eq('id', targetId)`, but `expenses.update({ matched_bank_transaction_id })` filtered only `.eq('id', ex.id)`. The **booking branch two cases up in this exact same file** does it correctly (`.eq('id', b.id).eq('tenant_id', tenantId)`) — a real inconsistency within one function, not just across files.

**Honest assessment, not inflating this into a live vulnerability**: neither is exploitable on the real schema. `documents.id` and `expenses.id` are globally-unique UUID primary keys — no two tenants can ever share one — and in both cases the UPDATE only runs after the preceding SELECT has already proven `id` belongs to the caller's own tenant. There is no producible request that reaches either UPDATE carrying a foreign-tenant id. This is defense-in-depth drift, not a data leak: if a future refactor ever loosened or removed the SELECT-side guard (e.g. someone "simplifies" by skipping the existence check since the DB will 404 the update anyway), these two UPDATEs would silently become genuine cross-tenant writes with no compiler or test to catch it — exactly the failure mode `undoBatch`'s own comment warns about.

**Fixed**: both UPDATEs now carry `.eq('tenant_id', tenantId)` alongside `.eq('id', …)`, matching their sibling mutations. 2 new tests (1 per route, `route.tenant-scope.test.ts`): since real UUID PKs can't collide across tenants, wrong-tenant-id-collision is unreachable via a normal seed — each test seeds a synthetic id collision (two rows sharing one `id`, one per tenant; documented inline as impossible on the real schema and only a way to make the query's own filter observable) and proves the WRITE itself — not just the preceding read — only touches the caller's own row. Mutation-verified: reverted both fixes via `git apply -R`, both new tests failed RED (the foreign-tenant row's field flipped too — `theirs.status` became `'voided'`, `theirs.matched_bank_transaction_id` became set); restored via `git apply`, GREEN.

`npx tsc --noEmit`: clean. `eslint` on all touched files: 0 errors, 0 new warnings (pre-existing unused-import warnings on `getTenantForRequest` in both route files, untouched by this diff). Full suite: 547 files (was 545), 2453 tests total (was 2451) — 2416 passed + 37 skipped, 0 failed, 0 regressions.

No DB migration needed — `tenant_id` already exists on both `documents` and `expenses` (this fix only widens an existing WHERE clause, no schema change).

**Scope note**: this was a targeted 2-instance fix, not an exhaustive sweep. A broader grep across every `route.ts` for the same "bare `supabaseAdmin….update(…).eq('id', …)` after a tenant-scoped SELECT" shape turned up ~80 raw hits; most inspected so far are either platform-wide tables with no `tenant_id` by design (`prospects`, `admin_users`, `platform_announcements`, `error_logs` — correctly gated by `requireAdmin()` instead), webhook handlers keyed off signature-verified external ids, or already correctly re-scoped. Flagging as an open thread rather than claiming closed — see MISSING-FEATURE GAPS below is the wrong bucket for this, so noting here directly: a follow-up round should finish walking the remaining ~70 hits before calling this bug class exhausted.

## Archetype depth

Added `sim-all-trades.ts` section 5a-36. Proves the fixed shapes against the live schema (schema-drift check, not a cross-tenant check — this harness runs one tenant per pass, so it can't reproduce the cross-tenant collision the vitest tests cover): (a) a live `documents` row accepts the void route's exact `.eq('tenant_id', …).eq('id', …)` UPDATE and actually transitions to `voided`; (b) a live `expenses` row accepts the match route's exact `.eq('tenant_id', …).eq('id', …)` UPDATE shape (`matched_bank_transaction_id` set to `null` to satisfy its live FK to `bank_transactions` without needing a full bank-account/bank-transaction fixture chain — only the WHERE clause is under test here, not the FK). Not yet executed — leader-run-only, writes to live tenant `documents`/`expenses` tables. Verified statically: `tsc --noEmit` clean, `eslint` clean (0 new; same 3 pre-existing warnings on untouched lines as every prior round this session).

## NOTICED — not fixed, flagging for the leader/Jeff

Carried forward unchanged from the prior round's list (`w2-fresh-ground-sweep-no-new-bug-plus-dead-column-2026-07-17-0747.md`), items 1-17. No new items this round — this round's finding was fixed directly (see Fresh ground above), not flagged.

## MISSING-FEATURE GAPS

Carried forward unchanged from the prior round's list, items 1-26.

## UX-FRICTION

Carried forward unchanged from the prior round's list.

File-only, no push/deploy/DB. 3 commits this round (1× `fix`+tests, 1× `test(sim)`, 1× `docs`).
