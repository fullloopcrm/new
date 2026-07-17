# W2 gap/fluidity refresh — 2026-07-17 13:05

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). No master file (per W4's confirmed pattern) — continues directly from `w2-client-sms-brand-domain-fallback-gap-plus-archetype-depth-2026-07-17-1250.md`.

Leader's fresh 3-deep queue this round (12:53 LEADER->W2): (1) continue project archetype depth. (2) continue fresh-ground hunting. (3) keep gap/fluidity current.

## (1) Fresh-ground — fourth mirror of the resolver-precedence bug class, second one that's LIVE today

Continued sweeping every remaining direct `.domain`/`.domain_name`/`website_url` read in `src/lib`/`src/app` for the same shape as NOTICED #26/#29/the client-sms brand fix's bug: reads the legacy `tenants.domain`/`domain_name`/`website_url` columns only, never consults `tenant_domains`. Found it in `src/lib/site-readiness.ts`'s `resolveOrigin()` — the resolver `checkSiteReadiness()` uses to pick the origin its real HTTP content/SEO audits fetch (word counts, title/meta uniqueness, H1 count, schema presence) for the admin readiness dashboard.

**This one is live today.** `resolveOrigin()` is called by `checkSiteReadiness()`, which is called by `admin/businesses/[id]/readiness` (the admin-facing "Site Readiness" panel). Previous behavior: `(tenant.domain || tenant.domain_name || '')` — legacy columns only, `tenant_domains` never consulted; falls through to `https://<slug>.fullloopcrm.com` if both are empty. A tenant whose custom domain lives only in `tenant_domains` (added via `admin/websites`, which never touches `tenants.domain`/`domain_name` — confirmed by reading that route, same as the brand.ts round) got:
- The content/SEO audit fetching and scoring the platform subdomain (`<slug>.fullloopcrm.com`) instead of the tenant's actual live site — wrong signal entirely if the two origins diverge in content.
- The UI's "Serving from https://..." detail string naming the platform subdomain instead of the tenant's real domain — misleading to whoever reads the readiness report (admin or, per the docstring, potentially surfaced during tenant activation review).

**Fixed:** `resolveOrigin()` now resolves via `getPrimaryTenantDomain()` first, same precedence as `getAgentConfig()`/`buildBrandOverride()`/`tenantBrand()`/`tenantSiteUrl()` (`tenant_domains` PRIMARY row, then `tenants.domain`/`domain_name`, then the `<slug>.fullloopcrm.com` fallback). It's now async (was sync) and exported (was private) for direct testability, matching the established pattern from the selena agent fix. `checkSiteReadiness()`'s one call site updated to `await` it.

7 new vitest cases: `site-readiness.test.ts` (new file — PRIMARY-wins, `tenants.domain` fallback, a BUG-CLASS PROBE naming the exact wrong-origin failure mode, slug-subdomain fallback when nothing else resolves, null-when-nothing-resolves-anywhere, a wrong-tenant probe, a no-id skip-lookup case). Mutation-verified: reverted the `site-readiness.ts` diff via `git diff` + `git apply -R` — all 7 new tests went RED for the right reason (the export itself was removed by the revert, so every case failed on `resolveOrigin is not a function` — confirms the tests exercise the real exported function, not a stale reference). Reapplied, confirmed all 7 GREEN.

**NOTICED #30 (new, not fixed — out of scope for this fix):** `resolveOrigin()` line ~174 (pre-fix line 162) has `custom.replace(/^www\./, 'www.')` — a no-op regex replace (replaces the literal string "www." with "www.", i.e. a no-op). Reads like it was meant to strip a `www.` prefix (`replace(/^www\./, '')`) but never did. Pre-existing, unrelated to the domain-fallback bug fixed this round, left unchanged. Flagging for Jeff/leader — low stakes (cosmetic: a domain that happens to start with "www." would keep it in the readiness UI's "Serving from" string) but a genuine one-line typo bug.

## (2) Archetype depth — 5a-53, proving the reverse-lookup precedence against the live schema

Added **5a-53** to `platform/scripts/sim-all-trades.ts` (after 5a-52, before `5b. CHANGE ORDER`). Same shape as 5a-49's `tenantSiteUrl()`, 5a-51's `buildBrandOverride()`/`applyBrandRewrite()`, and 5a-52's `tenantBrand()` probes: seeds a real legacy `tenants.domain_name` value (`tenants.domain` cleared), confirms fallback; seeds a real active PRIMARY `tenant_domains` row alongside it, confirms it wins; creates a real second tenant with its own PRIMARY `tenant_domains` row and confirms the first tenant's `resolveOrigin()` never resolves to the second tenant's domain. Restores both tables' original state and deletes the throwaway second tenant (the run's primary tenant is shared by every later phase).

**Leader: please run `SIM_ONLY=roofing npx tsx scripts/sim-all-trades.ts` (or a full run) to confirm 5a-53 (and the still-pending 5a-35 through 5a-52) pass before relying on them.**

## (3) NOTICED — not fixed, flagging for the leader/Jeff

Carried forward unchanged from the prior round (items 1-29), plus the new item added this round:
- **#30 (new):** `site-readiness.ts` `resolveOrigin()`'s `.replace(/^www\./, 'www.')` no-op regex — see above. Cosmetic, low stakes, genuine typo.

## MISSING-FEATURE GAPS

Carried forward unchanged from the prior round's list, items 1-26 (gap #18 stays open on `reviews/request`, unchanged, still Jeff's product call). Item #28 (dead neighborhood-attribution feature) still straddles both tracks per last round's note.

## UX-FRICTION

Carried forward unchanged from the prior round's list.

## Verification this round

- `npx tsc --noEmit` clean (repo-wide, incl. `sim-all-trades.ts`).
- `npx eslint` on all touched/new files (`site-readiness.ts`, `site-readiness.test.ts`): 0 warnings. `sim-all-trades.ts`: 3 pre-existing warnings, all far from this round's insertion (lines 51/443/2504 vs. the 5a-53 block at ~4085-4130) — confirmed not introduced this round.
- Full suite: 584/584 files, 2549/2586 tests passing (37 pre-existing skipped), 0 failures — up from 582/583 files, 2541/2542 non-skipped last round (+7 new test cases, and the prior round's one flaky `finance-export.test.ts` timeout did not recur under this round's load).
- Fix mutation-verified (see above).
- File-only, no push/deploy/DB write. `sim-all-trades.ts` probe added but not run by me (leader-run-only, per standing convention).

File-only, no push/deploy/DB write from this worker.
