# W4 — timing-unsafe secret comparisons (fixed)

**Date:** 2026-07-15 18:55 EDT
**Branch:** p1-w4
**Commit:** 610bc236

## Finding

The codebase already has a shared constant-time compare helper,
`safeEqual()` in `src/lib/secret-compare.ts`, purpose-built to close the
"`secret === userInput`" timing side-channel bug class (doc comment cites it
as "found repeatedly across the codebase"). It's used in `auth/login`,
`telegram-webhook-auth.ts`, `nycmaid/auth.ts`, and others — but a grep for
every remaining `=== process.env.<SECRET>` / `<userInput> === <secret>`
pattern turned up 4 call sites across 3 files that still used a plain `===`
against a live secret instead of the helper:

1. `src/app/api/admin-auth/route.ts:125` — `pin === ADMIN_PIN`, the
   global super-admin PIN (highest-privilege credential in the platform).
2. `src/app/api/admin/selena/sms-status/route.ts:20` — `monitorKey === process.env.ELCHAPO_MONITOR_KEY`.
3. `src/app/api/email/monitor/route.ts:51` — header-key variant of the same `ELCHAPO_MONITOR_KEY` check.
4. `src/app/api/email/monitor/route.ts:54` — JSON-body-key variant of the same check.

Severity note: (1) is already rate-limited 5 attempts/15min per IP
(`rateLimitDb('admin_auth:...')`, fail-closed), which makes a remote timing
attack impractical to exploit in practice — this is a defense-in-depth /
consistency fix, not a live exploit. (2)-(4) have **no rate limit** on the
monitor-key path, so a timing side-channel there is more theoretically
useful to an attacker trying to recover `ELCHAPO_MONITOR_KEY` byte-by-byte,
though network jitter still makes this a hard, non-trivial remote attack.
None of these were flagged in any prior W1-W4 report (checked via `grep -ril
timing deploy-prep/`).

## Fix

Imported `safeEqual` from `@/lib/secret-compare` at all 4 sites and replaced
the `===` with `safeEqual(a, b)`. `safeEqual` already handles the
empty/undefined-never-matches case and the length check before
`crypto.timingSafeEqual`, so no behavior change for valid inputs — only the
comparison timing changes.

## Verification

- `npx tsc --noEmit` — clean.
- `npx vitest run src/app/api/email/monitor/route.test.ts src/app/api/admin-auth src/app/api/admin/selena` — 6 test files, 38/38 passed, 0 regressions.
- Manual logic check of `safeEqual` semantics (match/mismatch/empty/undefined) in isolation — behaves as expected.

File-only. No push/deploy/DB. Committed locally on `p1-w4` (610bc236).
