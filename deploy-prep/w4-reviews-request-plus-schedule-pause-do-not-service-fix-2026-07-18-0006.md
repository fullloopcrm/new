# reviews/request + schedules/[id]/pause: missing do_not_service/sms_consent gates

W4, 2026-07-18 00:06. File-only, no push/deploy/DB.

## Context

Prior session closed the push-notification `do_not_service` gap in
`cron/reminders`, `team-portal/running-late`, and `team-portal/checkout`
(committed `3b16fcb5` this session as part of closing out the 23:59 LEADER
order). The 23:55 gap/fluidity checkpoint flagged "the direct `sendEmail(`/
`sendSMS(` call-site pool outside booking-lifecycle/campaigns/crons" as a
next-target candidate. Swept that pool (`grep -rl "sendSMS(\|sendEmail("
src/app/api`, ~55 files) against the established `do_not_service`/
`sms_consent` gating pattern (`notify.ts`'s own doc comment: `do_not_service`
is a stronger, channel-agnostic kill-switch than `sms_consent`, which only
blocks SMS).

## Fresh ground (item 1): `reviews/request/route.ts`

Admin-triggered "request a review" action (`reviews.request` permission)
sent a real client email + SMS with **zero** consent check at all — not
`sms_consent`, not `do_not_service`. Its cron sibling, `cron/rating-prompt`,
is already safe because it routes through `sendClientSMS()` /
`getClientContacts()` (`lib/nycmaid/client-contacts.ts`), both of which
already treat `do_not_service` as an absolute gate. This manual endpoint
bypasses that helper entirely and calls `sendEmail`/`sendSMS` directly.

Fix: added `sms_consent, do_not_service` to the client select; gated email
send on `!do_not_service`, gated SMS send on `sms_consent !== false &&
!do_not_service` — matching `notify.ts`'s exact precedent.

New test: `route.do-not-service.test.ts` (3 tests: DNS-flagged → neither
channel; SMS-opted-out → email only; normal client → both).

## Continuation (item 2): `schedules/[id]/pause/route.ts`

Same surface, sibling gap. Pausing a recurring schedule cancels in-window
bookings and texts the client "your recurring service is paused" — with
zero `sms_consent`/`do_not_service` check. This is booking-lifecycle-adjacent
(cancellation notification) and matches the exact class already fixed
elsewhere in the booking pipeline (`14fa0888`).

Fix: added `sms_consent, do_not_service` to the `clients(...)` embed on the
schedule select; gated the SMS send.

Note: this file already carries a stale-looking comment about a naive-ET
cutoff bug ("missed here") — checked git log, that bug was already fixed by
commit `102c5822`; the comment documents the historical fix, not a live gap.
Left untouched.

New test: `route.do-not-service.test.ts` (3 tests: DNS-flagged → no SMS;
SMS-opted-out → no SMS; normal client → SMS sent). This route's existing
`route.naive-et-boundary.test.ts` uses the shared `fake-supabase` helper,
which does **not** support PostgREST embed/join syntax (`.select('*,
clients(...)')` just returns the raw row, no nested `clients`) — so that
test's booking-cancel assertions never actually exercised the client-SMS
branch (client was always `undefined` there). Wrote a small hand-rolled
chain mock for this test file instead, storing the joined `clients` object
inline on the seed row (same trick used by the `running-late`/`checkout`
do-not-service tests), since the mock's `.select()` string is never parsed
by either helper — it's the seed data shape that determines what a `.single()`
resolves to.

## Checked, not fixed — flagged as a product question

`invoices/[id]/send`, `quotes/[id]/send`, `documents/[id]/send`: all three
send email/SMS to `contact_email`/`contact_phone` fields the admin can
override per-request (`body.to_email`/`body.to_phone`), not necessarily the
current `clients` row. These are financial/legal documents an admin
explicitly, deliberately sends to a specific address they typed or picked —
a materially different shape than an automated lifecycle nudge firing as a
side effect of another action. Gating these on `do_not_service` risks
silently blocking a legitimate invoice/quote/contract delivery a client is
financially/legally owed. Not forced; flagging for a product decision
(same class as the carried-forward `admin_phone`/transfer whitelisting
item from the 23:55 checkpoint).

`admin/find-cleaner/send`: broadcasts a job-opportunity SMS to **cleaners**
(team members), not clients — `do_not_service` is a client-only concept.
Confirmed clean, no change.

## Verification

RED/GREEN mutation-verified for both fixes independently (`git diff` +
`git apply -R`, not stash): `reviews/request` — 2/3 assertions failed
pre-fix, 3/3 pass post-fix. `schedules/[id]/pause` — 2/3 assertions failed
pre-fix, 3/3 pass post-fix. `tsc --noEmit`: clean except the 2 documented
pre-existing baseline errors in `sunnyside-clean-nyc/_lib/site-nav.ts`
(untracked file, unrelated, noted every checkpoint this session). Full
repo suite: see commit message / gap-fluidity checkpoint for the run
captured at commit time.

No push/deploy/DB this pass.
