# cron/generate-recurring + cron/late-check-in: 2 more health-monitor markers could starve permanently (2026-07-18 09:02)

## Bug
Same failure mode as this morning's `email-monitor` fix (`92e3192d`): a
health-monitor liveness marker gated behind a condition that can legitimately
stay false for a long time, so a real platform state (not an outage) starves
the marker forever and 3 separate consumers — `admin/monitoring/status`
route, `cron/health-monitor`'s Telegram alert, and `lib/jefe/health.ts` —
falsely and permanently report the cron as dead, re-alerting every 6h via
`cron_health_alerts`'s dedup window.

Audited every entry in `health-monitor`'s `CHECKS` array (the 3 consumers
duplicate this list independently) for the same shape: does the watched
notification type get written unconditionally on every cron run, or only
when the run finds work? Found 2 more instances.

### 1. `cron/generate-recurring` — `recurring_generated` marker unreachable
```ts
const { data: schedules } = await supabaseAdmin
  .from('recurring_schedules').select('*').eq('status', 'active')

if (!schedules || schedules.length === 0) {
  return NextResponse.json({ generated: 0 })   // <-- returns before...
}
// ... loop ...
await supabaseAdmin.from('notifications').insert({ type: 'recurring_generated', ... })  // <-- ...this
```
Zero tenants with an active recurring schedule (e.g. everyone paused, or a
platform in an early/quiet period) is a legitimate state, but it returns
before the marker write. `maxSilenceMin` is 8 days — this cron runs weekly,
so the marker was already living close to its own silence threshold even in
the healthy case (one skipped run and a zero-active week could tip it over).

### 2. `cron/late-check-in` — no marker at all, keyed off a real business event
```ts
await notify({ tenantId, type: 'late_check_in', ... })  // only inside the
                                                          // per-booking loop,
                                                          // only when a late
                                                          // check-in is found
```
This cron had no unconditional liveness marker whatsoever. All 3 consumers
instead watched the type used for the REAL per-booking late-check-in event.
Zero late check-ins platform-wide for 7 days is a legitimate — and honestly
good — operational state, not proof the cron is down, but it would still
falsely flag the cron dead.

## Fix (file-only where it touches schema; these are code-only, no migration needed)
Both follow the exact fix shape as `email-monitor` (`92e3192d`):

- **`generate-recurring`**: moved the `recurring_generated` insert to
  immediately after the cron-auth check, before the NYC-Maid auto-resume
  block and the zero-schedules early return. Message changed from
  `generated=${totalGenerated}` (only knowable after the loop) to `'tick'` —
  no consumer reads the message field, only the type, so this loses no
  monitored signal. Removed the now-redundant write at the end of the
  function (relocated, not duplicated).

- **`late-check-in`**: added a **new** notification type,
  `late_check_in_tick`, written unconditionally right after the cron-auth
  check. Deliberately NOT reusing `late_check_in` — the health check's
  intent is cron liveness, not late-event frequency, and conflating a
  system-level tick (`channel:'system'`, `recipient_type:'admin'`, no
  `tenant_id`) with the real per-booking SMS event (`channel:'sms'`,
  `tenant_id` set, `booking_id` set) would have muddied a type that other
  code may reasonably assume always means "a real late check-in happened."
  Same naming convention as `email_monitor_tick` — a dedicated `_tick` type
  never reused for a real event.

  Repointed all 3 consumers' `late-check-in` check entry from
  `match: { type: 'late_check_in' }` to
  `match: { type: 'late_check_in_tick' }`:
  - `src/app/api/cron/health-monitor/route.ts` (`CHECKS`)
  - `src/lib/jefe/health.ts` (`CRON_CHECKS`)
  - `src/app/api/admin/monitoring/status/route.ts` (`CRON_CHECKS`)

  `maxSilenceMin` left unchanged (7 days) on all 3 — narrowing it to match
  the cron's real schedule would be a separate, unrelated improvement, not
  part of this fix.

## Tests
- `route.silent-heartbeat.test.ts` (generate-recurring, 2 tests): marker
  written with zero active schedules (RED-confirmed against pre-fix code by
  reverting the edit and re-running — the early return skipped the insert,
  test failed with 0 marks found); marker still written when a schedule is
  refilled.
- `route.silent-heartbeat.test.ts` (late-check-in, 2 tests): tick written
  with zero tenants/bookings; tick is written as a type distinct from the
  real `late_check_in` event when one actually fires (both present, not
  conflated).
- Full suite: 676/676 files, 3490 passed + 1 pre-existing expected-fail,
  0 regressions.
- `tsc --noEmit`: clean on all 7 touched files. Pre-existing baseline noise
  only (stale `.next` admin-auth typing quirk, 2 unrelated cron test-file
  arg-count errors, 2 from the untracked `sunnyside-clean-nyc/site-nav.ts`)
  — none newly introduced, none reference the touched files.
- `eslint`: 0 errors on all touched files (late-check-in/route.ts carries
  11 pre-existing warnings — unused `notify` import, `any` casts — all on
  lines untouched by this fix).

## Swept for more siblings
Checked every other entry in `health-monitor`'s `CHECKS` (cross-referenced
against `jefe/health.ts`'s `CRON_CHECKS` and
`admin/monitoring/status`'s `CRON_CHECKS` — all 3 lists are otherwise
identical):
- `email-monitor` (`email_monitor_tick`) — already fixed this morning
  (`92e3192d`).
- `payment-reminder` (`payment_reminder_fired`) — marker written
  unconditionally after the tenant loop; an empty/no-op tenant loop still
  falls through to the write. Correct, not touched.
- `daily-summary` (`daily_summary_sent`) — same shape, correct, not touched.
- `recurring-expenses` (`recurring_expense_posted`) — same shape, correct,
  not touched.
- `reminders` (`email_logs`, `subject ILIKE '%reminder%'`) — **flagged, not
  fixed**. This cron has no dedicated unconditional marker either; it relies
  on one of several real reminder emails (day-based, hour-based, payment,
  etc.) actually firing, all gated on real booking state, structurally the
  same risk class as `late-check-in`. Did not fix: this cron runs hourly
  against every active tenant's day- and hour-based reminders, payment
  alerts, and thank-you emails simultaneously, with a 36h silence window —
  the odds of zero matching activity across the ENTIRE platform for 36
  straight hours are far lower than the weekly/event-driven crons above,
  and adding a dedicated tick type here means auditing ~10 more call sites
  across a 630-line file to confirm none of them already double as a safe
  proxy. Lower risk, real fix, out of this pass's scope — same "flag,
  don't build" discipline as prior rounds' lower-risk findings.
- `pipeline.new_lead` / `pipeline.new_booking` — not a cron marker at all;
  intentionally checks real business-activity freshness (lead/booking
  capture across ALL ingest paths, not one dedicated cron route), which is
  the actual signal the author wanted to watch. Ruled not-a-bug by design,
  same category as prior rounds' accepted-design siblings.

## Not touched
- `reminders` cron's missing dedicated tick — flagged above, lower risk,
  not fixed.
- `tenant_owner_messages.read_at` — while auditing a different messaging
  surface for a similar "marker never reflects reality" bug, noticed
  `admin/tenant-chats` `POST` and `jefe/actions.ts`'s `sendTenantMessage`
  both set `read_at` to now() on INSERT for an admin/Jefe→owner message,
  which (per the owner-side GET's own read-marking logic) is supposed to
  mean "the OWNER has read this" — so it's pre-marked read before the owner
  has seen it. No live consumer currently reads that field for an unread
  badge (`SidebarCounts` has no `messages` key, no badge is wired up), so
  this has zero observable effect today. Flagging, not fixing — same
  discipline as flagging without building when there's no live blast
  radius yet.
