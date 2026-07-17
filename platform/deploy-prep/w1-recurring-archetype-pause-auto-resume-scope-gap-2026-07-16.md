# Recurring archetype (full-lifecycle) — paused schedules only auto-resume for one hardcoded tenant

Scope: 20:55 queue item (2)/(3), fresh-ground + gap/fluidity on the recurring archetype's pause/resume lifecycle. Analysis-only — grounded in `src/app/api/cron/generate-recurring/route.ts`, `src/app/api/admin/recurring-schedules/[id]/pause/route.ts`, `src/app/api/schedules/[id]/pause/route.ts`, `src/lib/nycmaid/tenant.ts`. Not a code change — flagging for leader/Jeff, same as the period-lock and HR-onboarding-badge docs.

## The gap

Pausing a recurring schedule (`POST .../pause` with a `paused_until` date) is a **global**, tenant-agnostic feature — both `admin/recurring-schedules/[id]/pause` and `schedules/[id]/pause` are gated only by `requirePermission('schedules.edit')`, no tenant restriction, and both cancel the in-window bookings the same way for every tenant.

Resuming, however, has two paths that are NOT symmetric across tenants:
- **Manual**: `DELETE .../pause` — works for any tenant, any time (admin has to remember to do it).
- **Automatic**: `cron/generate-recurring/route.ts:19-30` — queries `recurring_schedules` where `status='paused' AND paused_until <= today`, flips them back to `active`. This block is hardcoded to `.eq('tenant_id', NYCMAID_TENANT_ID)` (`src/lib/nycmaid/tenant.ts`).

`NYCMAID_TENANT_ID` scoping is a **deliberate, Jeff-approved exception** per that file's own header comment ("the NYC Maid parity copy-over is scoped to THIS tenant only — NOT global... a deliberate, authorized exception") — so this is not a bug I fixed or should fix unilaterally. But it leaves an open question: was auto-resume-on-elapsed-pause meant to be a NYC-Maid-only parity feature (ported 1:1 from the standalone app), or is its absence for every other FullLoop-native tenant an oversight of the parity port that nobody circled back on?

Confirmed the resulting gap is real either way: for every non-NYCMaid tenant, a client who pauses service for a vacation with an end date stays paused **forever** past that date unless an admin manually visits the schedule and clicks resume. Checked `GET /api/admin/recurring-schedules` (list route) for any surfaced flag on this — none: an overdue-paused schedule (`paused_until` in the past) renders identically to a schedule paused for a future date. No badge, no sort-to-top, no notification. Nothing prompts the admin to notice.

## Why this is a doc, not a patch

This is a scope/intent question, not a mechanical fix:
1. If auto-resume was always meant to be NYC-Maid-specific (part of that app's original behavior), extending it globally would be a new feature for every other tenant, not a bug fix — needs product sign-off, not just code.
2. If it's an oversight, the fix is small (drop the tenant filter, or invert to `.neq` nothing / just remove the `.eq('tenant_id', ...)` line) but should be paired with at minimum a list-view overdue badge so this doesn't silently repeat in a different form.

## Proposed next step (not built)

Leader/Jeff call on intent. If global auto-resume is wanted: drop the `NYCMAID_TENANT_ID` filter in `generate-recurring/route.ts`'s resume block (3-line change) — file-only, no schema change, mirrors the exact update already used by both pause routes' own DELETE handlers. Separately worth an overdue-pause badge on the recurring-schedules list regardless of the auto-resume decision, since even NYC Maid's own admin only sees the effect a week later (cron is weekly) with no interim visibility.
