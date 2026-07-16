# W4 — Item 1 of 17:39 LEADER order: continue sweeping document/comms send routes

Time: 17:39 order, landed ~17:50. File-only, no push/deploy/DB.

## `POST /api/quotes/[id]/send` double-send race

Same bug class as the just-fixed `documents/[id]/send` (97b4f898), found by
sweeping the other "send" routes that dispatch customer email/SMS and flip a
document status: `sms/send`, `campaigns/[id]/send` (already fixed),
`invoices/[id]/send`, `quotes/[id]/send`, `admin/find-cleaner/send`,
`admin/comhub/send`, `admin/message-applicants/send`.

`quotes/[id]/send` read `quote.status` from a plain `SELECT` snapshot, then
dispatched email/SMS, then flipped `quotes.status` to `'sent'` with an
**unconditional** `UPDATE`. Two near-simultaneous calls on a still-draft quote
(double-click "Send", a client retry) both read `'draft'` before either write
landed, both dispatched to the customer, and both hit the "first send only"
pipeline side effects gated on the stale `quote.status === 'draft'` check: a
duplicate `deal_activities` "Proposal sent" note on the deal's timeline, a
duplicate `deals.value_cents`/`last_activity_at` bump, and a duplicate owner
alert email+SMS to the tenant's admins.

Unlike `documents/[id]/send`, this route has a real, intentional "resend"
feature (a rep can click Send again on an already-`'sent'` quote after
editing it), and it also has retry-after-failure semantics — the status is
only supposed to flip to `'sent'` if at least one channel actually sent, so a
misconfigured Resend/Telnyx key doesn't strand the quote as falsely "sent."
Both had to be preserved, so a straight port of the documents fix (claim
before dispatch, no rollback) would have been a silent regression: an admin
retry after a config fix would then fail to send, or a total send failure
would incorrectly lock the quote as `'sent'`.

Fix: gate the atomic claim to the first-send case only (`quote.status ===
'draft'`), claim it atomically **before** dispatch so a losing concurrent
call gets a clean 409 without emailing/texting the customer or double-logging
the pipeline event — then, if the claim-winner's dispatch fails on every
channel, release the claim back to `'draft'` so the existing "fix config,
retry" flow still works. Resends of an already-`'sent'` quote intentionally
skip the claim (same unprotected-by-design resend behavior already accepted
on `invoices/[id]/send` — lower severity since a resend race only risks a
duplicate customer email/SMS, not a duplicate pipeline event, and cost/benefit
doesn't justify blocking a legitimate rapid resend).

`invoices/[id]/send` has the identical unprotected-resend shape but no
"first send" side effects to duplicate (no deal timeline, no owner alert) —
just a possible duplicate customer email on double-click, same class/severity
as the quotes resend case left as-is. Not fixed this round; flagged as
Noticed below.

## Verification

- New test `quotes/[id]/send/route.double-send-race.test.ts`, 4 tests: single
  send flips status + fires the pipeline side effects once; concurrent
  `Promise.all([POST, POST])` race on a draft quote yields exactly one 200 +
  one 409, exactly one `sendEmail` call, exactly one deal-activity insert,
  exactly one owner alert; a total dispatch failure releases the claim back
  to `'draft'` and a subsequent retry succeeds; an explicit resend of an
  already-`'sent'` quote is not gated by the claim (no spurious 409) and does
  not re-fire the first-send-only deal timeline side effects.
- Mutation-tested: reverted `route.ts` only (`git stash` on the route file,
  test file untouched) → the race test fails for the right reason (both
  concurrent calls return 200, `sendEmail` called twice). Restored, all 4
  pass.
- Full `src/app/api/quotes/*` suite: 31/31 passing (10 test files), no
  regressions.
- `npx tsc --noEmit`: clean on changed files. Same 2 pre-existing unrelated
  errors as every prior report this session
  (`bookings/broadcast/route.xss.test.ts`, `sunnyside-clean-nyc/_lib/site-nav.ts`).

## Files touched

- `platform/src/app/api/quotes/[id]/send/route.ts` — atomic first-send claim
  before dispatch, with rollback-on-total-failure (~25 lines net).
- `platform/src/app/api/quotes/[id]/send/route.double-send-race.test.ts` —
  new, 4 tests.

## Noticed (not fixed — advisory)

- `invoices/[id]/send`: same unconditional-status-flip-after-dispatch shape
  as quotes had, but no first-send-only side effects to duplicate — a
  double-click just risks one duplicate customer email/SMS, same
  cost/benefit tier as the quotes resend case left unprotected above. Would
  need the same before-dispatch claim treatment if this is worth closing.
