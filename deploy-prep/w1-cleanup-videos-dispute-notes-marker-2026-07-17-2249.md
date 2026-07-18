# W1 — cron/cleanup-videos: [DISPUTE] notes marker replaced with a dedicated, un-erasable column

**Date:** 2026-07-17 22:49 ET
**Worker:** W1 (schema + backfill lane, tenant_domains)
**Files:** file-only, no push/deploy/DB command run

## Background

Fresh-ground pass for this round. Swept the previously-unaudited cron
routes still outside this session's coverage
(`anthropic-health`, `auto-reply-reviews`, `backup`, `cleanup-videos`,
`cleanup-videos`, `comms-monitor`, `email-monitor`, `finance-post`,
`jefe-heartbeat`, `sync-google-reviews`, `tenant-health`). `finance-post`,
`backup`, and `sync-google-reviews`/`auto-reply-reviews` checked out clean
(idempotent upserts, no unguarded external-send-then-write shape). Found a
real one in `cleanup-videos`: the exact fragile-marker-in-`notes` bug shape
already fixed this session for `[THANKYOU_SENT]` and `[FOLLOWUP_SENT]`, but
with a materially worse failure mode — instead of a duplicate send, this
one silently and unrecoverably deletes payment-dispute video evidence.

## What was broken

`cron/cleanup-videos` runs daily and deletes any `walkthrough_video_url` /
`final_video_url` (plus the underlying Supabase Storage object) once its
`_uploaded_at` timestamp is 30+ days old. The one exemption — per
`admin/docs`'s own documented instructions — was a `[DISPUTE]` substring in
`bookings.notes`: "This allows admins to flag disputed bookings to preserve
video evidence."

`notes` is a plain free-text field in `PUT /api/bookings/[id]`'s allowed
field list, edited via a single textarea on the booking detail page that
PUTs the *entire* field on every save. Any admin editing notes for any
unrelated reason after (or before) flagging a dispute — correcting a typo,
logging a callback, adding a scheduling note — silently overwrites the
whole field and erases the `[DISPUTE]` marker with zero relation to whether
the dispute was resolved. The next daily cron pass then permanently deletes
the walkthrough/final video from Storage with no recovery path. Unlike the
`[THANKYOU_SENT]`/`[FOLLOWUP_SENT]` family (worst case: a duplicate email),
this is unrecoverable data loss of the exact evidence a payment dispute
needs.

There was also no dedicated UI to set the flag — the documented workflow
was literally "type `[DISPUTE]` into the notes box," which is how the
field ends up being a magic string competing with real notes in the first
place.

## Fix

- New migration `2026_07_17_bookings_video_dispute_hold.sql` — adds
  `bookings.video_dispute_hold boolean not null default false`.
- `PUT /api/bookings/[id]/route.ts` — added `video_dispute_hold` to the
  `pick()` allowlist so the new toggle can persist it (same pattern as
  `discount_enabled`).
- `cron/cleanup-videos/route.ts` — now selects `video_dispute_hold` and
  gates deletion on `booking.video_dispute_hold || booking.notes?.includes
  ('[DISPUTE]')`. The column is the source of truth going forward; the
  legacy notes-substring check is kept **only** as backward compatibility
  for bookings already flagged the old way, so nothing already protected
  loses that protection the moment this ships.
- Booking detail page (`dashboard/bookings/[id]/page.tsx`) — added a real
  "Place Dispute Hold" / "Dispute Hold ON" toggle button in the Job Videos
  panel, calling `updateBooking({ video_dispute_hold: !... })` — the same
  `updateBooking` helper the existing discount toggle uses. This is the
  first real UI control for the flag; previously it only existed as
  written instructions to type a magic string into a notes textarea.
- `admin/docs` updated in the 3 places it referenced the old `[DISPUTE]`
  notes-marker workflow (schedule table, feature doc, troubleshooting
  section) to describe the toggle instead, so the docs no longer instruct
  admins toward the mechanism this fix deprecates.

No DB command run — migration is a file for the leader to apply after Jeff
approves, matching every other schema addition this session.

## Verification

- New `route.dispute-hold.test.ts` (5 tests): baseline delete with no
  hold/marker; **regression** — `video_dispute_hold: true` with no notes
  marker is NOT deleted; **regression** — a dispute hold placed via the
  toggle survives an unrelated notes edit (the exact bug this fix closes,
  simulated directly); legacy `[DISPUTE]` notes marker still honored
  (backward compat); recently-uploaded video untouched regardless of hold
  state.
- RED-confirmed: reverted just the `cron/cleanup-videos/route.ts` fix via
  `git apply -R` on the isolated diff and re-ran the new test file — the 2
  regression cases failed exactly as expected (deleted a held video), the
  other 3 baseline cases still passed. Re-applied the diff, all 5 green.
- New regression test in `route.assignables.test.ts` — PUT persists
  `video_dispute_hold` (the field the new toggle actually sends), same
  pattern as the existing `check_in_time`/`check_out_time` allowlist
  regression tests in that file.
- `npx tsc --noEmit`: 0 errors in any file touched this round. Pre-existing
  baseline noise only (stale `.next` admin-auth generated types, known
  pre-existing test-signature mismatches in `cron/outreach`/
  `cron/payment-reminder`, and another worker's untracked
  `sunnyside-clean-nyc/_lib/site-nav.ts`) — none touched this round.
- `npx vitest run` (full suite): 609/609 files, 3267 passed + 1 pre-existing
  expected-fail, 0 regressions.

## tenant_domains schema lane

Reconfirmed intact, no drift — this round's fix is entirely in `bookings`,
outside that table.

## Not touched / flagged for a future round

- **The same read-then-blind-write shape exists between
  `team-portal/video-upload`'s `.update({[field]: url, ...})` and
  `cleanup-videos`'s own per-booking `.update(updates)`.** If a team member
  re-uploads a video for a booking in the exact window between
  cleanup-videos reading that row and writing its null-out update (same
  cron pass, no external I/O in between — a much narrower window than the
  send-then-write races fixed elsewhere this session, which have a slow
  external API call in the gap), the fresh upload's URL could be
  overwritten back to null. Not fixed this round — narrow enough (no
  awaited external call between read and write, unlike the SMS/email
  claim-before-send races) that a CAS guard felt like defending a window
  that's effectively closed already; flagging in case a future pass wants
  to close it anyway for defense in depth.
- **`cron/auto-reply-reviews` / `lib/google-reviews.ts`'s
  `autoReplyReviews()`** — read-unreplied → generate (Anthropic call) →
  post (Google call) → write `reply` locally, with no compare-and-swap
  claim before the two external calls. Looked hard at this one since it's
  structurally the same shape as the claim-before-send races fixed all
  session, but the actual failure mode is materially different: Google's
  review-reply endpoint is a `PUT` (idempotent — the last write simply
  wins, no duplicate customer-visible reply), so an overlapping-invocation
  race here wastes an Anthropic + Google API call per collision rather
  than producing a duplicate/incorrect customer-facing artifact. Given
  the 6-hour cron interval makes a same-review overlap unlikely in
  practice, and the worst case is wasted API spend rather than a
  correctness bug, left unfixed this round rather than force a schema
  change onto a low-severity finding.
