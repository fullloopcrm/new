# Full-Suite Verification Note (W4, p1-w4)

**Command:** `cd platform && npx vitest run` (entire suite, not just new files)
**Date:** 2026-07-12
**Toolchain:** vitest v4.1.10, `npx tsc --noEmit` (exit 0, clean)

This note records the result of running the WHOLE vitest suite on branch `p1-w4`,
including W4's two new happy-path files added this session (queue b + c). It is a
factual snapshot — counts are copied from the runner, not estimated.

---

## 1. Result — after adding queue (b) + (c)

| Metric | Count |
|---|---|
| Test files | **82 passed / 1 failed** (83 total) |
| Tests | **618 passed / 1 failed** |
| Expected-fail (`test.fails`, passing-as-designed) | 1 |
| Skipped | 4 |
| Total test cases | 624 |
| `tsc --noEmit` | exit 0 (no type errors) |
| Runner exit code | 1 (due to the single failure below) |

**Baseline before this session's new files** (same command, captured first):
81 files (80 pass / 1 fail), 616 tests (610 pass / 1 fail / 1 expected-fail / 4 skipped).

**Delta from W4's new files** (`+2` files, `+8` passing tests, `0` new failures):
- `src/app/api/webhooks/stripe/route.invoice-payment.happy-path.test.ts` — **3 passing** (queue b)
- `src/lib/attribution.lead-to-crm.happy-path.test.ts` — **5 passing** (queue c)

---

## 2. The single failure — pre-existing, INTENTIONAL RED (not breakage)

```
FAIL  src/app/api/cron/tenant-health/status-coverage-divergence.test.ts
 > Fortress coverage vs middleware serve set (C-2 divergence)
 > INVARIANT (RED until fixed): every SERVED status is also MONITORED — cron set ⊇ served set
AssertionError: expected [ 'pending','trial','paused','past_due','grace',
  'onboarding','new','prospect','inactive','churned' ] to deeply equal []
```

- **Authored deliberately as a failing lock** — commit `edb7f600`
  (`test(deploy-prep): fortress C-2 divergence lock`), by W4. It asserts the
  Fortress health-cron's monitored-status set is a **superset** of the statuses
  middleware will actually serve a public site for. It fails today because
  several served statuses (`pending/trial/paused/past_due/grace/onboarding`, etc.)
  are **served-but-unmonitored** — a real product gap the test documents.
- **It is NOT introduced by, and does NOT interact with, queue (b) or (c).**
  It failed identically in the pre-session baseline (before either new file
  existed). Removing my two files leaves this exact failure; adding them changes
  nothing about it.
- **Status:** RED-until-fixed by design. Fixing it is a code change to the cron's
  monitored-status list (outside W4's read-only/test lane) — flagged for the
  leader, not silently patched. This is the same divergence tracked in
  `deploy-prep/fortress-health-coverage-audit.md`.

## 3. Cross-file breakage check

**None.** The two new files are fully isolated:
- Both use `vi.mock(...)` for `@/lib/supabase`, Stripe, `@/lib/domains`, and the
  finance post-* modules — no shared global state, no real DB, no network.
- Full-suite pass count rose by exactly the 8 cases the new files contain; no
  previously-passing test flipped to failing.
- `tsc --noEmit` stays clean with the new files present.

## 4. Skipped / expected-fail (for completeness — unchanged this session)

- **4 skipped** and **1 expected-fail** were present in the baseline and are
  unchanged. The expected-fail is a `test.fails`-annotated case that passes *as
  designed* (the runner counts it separately from the hard failure in §2). The
  skips live in auth/isolation suites (e.g. crews-authz, deploy-hook HMAC,
  cross-portal-secret, apology-batch) — pre-existing, not touched by W4.

## 5. Honest scope caveats

- This is a **unit/integration** vitest run only. It does **not** exercise a live
  deploy, real Stripe, or a real Supabase — those remain gated behind the A5
  canary per `verification-harness-readiness.md`.
- W4's visibility is `p1-w4`-local. Counts reflect this worktree's branch state
  at the commit this note ships with; other workers' branches may differ.
- The one hard failure is a leader decision (product gap), not a test bug and not
  a regression from this session's work.
