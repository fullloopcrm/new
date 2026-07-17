# Broad-hunt — W4, 2026-07-17 14:14 order (item 2: continue surface opened by item 1)

File-only, no push/deploy/DB.

## Finding + fix: 4 cron routes missed by the earlier 41-site timing-unsafe
## CRON_SECRET compare sweep

While reading through the rest of `cron/*` after the backup fix
(`deploy-prep/w4-broad-hunt-2026-07-17-1430-...md`), `cron/comms-monitor`
still had a plain `auth !== \`Bearer ${secret}\`` compare. Earlier this
session, `deploy-prep/w4-cron-secret-timing-unsafe-compare-full-sweep.md`
claimed to have converted every `CRON_SECRET`/internal-key comparison
codebase-wide to `safeEqual()` (41 sites). Re-grepped to check for
stragglers:

```
grep -rln "CRON_SECRET" src/app/api/cron --include="*.ts" | grep -v ".test.ts" \
  | xargs grep -L "safeEqual"
```

Found 4 routes the sweep missed, all with the identical unsafe pattern:

- `cron/jefe-heartbeat/route.ts`
- `cron/comms-monitor/route.ts`
- `cron/health-monitor/route.ts`
- `cron/recurring-expenses/route.ts` (fires due recurring expenses — touches
  the ledger via `postJournalEntry`, so this is the highest-value straggler:
  same class already flagged as guarding "payment state" routes in the
  original sweep's impact note)

All 4 are internet-reachable with only this Bearer-secret gate (no other
auth layer), same severity class as the 41 already fixed. Not clear why the
original sweep's grep missed these specifically — plausibly these 4 files
were added/touched after that pass ran, or its `CRON_SECRET` grep pattern
didn't match some formatting quirk; not chasing the root cause further since
re-grepping now confirms zero remaining stragglers.

**Fix:** identical drop-in swap to `safeEqual(auth, \`Bearer ${secret}\`)`,
matching the other 41 sites exactly.

## Verification

Following the original sweep's own established precedent (documented in its
own report): `safeEqual` is behavior-preserving for all non-equal-length or
null/undefined inputs (same `false` outcome as `!==` produced), only timing
differs for genuinely-equal-length inputs — and none of these 4 routes had
existing route tests before this change, consistent with the no-new-tests
precedent the original 41-site pass set for this exact swap. No new tests
added here either, for the same reason.

- `tsc --noEmit`: same 3 pre-existing unrelated errors only
  (`bookings/broadcast/route.xss.test.ts`,
  `site/sunnyside-clean-nyc/_lib/site-nav.ts` x2).
- `vitest run src/app/api/cron`: 61/63 pass. 2 pre-existing failures, both
  confirmed unrelated to this change: `tenant-health/status-coverage-
  divergence.test.ts` (documented intentional-RED invariant) and
  `generate-recurring/route.duplicate-occurrence-race.test.ts` (known
  parallel-load flake — reran in isolation 3x, passed 2/2 every time).
- Re-ran the straggler grep after the fix: zero remaining `CRON_SECRET`
  sites without `safeEqual` in `cron/*`.

No push/deploy/DB write.
