# Scheduling capacity-blind: `/api/portal/availability` — analysis + proposed fix (W1)

**Date:** 2026-07-12
**Trigger:** leader queue item (b) — "portal/availability marks slot booked on ANY
same-day overlap ignoring multi-crew capacity."
**Scope:** analysis + proposed fix only, per instructions — no code changed for this item.

## Headline

Confirmed. `platform/src/app/api/portal/availability/route.ts` (GET) is a **second,
independently-written, capacity-blind implementation** of availability. It ignores
`team_member_id` entirely and marks a slot unavailable the moment **any** booking for
the tenant overlaps it that day — so a tenant with 3 crews shows every slot as full
the instant crew A has one job at that time, even though crews B and C are free.

This is not the only availability implementation in the codebase — a correct,
capacity-aware one already exists (`src/lib/availability.ts` → `checkAvailability()`)
and is used by the two *other* public availability routes. `portal/availability` is the
outlier that never got wired to it.

## Where it's live

`portal/availability` is fetched by `src/app/portal/page.tsx:200` — the **authenticated
client portal** (existing/recurring clients booking via a portal token,
`verifyPortalToken`). This is a real, currently-reachable booking surface, not dead code.

## The bug, line by line (`platform/src/app/api/portal/availability/route.ts`)

```ts
const { data: bookings } = await supabaseAdmin
  .from('bookings')
  .select('start_time, end_time')          // <-- no team_member_id selected or filtered
  .eq('tenant_id', auth.tid)
  .gte('start_time', dayStart)
  .lte('start_time', dayEnd)
  .not('status', 'eq', 'cancelled')
...
const isBooked = bookedRanges.some(
  (b) => slotStart.getTime() < b.end && slotEnd.getTime() > b.start
)
slots.push({ time: timeLabel, available: !isBooked })
```

Every booking for the tenant that day — regardless of which team member/crew is
assigned — is thrown into one flat list. A slot is "booked" the instant **any** booking
overlaps it, with no per-member accounting. One crew's job blocks the slot for every
other crew.

Compounding gaps found in the same route (same root cause: it never consults
`team_members`):

1. **No team-member/day-off check at all.** It never queries `team_members`, so it
   will show a slot as available on a day nobody is scheduled to work (contradicts
   `getTeamForDay()` used everywhere else), and never excludes members on
   `unavailable_dates`.
2. **No travel buffer.** `lib/availability.ts` applies a 60-minute `BUFFER_MINUTES`
   between jobs (`hasConflict`); this route does an exact overlap check only —
   back-to-back jobs with zero drive time will be offered.
3. **No holiday / `open_365` gate.** `checkAvailability()` calls `isHoliday()` +
   `getSettings().open_365`; this route has neither, so it will offer slots on a
   holiday the business is closed for tenants who are NOT `open_365`.
4. **Hardcoded 8am–6pm window**, not the tenant's configured `business_hours_start`/
   `business_hours_end` (a narrower but related drift from the tenant's real settings —
   flagged for completeness, not the focus of this item).

## Why this matters (business impact)

Any multi-crew tenant using the client portal to self-book (recurring/existing
clients) sees **false "fully booked"** slots the moment any single crew has one job
that hour — undercounting real capacity by a factor of N crews. This directly costs
bookings/revenue and is the inverse-severity twin of a double-booking bug: it's silent
(no error, no crash) so it would never surface in logs — only in "why can't clients
book us, we have three crews free" symptom reports.

## Proposed fix

**Delegate to the existing, tested, capacity-aware `checkAvailability()`
(`src/lib/availability.ts`) instead of reimplementing scheduling logic inline** — the
same pattern already used by `src/app/api/availability/route.ts` and
`src/app/api/client/availability/route.ts`. This is a same-shape, low-risk change:

```ts
// platform/src/app/api/portal/availability/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { checkAvailability } from '@/lib/availability'
import { verifyPortalToken } from '../auth/token'

export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = verifyPortalToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const date = request.nextUrl.searchParams.get('date')
  const duration = parseInt(request.nextUrl.searchParams.get('duration') || '2')
  if (!date) return NextResponse.json({ error: 'Date required' }, { status: 400 })

  const result = await checkAvailability(auth.tid, date, duration)
  return NextResponse.json(result) // { slots, sameDay?, message? }
}
```

This single change fixes all four gaps above in one shot (capacity-aware,
day-off-aware, buffer-aware, holiday-aware) because they're already solved correctly
inside `checkAvailability()` — no new scheduling logic to write or test separately.

### Compatibility note for whoever implements this

`checkAvailability()`'s response shape is `{ slots: {time, available}[], sameDay?,
message? }` — a superset of the current route's `{ slots }`. The current route's
`time` label format (`"8:00 AM"`, hour+`:00`/`:30`, no leading zero on hour) differs
slightly from `checkAvailability()`'s `TIME_LABELS` (`"9:00 AM"` fixed hourly labels,
`BUSINESS_START=9`/`BUSINESS_END=17`, no `:30` half-hour slots, capped at `hour <= 16`
i.e. last slot start 4 PM). **`src/app/portal/page.tsx` currently renders whatever
`time` strings the route returns as opaque labels** (no format-parsing on the client),
so swapping the source is UI-safe, but the *set of offered slots* will shrink from
30-minute granularity 8am–9pm to `checkAvailability()`'s hourly 9am–5pm grid — that's
a real behavior change (arguably a second, separate fix: `checkAvailability()`'s
hardcoded `BUSINESS_START`/`BUSINESS_END`/`TIME_LABELS` should also read the tenant's
configured `business_hours_start`/`business_hours_end`, which it currently does not).
Flagging so the implementer verifies the narrower grid is acceptable before landing,
or extends `checkAvailability()`'s granularity/window first.

## Not implemented

Per the leader's item (b) phrasing ("write analysis + proposed fix," distinct from
item (a)'s "author the fix + test"), no code was changed for this item — this is the
analysis + proposed-fix artifact only.
