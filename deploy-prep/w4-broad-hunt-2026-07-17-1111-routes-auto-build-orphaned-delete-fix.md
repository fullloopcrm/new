# W4 — routes/auto-build orphaned-delete-before-insert fix (2026-07-17 11:11 order)

## Scope of this pass
Leader order: continue scheduling/dispatch depth (item 1 of fresh 3-deep queue),
following up on the just-landed `04da4cfe` (booking-team orphaned-write rollback)
and `0a845126` (quote-conversion email-case dedup).

## Bug found & fixed: POST /api/routes/auto-build

`src/app/api/routes/auto-build/route.ts` builds/replaces one dispatch route per
team member per day. Per team member group, the old code:

1. Deleted the existing `routes` row for that `(tenant_id, team_member_id, route_date)` — error not checked.
2. Inserted the new route — **error not checked at all** (`const { data: newRoute } = await ...insert(...).single()`).
3. Only updated `bookings.route_id` when `newRoute` was truthy.

If the insert failed for any reason (transient DB error, RLS hiccup, bad
`stops` payload), the old route was already gone and nothing replaced it —
silently. The route could have been `status: 'optimized'` or `'published'`,
not just a throwaway draft, so this could destroy a dispatcher's already-
published route for a team member with zero error surfaced. The endpoint
still returned `{ ok: true, routes_created: N, ... }` (N just short one),
and the calling UI (`dashboard/sales/routes/page.tsx`) only checked
`res.ok` (HTTP status, always 200) before showing a bare "Built N routes"
success toast — no path for the dispatcher to learn a team member's route
never got rebuilt.

Same failure class as the booking-team fix from the prior order: destructive
write (delete) landed unconditionally before the replacement write was
confirmed to succeed, with the insert's own error swallowed on top.

### Fix
Reordered to insert-before-delete (there's no unique constraint on
`(tenant_id, team_member_id, route_date)` in `028_routes.sql`, so a
transient duplicate row is harmless) and now check the insert's error:
- Insert fails → old route (if any) is left fully intact, team member id
  recorded in a new `failed_team_members` array, loop continues to the next
  team member instead of aborting the whole request.
- Insert succeeds → bookings repointed to the new route, THEN the old
  route(s) for that slot are deleted (safe now that a replacement exists).
- Response: `ok` is only `true` if no team member failed; `failed_team_members`
  included when non-empty.
- Updated the one caller (`dashboard/sales/routes/page.tsx`) to surface a
  warning when `failed_team_members` comes back non-empty, since a JSON-body
  `ok:false` doesn't affect `res.ok` (HTTP status stays 200) and would
  otherwise still render as a silent success toast.

### Verification
- `npx tsc --noEmit` — no errors in either touched file (3 pre-existing
  unrelated errors elsewhere, confirmed present before my edit).
- `npx vitest run src/app/api/routes/auto-build/route.permission-gate.test.ts`
  — 2/2 passed, unaffected by the reorder.
- Did not add a new test for the insert-failure path (would require mocking
  supabaseAdmin's insert to reject) — flagging as not done, not silently
  skipped.

## Rest of scheduling/dispatch sweep this pass
Re-checked for the same delete-then-insert-no-rollback shape across:
`admin/recurring-schedules/route.ts` (base POST), `admin/recurring-schedules/[id]/regenerate`,
`admin/recurring-schedules/[id]/exception`, `schedules/route.ts`, `client/recurring/route.ts`,
`bookings/[id]/route.ts`. All already carry proper rollback-on-insert-failure handling
(several explicitly reference prior fix commits in their comments) — no further
findings there this pass.
