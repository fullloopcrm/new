# Broad-hunt sweep — 22:37 order — W4, 2026-07-15

File-only. No push/deploy/DB.

## Ported: storage-path randomness fix (originated on p1-w1, not yet on this branch)

While hunting fresh surface, a `git log --oneline --all` scan (which spans
every worker branch, not just this worktree's) surfaced commit `5ab388f4`
("replace Math.random() with crypto.randomBytes() for storage object
paths"). Checked whether it was an ancestor of this branch's HEAD —
it is not (`git merge-base --is-ancestor` = false; the commit lives on
`p1-w1`). Confirmed by grepping the actual working-tree files: all 7 routes
that commit touched still had `Math.random()` unfixed here.

This is a real, currently-live gap on this branch/worktree, independent of
whatever the leader eventually merges: the `uploads`/`team-photos` Storage
buckets are public buckets with no auth check on GET — for routes where the
path carries no other unguessable segment (e.g. `admin/notes/upload`'s
`notes/<rand>.<ext>` has no tenant/entity id in it at all), the random
suffix is the entire access control for that object. `Math.random()` is
V8's non-cryptographic xorshift128+ PRNG with published state-recovery
attacks from a handful of observed outputs, after which future outputs
(including other callers' path suffixes on the same warm process) become
predictable.

Ported the identical fix (same convention as `lib/tokens.ts`,
`lib/invoice.ts`, `lib/documents.ts` etc.) to this branch's copies of the
same 7 files:

- `cleaners/upload/route.ts`
- `admin/notes/upload/route.ts`
- `uploads/route.ts`
- `booking-notes/upload/route.ts`
- `team-applications/upload/route.ts`
- `public-upload/route.ts`
- `team-portal/video-upload/route.ts` (both `GET` and legacy-`POST` call sites)

Each: added `import { randomBytes } from 'crypto'`, replaced the
`Math.random().toString(36)...` suffix with `randomBytes(n).toString('hex')`
(n chosen to match the original suffix's rough entropy length per call
site). Also ported the accompanying static regression guard,
`src/test/storage-path-randomness.test.ts` (verbatim — it's a pure
file-content assertion, not app logic, so no adaptation needed).

Left `referrals/route.ts` / `referrers/route.ts` referral-code generation on
`Math.random()` untouched, matching the original commit's judgment: those
codes are deliberately public-by-design (shared for marketing), with
financial fields gated behind a separate OTP session — different threat
model.

## Verification

- `npx tsc --noEmit`: clean (same pre-existing unrelated failure in
  `bookings/broadcast/route.xss.test.ts` noted in prior W4 reports).
- New test file: `storage-path-randomness.test.ts` — 7/7 pass.
- Existing tests touching 2 of the 7 routes (`team-portal/video-upload`,
  `public-upload`) re-ran clean: 18/18 pass.
- Full suite: 359/360 files, 1499 passed + 1 pre-existing expected fail +
  1 skipped. The 1 failing file
  (`cron/tenant-health/status-coverage-divergence.test.ts`) is the same
  documented pre-existing baseline failure from prior W4 reports —
  unrelated to this change, not touched by it. 0 regressions.

File-only, no push/deploy/DB.
