# Photo / proof-of-work capture — design (file-only, not wired/run)

Gap flagged at 15:00 (deploy-prep/w4-broad-hunt-2026-07-16-1637-referrer-total-earned-race-plus-checkin-photo-gap.md):
zero photo/proof-of-work capture anywhere in check-in/check-out. Most valuable
for the dumpster/junk/moving archetypes flagged in the 13:01 feature-gap audit
— dumpster placement/pickup proof, junk-removal before/after proof, moving
damage-claim documentation (the #1 real-world moving-industry dispute driver)
— but built GLOBAL per platform/CLAUDE.md, not archetype-gated.

## Schema (PROPOSED, not applied)

`src/lib/migrations/2026_07_16_bookings_photo_proof_columns_PROPOSED.sql`

- `bookings.checkin_photos` / `bookings.checkout_photos` — `jsonb NOT NULL
  DEFAULT '[]'::jsonb`. A jsonb array, not a single `*_url` column, unlike
  `walkthrough_video_url`/`final_video_url` (013_full_parity.sql) — a real job
  needs several photos, not one. Mirrors the existing multi-image precedent
  (`reviews.images jsonb`, 017_review_submission_fields.sql).
- Each array element: `{ url, uploaded_at, lat, lng }`. Per-photo GPS (not
  just reusing the booking-level `check_in_lat/check_in_lng`) because a crew's
  location can drift between check-in and when a specific shot is taken later
  in a long job.
- `booking_append_checkin_photo` / `booking_append_checkout_photo` — atomic
  `jsonb || jsonb_build_array(...)` append RPCs, same reasoning as this
  session's `referrer_bump_total_earned` fix: a plain read-then-write update
  would race if a crew member selects several photos at once and they upload
  in parallel, silently dropping one. Two functions instead of one
  column-name-parameterized function, to avoid any dynamic-SQL identifier
  handling for a two-column case.

## Endpoint (file-only, not wired)

`src/app/api/team-portal/photo-upload/route.ts` — mirrors
`team-portal/video-upload/route.ts`'s structure exactly:

- `GET` — signed upload URL (bypasses Vercel's 4.5MB body limit), booking
  ownership + tenant check, MIME allowlist (jpeg/png/webp/heic/heif — HEIC
  included since it's the native format for iOS camera capture, the
  realistic field-worker device), 15MB cap (vs video's 150MB).
- `POST` — dual flow: JSON body (save reference after a signed-URL upload)
  or legacy FormData (small direct upload). Both append via the atomic RPC,
  not an update.
- Storage-prefix validation on the client-reported URL in the JSON flow —
  same fix class as video-upload/reviews/team-applications this session
  (don't trust an out-of-band-signed URL without checking it's actually
  inside this tenant+booking+type's own prefix).
- `notify()` call reusing the existing `check_in`/`check_out` notification
  types — no new notification type needed.

## Explicitly NOT done this pass (scope was schema + endpoint only)

- No UI wiring (team-portal capture button, admin dashboard photo gallery).
- No admin-side display component for `checkin_photos`/`checkout_photos`.
- Migration not applied; RPCs and columns don't exist yet — the route
  references both and would 500 if called today, but nothing calls it (no
  UI wired), same safe-to-leave-unwired convention as every other PROPOSED
  migration this session.

## Verified

- `npx tsc --noEmit` — clean on the new route file (3 pre-existing unrelated
  errors elsewhere, confirmed present before this change).
- `npx eslint` on the new route file — clean.
- Not run against a live DB; no migration applied; no code wired into any
  UI or existing call site.
