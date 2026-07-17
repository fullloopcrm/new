# Reschedule OUT-of-same-day-back-to-future pricing revert — options (prep doc, no code changed)

Source: LEADER 19:16 3-deep queue item (1), W3. This is prep only — file-only,
no push/deploy/DB, no behavior change applied. I flagged this gap while
landing `a08c31da` (PUT `/api/client/reschedule/[id]` applies
`selena_config.emergency_rate` when a client reschedules a booking to today)
and left it explicitly unfixed pending a design call. This doc lays out
concrete options.

## The gap, confirmed by reading the code

`platform/src/app/api/client/reschedule/[id]/route.ts:78-101` (current HEAD):

```ts
let emergencyOverride: { hourly_rate: number; price: number } | null = null
const becomesEmergency = body.start_time ? body.start_time.split('T')[0] === new Date().toLocaleDateString('en-CA') : null
if (becomesEmergency) {
  const selenaConfig = (tenant as {...}).selena_config
  if (selenaConfig?.emergency_available && selenaConfig.emergency_rate) {
    // ...compute emergencyOverride from emergency_rate...
  }
}

const { data: updated, error } = await db.from('bookings').update({
  start_time: body.start_time,
  end_time: body.end_time,
  ...(body.team_member_id !== undefined ? { team_member_id: body.team_member_id } : {}),
  ...(becomesEmergency !== null ? { is_emergency: becomesEmergency } : {}),
  ...(emergencyOverride ?? {}),   // <-- only ever ADDS a rate override, never removes one
}).eq('id', id)...
```

The override only fires in one direction. Walk the sequence:

1. Client books routine service for next week. `hourly_rate=75, price=15000
   (2hrs), is_emergency=false`.
2. Client reschedules to **today** via this endpoint. `becomesEmergency=true`
   → `hourly_rate=130, price=26000, is_emergency=true`. The original
   `75/15000` is gone — overwritten in place, never written anywhere else.
3. Client (or staff, via the same client-facing flow, or a client who
   changes their mind again) reschedules back **out** to a future date.
   `becomesEmergency=false` → `is_emergency:false` is written (the `!==
   null` branch fires), but `emergencyOverride` is `null` for this call, so
   `hourly_rate`/`price` are **not** included in the update. The row keeps
   `hourly_rate=130, price=26000` — a routine future booking now permanently
   billed at the emergency rate, with `is_emergency=false` masking that the
   price doesn't match a routine job.

Grepped every route that both writes `emergency_rate`-derived pricing AND
can move a booking's date twice (create-then-reschedule): `portal/bookings`,
`bookings` (AI/SMS create_booking), and `client/book` are creation-only —
they set price once and never revisit it, so they don't have this problem.
`client/reschedule/[id]` is the only route that recomputes pricing on every
date change, and it's the only one where a real inverse case exists.
The staff-facing `bookings/[id]` PUT (`src/app/api/bookings/[id]/route.ts:54`)
lets an admin set `hourly_rate`/`price` directly via its `pick()` allowlist —
no auto-recompute at all, so staff already has full manual override there;
that path is unaffected by this gap and out of scope for this doc.

Confirmed no place already holds the pre-override value: `bookings` has no
JSONB metadata column (`check_in_location`/`check_out_location` are the only
two JSONB columns, both check-in/out geo — grepped all of
`src/lib/migrations/*.sql`) and no `booking_history`/audit table exists.
**There is genuinely nothing to revert to today** — any fix has to either
start persisting the pre-override value, or stop trying to auto-revert.

## Option A (recommended) — snapshot columns, restore on the reverse transition

Add two nullable columns via a new migration file
(`src/lib/migrations/2026_07_16_bookings_pre_emergency_rate.sql`, following
the existing single-`ALTER TABLE ... ADD COLUMN IF NOT EXISTS` idiom used
throughout `009_closeout_fields.sql` / `011_parity_with_nycmaid.sql`):

```sql
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS pre_emergency_hourly_rate NUMERIC;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS pre_emergency_price INTEGER;
```

In the route: widen the existing `oldBooking` select's TS cast (it already
does `select('*, ...)`, so the columns come back on the wire today — only
the manual type needs `hourly_rate`/`price`/`is_emergency` added) and branch
on the **transition**, not just the new state:

```ts
// old.is_emergency false -> becomesEmergency true: entering emergency for
// the first time. Stash the pre-override rate so a later reschedule back
// out of same-day has something to restore.
if (becomesEmergency && !oldBooking.is_emergency) {
  updatePayload.pre_emergency_hourly_rate = oldBooking.hourly_rate
  updatePayload.pre_emergency_price = oldBooking.price
}
// old.is_emergency true -> becomesEmergency false: leaving emergency.
// Restore the stashed rate (if one exists — a booking that was manually
// set to is_emergency=true with no stash, e.g. via the admin PUT path,
// has nothing to restore and is left alone) and clear the stash so the
// NEXT entry into emergency snapshots a fresh value, not a stale one.
if (becomesEmergency === false && oldBooking.is_emergency && oldBooking.pre_emergency_hourly_rate != null) {
  updatePayload.hourly_rate = oldBooking.pre_emergency_hourly_rate
  updatePayload.price = oldBooking.pre_emergency_price
  updatePayload.pre_emergency_hourly_rate = null
  updatePayload.pre_emergency_price = null
}
```

This round-trips through any number of toggles (routine→emergency→routine→
emergency...) because the stash is only written on a genuine
false→true edge and only consumed+cleared on a genuine true→false edge —
same-day-to-same-day or future-to-future reschedules touch neither.

**Pros:** correct for arbitrary toggle sequences, small diff (1 migration +
~15 lines in one route), matches the codebase's existing simple-column
idiom, no new table.
**Cons:** real migration (needs Jeff's prod-DDL approval per standing rule);
two more nullable columns on an already-wide `bookings` table; only fixes
the automated path — a booking pushed into emergency via this route, then
edited to a different rate by staff via `bookings/[id]` PUT, then rescheduled
back out, restores the *pre-emergency* rate, not the *staff-edited* one
(edge case, but real — staff-set values aren't tracked by this stash).

## Option B — re-derive from the service/quote baseline instead of snapshotting

Instead of storing what the row *was*, look up what it *should be*: the
booking's `service_type_id` → `service_types` base rate, at the moment of
reverting out of emergency, and write that instead of a stashed value.

**Pros:** no new column, no migration, no prod-DDL approval needed to ship.
**Cons:** silently wrong for exactly the bookings most likely to hit this
path — a manually quoted/discounted price won't match its service type's
list rate, so "reverting" could change what the client was actually billed
to something they never agreed to. Also `bookings.service_type_id` is
nullable in practice (grepped several creation paths that leave it unset),
so there isn't always a baseline to look up. Worse than A on correctness for
the same or more implementation effort — not recommended.

## Option C — don't auto-revert; treat the emergency rate as sticky, fix by hand

Leave the current one-directional behavior as-is (already shipped in
`a08c31da`, so this is "no further code change") and rely on the existing
staff-facing `bookings/[id]` PUT — which already lets an admin set
`hourly_rate`/`price` directly — for the rare real-world case where a client
reschedules back out of an emergency slot. Optionally add a dashboard-side
visual flag (e.g. a badge on the booking edit view: "was billed at the
emergency rate, was rescheduled off same-day — verify pricing") so staff
notice instead of relying on them to catch it unprompted.

**Pros:** zero migration, ships same-session, no risk of restoring a stale
snapshot over a legitimate manual staff edit (Option A's edge case).
**Cons:** doesn't actually fix the billing-gap archetype this whole P11.x
series has been closing — leaves a real over-billing case standing whenever
staff don't notice the flag. Given this session already closed 6 sibling
gaps in the exact same archetype (P11.8/16/17 + this one), leaving this one
half-fixed is the visible outlier.

## Recommendation

Option A. It's the only option that's both correct (round-trips arbitrary
toggles) and additive (no existing column semantics change) — the
established pattern for this codebase per `CLAUDE.md`'s "global, additive"
rule and every prior fix in this session. Its one real weakness (losing a
staff manual edit made *while* a booking was mid-emergency) is a narrow
double-edit race, not a routine case, and can be flagged as a documented
known limitation rather than blocking the fix.

Not applied — migration file not written, route not changed, awaiting
Jeff's sign-off on Option A (or a different pick) before implementation.
