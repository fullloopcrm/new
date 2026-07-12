# F4: holiday gate + 8am-6pm window blocks 24/7 emergency self-booking

**Author:** W3 · **Date:** 2026-07-12 · **Scope:** code fix + test, this
branch (`p1-w3`) only. Pure engine-logic fix, no DB write, no push/deploy.

## Root cause

`platform/src/lib/availability.ts`'s `checkAvailability()` — the function
behind the public self-booking widget (`GET /api/client/availability` →
`checkAvailability(tenant.id, date, duration)`, feeding `POST
/api/client/book`) — **ignored three settings that already exist per tenant**
and are already surfaced in the dashboard settings UI + onboarding:

| Setting (already exists) | Where it's normally honored | Where it was ignored |
|---|---|---|
| `tenants.business_hours_start` / `business_hours_end` | dashboard settings, `admin/businesses/new` onboarding, `selena-legacy.ts` | `checkAvailability()` hardcoded `BUSINESS_START = 9`, `BUSINESS_END = 17` |
| `tenants.allow_same_day` | `/api/portal/bookings` (existing-client portal booking) | `checkAvailability()` unconditionally returned `{ slots: [], sameDay: true, message: 'Same-day bookings require confirmation' }` for `date === today`, regardless of the flag |
| — | — | `TIME_LABELS` was a hardcoded lookup table for hours 9-16 only, and the slot loop additionally capped at `Math.min(lastStartHour, 16)` — so even fixing the two settings above, no slot could ever be offered past 4pm |

So a tenant that explicitly set custom hours (e.g. 6am-10pm) or toggled "Allow
same-day booking" on in Settings got **no effect** from either — the self-book
widget stayed locked to 9am-4pm(last-start), never same-day, and (separately,
pre-existing and correctly gated) closed on the 10 federal holidays in
`holidays.ts` unless `open_365` was set.

This is fatal specifically for the verticals that market themselves as 24/7 —
`industry-presets.ts` seeds these exact service descriptions:
- `towing`: "Accident / Emergency Tow — **24/7** urgent accident recovery"
- `restoration`: "Water Damage Extraction — **24/7** water extraction + dry-out"
- `tree_service`: "Emergency / Storm — **24/7** storm-damage response"
- `plumbing`: checklist option `'Emergency'`

A towing customer at 11pm, or a restoration customer on July 4th, hit the
self-book widget and got zero slots and "Same-day bookings require
confirmation" — even though nothing in their tenant's actual configuration
said they should be closed.

## Fix (on this branch)

`checkAvailability()` now:
1. Reads `business_hours_start` / `business_hours_end` from `getSettings()`
   (already fetched once for `open_365` — no extra query) instead of the
   hardcoded constants, falling back to 9/17 only when a tenant hasn't set
   them.
2. Only applies the same-day block when `allow_same_day` is falsy. When true,
   same-day slots are generated and any slot whose start time has already
   passed today is filtered out (`slotStartMin <= nowMinutes`) — you can't
   offer a 9am slot at 3pm.
3. Replaced the fixed `TIME_LABELS` (hours 9-16 only) with `formatHourLabel()`,
   a pure 24h→12h-label formatter that works for any hour 0-23, and removed
   the `Math.min(lastStartHour, 16)` cap — a tenant configured for, say,
   6am-10pm now actually gets slots across that full range.

The federal-holiday gate (`isHoliday()` + `open_365`) was already correctly
tenant-configurable (nycmaid runs `open_365: true`) — that part of F4 was a
**usage** gap, not an engine bug: `open_365` defaults to `false` (closed on
holidays) for every tenant including emergency verticals, and nothing at
provisioning time turns it on for towing/restoration/emergency-capable trades.

## Proposed follow-up (product decision — not implemented here)

Whether `provision-tenant.ts` should default `open_365: true` +
`allow_same_day: true` + wide `business_hours_start/end` for towing,
restoration, and/or plumbing at signup (so a new emergency-vertical tenant is
24/7-capable from day one instead of needing an operator to flip 3 settings
before their first emergency job) is a product/business call, not an
engineering bug fix — plumbing in particular is emergency-capable but not
universally 24/7 (routine drain cleaning tenants may not want same-day-by-
default). Flagging for Jeff rather than deciding unilaterally which verticals
get which defaults. If approved, the change is a 3-line addition to
`DEFAULT_SELENA_CONFIG`/the tenant-insert path in `provision-tenant.ts`,
gated on a small `EMERGENCY_CAPABLE: ReadonlySet<IndustryKey>` the same way
`PROJECT_VERTICALS` is now defined (see the F1 doc) — no schema change needed,
all three columns already exist.

## Verification run in this worktree

- `npx tsc --noEmit` → clean (exit 0)
- `npx vitest run src/lib/availability.test.ts` → 5/5 passed:
  - tenant-configured hours honored beyond the old 9-16 range (6am-10pm case)
  - falls back to 9am-5pm when a tenant has no configured hours (no regression)
  - same-day still blocked when `allow_same_day=false` (existing opt-in
    behavior preserved)
  - same-day allowed + slots generated when `allow_same_day=true`
  - already-past hours excluded from a same-day result
- No existing test file covered `availability.ts` before this change (checked
  via `find . -iname "*availability*test*"` — none), so this is net-new
  coverage, not a modification of an existing suite.
