# W4 broad hunt — running-late SMS/push cooldown fix

**Time:** 2026-07-16 14:18 EDT
**Status:** File-only. Not deployed. Not pushed. No DB migration required.

## Bug

`POST /api/team-portal/running-late` — a field team member reports they're
running late; the endpoint fires a real SMS to the client's phone, a real SMS
to the admin, and two push notifications. It's gated by a per-member rate
limit of 5 calls / 10 minutes (already documented in the code as the mitigation
for "unmetered SMS-cost-abuse/harassment against a real client phone number"),
but that limit renews every 10 minutes with no cap on the number of windows —
a compromised or malicious team-member account (lowest-trust authenticated
tier in the portal) could keep the endpoint hot for an entire shift and put
dozens of unwanted texts on one real client's phone, plus matching admin SMS
noise. There was no per-booking dedup at all, unlike the sibling
`15min-alert` payment-reminder route, which already tracks
`fifteen_min_alert_time` and skips re-sending inside a 30-minute window.

## Fix

Added the same dedup shape used by `15min-alert`: track elapsed time since
`booking.running_late_at`. A re-tap within a 10-minute cooldown still updates
`running_late_eta` (so the recorded ETA stays current) but skips the
admin/client SMS + push blast entirely, returning `{ success: true,
alreadyReported: true }`. First report in a window still sends normally.

Files:
- `platform/src/app/api/team-portal/running-late/route.ts`
- `platform/src/app/api/team-portal/running-late/route.tenantdb.test.ts` (added cooldown test case)

## Verification

- `npx tsc --noEmit` — clean (3 pre-existing unrelated errors in
  `bookings/broadcast/route.xss.test.ts` and
  `site/sunnyside-clean-nyc/_lib/site-nav.ts`, untouched by this change).
- `npx vitest run src/app/api/team-portal/running-late/route.tenantdb.test.ts`
  — 3/3 passed, including the new cooldown case (asserts `sendSMS` /
  `sendPushToClient` are not called on a re-tap inside the window, and that
  the ETA still refreshes).
