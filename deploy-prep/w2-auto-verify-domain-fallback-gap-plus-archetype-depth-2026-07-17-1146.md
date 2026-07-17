# W2 gap/fluidity refresh — 2026-07-17 11:46

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). No master file (per W4's confirmed pattern) — continues directly from `w2-site-export-domain-fallback-gap-plus-archetype-depth-2026-07-17-1136.md`.

Leader's fresh 3-deep queue this round (11:40 LEADER->W2): (1) continue project archetype depth, (2) continue fresh-ground hunting, (3) keep gap/fluidity current.

## (1) Fresh-ground — third instance of the same resolver-precedence class, a different code SHAPE

5a-45 (`linkTenant()`/`backfillUntrackedDomains()`) and 5a-46 (`site-export`) were both single-tenant fallback queries — "given one host/tenant_id, resolve the other side, falling back to `tenants.domain` when `tenant_domains` has nothing." This round's static sweep turned up the same coverage-gap class in a third, structurally different shape: an **allowlist UNION**, like `backlinks.ts`'s `loadActiveFleet()` and `onboarding.ts`'s `backfillUntrackedDomains()` (both already fixed earlier this session) — build a `Set` of valid domains from one source, then test membership.

**`eligibleForAutoVerify()` in `src/lib/seo/auto-verify.ts`** — the allowlist gate that decides which `awaiting_grant` `seo_properties` are even *candidates* for `SEOMGR_AUTOVERIFY_ENABLED`'s live auto-verification flow — built its `activeDomains` set from `tenant_domains` only (`.eq('active', true)`), with no `tenants.domain` union. A tenant live only via the legacy `tenants.domain` column (still normal: `tenant_domains` registration is best-effort per `activate-tenant.ts`'s try/catch upsert) would have every one of its `awaiting_grant` properties silently and *permanently* excluded from auto-verify — not a one-time miss, since `eligibleForAutoVerify()` is also what dry-run reporting calls, so the tenant would never even show up as "would verify" to a human reviewing the dry-run output. No externally-visible error, no 400 — this is a silently-empty-allowlist failure mode, the same shape as the pre-fix `backlinks.ts`/`onboarding.ts` bugs (an entire tenant invisible to an engine, not a wrong-tenant leak).

Swept the rest of `src/lib/seo/*.ts` for the same `tenant_domains`-only allowlist/query shape to confirm this was the only remaining unfixed instance: `alerts.ts`, `commercial.ts`, `competitor-remediate.ts`, `competitors.ts`, `content.ts`, `detect.ts`, `enrich.ts`, `intent.ts`, `locations.ts`, `overrides.ts`, `photos.ts`, `remediate.ts`, `safety-gate.ts`, `schema.ts`, `serp.ts`, `services.ts`, `technical.ts`, `tenant-seo.ts`, `tenant-sitemap.ts`, `verify-revert.ts` — none of these query `tenant_domains` or `tenants.domain` directly; they all consume already-resolved `tenant_id`/`domain` values passed in from `backlinks.ts`'s `loadActiveFleet()` or similar upstream resolvers already fixed. `gsc.ts`/`gsc-write.ts` are pure Google API wrappers, no tenant resolution. `auto-verify.ts` was the last one standing.

**Fix:** added the `tenants.domain` union to `eligibleForAutoVerify()`'s `activeDomains` set, matching `backlinks.ts`'s `loadActiveFleet()` / `onboarding.ts`'s `backfillUntrackedDomains()` precedent exactly (`tenant_domains` already in the set; the fallback pass only fills gaps, no `.eq('status', ...)` filter needed since it's building a domain allowlist, not resolving a specific tenant identity). 5 new tests (`auto-verify.test.ts`, new file — this function had no prior test coverage) incl. a wrong-tenant probe (a legacy `tenants.domain` row for an unrelated host doesn't make an unrelated property eligible) and confirming the `awaiting_grant`/`permission` idempotency filters still apply on top of the fallback-resolved domain. Mutation-verified: reverted via `git diff` + `git apply -R` (`git stash` disabled, shared `.git` dir across all 4 worker worktrees) — the fallback test went RED for the right reason (empty eligible list instead of the legacy-only domain), reapplied, confirmed GREEN.

## (2) Archetype depth — 5a-47, proving the UNION shape against the live schema

Added **5a-47** to `platform/scripts/sim-all-trades.ts` (after 5a-46, before `5b. CHANGE ORDER`). 5a-45/5a-46 both probed single-tenant fallback-query shapes; this is the first archetype-depth probe of the allowlist-UNION shape this session's `eligibleForAutoVerify()` fix depends on. Deactivates the tenant's `tenant_domains` rows, seeds `tenants.domain`, inserts a throwaway `awaiting_grant` `seo_properties` row for that legacy-only domain, calls the real `eligibleForAutoVerify()` (no requireAdmin gate on this one — it's a pure library function, not a route handler, so unlike 5a-38/5a-39/5a-46 this probe imports and calls it directly rather than mirroring its query inline), and confirms the throwaway property is included. Deletes the throwaway row and restores both tables' original state (this tenant is shared by every later phase in the run).

**Leader: please run `SIM_ONLY=roofing npx tsx scripts/sim-all-trades.ts` (or a full run) to confirm 5a-47 (and the still-pending 5a-35 through 5a-46) pass before relying on them.**

## Verification this round

- `npx tsc --noEmit` clean (repo-wide, both fixed/new files + `sim-all-trades.ts`).
- Full suite: 579/580 files, 2504/2504 non-skipped tests passing (37 pre-existing skipped). One file (`finance-export.test.ts`) hit a 5s test-timeout under full-suite parallel load (a 200k-synthetic-row generation test) — re-ran in isolation, passed clean in 4.09s; not a regression, not touched by this round's changes, flagging as a pre-existing flakiness note rather than a real failure.
- Fix mutation-verified (`git diff` the fixed file + `git apply -R` to revert — confirmed the fallback test goes RED for the right reason, restored, confirmed GREEN).
- File-only, no push/deploy/DB write. `sim-all-trades.ts` probe added but not run by me (leader-run-only, per standing convention).

## NOTICED — not fixed, flagging for the leader/Jeff

Carried forward unchanged from the prior round (items 1-26). No new items this round — this round's fresh-ground find was a clean fix within the same established fallback pattern, no design-decision-shaped side findings.

## MISSING-FEATURE GAPS

Carried forward unchanged from the prior round's list, items 1-26 (gap #18 stays open on `reviews/request`, unchanged, still Jeff's product call).

## UX-FRICTION

Carried forward unchanged from the prior round's list.

File-only, no push/deploy/DB write from this worker.
