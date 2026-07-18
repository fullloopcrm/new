# W2 gap/fluidity refresh — 2026-07-18 04:43

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). Continues from `w2-public-site-header-resolver-status-gate-gap-2026-07-18-0431.md`.

Leader's instruction this round (04:32 LEADER->W2): fresh 3-deep queue — (1) new fresh-ground surface. (2) continue whichever surface (1) opens up. (3) keep gap/fluidity current.

## (1) — new fresh-ground surface: a THIRD, un-synced source of "owned domain" truth exists per-tenant, and one instance is cross-tenant-contaminated

**Found, NOT code-fixed — flagging, same as item 30 (ComHub).** This is a real, verified issue, but fixing the DATA requires ground truth (which SEO domains actually belong to which tenant) that I cannot obtain from this file-only, no-DB-access worktree — fabricating a "corrected" list would be guessing, not fixing.

**What it is:** three bespoke per-tenant site subtrees each carry their own `_lib/domains.ts` (`ALL_DOMAINS` / `OWNED_DOMAINS`) and `_lib/lead-filters.ts` (`isOwnedReferrer()`, `findRealVisitorIds()`):
- `src/app/site/wash-and-fold-nyc/_lib/domains.ts` + `lead-filters.ts`
- `src/app/site/wash-and-fold-hoboken/_lib/domains.ts` + `lead-filters.ts`
- `src/app/site/nyc-mobile-salon/_lib/domains.ts` + `lead-filters.ts`

This is a parallel, independent implementation of the exact "which hosts count as this tenant's own site" concept that `src/lib/domains.ts`'s `getOwnedDomainSet(tenantId)` already solves correctly and DB-backed (tenant-scoped, reads live `tenant_domains` + `tenants.domain`/`domain_name`, documented at length re: why it unions rather than first-wins-falls-back). These per-tenant files instead hardcode a static domain list with no tenant-scoping mechanism at all — a plain array checked in once and never reconciled against the DB.

**The concrete data bug:** `wash-and-fold-nyc/_lib/domains.ts`'s `ALL_DOMAINS` (96 entries) is a near-verbatim copy of `wash-and-fold-hoboken/_lib/domains.ts`'s list (`diff` shows exactly 2 lines differ — hoboken has `thenycmaid.com`/`thenycmaidservice.com`, nyc has `washandfoldnyc.com` listed twice). The other 93 domains are IDENTICAL between the two files, including obviously Hoboken/NJ/Long-Island-branded entries (`hobokenmaidservice.com`, `weehawkenmaid.com`, `jerseycitymaid.com`, `manhassetmaid.com`, `portwashingtonmaid.com`, `greatneckmaid.com`) that wash-and-fold-nyc has no plausible claim to. This has every signature of a directory-level fork (git log shows `wash-and-fold-nyc`/`wash-and-fold-hoboken` were ported/restored together in the same cutover commits) where the primary domain was swapped but the SEO neighborhood-domain list was never trimmed per-tenant.

**Failure mode if this code were ever wired up (it currently is not — see below):** `isOwnedReferrer()` builds `OWNED_HOSTS` from `ALL_DOMAINS` and `findRealVisitorIds()` uses it to EXCLUDE visits referred from an "owned" host from real-visitor/lead-attribution counts. For wash-and-fold-nyc, that would wrongly classify traffic referred from any of the ~93 Hoboken-branded domains as internal/self-referral and silently drop it from lead attribution — undercounting real leads. This is the same "wrong-tenant" class of bug this session has repeatedly found and fixed in the live resolver stack (tenant_domains-first divergence guards, dead resolver-twin status drift, etc.), just in the domain-OWNERSHIP surface instead of the domain-ROUTING surface, and in per-tenant site code instead of the shared platform.

**Why not fixed outright (unlike the tenant.ts dead-resolver-twin round):** that fix was a pure code correction (swap a hardcoded status check for the existing `tenantServesSite()` helper) needing no external data. This one needs to know which of the 93 shared domains genuinely belong to wash-and-fold-nyc vs wash-and-fold-hoboken vs neither — that's tenant/domain registration data I have no way to verify from this worktree (no live DB read available to this worker; `TENANT-LAUNCH-PLAN-2026-06-11.md` and `TEMPLATE-MIGRATION-AUDIT.md` mention both tenants but not a domain-level breakdown). Guessing would be fabrication, not a fix.

## (2) — continued: swept for live wiring / broader blast radius

Traced the full call chain before flagging, to make sure this isn't actually live:
- `lead-filters.ts` in all three tenants (`wash-and-fold-nyc`, `wash-and-fold-hoboken`, `nyc-mobile-salon`) has **zero importers anywhere in the repo** — confirmed by repo-wide grep for each tenant's `_lib/lead-filters` path and for `isOwnedReferrer`/`findRealVisitorIds`/`OWNED_HOSTS` by name. `domains.ts`'s only consumer (`ALL_DOMAINS`) is `lead-filters.ts` itself, so the whole chain is dead.
- Checked whether the REAL, live attribution engine (`_lib/attribution.ts`, 18-19KB per tenant, clearly the actual analytics code path) depends on any of this — it doesn't. It has its own inline `isSearchReferrer()` and never references `isOwnedReferrer`/`OWNED_HOSTS`/`ALL_DOMAINS`. `lead-filters.ts` reads as an abandoned/superseded draft, not a live dependency.
- Checked all 19 bespoke-site tenants for the same `_lib/domains.ts` pattern — only these 3 have it (`find src/app/site -path '*/_lib/domains.ts'`), so this is fully scoped, not a wider systemic pattern across the tenant fleet.
- Net: **zero live production impact today.** This is a landmine, not an active bug — but a real one, with a concrete cross-tenant data error already baked in, waiting for whoever eventually wires `isOwnedReferrer`/`findRealVisitorIds` into a real lead-quality report to inherit it silently.

No code change made this round — nothing to verify with tsc/tests (confirmed `git status` shows zero diff under `platform/src`).

## (3) — gap/fluidity kept current

Carried-forward NOTICED items 1–29, 31–32, unchanged (see prior rounds' docs, most recently restated in `w2-public-site-header-resolver-status-gate-gap-2026-07-18-0431.md`).

Carried forward, still flagged not fixed (product/rollout/data calls, unchanged):
- `webhooks/stripe` never calling `activateTenant()` (HIGH SEVERITY, flagged 2026-07-18 ~02:10, in `JEFF-MORNING-QUEUE.md`).
- Item 30: ComHub `requireAdmin()` vs. nav-parity (20 route files gated Jeff-only while nav exposes ComHub to every operator; needs Jeff's rollout-gating call).

NEW this round:

33. Three bespoke-site tenants (`wash-and-fold-nyc`, `wash-and-fold-hoboken`, `nyc-mobile-salon`) each carry a dead, DB-un-synced `_lib/domains.ts` + `_lib/lead-filters.ts` pair implementing their own static "owned domain" list instead of the shared, tenant-scoped `getOwnedDomainSet()` (`src/lib/domains.ts`). `wash-and-fold-nyc`'s list is a near-verbatim copy of `wash-and-fold-hoboken`'s (93 of 96 domains identical, including clearly Hoboken/NJ/Long-Island-branded ones NYC has no claim to) — a cross-tenant data-contamination landmine that would silently undercount real lead attribution if ever wired up. Confirmed dead today (zero importers repo-wide); the live `attribution.ts` engine doesn't use it. Flagged for Jeff's call on either (a) deleting the dead files, or (b) if this was meant to be wired up, providing the correct per-tenant domain split first.

## MISSING-FEATURE GAPS / UX-FRICTION

Carried forward, unchanged: items 18–20.

## Verification this round

- No code changed — `git status --porcelain -- platform/src` empty.
- Confirmed dead-code claim via repo-wide grep (multiple angles: direct path import, named-export import, `find` for the `_lib/domains.ts` pattern across all 19 bespoke tenants).
- File-only, no push/deploy/DB write from this worker.
