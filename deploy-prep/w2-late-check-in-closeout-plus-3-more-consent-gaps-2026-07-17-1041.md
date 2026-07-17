# W2 gap/fluidity refresh — 2026-07-17 10:41

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). No master file (per W4's confirmed pattern) — continues directly from `w2-team-sms-consent-gap-2026-07-17-1030.md`.

Leader's fresh 3-deep queue this round: (1) close out cron/late-check-in's 2 remaining sms_consent instances, (2) continue fresh-ground hunting, (3) keep gap/fluidity current.

## (1) Closed out cron/late-check-in — the open thread from last round

Last round flagged `src/app/api/cron/late-check-in/route.ts` as having 2 more unfixed instances of the team_members.sms_consent bug class (late check-in team SMS, late check-out team SMS), left as an open thread to keep that round's diff reviewable. Fixed both this round: added `sms_consent` to both bookings→team_members joins, gated both team-facing sends on `sms_consent !== false` (admin-facing sends in the same route are untouched — only the team text is guarded). 2 new tests (`route.sms-consent-guard.test.ts`), mutation-verified — both BLOCKED cases revert to RED with the fix reverted, restored GREEN with it reapplied.

This closes the instance count for last round's fresh-ground bug class (raw `sendSMS()` to a team member never checking `team_members.sms_consent`) to zero — **except see below, which reopens it.**

## (2) Fresh-ground hunting — same bug class had 3 more live instances outside the audited set

Re-swept every `sendSMS(...)` call site whose recipient is a team member, this time including routes outside the original "7 sites + late-check-in" list the prior two rounds enumerated. Found 3 more real, unfixed instances:

1. **`POST /api/bookings`** — the PRIMARY admin-facing booking-create path every non-project tenant uses. The "Team member assignment SMS" fired on `team_members.phone` presence alone; the client confirmation SMS one field above it already gated on `sms_consent`. This route already has its own `route.sms-consent-guard.test.ts` covering the *client* leg (fresh-ground find from an earlier round) — that test file's own RPC mock never embedded a `team_members` row with a phone, so the team-side gap never fired in-test and slipped past. New test file (`route.team-sms-consent-guard.test.ts`) extends the RPC mock to embed `team_members` too.
2. **`GET /api/cron/confirmations`** — the hourly team confirm-request resend (jobs in the next 48h, resent every 55+ min until confirmed). This route's own `route.sms-consent-guard.test.ts` (client day-before leg) explicitly documents scoping this block OUT: *"the team-member confirm-request block already has its own terminated-crew guard ... and is untouched by this fix"* — it had a terminated-crew guard but no consent guard, and got left open across at least one prior round. A crew member who revoked consent got hourly resends for up to 48 hours.
3. **`GET /api/cron/daily-summary`** — the 3-day team lookahead SMS ("here are your next 3 days of jobs"). Email/in-app fan-out for the same loop iteration is untouched (deliberately — those are separate consent surfaces); only the SMS leg was gated.

**Consequence:** same shape as every other instance of this bug class — a crew member's own SMS opt-out (`team_members.sms_consent`, the crew-portal-editable column) had zero effect on 3 more real send paths, including one (`cron/confirmations`) capable of firing hourly for up to 2 days per unconfirmed booking.

**Fix:** all 3 now gate on `sms_consent !== false`, matching the invariant applied everywhere else in this class. `BookingUnconfirmed.team_members` (shared type in `lib/types.ts`) widened from `TeamMemberNamePhone` to `TeamMemberNamePhoneConsent` to carry the field through `cron/confirmations`' typed `.returns<>()` call. 3 new tests total (1 per site), mutation-verified the same way as every prior round in this class — each BLOCKED case reverts to RED (a real SMS sent) with its fix reverted, restored GREEN with it reapplied.

**Confirmed NOT this bug class (checked, ruled out this round):**
- `webhooks/stripe.ts`'s team-member payout-notification SMS — already gates on `tm.sms_consent !== false` (line 537).
- `client/reschedule/[id]/route.ts`'s stale-assignment team-member notify — routes through the shared `lib/notify-team-member.ts` helper (one of the two NOTICED-#23 duplicate dispatchers from last round), which already gates on `sms_consent` internally.
- `team-portal/running-late/route.ts` — sends only to admin and client (both already gated on their respective consent), no team-member-recipient SMS leg exists in this route; the crew member is the one *triggering* the action, not a recipient.
- `webhooks/telnyx.ts` — this file IS the STOP/START opt-in/opt-out handler; not a candidate for the same class (it manages consent, doesn't need to check it before an outbound send in the same sense).
- `client/book/route.ts` — only sends client-side SMS; no team-member SMS leg in this route (assignment SMS on this path, if any, would go through the shared `find-cleaner` broadcast/assignment routes already fixed).

**Scope note:** this closes every `sendSMS()`-to-team-member call site found across two full sweeps (last round's systematic pass + this round's wider re-pass). No further open threads on this specific bug class as of this round.

## Verification this round

- `npx tsc --noEmit` clean (repo-wide, all touched files + `lib/types.ts`).
- Full suite for every touched route directory: all passing, zero regressions (`cron/late-check-in`, `bookings`, `cron/confirmations`, `cron/daily-summary`).
- All 4 fixes mutation-verified individually (sed/cp revert the single guard clause, confirm the BLOCKED test goes RED for the right reason — a real SMS call with the blocked phone number — then restore and confirm GREEN).
- 3 commits this round (late-check-in closeout + 2 tests; bookings/route.ts fresh-ground fix + 1 test; confirmations+daily-summary fresh-ground fixes + 2 tests + types.ts widen).

## NOTICED — not fixed, flagging for the leader/Jeff

Carried forward unchanged from the prior round (items 1-23, including #23's duplicate `notify-team-member.ts`/`notify-team.ts` dispatcher consolidation call — still untouched, still a product/cleanup decision not a bug).

No new NOTICED items this round — the open thread from last round (#22) is now closed by section (1) above.

## MISSING-FEATURE GAPS

Carried forward unchanged from the prior round's list, items 1-26.

## UX-FRICTION

Carried forward unchanged from the prior round's list.

File-only, no push/deploy/DB write from this worker. 3 code commits this round (late-check-in closeout + 2 tests, bookings/route.ts fresh-ground fix + 1 test, confirmations+daily-summary fresh-ground fixes + 2 tests) + 1 docs commit.
