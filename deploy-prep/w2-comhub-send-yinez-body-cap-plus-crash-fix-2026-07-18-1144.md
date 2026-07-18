# W2 round summary — 2026-07-18 11:44 order

**Lane note:** resolver-refactor lane was confirmed dry 6+ consecutive
rounds and dropped from my queue entirely per leader's 11:29 order — not
re-checked this round.

## Fresh-ground surface

`admin/comhub/*` is the internal fullloop admin panel's Comhub messaging
family, gated by `requireAdmin()` (binary internal-staff cookie auth) —
not the tenant RBAC `requirePermission()` model the last several rounds'
permission-differential bugs came from. That bug class doesn't apply
here. The free-text-cap class does, and this family hadn't been swept
for it yet this session (only `admin/comhub/channels` had, last round).

## Bugs fixed

1. **`POST /api/admin/comhub/send`** — `body` (all 4 channels) and
   `subject` (email) stored/forwarded raw with zero type or length cap.
   `body.body.slice(0, 140)` was called directly on the unchecked value
   for `last_message_preview` — a non-string body (object/number) passed
   the truthy-only `!body.body` guard and then threw an uncaught
   `TypeError` (500) instead of a clean 400. Fixed with
   `capString(body, 5000)` / `capString(subject, 200)`.

2. **`POST /api/admin/comhub/yinez/send`** — same shape, one level worse:
   `(payload?.body || '').trim()` throws directly on any truthy
   non-string body (no `.trim()` on objects/numbers). The uncapped text
   was also forwarded straight into the Selena AI call. Fixed with
   `capString(body, 5000)`.

## Verification

- 6 new tests: `admin/comhub/send/route.post-text-cap.test.ts`
- 5 new tests: `admin/comhub/yinez/send/route.post-text-cap.test.ts`
- RED/GREEN mutation-verified via `git diff > patch` / `git apply -R
  patch` (worktree `git stash` is hook-blocked): 5/6 and 3/5 new probes
  respectively were wrong against the pre-fix code, including the exact
  `TypeError` crash reproducing on both routes' non-string-body cases.
- `npx tsc --noEmit`: clean.
- `npm run audit:tenant`: same 4 pre-existing findings (tenant_domains
  resolver-by-design x2, recurring-expenses cron cross-tenant fan-out
  already gated downstream, one regex hit inside a test-file comment),
  none new.
- Full suite: 788 files, 3429/3466 pass + 37 pre-existing skipped, 0
  regressions (was 786/3455).

## Noticed, not touched

- The rest of the `admin/comhub/*` family (`templates`, `threads`,
  `search-recipients`, `voice/*`) not yet individually swept for the same
  free-text-cap class — candidate for next continuation round.
- `deploy-prep/conflict-risk-p1-w2.md` (untracked, pre-dates this
  session), `platform/scripts/out/sim-all-trades-p1.json` (untracked
  output artifact), `.worker-driver.sh` + `.bak-session4` (driver infra)
  — none are mine to touch, left alone.

File-only, no push/deploy/DB. 3 commits (fix+test per route, plus docs).
