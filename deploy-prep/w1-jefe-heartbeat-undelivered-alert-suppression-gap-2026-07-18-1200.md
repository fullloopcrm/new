# Jefe's own heartbeat alert could permanently suppress an alert it never delivered (2026-07-18 12:00)

## Fresh-ground discovery

`runHeartbeat()` (`src/lib/jefe/heartbeat.ts`) is the cron that makes Jefe
"Jeff's eyes and ears" — it evaluates platform health each run and pushes an
UNPROMPTED Telegram message to the owner the moment something newly breaks
(comms deliverability, a silent cron, an error spike, stuck payments,
security events, worsening tenant provisioning). Dedup works by fingerprint:
each run computes `alerts`, diffs against the fingerprints recorded in the
last `jefe_snapshots` row (`prevFps`), and only messages on the ones that
weren't already there (`newAlerts`).

The bug: the new snapshot — **including the brand-new alerts' fingerprints**
— was persisted to `jefe_snapshots` unconditionally, immediately after
computing `newAlerts` and *before* the `chatId`/`token` env check, and before
`sendTelegram()` was ever called. `sendTelegram()` never throws (it catches
and returns `{ok:false}` on any fetch failure), so nothing here would surface
as a route-level error either way. Concretely:

- A missing/misconfigured `JEFE_BOT_TOKEN` or `JEFE_OWNER_CHAT_ID` (the
  `!chatId || !token` branch) meant the alert's fingerprint was already
  written to disk with **zero delivery attempt** — guaranteed silent loss,
  not just a race.
- Any transient Telegram failure (rate limit, network blip, API outage)
  hit the same fate: fingerprint recorded, message never sent.

Either way, the next run's dedup sees that fingerprint already in
`active_alerts` and treats the (still-broken, still-real) issue as
steady-state — already reported, nothing new to say. The alert never fires
again unless the *underlying* condition changes shape (e.g. a different cron
goes silent, producing a new fingerprint). The one system built to catch
platform failures had a failure mode where its own first alert on a given
issue could vanish without a trace, and there was no existing test file for
`heartbeat.ts` at all to have caught it.

Distinct from every earlier dedup-race fix this session (comms-monitor,
health-monitor, etc.) — those were concurrent-invocation TOCTOU races on a
check-then-act read. This one is a single-invocation ordering bug: writing
the "I told them" record before confirming it was actually told.

## Fix

Reordered so the snapshot write happens *after* the delivery outcome is
known, and only fingerprints that were actually delivered (or were already
known from a prior successful run) get persisted:

- `newAlerts.length === 0` (nothing new this run): insert `active_alerts:
  alerts` as before — no change in behavior for the steady-state path.
- New alerts exist but `chatId`/`token` missing: insert
  `active_alerts: stillKnownAlerts` (only the already-seen fps — new ones
  excluded) so the next run still sees them as new.
- New alerts exist, `sendTelegram()` called: insert
  `active_alerts: send.ok ? alerts : stillKnownAlerts` — full set only on a
  confirmed successful send; on failure, only the previously-known fps
  persist, so the undelivered new alert(s) retry next run.

`meta` (used for the `provisioning.fully_unprovisioned` steady-state delta
check, unrelated to delivery) is still always recorded — only the
alert-dedup fingerprint set changed.

## Files (file-only, no push/deploy/DB)

- `src/lib/jefe/heartbeat.ts` — moved the `jefe_snapshots` insert after the
  send outcome is known; persists only delivered/previously-known
  fingerprints.
- `src/lib/jefe/heartbeat.undelivered-alert-suppression.test.ts` —
  first-ever coverage of this file; 4 tests: (1) a failed Telegram send
  doesn't mark the new alert seen, retries next run, (2) a missing bot
  token doesn't mark it seen either, retries once configured, (3) a
  successful delivery DOES mark it seen — steady-state correctly stays
  quiet, (4) a mixed scenario (one alert already delivered + a second one
  whose delivery fails, then later succeeds) proves the already-delivered
  fingerprint isn't disturbed by a later failed send and the newly-failed
  one still retries correctly on the next successful send.

## Verification

- RED confirmed: `git diff <file> > patch && git apply -R`, reran the new
  test file against pre-fix code — 3 of 4 tests failed for the predicted
  reason (`alerts_new` reported `0` instead of `1` on the retry run,
  because the old code had already marked the undelivered fingerprint
  "seen"); the 4th test (successful-delivery-marks-seen) passed under both
  old and new code, since that path was already correct — confirming the
  test isn't a tautology. Re-applied the patch — all 4 GREEN.
- Test-authoring note: the fake Supabase's `order('created_at',
  {ascending:false}).limit(1)` needs distinct, increasing `created_at`
  values to pick the latest row — `heartbeat.ts` never sets it itself
  (relies on the real DB's `default now()`), so the first draft of this
  test (calling `runHeartbeat()` directly, multiple times in sequence)
  silently read back the OLDEST snapshot instead of the latest and produced
  a false failure on an unrelated assertion. Fixed by wrapping the call in
  a local `run()` helper that stamps an incrementing `created_at` onto the
  just-inserted row via the fake's `_all()` accessor after each call — same
  idiom the DB would apply itself, kept local to this test file.
- `npx tsc --noEmit --pretty false`: 0 new errors — same 5 pre-existing
  baseline errors as every pass this session (admin-auth route-types, 2
  unrelated pre-existing test files, `sunnyside-clean-nyc` nav import);
  none touch `heartbeat.ts` or the new test file.
- `npx eslint` on both touched/new files: 0 errors, 0 warnings.
- Full suite: `npx vitest run` — 693/693 files, 3553 passed + 1
  pre-existing expected-fail, 0 regressions.

No push/deploy/DB. No schema change this round (tenant_domains lane
untouched) — this is the fresh-ground silent-failure surface for this
round, per LEADER's 3-deep queue order.
