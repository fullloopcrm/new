# Recurring Booking System — Rebuild Design

Status: draft for review. Grounded in the actual current codebase (`lib/recurring.ts`,
`lib/recurring-sync.ts`, `api/admin/recurring-schedules/*`, `api/client/recurring/*`) and
production data (nycmaid, 6-month window). Nothing here is destroyed until this is approved
and the backup (`docs/backups/recurring-schedules-pre-rebuild-2026-07-26.json`, 62 schedules,
all tenants) is confirmed intact.

## Why a rebuild, not another patch

Four independent implementations of "what does a recurring pattern mean" exist right now:
1. `lib/recurring.ts` — the canonical date-gen + type enum. Well-built, keep this.
2. `dashboard/bookings/_recurring.ts` — a SEPARATE display-string parser (`"Weekly"`,
   `"1st Monday"`) with its own regex-based interval logic, used by the admin UI.
3. `site/nyc-mobile-salon/_lib/recurring.ts` — a per-tenant clone.
4. `site/wash-and-fold-nyc/_lib/recurring.ts` — another per-tenant clone.

(3) and (4) directly violate this repo's own documented rule (`CLAUDE.md`: "Tenants differ
by DATA, never by code" / "if a change has to be repeated per tenant, the architecture is
wrong"). That rule is being broken specifically by recurring bookings.

Root cause of the client-facing bug: **there is no atomic "edit" for a client's own recurring
schedule.** The admin side (`PUT /api/admin/recurring-schedules/[id]`) does it correctly —
updates the schedule row in place and calls `syncFutureBookings()` to re-date/re-price
already-generated bookings. But the client side (`POST /api/client/recurring`) is
insert-only. A client "editing" their schedule today means: cancel the old schedule, then
call the create endpoint again — two separate, non-atomic actions. That produces exactly
what the data shows: 9 clients with a `cancelled` schedule row and an `active` schedule row
for the same day/time sitting side by side, both of which generated bookings during the
handoff window. That's where the duplicate visits and the duplicate confirmation
texts/emails come from (Hannah Gay, Daniel Mazur — confirmed via SMS logs).

## Target architecture

### 1. One schedule = one canonical row, edited in place, always

- A recurring schedule is **never** cancel+recreated for an edit. Every edit path (admin AND
  client) goes through one shared function: `updateRecurringSchedule(tenantId, scheduleId, changes)`.
- That function is the only thing that writes to `recurring_schedules` after creation. It:
  1. Updates the row in place (same id — booking history, tokens, and the schedule's own id
     never change).
  2. Calls the existing `syncFutureBookings()` logic (proven correct on the admin path) to
     re-date/re-price/re-assign already-generated future bookings.
  3. Fires exactly ONE client notification for the edit ("your cleaning schedule changed to
     X"), never a fresh "booking confirmed" for what the client experiences as one continuous
     recurring service.
- Client-portal self-edit becomes a real `PUT /api/client/recurring/[id]`, auth-gated the same
  way the existing `POST` is (session must own the schedule), calling the same shared function
  the admin route uses. No more cancel+recreate from the client side, ever.

### 2. Single source of truth for recurring-type semantics

- `lib/recurring.ts` becomes the ONLY module that knows what `weekly`/`biweekly`/`monthly_date`/
  etc. mean and how to generate dates from them.
- `dashboard/bookings/_recurring.ts`'s parallel display-string parser is retired; the admin UI
  is repointed to call the same shared function/types instead of re-deriving interval logic
  from a label string.
- `site/nyc-mobile-salon/_lib/recurring.ts` and `site/wash-and-fold-nyc/_lib/recurring.ts` are
  deleted; both tenants' booking UIs import the global `lib/recurring.ts` + shared
  `RecurringOptions` component instead of a forked copy. This is the literal fix for this
  repo's own "known debt" list.
- `recurring_type` gets a DB CHECK constraint against the real enum values. This closes the
  case-inconsistency bug (`"Weekly"` vs `"weekly"` currently both live in prod) at the data
  layer instead of hoping every call site normalizes it.

### 3. Native multi-visit-per-week support

- `recurring_schedules.days_of_week` (array column) already exists but is `null` on every row
  inspected — it was added to the schema and never wired into generation, editing, or the
  admin/client UIs, which all still assume one `day_of_week` per schedule.
- Rebuild treats "N visits per week" as first-class: one schedule row, `days_of_week: int[]`,
  `generateRecurringDates()` fans out over every entry instead of assuming a single weekday.
  No more modeling "twice a week" as two separate schedule rows (which is itself indistinguishable
  from the duplicate-row bug — a second reason to fix this now, not later).

### 4. Comms dedup, by construction

- Because edits never cancel+recreate, there's no longer a code path that fires a fresh
  "booking confirmed" alongside a "your old booking was cancelled" for what the client
  experiences as a single continuous service. One edit -> one notification.

## Data migration (nycmaid, before cutover)

The 9 affected clients (Catherine Mollerus, Natasha Armbrust, Hannah Gay, Natalie Pita,
Daniel Mazur, Pierce Dimauro, Kim Abramson, Fanny Kuang, Liza Bradburn) each have a
`cancelled` + `active` schedule pair for the same slot. Before cutover:
1. For each pair, keep the `active` row as canonical, re-parent any of the `cancelled` row's
   real (non-duplicate) booking history onto it for LTV/reporting continuity.
2. Cancel the 11 still-`scheduled` duplicate bookings identified (Daniel Mazur x4, Kim
   Abramson x3, Pierce Dimauro x3, one more) — confirm with support before touching Daniel
   Mazur's and Hannah Gay's given they already complained.
3. Normalize every `recurring_type` value to the canonical lowercase enum before the CHECK
   constraint goes on, or the constraint will fail to apply.

## Rollout

nycmaid is the only tenant with real recurring volume (25 active schedules); everywhere else
on the platform has at most 1 test/demo schedule. Build and verify against nycmaid first,
then the global rule means every other tenant gets it automatically — there is no
per-tenant rollout step for the admin/API layer. The only per-tenant work is deleting the two
site clones and repointing those two sites' booking UI to the shared component.

## What I have not yet done

- Have not written the new schema migration or any code yet — this is the design only.
- Have not confirmed with you which of the 11 live duplicate bookings to cancel outright vs.
  hand-review first.
- Have not scoped the `dashboard/bookings/_recurring.ts` retirement in detail (needs a pass to
  confirm every call site before deleting it).
