# Gap/fluidity: cron/health-check's failed-notification retry window silently starved 23/24 of daily failures

**Date:** 2026-07-18 11:45
**Worker:** W1
**Status:** Fixed, committed (7713756f)

## The gap

`GET /api/cron/health-check` (`src/app/api/cron/health-check/route.ts`)
opens with a docstring: "Self-healing health check — runs every 15
minutes... Retry failed notifications (up to 3 attempts)." Its retry query
matched that assumption:

```ts
const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
const { data: failedNotifs } = await supabaseAdmin
  .from('notifications')
  .select(...)
  .eq('status', 'failed')
  .gte('created_at', oneHourAgo)
  .lt('retry_count', 3)
```

But `vercel.json` actually schedules this cron **once daily**
(`0 12 * * *`), not every 15 minutes. A 1-hour, backward-looking
`created_at` window only ever catches failures from the ~1 hour immediately
before that single daily run. Everything that failed in the other ~23
hours of the day ages past `created_at >= oneHourAgo` before the next run
ever executes — and because the window looks backward from "now," a
failure's age only increases, so once it falls outside the window it can
never fall back inside. It's excluded permanently, with zero retry
attempts ever made, despite the `retry_count < 3` cap implying every
failure gets up to three.

## Why it's the same class as this session's other fixes

A "self-healing" system whose actual trigger cadence silently drifted out
of sync with the window/logic written for a different assumed cadence —
same shape as the seomgr not_indexed cron cadence mismatch (root cause B
from this session's earlier reconciliation) and the email-monitor tick
that looked alive/dead for the wrong reason. The code reads as working (it
retries *something* on every run when the timing lines up), so nothing
ever surfaced this in normal operation — the docstring itself is stale
evidence that the schedule changed after the retry window was written and
nobody re-checked the two against each other.

## Fix

Widened the lookback to 26 hours (daily cadence + drift margin) so any
notification that failed since the last real run is still caught on the
next one. Also corrected the file's docstring to state the actual schedule
instead of the stale "every 15 minutes" claim. Left the *error-spike*
detector's own independent `oneHourAgo` (further down in the same file,
section 4) untouched — that one is intentionally a 1-hour burst-rate
metric, a different concern from retry eligibility, and its window is
correct for what it measures. The existing 7-day expiry (section 3 of the
same file, `status='failed' AND retry_count>=3` → `expired`) remains the
real backstop against a failure retrying forever.

## Sibling sweep (continuation)

Grepped every cron route under `src/app/api/cron/*/route.ts` for a
claimed run-frequency in its own comments (`runs every`, `runs once`,
`runs daily`, `runs hourly`) and cross-checked each against its actual
`vercel.json` schedule:

- `confirmation-reminder` claims "runs every 5 min" — schedule is
  `*/5 * * * *`. Matches.
- `post-job-followup` claims "runs every 30 min" — schedule is
  `*/30 * * * *`. Matches.
- `system-check` claims "runs every hour" — schedule is `0 * * * *`.
  Matches.
- `cleanup-videos`, `phone-fixup`, `rating-prompt` use their own
  `Ago = new Date(Date.now() - …)` windows but make no explicit cadence
  claim to contradict.

`health-check` was the only cron route whose own docstring's claimed
cadence didn't match `vercel.json`. No other cadence-mismatch sibling
found this pass.

## Verification

- New test `route.retry-window-cadence.test.ts` (2 tests): a notification
  that failed 5 hours ago is retried and reaches `retry_success` under the
  fix (RED-confirmed against the pre-fix 1-hour window: same test failed
  with `status` still `'failed'`, exactly as predicted); a 27-hour-old
  failure is still correctly left alone, proving the window has a real
  bound rather than retrying indefinitely.
- Full `src/app/api/cron` suite: 60 files / 181 tests, all passing.
- `npx tsc --noEmit`: no new errors introduced by this change (pre-existing
  unrelated errors in generated route types and untracked site-nav/test
  files left as-is, not part of this fix).
