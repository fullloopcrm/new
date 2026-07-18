# comhub voice/dial + voice/control transfer: unrate-limited arbitrary-number outbound calling

**W4, 2026-07-17 23:40. File-only, no push/deploy/DB.**

## Fresh-ground surface

Per the 23:26 LEADER queue item (1), picked up the gap/fluidity checkpoint's
own suggested next candidate: an IDOR sweep of the admin comhub
`contacts/[id]`, `messages/[id]`, `templates/[id]`, `threads/[id]` routes —
explicitly flagged as "not yet checked this session."

## What the IDOR sweep found

Clean. Every `[id]` route (`contacts/[id]/context`, `contacts/[id]/notes`,
`messages/[id]/flag`, `templates/[id]`, `threads/[id]` GET+PATCH) correctly
scopes both the read and the write with `.eq('tenant_id', tenantId)`. Also
re-checked the list/create siblings (`threads`, `templates`,
`search-recipients`, `channels`) — all tenant-scoped, and the two that build
`.or()` filters (`templates` GET, `search-recipients`) already use
`sanitizePostgrestValue` from the earlier postgrest-filter-injection sweep.
No IDOR, no injection. This narrow surface is closed.

## What continuing into the surface found (real bug)

While reading every comhub route file end-to-end for the IDOR pass, went
one directory further into `voice/*` (not part of the original "[id] routes"
ask, but same admin/comhub surface) and found a real, unaudited cost-abuse
gap:

- `POST /api/admin/comhub/voice/dial` places a real, per-minute-billed
  outbound Telnyx PSTN call to `body.admin_phone` — a free-text phone number
  the browser sends (the comhub UI's "ring me at" field, persisted in
  `localStorage`, completely client-controlled). There is **no server-side
  check that it belongs to a tenant member**, and **no rate limit** —
  unlike `comhub/send`'s SMS/email branches, which both call `rateLimitDb`
  before sending.
- `POST /api/admin/comhub/voice/control` with `action: transfer_blind` or
  `transfer_warm` has the identical shape: `payload.target` is an arbitrary
  caller-supplied phone number, dialed/transferred via the tenant's own
  Telnyx account, also with **no rate limit**.

**Impact.** Any authenticated admin session (or a stolen/compromised
`admin_token`, or a scripted client hitting the endpoint directly) can dial
or transfer to an unlimited number of arbitrary phone numbers — including
international/premium-rate numbers — at the tenant's own Telnyx billing
cost, with zero throttle. This is the same "unrated paid third-party
action" class this session already fixed elsewhere (public-checkout-session,
public-upload, waitlist, translate-and-request-automation,
team-portal-running-late SMS) — a bounded but real toll-fraud /
cost-abuse vector that had not been swept for comhub's voice actions
specifically. (The earlier 05:11 voice pass checked these same three
routes for tenant-scoping/IDOR and found them clean on that axis — it
didn't look at the rate-limiting angle, which is a separate bug class.)

**Fix.** Added `rateLimitDb('comhub-voice-dial:<tenantId>', 20, 10 * 60 *
1000)` before the network call in `voice/dial`'s POST, and before the
Telnyx transfer/consult-dial calls in both `voice/control`'s
`transfer_blind` and `transfer_warm` branches. All three share one bucket
key per tenant so switching from dial to transfer can't be used to route
around the limit. `hold`/`unhold`/`mute`/`unmute`/`hangup`/`speak`/`dtmf`
are unaffected — they only act on an already-tenant-verified existing call
and never dial a new arbitrary number, so they don't belong in this bucket.

## Continuation (order item 2)

Grepped the whole repo for every `api.telnyx.com/v2/calls` call site to
check for sibling instances of the same bug. Found exactly 3:
`voice/dial` and `voice/control` (both fixed above), and
`webhooks/telnyx-voice/route.ts`'s `dialRingTarget()`. That third one rings
targets built server-side from the tenant's own registered ring
config/presence (`getRingTargets` — SIP softphone registrations + the
tenant's configured fallback cell phone), not from user/webhook-attacker
input, so it isn't part of this class. Confirms this is a bounded,
2-instance gap, now closed — not a codebase-wide miss.

## Verification

RED/GREEN mutation-verified via `git diff > patch && git apply -R patch`
(revert) then `git apply patch` (restore): 4/4 new rate-limit assertions
failed pre-fix exactly as predicted (200 instead of 429, rate-limit spy
never called with the expected bucket key), all 4 pass post-fix. New test
file `voice/dial/route.test.ts` (2 tests, this route had none before);
extended `voice/control/route.test.ts` with 4 new tests (10 total, up from
6). Full comhub suite: 7 files / 26 tests passing. `npx tsc --noEmit`:
clean except the same 2 pre-existing baseline errors in
`sunnyside-clean-nyc/_lib/site-nav.ts` noted every checkpoint this session.
Full repo suite: 641/643 files, 2264/2268 tests passing — the 2 failures
are the same documented pre-existing ones every checkpoint this session
(`cron/tenant-health`'s self-labeled RED-until-fixed invariant, and
`cron/generate-recurring`'s known flaky race test). Zero regressions.

File-only, no push/deploy/DB.
