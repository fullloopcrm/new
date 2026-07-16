# Broad-hunt sweep — 21:23 order — W4, 2026-07-15

File-only. New attack-surface angle this pass: CSV export injection and
file-upload validation across upload/export routes not yet swept.

## Checked, clean — no fix needed

- `clients/[id]/export` and `finance/tax-export` (the only two `text/csv`
  routes in the API): both already have formula-injection escaping
  (`csvEscape` neutralizes leading `=+-@\t\r`) and filename sanitization.
  No other `.join(',')` CSV-shaped output exists in `src/app/api` outside
  cron internals (not user-facing).
- `public-upload`, `uploads`, `cleaners/upload`, `management-applications/upload`,
  `finance/upload`, `team-applications/upload`, `reviews/upload`,
  `admin/notes/upload`, `booking-notes/upload`: all have MIME allowlists,
  size caps, and (where client-suppliable) a sanitized folder/path — several
  carry comments referencing prior hardening passes ("same fix as
  /api/public-upload"). No fresh gaps.

## Fixed this pass: `team-portal/video-upload` JSON-save URL not validated

The route has two upload paths: a legacy small-file FormData upload (path
computed server-side, never trusts client input) and a signed-URL flow for
files up to 150MB (Vercel's body-size limit forces this for video):
`GET` mints a Supabase signed upload URL + the `path` it will land at,
the client `PUT`s the file directly to Supabase, then `POST`s
`{booking_id, type, url}` as JSON so the server can stamp
`walkthrough_video_url`/`final_video_url` on the booking.

That JSON `POST` branch stored whatever `url` string the caller sent with
**no check that it pointed at the file the server actually signed** — only
booking-ownership (`team_member_id === auth.id`, fixed in a prior session)
gated it. A team member with a valid portal token for their *own* booking
could call the JSON endpoint directly (bypassing the real upload UI
entirely) and set the stored video URL to any arbitrary string: an
external domain, or another booking/tenant's object path in the same
bucket. That URL is later rendered unvalidated as `<video src={...}>` in
the operator dashboard (`dashboard/bookings/BookingsAdmin.tsx`,
`dashboard/bookings/[id]/page.tsx`) — so a rogue/compromised team-member
session could get an admin's browser to load arbitrary attacker-controlled
content/URLs inside the CRM. Confirmed the real frontend
(`components/VideoUpload.tsx`) always echoes back the server-computed
`publicUrl` from its own prior GET call — this fix only affects a
forged/off-path request, not the legitimate flow. The pre-existing test
file's own "ALLOWS" case demonstrated the gap: it asserted success storing
`url: 'https://x/video.mp4'`, a value bearing no relation to the signed
path.

**Fix:** before persisting, recompute this tenant+booking+type's own
storage prefix via `supabaseAdmin.storage.from('uploads').getPublicUrl(...)`
(same call the GET handler uses to mint the path) and require the
submitted `url` to start with it; 400 otherwise. Closes the injection
while leaving the legitimate signed-URL flow untouched.

## Verification

- `npx tsc --noEmit` clean.
- Updated the mock in `route.test.ts` (`getPublicUrl` now echoes the path
  argument into the URL, matching real Supabase behavior, instead of a
  fixed unrelated string) so the new prefix check is exercised
  meaningfully rather than trivially bypassed by the mock.
- Fixed 2 existing assertions that had asserted an arbitrary/mismatched
  URL as the accepted value (now correctly rejected) or a stale hardcoded
  mock URL.
- Added 2 new tests: rejects a foreign-domain URL, rejects a URL pointing
  at a *different* booking's own storage path (same tenant/type, wrong
  booking segment) — both mutation-verified (reverting the fix flips them
  green→failing).
- `src/app/api/team-portal/video-upload/route.test.ts`: 16/16 pass (was
  14, +2 new).
- Full suite: 1491 passed, 1 pre-existing unrelated failure
  (`cron/tenant-health` status-coverage-divergence — same known baseline
  flagged in prior W4 reports), 1 expected fail, 1 skipped. 0 regressions
  from this change.
- Committed `19a9c624`.

File-only, no push/deploy/DB.
