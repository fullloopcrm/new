# Full-Suite Verification Protocol (before any "DONE" claim)

**Author:** W1 · **Date:** 2026-07-12 · **Item:** Q-N5 · **Status:** FILE ONLY — process doc. No CI/workflow edited, nothing deployed. This codifies the check every worker must run before claiming DONE, so a passing *new* file can't mask a suite it silently broke.

---

## 1. The failure mode this stops ("new-file-only green-washing")

A worker adds `src/lib/foo.test.ts`, runs **only that file**:

```bash
npx vitest run src/lib/foo.test.ts     # ← 12 passed. Looks green.
```

…and reports "vitest green, DONE." But `vitest run <path>` executes *only the
named file*. If the same change also touched a shared module (a fake, a lib, an
exported type), it can have **broken other test files that were never run**. The
green the worker saw is real for one file and meaningless for the suite. Same
trap with `tsc`: editing one file can introduce a type error that only surfaces
in a *consumer* file the worker never opened.

**Rule:** a DONE claim asserts the *whole* suite is green, not the file you added.
So the whole suite is what you must run.

---

## 2. The exact command sequence (authoritative)

All commands run from the **`platform/`** directory (that is where
`package.json`, `tsconfig.json`, and `vitest.config.ts` live). Not the repo root.

```bash
cd platform

# 1. TYPES — whole project, no emit. Must print nothing and exit 0.
npx tsc --noEmit ; echo "TSC_EXIT=$?"

# 2. FULL TEST SUITE — every file matched by vitest.config.ts, not just yours.
npx vitest run    ; echo "VITEST_EXIT=$?"
```

`npx vitest run` is exactly what `npm test` runs (`"test": "vitest run"` in
`platform/package.json`). Either form is fine; **`vitest run` with no path
argument is the load-bearing part** — it selects the whole suite via the config
`include` glob, not a hand-picked file.

Config that governs suite selection (`platform/vitest.config.ts`):

```ts
test: {
  environment: 'jsdom',
  globals: true,
  setupFiles: ['./src/test/setup.ts'],
  include: ['src/**/*.test.{ts,tsx}'],   // ← every *.test.ts/tsx under src/
}
```

So the suite = **every** `src/**/*.test.{ts,tsx}`. Adding a file adds it to the
suite automatically; there is no manifest to update, and no excuse for running a
subset when claiming DONE.

### Optional / situational

```bash
npx vitest run --coverage        # = npm run test:coverage; only when a coverage number is claimed
npx vitest run src/lib/foo.test.ts   # FINE while iterating — NEVER as the basis for a DONE claim
```

Running a single file *during development* is encouraged (fast loop). The
protocol only forbids it as the **evidence** behind "DONE."

---

## 3. Known-good baseline (captured 2026-07-12, branch p1-w1)

So a worker can tell "I broke something" from "it was already like that":

| Check | Command | Expected |
|---|---|---|
| Types | `npx tsc --noEmit` | exit `0`, no output |
| Suite | `npx vitest run` | `Test Files 71 passed (71)` · `Tests 771 passed \| 1 expected fail (772)` |

**The `1 expected fail` is intentional and must stay exactly 1.** It is the
`it.fails` RED latch in `src/lib/gdpr-export-deadbranch.test.ts` pinning the
`crm_notes subject_type='client'` dead-branch (CHECK-vs-query mismatch). vitest
reports an `it.fails` that *correctly fails* as a pass-of-the-negation, hence
"771 passed | 1 expected fail." Watch for drift:

- **`0 expected fail`** → the dead branch was fixed/changed; the latch flipped.
  Re-read `gdpr-export-deadbranch.test.ts` before assuming that's good.
- **`2+ expected fail`** or any **real** failure → you broke something. Stop.

File-count drift is also signal: if you added one test file, `Test Files` should
read `72 passed (72)`, not `71`. A number that didn't move means your file
wasn't picked up (wrong path / not `*.test.ts`).

---

## 4. The DONE-claim checklist (paste-ready)

Before writing `W<n>->LEADER: DONE …`, every box must be true **and** the claim
must state the numbers you actually saw:

- [ ] Ran from `platform/` (not repo root).
- [ ] `npx tsc --noEmit` → **exit 0**, no diagnostics. (Not "my file looks typed" — the command.)
- [ ] `npx vitest run` with **no path arg** → whole suite. (Not `vitest run <one-file>`.)
- [ ] `Test Files` count = prior baseline **+ the number of test files I added**.
- [ ] Failures = **0**; expected-fails = **exactly 1** (or the number I can name and justify).
- [ ] If I edited a **shared** module (`src/test/*`, a lib many tests import), I confirmed the suite total *stayed* green — that is the whole reason the full run is mandatory.
- [ ] The DONE line quotes the real counts (`tsc=0, vitest N pass + 1 expected-fail`), not "green."

If any box is false, the correct report is **not** "DONE" — it is the honest
partial: *"new file passes in isolation; I have NOT run the full suite,"* which is
exactly the green-washing this protocol exists to replace.

---

## 5. Why `tsc` and `vitest` are both required (neither substitutes)

- **vitest does not type-check.** It runs via esbuild/SWC transform, which strips
  types without checking them. A test suite can be 100% green while `tsc` has
  errors — vitest never saw them. `tsc --noEmit` is the only type gate.
- **tsc does not run anything.** It proves types compose; it says nothing about
  runtime behavior, tenant-scoping, or whether an assertion holds. Only the test
  run does.

A DONE claim needs both: types compose (tsc) **and** behavior holds across the
whole suite (vitest run). One without the other is a half-verified claim and
should be reported as such.

---

## 6. Scope / honesty notes

- This is a **process doc**, not a CI change. Wiring these two commands as a
  required PR gate is a workflow edit (`.github/workflows/*`) — Jeff-gated, not
  done here. Reference: `deploy-prep/preview-smoke-gate-plan.md` already describes
  the smoke tier; this doc is the *local pre-claim* gate that precedes any of that.
- Counts in §3 are this worktree's real numbers at authoring time (`npx tsc
  --noEmit` = exit 0; `npx vitest run` = 71 files, 771 pass + 1 expected-fail).
  They will move as workers add files — the protocol is the *method*, not the
  frozen totals; re-baseline the number, keep the method.
