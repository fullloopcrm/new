# W2 gap/fluidity refresh — 2026-07-18 02:34

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). Continues from `w2-tenant-creation-slug-negative-cache-gap-2026-07-18-0230.md`.

Leader's instruction this round (02:28 LEADER->W2): "Good closure -- neither tenant-creation path busted its own new tenant's negatively-cached slug... Fresh 3-deep queue (file-only, no push/deploy/DB each): (1) new fresh-ground surface. (2) continue whichever surface (1) opens up. (3) keep gap/fluidity current."

## (1) — new fresh-ground surface: the live-schema simulation harness's divergence-guard probe tested the WRONG resolver — a fully dead duplicate, not the one middleware.ts actually calls

**Bug found:** `scripts/sim-all-trades.ts`'s probe 5a-48 ("TRANSITION ASSERT-AND-REFUSE DIVERGENCE-GUARD PROBE") is the harness's only attempt to prove, against the REAL live schema (not a mock), that the resolver refuses to pick a tenant when `tenant_domains` and legacy `tenants.domain` disagree on the same host — the guard standing between a stale legacy row and the brand-swap failure mode (serving tenant A's data under tenant B's domain). The probe's own comment claimed `tenant.ts`'s `getTenantByDomain()` is "the exact function middleware.ts calls on every custom-domain request."

That claim is false. `src/middleware.ts` line 10 imports `getTenantBySlug`/`getTenantByDomain` exclusively from `@/lib/tenant-lookup` — never from `@/lib/tenant`. `tenant.ts` exports its own separate `getTenantByDomain`/`getTenantBySlug` pair (heavily hardened with the identical divergence-guard logic, same masked-error fixes, same doc comments) but grepping the entire `src/` tree turned up **zero production importers** of either function from `@/lib/tenant` — the only reference anywhere outside `tenant.ts` itself is its own `tenant.test.ts`. It's a complete, unreachable duplicate resolver — same class as the already-flagged `lib/tenant-schema.ts` dead code (carried item #2), just never previously identified as dead.

Net effect: the TRANSITION ASSERT-AND-REFUSE guard protecting every real custom-domain request in production had **never once been exercised against the live schema** by this harness — the probe spent its real-DB writes (a throwaway second tenant, a real conflicting `tenant_domains` row, a real conflicting legacy `tenants.domain` row, all cleaned up immediately) proving a guard on code nothing can ever reach. The only coverage the LIVE guard (`tenant-lookup.ts`'s copy) has ever had is `tenant-lookup.test.ts`'s mocked-`supabaseAdmin` unit tests — never a real conflicting row, never the live schema's actual constraints/behavior.

**Fixed:** repointed the probe's import from `'../src/lib/tenant'` to `'../src/lib/tenant-lookup'` so it exercises the resolver that's actually live. Rewrote the probe's own comment to document the correction (wrong-module claim, zero-caller confirmation, what it's repointed to) so a future reader doesn't reintroduce the same false premise. Verified the swap doesn't change probe semantics: the two resolvers' divergence-guard logic is structurally identical (same query order, same maybeSingle()+explicit-error-check pattern, same throw shape), the probe's assertions only ever touch `.id` on the returned tenant (both resolvers' return shapes carry that field), and `tenant-lookup.ts`'s in-memory 5-min cache can't pollute the probe — the divergence throw path never calls `setCache`, and the probe's dynamically-generated per-run host (`divergence-probe-${tenant.id.slice(0,8)}.example.com`) can't collide with any prior cache entry.

**Not run this round:** did NOT execute `scripts/sim-all-trades.ts` to behaviorally confirm the fix. `SIM-STRATEGY.md` documents this harness's pattern as real writes against FL prod (`cetnrttgtoajzjacfbhe`) via service-role key, self-cleaned via `test-*`/throwaway rows — an established pattern many prior rounds have used, but this session's standing instruction to this worker is explicit: "NEVER... run a prod DB migration or prod write." A throwaway divergence-injection probe is exactly a prod write, even though self-cleaning. Verified instead via full static analysis: confirmed the corrected import resolves the actual live-called module (`src/middleware.ts:10`), confirmed via exhaustive grep sweep that no other place in `sim-all-trades.ts` (or anywhere else in the repo) makes the same wrong-module mistake, and `npx tsc --noEmit` clean. Leaving the corrected probe as a file for the leader/Jeff to decide whether to run.

**Worth flagging, not deciding unilaterally:** `tenant-resolver-flip.smoke.test.ts`'s own Part B (synthetic divergence) deliberately uses a mocked Supabase client specifically so "NO divergence is ever written to a real database" — a designed choice to avoid injecting real conflicting rows into prod, even temporarily. `sim-all-trades.ts`'s probe 5a-48 does the opposite by design (real conflicting rows, real prod writes, immediate cleanup) — that tension predates this round's fix (the probe already existed, just aimed at the wrong function) and isn't something I'm resolving here. Whether the harness should keep doing real-prod-divergence-injection now that it's pointed at the function that matters, versus switching to the smoke test's mocked-only philosophy, is Jeff's call — not flagging to JEFF-MORNING-QUEUE.md since it's a test-infra risk posture question, not a live customer-facing bug, but noting it here so it isn't silently decided by inertia.

## (2) — continued: swept for the same class of error elsewhere — found none

Grepped the full repo for any other place claiming a `tenant.ts` function is what middleware/production calls, and for any other import of `getTenantByDomain`/`getTenantBySlug` from `'../src/lib/tenant'` (or `'@/lib/tenant'`) outside `tenant.ts`'s own test file. Confirmed clean — this was an isolated instance, not a pattern. Nothing else "opens up" from this specific surface.

## (3) — gap/fluidity kept current

Carried-forward NOTICED items, unchanged (see prior round's doc for full list, items 1–16 + 18–20):
1. `tenant_domains` DELETE/reactivate gap — still open, still gated on Jeff's product call. (Confirmed again this round while surveying `admin/websites/route.ts`: only GET+POST exist, no DELETE/deactivate endpoint at all — an admin told "remove it there first, or reassign it" by the 23505 collision error has no UI path to do either.)
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

CLOSED this round:
17. ~~Live-schema simulation harness's TRANSITION ASSERT-AND-REFUSE divergence-guard probe tested a dead duplicate resolver instead of the one middleware.ts actually calls~~ — fixed above (1): repointed `scripts/sim-all-trades.ts`'s import from `../src/lib/tenant` to `../src/lib/tenant-lookup`.

NEW this round:
21. Whether `sim-all-trades.ts`'s divergence-guard probe should keep injecting real conflicting rows into prod (self-cleaning) now that it targets live code, versus adopting `tenant-resolver-flip.smoke.test.ts`'s mocked-only philosophy for this exact scenario class — flagged in (1) above, not decided unilaterally.

## MISSING-FEATURE GAPS / UX-FRICTION

Carried forward, unchanged: items 18–20 (referrals-tab copy overpromise, `ownerPin` display gap, full-loop-signup `activateTenant()` bypass as missing-feature gap).

## Verification this round

- `npx tsc --noEmit` clean (repo-wide).
- `npx eslint scripts/sim-all-trades.ts` — 0 new errors, 3 pre-existing warnings (unrelated: unused type/const, one `any`).
- Fixed 1 file: `scripts/sim-all-trades.ts` (import path + explanatory comment, no logic change).
- Did NOT execute the simulation harness this round (prod-write; see (1) above for reasoning). No vitest suite covers this script (it's a standalone tsx script, not part of the vitest run).
- No new test files this round — this was a test-harness correctness fix, not application code; the "test" IS the artifact being fixed.

File-only, no push/deploy/DB write from this worker. 1 code commit this round (fix + comment) + 1 docs commit (this file).
