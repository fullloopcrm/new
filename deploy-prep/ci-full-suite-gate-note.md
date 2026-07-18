# CI full-suite gate — confirmation note

**Question (leader):** Does CI run the FULL vitest suite on PRs, or a subset? Cite the lines. If subset, propose the fix.

**Answer: FULL suite. No fix needed.** Every `.test.{ts,tsx}` under `platform/src` runs on every PR.

---

## Evidence

### 1. The suite runs on PRs

`.github/workflows/ci.yml`:

- Line 8 — trigger includes `pull_request:` (fires on every PR, all branches).
- Lines 22–24 — `defaults.run.working-directory: platform` (so the vitest step runs inside `platform/`).
- Lines 45–46 — the gate step:

  ```yaml
  - name: Unit tests (vitest)
    run: npx vitest run
  ```

`npx vitest run` is invoked with **no path argument, no `--project`, no `--shard`, no `--changed`, no grep/`-t` filter**. Vitest therefore runs every file matched by its config's `include`.

### 2. The config `include` is the whole test tree — not a subset

`platform/vitest.config.ts`:

- Line 11 — `include: ['src/**/*.test.{ts,tsx}']` → this is the **test-selection** glob: all test files anywhere under `src`.
- Lines 12–15 — the *other* `include` (`['src/lib/**', 'src/app/api/**']`, line 14) is nested under `coverage:` (line 12). That narrows **coverage instrumentation scope only**; it does **not** narrow which tests execute. Easy to misread as a subset — it is not.

At time of writing, the include glob matches **38 test files** under `platform/src` (`find src -name '*.test.ts' -o -name '*.test.tsx' | wc -l` = 38). All 38 run in the CI `verify` job.

### 3. No sharding or subsetting anywhere in the workflows

`grep -rnE "vitest|--shard|--project|--changed|shard|split" .github/workflows/` returns exactly one match — the single `npx vitest run` line above. There is no matrix split, no shard index, no "changed files only" step.

### 4. The other workflows are separate gates, not a vitest subset

One other workflow runs Node but is **not** part of the test suite (so it doesn't create a false impression that "some tests run elsewhere"):

- `tenant-config-reconcile.yml` → runs the reconcile script under a token-guard (no `SUPABASE_ACCESS_TOKEN` secret ⇒ skips green). Not a test-runner.

(`tenant-scope.yml` was removed 2026-07-17 — it duplicated ci.yml's own "Tenant-isolation guard" step, same command/triggers/baseline; `node scripts/audit-tenant-scope.mjs` now runs only as a step inside `ci.yml`.)

`db-backup.yml` is unrelated (scheduled backup).

---

## Verdict

CI runs the **complete** vitest suite on every PR via a single unfiltered `npx vitest run` (ci.yml:46), with `include` covering all `src/**/*.test.{ts,tsx}` (vitest.config.ts:11). There is **no subset, shard, or changed-files narrowing** to fix.

### Standing caveats (for the record, not defects to fix here)

- The full-suite guarantee holds only as long as the vitest step stays unfiltered. If anyone later adds `--changed`, `--shard`, or a path arg to ci.yml:46 to speed CI up, this guarantee breaks — flag any such change in review.
- The gate is only as complete as the `include` glob: a test file placed **outside** `platform/src` (e.g. a root-level or `scripts/` test) would not be picked up. All 38 current test files are under `src`, so this is not a live gap today.
