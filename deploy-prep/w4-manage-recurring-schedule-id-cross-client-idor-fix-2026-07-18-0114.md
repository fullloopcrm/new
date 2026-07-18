# W4 — 01:14 pass: manage_recurring cross-client schedule_id IDOR (fix)

Per the 01:11 LEADER order item 1 (new fresh-ground surface). File-only, no
push/deploy/DB.

## Scope selection

The 21:03/21:13 checkpoints had flagged as untouched: "whether any Jefe/
Selena tool accepts a raw tenant_id/entity_id parameter from LLM output
without a matching ownership check." Read every handler in
`src/lib/jefe/actions.ts` and `src/lib/selena/tools.ts` (owner-facing tool
dispatcher, ~1500 lines) in full first — both are already clean: Jefe's
`identifier` params resolve through `findTenant()` by design (Jefe is
platform-level, cross-tenant by intent, not a bug); every `tools.ts` handler
that writes a foreign-key id (`cleaner_id`, `client_id`, `deal_id`) already
has an `idInTenant()` ownership check from a documented prior pass ("P3-5").
Widened to the client-facing side (`src/lib/selena/core.ts`, 2669 lines,
never read in full before this pass) since that's the surface an actual
untrusted caller (SMS client, or attacker-influenced content reaching the
LLM via indirect prompt injection — this session's established Selena/Yinez
threat model) talks to directly.

## Found and fixed

`handleManageRecurring` (the `manage_recurring` SMS tool, `core.ts:1552`)
handles pause/resume/cancel on a `recurring_schedules` row. Its sibling
functions in the same file — `handleRescheduleBooking` and
`handleCancelBooking` — both explicitly re-derive `tenant_id` from the
*conversation* (never the fetched row) and then check
`booking.client_id !== callerClientId`, returning `not_your_booking` on a
mismatch; both have inline comments explaining exactly why. `manage_recurring`
had the tenant check but not the client check: when the LLM supplies
`schedule_id` (a real, declared field in the tool's `input_schema`, not
required — so plausibly reachable via conversation context or injected
content, same class as this session's prior indirect-prompt-injection
Selena fixes), the code accepted any schedule id that resolved inside the
caller's *tenant*, with no verification it belonged to the caller's own
*client_id*. Since `recurring_schedules.client_id` was never checked, any
client (SMS thread) could pause/resume/cancel **another client's** recurring
schedule in the same tenant just by supplying that schedule's UUID — and
pause/cancel already cascade to cancel every already-generated future
booking on the series (a deliberate fix from an earlier session, still
correct), so this reaches real-world impact: a stranger's cleaner stops
showing up and their upcoming visits get silently cancelled, with Selena
confirming success back to the attacker.

Fixed by adding the same ownership check as the booking siblings: when
`schedule_id` is caller-supplied, re-fetch it scoped to both
`tenant_id` AND `client_id` before doing anything; return `not_your_schedule`
on a miss. The self-lookup path (no `schedule_id` supplied — the common
case, "pause my cleaning") is unchanged since it was already
`client_id`-scoped.

## Verification

RED/GREEN mutation-verified (`git diff > patch && git apply -R patch`,
reran, reapplied). New file `manage-recurring-client-ownership.test.ts`
(4 tests: pause/cancel/resume against a different client's schedule in the
same tenant, plus one confirming the caller's own explicit schedule_id
still works). 3/4 failed pre-fix for the exact predicted reason (schedule
silently flipped, victim's booking silently cancelled, no
`not_your_schedule` error); 4/4 pass post-fix. Existing
`manage-recurring.test.ts` (5 tests, cross-tenant + cascade-cancel
coverage) still 5/5 green — no regression to the tenant-scoping or
cascade-cancel behavior it already covers.

`tsc --noEmit`: clean except the 2 documented pre-existing baseline errors
in `sunnyside-clean-nyc/_lib/site-nav.ts` (untracked, unrelated, noted every
checkpoint this session). Full repo suite: 657 files, 2295 passed + 1
expected-fail + 1 skipped, 2 failed — same 2 documented pre-existing
failures every checkpoint this session (`cron/tenant-health` RED-until-fixed
invariant, `cron/generate-recurring` known flaky race). Zero regressions.

Commit: (this pass, staged as `platform/src/lib/selena/core.ts` +
new test file).

## Next-target candidates if continuing fresh-ground hunting

- Same file, same class: `handleReportIssue`, `handleRequestCallback`,
  `handleUpdateAccount`, `handleGetInvoice`, `handleAddToWaitlist`,
  `handleRemember` (lines ~1168-1850, not yet read this pass) — worth a
  pass for the same "conversation-scoped tenant/client, verify any
  caller-supplied foreign id" check.
- `src/lib/selena/agent.ts`, `agent-config.ts`, `agent-config-loader.ts`,
  `build-playbook.ts`, `prompt-assembler.ts` — not yet opened this pass.

No push/deploy/DB this pass.
