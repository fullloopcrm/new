# Gap: /dashboard/schedules has no per-occurrence exception support (skip/move/reassign)

**Track:** missing-feature gap (Jeff's 3-track rule) — documented, not built.

## What exists

Two parallel, independently-implemented surfaces both manage `recurring_schedules`:

1. **`/dashboard/schedules` + `/api/schedules/*`** — the real admin-facing
   recurring-schedule management UI (list, detail, create, edit, pause/resume,
   cancel). Referenced from `dashboard/schedules/page.tsx` and
   `dashboard/schedules/[id]/page.tsx`.
2. **`/api/admin/recurring-schedules/*`** — used only by
   `dashboard/bookings/BookingsAdmin.tsx`. This surface additionally has
   `[id]/exception` (per-occurrence skip/move/reassign, honored by
   `cron/generate-recurring`'s `recurring_exceptions` lookup) and
   `[id]/regenerate`.

## The gap

An admin working from `/dashboard/schedules` (the schedule's own dedicated
page — the more discoverable, purpose-built surface) has **no way to**:
- skip a single upcoming visit (e.g. holiday, client on vacation for one visit
  only, without pausing/cancelling the whole plan)
- move a single visit's date/time without disturbing the recurring pattern
- manually regenerate/top up bookings ahead of the weekly cron

All three are real, already-built backend features
(`recurring_exceptions` table + `cron/generate-recurring`'s exception-honoring
logic + `[id]/regenerate`) — they're just wired to the *other* UI surface
only. An admin has to know to go find the booking inside BookingsAdmin's
recurring view instead, which isn't obvious from the schedule detail page.

## Also noticed (same investigation)

`recurring_schedules.next_generate_after` is written by 4 call sites
(`/api/admin/recurring-schedules` POST, `[id]/regenerate`,
`/api/client/recurring`, `sale-to-recurring.ts`) but never read anywhere —
`cron/generate-recurring` derives its anchor purely from the latest real
`bookings` row, not this column. Not causing incorrect behavior (the cron's
own derivation is correct), just dead write-only data. Low value, not fixed.

## Proposed shape (not built — scoping only)

Port the exception dialog (skip/move date picker) and a "Generate more
visits now" button from BookingsAdmin's recurring panel onto
`dashboard/schedules/[id]/page.tsx`, calling the *existing*
`/api/admin/recurring-schedules/[id]/exception` and `.../regenerate`
endpoints (no new backend needed — same `recurring_schedules` row, same
permission gate `schedules.edit`/`recurring-schedules.edit`, verify these
resolve to the same permission key before wiring). Pure additive UI work on
one page.

Flagging for leader/Jeff priority call — this is new UI surface area, not a
bug fix, consistent with the standing "don't build workflow proposals
unilaterally" rule.
