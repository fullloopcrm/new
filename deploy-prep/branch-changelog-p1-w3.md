# p1-w3 branch changelog — CI hardening, SEO, IDOR lint guard

**Author:** W3 · **Date:** 2026-07-12 · **Scope:** docs + tests only, this
worktree's own commits on `p1-w3`. No `.github/workflows` edit was applied by
this lane without an explicit prior leader instruction (the two exceptions
are called out below); no PR opened, no push beyond this branch, no prod DB
write. File-only summary — the leader/Jeff decides what gets applied.

This note indexes the branch's work across three lanes so the leader can scan
one file instead of 90+ commits. Each section links the deploy-prep doc(s)
with the full detail.

---

## 1. CI hardening

- **Least-privilege + concurrency-cancel, applied:** `ci.yml` and
  `tenant-scope.yml` both got `permissions: contents: read` and a
  `concurrency: { group, cancel-in-progress: true }` block (commits
  `62650372`, `8eae3e17`, `774e89fc` for the reconcile workflow). Prevents a
  stale run from racing a newer push and caps the default token's blast
  radius.
- **Full-suite gate confirmed, no fix needed:** verified `ci.yml`'s
  `npx vitest run` (line 46) is unfiltered — no `--shard`/`--changed`/path arg
  — and `vitest.config.ts`'s `include` covers all of `src/**/*.test.{ts,tsx}`.
  The `coverage.include` narrowing is a separate, easily-misread key that does
  **not** subset which tests run. See `ci-full-suite-gate-note.md`. A ratchet
  test (`ci-full-suite-guard.test.ts`) now guards this invariant so a future
  edit that narrows the vitest step gets caught in CI itself.
- **Reconcile gate wiring guarded:** `reconcile-gate-wiring.test.ts` asserts
  `tenant-config-reconcile.yml` still token-guards on
  `SUPABASE_ACCESS_TOKEN_FULLLOOP` and skips clean when absent, so the gate
  can't silently start requiring the secret or silently stop running.
- **SHA-pinning, proposal only:** every third-party `uses:` across the four
  workflows is on a mutable `@v4` tag. Full inventory + exact SHA pins +
  re-resolve command in `actions-sha-pinning-note.md`. Flags one adjacent gap
  (`db-backup.yml` has no `permissions:` block, unlike the other three) as a
  separate follow-up, not bundled into the pinning edit.
- **Per-branch CI validation for the wave, proposal only:** none of the six
  `p1-wN` branches (79/66/72/66/63/59 commits ahead of `main` at time of
  writing) have ever run through `ci.yml`, because its trigger is
  `push: [main]` + `pull_request:` and no branch has an open PR. `pr-ci-
  matrix-note.md` lays out three options (draft PRs / branch-pattern push
  trigger / dedicated matrix workflow) with a recommendation (draft PRs,
  cheapest, zero workflow edits) and flags that per-branch green does not
  substitute for validating the merged `integ/wave2` result.

## 2. SEO

Nine regression-guard test suites added this branch, each closing a specific
gap found by direct audit (not hypothetical):

| Guard | What it catches |
|---|---|
| `seo-metadata-completeness.test.ts` | any tenant site metadata with empty title/description |
| `seo-canonical-consistency.test.ts` | canonical-vs-301 + `metadataBase` drift per site |
| `seo-indexing-safety.test.ts` | accidental `noindex`/`nofollow` on a tenant page |
| `seo-og-image-assets.test.ts` | OG/Twitter image referencing a file that doesn't exist on disk |
| `seo-og-inherited-image.test.ts` | a site inheriting the shared NYC-Maid OG card instead of its own |
| `seo-robots-sitemap-host.test.ts` | `robots.ts`'s sitemap URL host mismatching its own base host |
| `seo-sitemap-canonical-host.test.ts` | sitemap host diverging from canonical host (split-brain) |
| `sitemap-presence.test.ts` | a rich-sitemap entry with no matching on-disk route |
| `jsonld-sink-guard.test.ts` | a JSON-LD sink bypassing `safeJsonLd` |

Supporting audit docs (all pre-existing, cross-referenced here for
completeness): `seo-remediation-spec.md`, `seo-canonical-audit.md`,
`seo-meta-consistency-final.md`, `structured-data-inventory.md`,
`og-image-fix-plan.md`, `sitemap-www-vs-apex-detection.md`,
`sitemap-apex-fix-plan.md` / `sitemap-apex-clean-full-spec.md`,
`sitemap-live-verification-plan.md`, `robots-sitemap-coverage-audit.md`,
`accessibility-audit.md`, and the consolidated go/no-go in
`seo-final-signoff.md` / `seo-readiness-summary.md`.

Twelve rich sitemaps were also implemented (not just audited) for
previously-flat-sitemap tenants (fla-dumpster-rentals, toll-trucks-near-me,
nyc-tow, we-pay-you-junk, stretch-ny, stretch-service, and six others —
commits `1442b4a5`..`8ae9a565`).

## 3. IDOR lint guard

Origin: the fleet kept rediscovering the same bug class by hand — every DB
query runs through the Supabase `service_role` key (bypasses RLS), so
tenant isolation depends entirely on each route remembering
`.eq('tenant_id', …)`. This turns that recurring manual finding into a
mechanical, CI-visible one.

- **Prototype → finalized this branch:** `src/lib/idor-route-guard.ts`
  (heuristic analyzer, no AST/DB — matches `.from(...)` chains, flags
  `.eq('id', …)`/`.in('id', …)` with no sibling `.eq('tenant_id', …)`, skips
  `tenantDb(...)`-wrapped and allowlisted cross-tenant-by-design tables).
  Full heuristic, allowlist rationale, and precision/recall envelope in
  `idor-lint-guard-spec.md`.
- **Ratchet, already riding the required gate:**
  `idor-route-guard.test.ts` + `idor-route-guard.baseline.json` freeze the
  current-tree candidate surface (178 flagged chains / 123 file::table
  signatures, 99 non-admin) and fail only on **new** offenders — runs inside
  the existing `verify` job via the unfiltered `npx vitest run`, no new CI
  wiring needed.
- **Standalone CLI, finalized:** `scripts/idor-lint-guard.ts` — same check,
  runnable outside vitest (`npx tsx scripts/idor-lint-guard.ts`, or
  `--update-baseline` to accept new findings), mirroring the existing
  `scripts/audit-tenant-scope.mjs` shape.
- **Sample CI job, proposal only, NOT wired:**
  `idor-lint-guard.sample.yml` lives in `deploy-prep/` specifically so it
  cannot execute. Shows the exact job to paste into `.github/workflows/`
  (`continue-on-error: true` — reporting-only, never blocks a merge) if the
  leader/Jeff wants a standalone Actions-tab annotation in addition to the
  vitest ratchet. Graduating it to a real blocking gate is a distinct,
  Jeff-gated follow-up once the 178-item baseline is triaged down (see spec
  §7).
- **Blind-spot regression:** `tenant-scope-guard-idor-blindspot.test.ts`
  proves the *existing* `audit-tenant-scope.mjs` guard's `idLookup`
  exemption misses exactly this bug class — motivating why the new guard is
  not redundant (`86fdc6cb` documents this explicitly).

## 4. Verification (this session)

- `npx tsc --noEmit --pretty false` — **0 errors**.
- `npx vitest run` (full, unfiltered) — **46 test files / 493 tests, all
  passed**, 5.51s.
- `SUPABASE_ACCESS_TOKEN_FULLLOOP` not present in this environment — the
  reconcile script's token guard means it is not exercised live this
  session; the gate-wiring test (`reconcile-gate-wiring.test.ts`) confirms
  the skip-clean behavior statically instead.
