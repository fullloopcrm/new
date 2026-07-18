# selena-legacy-handlers.ts cross-client IDOR — 5 handlers, live surface

W4, 2026-07-18 01:25. File-only, no push/deploy/DB.

## Context

LEADER's 01:23 order re-flagged `handleManageRecurring`'s caller-supplied
`schedule_id` client-ownership gap — but that exact fix already landed at
01:16:53 (commit `8efb0a46`) in `src/lib/selena/core.ts`, 6 minutes before
this order. Order was stale/crossed in transit. Did not redo it.

Instead treated the order as pointing at the right *class* of bug and hunted
for it fresh (order item 1). Found the real thing: **the prior session's
01:17 checkpoint incorrectly declared `src/lib/selena-legacy-handlers.ts`
"confirmed dead: zero importers"** and dropped it as a cleanup-only item.
That check only grepped for the handlers filename directly; it missed that
`src/lib/selena-legacy.ts` imports `routeExtendedTool` from it
(`selena-legacy.ts:23`) and calls it live inside the SMS tool-dispatch loop
(`selena-legacy.ts:1121`). `selena-legacy.ts` in turn is wired into 7 live
routes: `api/chat`, `api/selena`, `api/admin/selena`, `api/admin/ai`,
`api/admin/businesses/[id]/selena-preview`, `api/webhooks/telnyx`,
`api/test/email-selena`. This is not dead code — it is a second, parallel,
live copy of the exact handler set that `core.ts` has, un-synced with
`core.ts`'s security fixes.

## Bug

Same class as the `core.ts` `handleManageRecurring` fix (commit `8efb0a46`):
a caller-supplied id (`booking_id` / `schedule_id`) from Selena's tool-call
input was trusted after checking `tenant_id` only, never `client_id`. Any
client texting Selena (on the `selena-legacy.ts` code path) could act on or
read **another client's** data in the same tenant by supplying that client's
booking/schedule id — which an attacker could obtain by, e.g., social
engineering a booking id out of the target, or via IDs leaked elsewhere.

Five handlers affected, by severity:

- `handleRescheduleBooking` — no client check *at all* (didn't even resolve
  the caller's `client_id`). Caller could reschedule a stranger's booking.
- `handleCancelBooking` — same gap. Caller could cancel a stranger's
  booking, including recurring bookings the stranger depends on.
- `handleManageRecurring` — caller-supplied `schedule_id` skipped the
  client-scoped query path entirely and went straight to
  `.eq('id', scheduleId).eq('tenant_id', tenantId)` with zero client check
  — worse than `core.ts`'s pre-fix version, which at least existed in a
  file nobody thought was live.
- `handleBookingDetails` — returned another client's home address, GPS
  check-in/check-out coordinates, billed hours, rate, and payment records
  directly into the SMS conversation. Direct PII/financial leak to an
  unrelated party.
- `handleResendConfirmation` — lower severity (the email still lands in the
  real owner's inbox, not the attacker's), but the caller could trigger an
  arbitrary resend and learn the target's name/PIN/rate indirectly. Fixed
  for consistency with the other four and with `core.ts`'s sibling.

## Fix

Added the same ownership-check pattern used in `core.ts`'s
`handleManageRecurring` fix to all five handlers in
`src/lib/selena-legacy-handlers.ts`: resolve the caller's `client_id` via
the existing `getConvoClientId()` helper (already present in the file, used
elsewhere for other purposes), then require the fetched
booking/schedule row's `client_id` to match before reading or mutating it.
`not_your_booking` / `not_your_schedule` on mismatch, matching `core.ts`'s
error shape.

## Verification

New test file `selena-legacy-handlers.cross-client-idor-fix.test.ts` — 6
tests: one per fixed handler proving a cross-client attempt is now rejected
and the target row is untouched, plus one proving same-client access still
works. All 6 pass. Ran the existing `selena-legacy-handlers*.test.ts` suite
(3 files, 10 tests) alongside — all still pass, no regressions.
`npx tsc --noEmit`: clean except the 2 pre-existing baseline errors in
`sunnyside-clean-nyc/_lib/site-nav.ts` (untracked, unrelated, present before
this session's changes).

## Checkpoint correction

The 01:17 checkpoint's "New this pass" section item claiming
`selena-legacy-handlers.ts` is dead code is wrong and is superseded by this
file. `src/lib/selena-legacy-core.ts` (the other file named in that same
bullet) was re-checked this pass since the sibling claim proved unreliable:
it IS also live (imported by `selena-legacy.ts:8-22`), but it only exports
intent-classification/validation utilities (`detectIntent`,
`isTeamMemberPhone`, `isDoNotServiceByPhone`, name/profanity validators,
etc.) — no `handle*` tool dispatchers. Its 3 DB reads are keyed off
server-derived `tenantId`/`phone`/`clientId` from the actual conversation,
never a caller-supplied id from LLM tool input. Confirmed clean, not the
same bug class.

No push/deploy/DB this pass.
