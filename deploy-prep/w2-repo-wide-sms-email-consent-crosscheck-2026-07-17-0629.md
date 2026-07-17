# W2 gap/fluidity refresh — 2026-07-17 06:29

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). No master file (per W4's confirmed pattern) — continues directly from `w2-post-job-followup-confirmations-payment-followup-daily-consent-gap-2026-07-17-0615.md`.

Leader's fresh 3-deep queue this round: (1) continue archetype depth, (2) run the repo-wide `sendSMS(`/`sendEmail(`-vs-consent-gate cross-check flagged as the next fresh-ground candidate (gap #22, prior round), (3) keep gap/fluidity current. All 3 done — see below.

## Fresh ground (real bugs) — repo-wide cross-check, 2 more call sites of the missing-consent-check bug class, the 17th and 18th this session

Grepped every `sendSMS(`/`sendEmail(` call site across `src/app/api` and `src/lib` (~90 files) and checked each client-facing one against the established `sms_consent`/`do_not_service` gate convention. Most were already covered (prior rounds) or out of scope by design — team/cleaner-facing sends (`cron/late-check-in`, `cron/daily-summary`, `cron/phone-fixup`, `webhooks/stripe`'s team payout SMS), admin-manual 1:1 tools with documented no-consent-filtering intent (`sms/send`, `admin/comhub/send`, `admin/invites`), transactional auth codes (`client/send-code`, `portal/auth`, `pin-reset` — all deliver a code the recipient is actively requesting right now, not a business notification), lead-capture/contact-form replies (a brand-new submitter has no consent row yet), and reactive live-conversation continuations (`admin/selena`, `selena` reset-flow, `webhooks/telnyx` inbound replies — not treated as this bug class, same reasoning session applied to inbound SMS handling all along). `document_signers` sends (`documents/[id]/send`, `documents/public/[token]/sign`) are the already-flagged separate ambiguity (gap #21, needs Jeff's call on GDPR/consent model for that table) — not re-litigated here.

Two real, previously-unaudited gaps surfaced:

1. **`POST /api/client/confirm/[token]`** — the one-tap "terms accepted" SMS a client gets after tapping their own booking-confirmation link. This one is worse in kind than every prior find: the code called `sendSMS(client.phone, ..., { skipConsent: true, ... })` — an **explicit** bypass, not just an omitted check. `lib/nycmaid/sms.ts`'s own built-in consent check (gated on `recipientType`/`recipientId`, and only covers `sms_consent`, never `do_not_service`) was deliberately skipped here with no recipient info passed either. A STOP-revoked or banned client tapping their own confirm link still got texted "Got it — terms accepted."
2. **`GET/POST /api/email/monitor`** (IMAP-parsed Zelle/Venmo payment confirmations) — its `matchPaymentToBooking()` helper has 3 independent match branches (by `payment_sender_name`, by `client.name`, and an amount-fallback), and the client "Got your payment... thank you! 😊" SMS that follows a match never checked consent on any of the 3. This is the direct sibling of `webhooks/stripe`'s Stripe-checkout payment-confirmation SMS, which already gates correctly on `client.sms_consent !== false && !client.do_not_service` — this IMAP-forwarded-payment path (a different way the same "payment received" event reaches the system) just never got the same treatment.

**Fixed**: `client/confirm/[token]` now selects `sms_consent, do_not_service` on the joined client and gates the send the same as every other client fan-out this session (kept `skipConsent: true` on the call itself, since the route does its own explicit gate rather than delegating to the lib's partial one — the lib's check doesn't cover `do_not_service` anyway). `email/monitor`'s `MatchResult` now carries `clientSmsConsent`/`clientDoNotService` from all 3 match branches, threaded through to the send-site gate.

9 new tests across 2 files (4 in `client/confirm/[token]`, 4 in `email/monitor`, following the sibling-file mock conventions already established in each route's existing test suite), mutation-verified via a combined `git apply -R`/`git apply` round-trip on both fixes together — all 4 BLOCKED assertions failed for the right reason on revert (unconsented client got texted), CONTROL/null-consent assertions stayed correct throughout revert and reapply.

`npx tsc --noEmit`: clean. `eslint` on all touched files: 0 errors, only pre-existing warnings unrelated to these lines. Full suite: 539 files (was 537), 2422 tests total (was 2414) — 2384 passed + 37 skipped, 1 failed (`finance-export.test.ts`'s 200k-row pagination test timed out under full-suite parallel load — confirmed unrelated: passes clean in isolation, not touched by this round's changes, pre-existing flakiness).

No DB migration needed — `sms_consent`/`do_not_service` both already exist on `clients`.

## Archetype depth

Added `sim-all-trades.ts` section 5a-29, same pattern as every prior round. Covers both fixes' exact column-selection shapes against real `bookings`/`clients` rows in the live schema: `client/confirm/[token]`'s join (identical shape to 5a-28's, already proven) and, newly, `email/monitor`'s 3 distinct shapes — two bookings→clients joins that omit `name` (never proven in this file before) and one **direct `clients`-table select with no booking join at all** (branch 2, matching by `client.name` — also never proven before). **Not yet executed** — `sim-all-trades.ts` is leader-run-only (touches live prod Supabase, blocked by local hook for workers); flagging for the leader to run alongside prior rounds' still-outstanding checks. Verified statically: `tsc --noEmit` clean, `eslint` clean (0 errors, same pre-existing warnings, none from the new section).

## NOTICED — not fixed, flagging for the leader/Jeff

All carried forward unchanged from the prior round's list (`w2-post-job-followup-confirmations-payment-followup-daily-consent-gap-2026-07-17-0615.md`), items 1-9, plus one new observation from this round's cross-check:

10. **New**: the cross-check surfaced two live-conversation "recovery" SMS sends (`admin/selena`'s expired-conversation reset, and the public `selena` route's equivalent) that bypass consent the same way `client/confirm/[token]` did — but these fire in direct reply to a client who is *actively texting in right now*, not as an automated notification against a stored client record with no live signal. Treating these as a different category (not this bug class) rather than fixing unilaterally; flagging in case the leader/Jeff wants a ruling on whether "client just texted us" should itself count as implied consent to reply, independent of `sms_consent`/`do_not_service`.

## MISSING-FEATURE GAPS

All carried forward unchanged from the prior round's list, items 1-26 (see prior doc for full detail). Item 22 updated:

22. **Same missing-`sms_consent`-check pattern across client-facing SMS/email send sites** — now 18 real sites closed across this session. The repo-wide cross-check this round (grepping every `sendSMS(`/`sendEmail(` call site in `src/app/api` + `src/lib`) found exactly 2 more genuine gaps and confirmed no others remain among client-facing automated sends — the previously-claimed candidate list is now believed exhaustive for this specific bug shape (automated/cron/webhook sends against a resolved `clients` row). Remaining 3 sites (`invoices/send`, `quotes/send`, `portal/collect`) still need Jeff's call (product classification, unchanged). Structural-fix proposal (moving the check into `notify()` itself) still awaits Jeff's sign-off.

## UX-FRICTION

Carried forward unchanged from the prior round's list.

File-only, no push/deploy/DB. 3 commits this round (1× `fix`+test, 1× `test(sim)`, 1× `docs`).
