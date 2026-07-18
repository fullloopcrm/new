# cron/email-monitor: tick written only when there's work, but 3 monitors treat it as a liveness proof (2026-07-18 08:32)

## Bug
`GET /api/cron/email-monitor` (`src/app/api/cron/email-monitor/route.ts`)
runs every minute and, per its own comment, writes an `email_monitor_tick`
`notifications` row as a "health-monitor marker — proves the every-minute
cron ran."

3 independent consumers rely on that marker's freshness to decide whether
this cron is alive, all with `maxSilenceMin: 60`:
- `src/app/api/admin/monitoring/status/route.ts` — admin dashboard health tile
- `src/app/api/cron/health-monitor/route.ts` — Telegram DM + `cron_health_alert`
  notification on silence, deduped 6h at a time via `cron_health_alerts`
- `src/lib/jefe/health.ts` — Jefe's platform-health digest (`crons.silent`)

The tick write sat *after* an early-return precheck:

```ts
const { count } = await supabaseAdmin.from('tenants').select('*', { count: 'exact', head: true })
  .eq('email_monitor_enabled', true).not('imap_host', 'is', null)
if (!count || count === 0) {
  return NextResponse.json({ ok: true, skipped: 'no enabled tenants' })  // <-- returns before the tick insert below
}
...
await supabaseAdmin.from('notifications').insert({ type: 'email_monitor_tick', ... })
```

Zero tenants with `email_monitor_enabled` is a fully legitimate, expected
state (nobody has turned the feature on yet, or the last tenant using it
disabled it) — not a failure. But it's indistinguishable from a real outage
to all 3 consumers: the tick goes silent, and after 60 minutes every one of
them reports `email-monitor` as down. `health-monitor`'s alert isn't a
one-shot either — its 6h dedup window means the false Telegram DM + red
dashboard tile would recur **forever**, every 6 hours, until some tenant
enables email monitoring. A legitimate, permanent product state was
indistinguishable from a real cron death, which is exactly the kind of
false-permanent-alarm class this session already closed elsewhere (dead-code
`is_primary` preference, masked-error owner-PIN, etc.) — same shape, alerting
subsystem this time instead of a data-correctness one.

## Fix (file-only, no push/deploy/DB)
`src/app/api/cron/email-monitor/route.ts` — moved the tick insert to run
unconditionally, immediately after cron-secret auth and before the
enabled-tenants precheck, so it proves what its own comment already claimed:
"the every-minute cron ran," full stop — not "the cron ran and found at
least one enabled tenant." No functional change to the downstream
`/api/email/monitor` forwarding path; the precheck's early-return `skipped`
response shape is unchanged.

## Tests
Added `route.silent-heartbeat.test.ts` (2 tests):
1. Zero enabled tenants → tick still written, `fetch` (downstream forward)
   never called, response still reports `skipped`. RED against the pre-fix
   code (zero ticks written; verified via `git apply -R` on the diff, not a
   stash) — GREEN after.
2. One enabled tenant → tick written AND downstream forward fires, matching
   prior behavior exactly (no regression on the working path).

Full `src/app/api/cron` suite: 57 files / 175 tests, all passing.

## Verification
- `tsc --noEmit`: clean on both touched files. Pre-existing baseline noise
  only (`.next` admin-auth route-typing quirk, 2 unrelated
  `outreach`/`payment-reminder` test-file arg-count errors, 2 from the
  untracked `sunnyside-clean-nyc/site-nav.ts` outside this lane) — none
  newly introduced, none reference `cron/email-monitor`.
- `eslint`: 0 warnings on both touched files.
- `src/app/api/cron` suite: 57/57 files, 175/175 tests passing.

## Not touched
- The downstream `/api/email/monitor` handler and its own dedup/claim
  logic — unaffected, this fix is purely about when the heartbeat marker
  fires relative to the precheck.
- No schema/migration change — pure application-layer ordering fix.
- Did not audit every other cron's tick-vs-precheck ordering in this pass
  (scope was this one gap); flagging as a pattern worth a follow-up sweep if
  a future round wants a fresh-ground surface: any cron whose liveness
  marker is written conditionally on finding work, rather than
  unconditionally on having run, is a candidate for the same false-permanent-
  alarm shape.

File-only. No push/deploy/DB.
