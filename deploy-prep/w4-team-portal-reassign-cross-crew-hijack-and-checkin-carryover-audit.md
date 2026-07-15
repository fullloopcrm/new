# W4 finding: team-portal job reassign has no source-scope check — a `lead` can hijack any tenant's booking into their own crew, and reassignment doesn't clear check-in state, letting the new assignee cash in on the previous assignee's already-elapsed clock

**Severity: HIGH (authorization bypass + real money — payroll). FIXED 2026-07-15 per leader 01:59 order.**

## Fix applied

`platform/src/app/api/team-portal/jobs/reassign/route.ts`:
1. Added source-scope check — `if (booking.team_member_id && !scope.includes(booking.team_member_id)) return 403` — right after the booking is fetched, before any mutation.
2. The update now also clears `check_in_time`, `check_out_time`, `check_in_lat`, `check_in_lng`, `check_out_lat`, `check_out_lng`, `actual_hours` to `null`, so the new assignee starts clean and cannot inherit/cash in on the prior assignee's already-elapsed clock via `checkout`.
3. Extended `route.test.ts`: fixed the default `scope` fixture to include `PREV_MEMBER` (existing "allow" tests were only exercising the destination check), added a dedicated 403 test for the new source-scope check, an "unassigned booking still allowed" test, and a test asserting the check-in/out fields are nulled in the update payload. All 12 tests pass; `tsc --noEmit` clean.

## Where

`platform/src/app/api/team-portal/jobs/reassign/route.ts` (`POST`, gated on `jobs.reassign`, granted by default to `lead` and `manager` — see `src/lib/portal-rbac.ts:37-38`).

## Bug 1 — no scope check on the booking being taken

`scopedMemberIds(auth)` (`src/lib/team-portal-auth.ts:69-103`) defines a `lead`'s authority as "everyone sharing at least one crew with them." The route uses that scope correctly for the **destination**:

```ts
const scope = await scopedMemberIds(auth)
if (!scope.includes(to_member_id)) {
  return NextResponse.json({ error: 'That member is not in your crew' }, { status: 403 })
}
```

but the **source** booking is only tenant-scoped, never checked against the actor's scope:

```ts
const { data: booking } = await supabaseAdmin
  .from('bookings')
  .select('id, team_member_id, start_time, clients(name)')
  .eq('id', booking_id)
  .eq('tenant_id', auth.tid)   // tenant only — no crew/ownership check
  .single()
```

Any `lead` who knows (or enumerates/guesses) a `booking_id` belonging to **any other crew** — or one still unassigned and intended for another pod — can reassign it straight to a member of their own crew. This is cross-crew job theft: a dishonest lead can pull higher-value jobs away from a rival crew into their own, at will, with no authorization check stopping it. The docstring's stated intent ("Runs a crew — sees teammates and can reassign jobs") only supports reassigning *within/into* their own crew, not *taking from* an unrelated one — but the code never enforces the "from" side.

## Bug 2 — reassignment doesn't clear check-in/out state, so the new assignee inherits the old assignee's clock

The update only touches `team_member_id`, `pay_rate`, `status`:

```ts
.update({ team_member_id: to_member_id, pay_rate: target.pay_rate || null, status: 'confirmed' })
```

`check_in_time` / `check_out_time` / `check_in_lat` / `check_in_lng` are left untouched. If the original assignee had already checked in (`checkin/route.ts` sets `check_in_time`), the booking is reassigned to a new member who never checked in, but:

- They cannot call `checkin` again — `checkin/route.ts:34-36` blocks because `check_in_time` is already set ("Already checked in").
- They **can** immediately call `checkout` — our just-applied guard in `checkout/route.ts` only rejects if `check_out_time` is already set; there is no requirement that the caller ever checked in themselves. `checkout` will happily compute `now − check_in_time` (the **original** assignee's check-in) and pay the **new** assignee for that entire elapsed span, and set `team_member_pay`/`price` on the booking accordingly.

Concrete path: Lead L reassigns a job away from worker A (who checked in 6 hours ago on a different crew's job, per Bug 1) to worker B in L's own crew. B immediately hits `POST /api/team-portal/checkout` with that `booking_id` → gets paid for 6 hours of work they didn't do, and A's actual check-in is silently overwritten/lost (A never gets checked out or paid for the time they did work, since the booking no longer belongs to them). This compounds Bug 1 — the reassign-hijack is also a payroll-forgery vector, not just a job-visibility/fairness issue.

## What I checked

- Read `reassign/route.ts`, `claim/route.ts`, `release/route.ts` in full — `claim` and `release` are correctly atomic/self-scoped (`.is('team_member_id', null)` / `.eq('team_member_id', auth.id)` compare-and-swap guards); `reassign` is the outlier missing a source-side check.
- Read `team-portal-auth.ts` (`scopedMemberIds`, `requirePortalPermission`) and `portal-rbac.ts` — confirmed `lead` (not just `manager`) has `jobs.reassign` by default, and `lead`'s scope is crew-limited (not tenant-wide), which is exactly the boundary the route fails to enforce on the read side.
- Confirmed `checkin/route.ts` blocks a second check-in on a booking with `check_in_time` already set (so the new assignee is structurally prevented from ever generating their *own* check-in on a hijacked, already-checked-in booking) — reinforcing that `checkout` is the only gate standing between reassignment and payroll inflation, and it does not check who checked in.
- Did not check `referrers/`, `referral-commissions/`, or team-PIN routes (per leader instruction, out of scope for this pass).
- Did not check whether the team-portal client UI restricts which `booking_id`s a lead is shown/can select for reassignment — a UI-only restriction would not stop a direct API call with a captured/known `booking_id`.

## Suggested fix (not applied — file-only per lane rules)

1. **Source-scope check:** before allowing reassignment, require the *current* `team_member_id` (if any) to also be in `scope`, OR require the booking to be currently unassigned to any member outside the actor's authority. Concretely: `if (booking.team_member_id && !scope.includes(booking.team_member_id)) return 403`.
2. **Clear check-in/out state on reassignment** so the new assignee starts clean: set `check_in_time: null, check_out_time: null, check_in_lat: null, check_in_lng: null, check_out_lat: null, check_out_lng: null, actual_hours: null` in the same update (unless the business wants an explicit "handoff mid-shift" flow, which should be a distinct, audited, admin-only action — not a side effect of a lead-level reassign).
