# Fixed: neither Telnyx webhook (SMS, voice) had a dedup guard against Telnyx's own documented at-least-once redelivery

**From:** W1, 23:45 order item (1) (fresh-ground surface) + item (2) (continuation).
**Scope:** first audit this session of the inbound-webhook surface (as opposed to cron/*) for the duplicate-send-on-redelivery bug class this session has repeatedly found and fixed across cron jobs.

## Why this surface

Every prior round this session found and fixed the same shape of bug —
check-then-act or send-then-claim with no atomic guard, exploitable by
Vercel's cron-timeout retries — across nearly every `cron/*` route. That
sweep never touched `src/app/api/webhooks/*`, which has an equivalent (in
some ways worse) exposure: Telnyx's own docs
(developers.telnyx.com/docs/messaging/messages/receiving-webhooks,
confirmed via WebSearch this round) state webhooks are retried **up to 3x
per URL** when the endpoint doesn't respond 2xx quickly, with a
`meta.attempt` field on every delivery. Both Telnyx webhook routes in this
codebase do a long, fully sequential chain of awaited Supabase + outbound
Telnyx-API calls per event (AI chatbot round-trips, admin ring-list
dialing) with **zero dedup key** — a slow invocation that misses Telnyx's
response window gets the entire event reprocessed on redelivery.

## Fixed

**`src/app/api/webhooks/telnyx/route.ts`** (`message.received` branch
only — the delivery-status branches `message.sent/delivered/failed` are
plain idempotent UPDATEs and are intentionally not covered, reprocessing
those is harmless). A redelivery today would send a second STOP/START
confirmation SMS, a second rating-reply SMS, a second AI chatbot reply (a
fresh, possibly *different* LLM response), and double-log
`client_sms_messages`/`notifications` rows and booking/client notes — a
live customer-facing duplicate-send.

**`src/app/api/webhooks/telnyx-voice/route.ts`** — worse in shape, not
scoped to one event type since nearly every branch has a real side effect.
`call.initiated` is the most severe: a redelivery re-inserts a **second**
`comhub_active_calls` row for the same call and re-dials the admin ring
list (an admin's phone rings twice for one inbound call). Once a second
row exists, every later event in that call's lifecycle
(`call.answered`/`call.hangup`/`call.recording.saved`/`call.transcription`)
does `.eq('customer_call_id', callControlId).single()` — now ambiguous,
`.single()` throws, silently dropping the rest of the call (no bridge, no
recording, no missed-call SMS). Claimed at the very top of `POST`, before
any event-type branch, rather than scoping to one event as the SMS route
does.

**Fix (both routes):** insert-first-claim on a new shared
`telnyx_webhook_events(event_id text PRIMARY KEY)` table, keyed on the
Telnyx event envelope's `data.id` (a unique event id — confirmed via
WebSearch of Telnyx's docs — distinct from `data.payload.id`, which is the
message/call id and is *reused* across that single message's or call's own
multi-event lifecycle and would wrongly self-collide if used as the dedup
key). `23505` on the claim insert short-circuits as an idempotent no-op
before any side effect runs; any other claim error falls through and
processes anyway (an infra hiccup on the dedup table must not silently
drop a real inbound message/call). Shared table across both routes, not
two separate ones — same event envelope shape, no reason to duplicate.
Migration `2026_07_17_telnyx_webhook_events_dedup.sql` (file-only, not
applied). No backfill needed — brand-new table.

## Self-caught issue during verification

Building the `call.initiated` test surfaced a real problem with my own
test, not the fix: `telnyx-voice/route.ts` reads `TELNYX_API_KEY` from
`process.env` at module-import time, and this worktree's shell environment
has a real key set (58 chars, presumably from `.env.local`). My first draft
of the test didn't mock `fetch`, and the RED-verification run made **live
POST requests to `api.telnyx.com`** with a fake `call_control_id`
(rejected with a real 400 "Invalid Call Control ID" — no telephony action
actually occurred, but it was a genuine unauthorized outbound call using
live credentials from a test run). Fixed by `vi.stubGlobal('fetch', ...)`
in the test file so no test in it can reach the network regardless of
environment state. Flagging this as a standing risk, not fixed beyond my
own test: any *other* test of `telnyx-voice/route.ts` that exercises
`call.initiated`/`call.answered` without mocking `fetch` would have the
same live-call exposure in this environment. Worth a project-level look at
whether `.env.local` should carry a real `TELNYX_API_KEY` at all during
test runs — out of my lane to change unilaterally.

**Verification:** 2 new test files (first-ever coverage for
`telnyx-voice`'s `call.initiated` branch). SMS route:
`route.duplicate-webhook-delivery.test.ts`, 3/3 green, mutation-verified
via `git diff`/`apply -R` on `route.ts` alone (RED for the exact predicted
reason — redelivery processed normally instead of short-circuiting),
restored GREEN, no regression on the file's 2 existing test files (7/7
total). Voice route: `route.duplicate-webhook-delivery.test.ts`, 3/3
green, same mutation-verify discipline (RED confirmed, then re-confirmed
RED again after adding the `fetch` stub to prove the stub itself didn't
mask the bug), restored GREEN, no regression on the file's existing
`route.test.ts` (6/6 total across both files). tsc clean on touched files
(4 pre-existing unrelated baseline errors elsewhere: stale `.next`
admin-auth types, `cron/outreach` + `cron/payment-reminder` pre-existing
test-signature mismatches, untracked `sunnyside-clean-nyc/site-nav.ts` —
none touched by this fix). eslint: 0 new errors/warnings on touched files
(1 pre-existing unrelated warning, `TELNYX_FROM_NUMBER` unused, not
introduced by this fix). Full suite: 615/616 files, 3293 passed + 1
pre-existing expected-fail, **1 unrelated failure** (see below) — net +6
tests, zero regressions from this fix.

## Noticed, not fixed — pre-existing wall-clock-flaky test

`src/app/api/dashboard/route.day-boundary.test.ts` ("counts a booking
starting 5 minutes from now...") failed when the full suite ran at 23:56–
23:57 ET tonight. The test seeds a booking at `nowNaiveET(5 * 60 * 1000)`
and asserts it's always in "today's" jobs/financials — true except in the
last ~5 minutes before ET midnight, when "5 minutes from now" genuinely
falls on tomorrow's ET calendar date and the app's day-boundary logic
*correctly* excludes it. Not a regression from this round (I never touched
`dashboard/*` or booking code) and not the same bug class this session
fixed earlier tonight in 3 *other* test files that seeded via real
`new Date().toISOString()` instead of `nowNaiveET()` — this file already
uses `nowNaiveET()` correctly; the bug is the fixed `+5min` offset itself
being too close to the boundary it's testing. Re-ran standalone a minute
later, same result (still inside the flake window at the time). Left
unfixed — out of this round's queue scope, low severity (test-only, not a
production bug, self-resolves once real time moves past the boundary), but
worth a one-line fix (e.g. offset by 30min instead of 5) if it starts
failing CI runs that happen to land near ET midnight.

## Not yet independently swept

`src/app/api/webhooks/clerk/route.ts` (read: naturally idempotent, no
side effects beyond last-write-wins DB syncs — no dedup needed) and
`src/app/api/webhooks/resend/route.ts` (has existing
`complaint-bounce-suppression` test coverage, not re-audited for this
specific redelivery-dedup class this round). `stripe-platform` and
`stripe` webhooks already carry their own hardened idempotency
(`createTenantFromLead`'s claim-based concurrent-conversion guard,
dedicated `signature-verification-and-idempotency.test.ts` /
`booking-payout-and-deposit-idempotency-race.test.ts`) — read and
confirmed already correct, not touched.
