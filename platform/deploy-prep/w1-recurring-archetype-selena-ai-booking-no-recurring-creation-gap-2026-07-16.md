# Gap: Selena/Yinez AI booking channel promises recurring service but never creates one

**Track:** missing-feature gap (Jeff's 3-track rule) — documented, not built.

## What exists

Selena/Yinez (the SMS/web/Telegram AI booking agent, `src/lib/selena/`) has
exactly one booking-creation tool, `create_booking`, whose tool schema
(`src/lib/selena/agent.ts:63`) explicitly advertises an argument
`recurring_type (one_time/weekly/biweekly/monthly)` to the model. The prompt
(`src/lib/selena/tenants/nycmaid.ts:129`) tells Selena "Recurring discounts
only AFTER first visit. Don't push recurring on a first booking" — implying
recurring setup IS an expected conversational path, just not on visit #1.

Separately, Selena has 4 tools that operate on an **already-existing**
`recurring_schedules` row: `list_recurring`, `pause_recurring`,
`resume_recurring`, `cancel_recurring` (`agent.ts:105-108`, dispatched in
`tools.ts:157-163`). There is no `create_recurring` tool.

## The gap

`handleCreateBooking` (`src/lib/selena/core.ts:1108-1183`) does exactly this
with `recurring_type`:

```ts
const recurringType = (input.recurring_type as string) || 'one_time'
...
recurring_type: recurringType, suggested_cleaner_id: suggestedCleanerId,
```

It stores the value as a plain label on a **single `bookings` row** and
nothing else. It never inserts into `recurring_schedules`, never calls
`generateRecurringDates`, never touches `sale-to-recurring.ts`'s pattern. Grepped
every write path in `core.ts`/`selena-legacy-handlers.ts`/`tools.ts` —
confirmed zero `recurring_schedules` INSERT exists anywhere in the Selena
codepath, only the pause/resume/cancel/list reads above.

Worse, the client-facing confirmation channel actively **displays** this as
if it were real recurring service:
`src/lib/nycmaid/email-templates.ts:283`:
```ts
${isRecurring ? infoRow('Schedule', booking.recurring_type) : ''}
```
(`isRecurring = !!booking.recurring_type`, same pattern in
`sms-templates.ts:73`/`:89`). So a client who tells Selena "book me weekly"
gets a confirmation that literally says `Schedule: weekly` — then receives
exactly ONE cleaning, ever, with no cron, no schedule row, and no second
message from Selena telling them anything is wrong. The only way the client
actually gets ongoing service is if a human tenant admin separately notices
and manually builds a `recurring_schedules` row through the dashboard, or the
client independently uses the unrelated `/api/client/recurring` self-service
flow.

This is the same "silently promises X, delivers nothing" failure shape as
the monthly-enum bugs fixed earlier this session (d8cf9732, 50a97f84,
18f600fe, 10cc3c1a, 291a6be6) — except here there's no invalid-enum edge
case gating it; it's the *default, always-true* behavior of the only AI
booking-creation tool whenever a client asks for anything but a one-time visit.

## Why not fixed directly

Building `create_recurring` (or extending `create_booking`) correctly needs
product answers this session isn't positioned to guess:
- Which fields does Selena collect before creating a series (day_of_week,
  start date, cadence-specific fields for `monthly_date`/`monthly_weekday`)
  vs. defer to a human?
- How does the "discount only after first visit" rule (nycmaid.ts:129)
  interact with `applyRecurringDiscount` — does Selena create the schedule
  starting from visit #2, or create it immediately and rely on billing-time
  discount logic (client/book/route.ts's pattern)?
- Should an AI-driven flow be trusted to autonomously spin up an indefinite
  recurring commitment with real billing implications at all, or should
  Selena's job here stay "hand off to a human/self-service link" instead of
  writing the schedule herself?

Any of those wrong assumptions creates either an under-scoped tool (silently
drops fields the schedule needs) or an over-scoped one (AI autonomously
commits a client to a billing cadence nobody reviewed). Flagged for
leader/Jeff, not built unilaterally.

## Suggested options (not built)

1. **Minimal/safer:** keep `create_booking` one-time-only; when
   `recurring_type` is anything but `one_time`/absent, have Selena's reply
   copy explicitly tell the client "I'll get the recurring plan set up and
   confirm shortly" and fire an internal `notify()` to the tenant owner to
   manually build the schedule (removes the false confirmation, adds a human
   in the loop, smallest change).
2. **Full parity:** add a real `create_recurring` tool that calls the same
   underlying series-creation logic `/api/client/recurring` uses, gated to
   only fire after the explicit "don't push on first booking" checkpoint the
   prompt already describes.
3. At minimum, regardless of 1 vs 2: stop displaying `Schedule: <value>` in
   the booking confirmation templates until *something* backs that claim —
   today it's cosmetic label agreement with zero underlying schedule.
