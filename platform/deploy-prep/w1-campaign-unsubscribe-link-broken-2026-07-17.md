# W1 fresh-ground finding + fix: the campaign email footer's "Unsubscribe" link was a dead end — no client could ever opt out through it

Fresh surface this round (`/api/unsubscribe`, `/api/gdpr/export`, `/api/track`, tracing every caller of
`unsubscribeUrl()`/`signUnsubscribeToken()`) — untouched by any other worker tonight.

## The bug

`src/app/api/campaigns/[id]/send/route.ts` (the live route the dashboard "Send Now" button calls — confirmed
via the `[id]/send` vs `send` reconciliation already logged in
`w1-campaign-recipients-tracked-route-orphaned-2026-07-17.md`) builds its `campaign_auto_unsubscribe` footer link as:

```
${APP_URL}/unsubscribe?email=${encodeURIComponent(client.email)}
```

`src/app/unsubscribe/page.tsx` — the page that link lands on — only ever reads a signed `t` token from the query
string (`searchParams.get('t')`). It has **zero** handling for an `email` param. The confirm button is
`disabled={!token || confirming}`, so with no `t` present the button is permanently disabled: the page renders,
but there is no way to click through it. `POST /api/unsubscribe` (the actual opt-out write) requires the same
signed token and would 400 with `{error:'Invalid or expired link'}` even if the client tried to call it directly
without one.

The real signed-token mechanism already exists and is correct — `src/lib/unsubscribe-token.ts`
(`signUnsubscribeToken`/`verifyUnsubscribeToken`/`unsubscribeUrl`, HMAC-SHA256 + `timingSafeEqual`, documented as
intentionally reusable/no-nonce) — but `campaigns/[id]/send/route.ts` never called it. Grepped every caller of
`unsubscribeUrl`/`signUnsubscribeToken` repo-wide: only `src/app/api/unsubscribe/route.ts` (verifying, not
signing) referenced the module at all. Nothing in the live send path ever produced a real token.

## Why this is worse than a cosmetic bug

`campaign_auto_unsubscribe` defaults to `true` (`settings.ts:282`, `selenaConfig.campaign_auto_unsubscribe !== false`)
and is tenant-configurable but on by default — every tenant's marketing emails, out of the box, ship a footer that
says "Unsubscribe" and looks like a working one-click opt-out (the CAN-SPAM/TCPA-motivated feature the comment
above it describes). It has silently never worked for any tenant since the page/token mechanism was built — a
client clicking it gets a permanently-disabled button with no error message explaining why, and no path to
actually stop the emails except replying or contacting the business directly.

SMS opt-out is unaffected — that relies on inbound STOP-keyword handling (`notify.ts:145` references
`sms_consent===false` set via that path), not a link, so this is scoped to the email channel only.

## Fix

Swapped the broken `?email=` link for `unsubscribeUrl(origin, { clientId: client.id, tenantId, channel: 'email' })`
from `src/lib/unsubscribe-token.ts` — the same signed-token constructor already used correctly for the SMS-opt-out
flow's counterpart page. `client.id` and `tenantId` were already in scope at the call site; no new query needed.

New test: `src/app/api/campaigns/[id]/send/route.unsubscribe-link.test.ts` — asserts the sent email's HTML no
longer contains `/unsubscribe?email=`, extracts the `t=` token from the real HTML the route builds, and round-trips
it through `verifyUnsubscribeToken()` to confirm it resolves to the exact `{clientId, tenantId, channel:'email'}`
that was sent. Mutation-verified RED on the pre-fix route (`git apply -R` on the route file alone → fails for the
right reason, old `?email=` string present, no `t=` token in the output) → restored → GREEN.

tsc clean (0 new errors; 2 pre-existing baseline errors elsewhere untouched, unrelated to this file). Full suite:
571/571 files, 3126 passed + 1 expected-fail (unchanged baseline), zero regressions.

File-only change to app code + a new test file — no migration, no DB, no push/deploy. This is a pure logic fix
(no schema change), so nothing to prepare for LEADER to run.

**Files touched:** `src/app/api/campaigns/[id]/send/route.ts` (fixed), new test file (above).
**Files read, not modified:** `src/app/unsubscribe/page.tsx`, `src/lib/unsubscribe-token.ts`,
`src/app/api/unsubscribe/route.ts`, `src/app/api/campaigns/send/route.ts` (the orphaned sibling — its `notify()`
path is dead/uncalled per the earlier finding, so its own missing unsubscribe link isn't reachable and wasn't
touched), `src/app/api/gdpr/export/route.ts` (clean — tenant-scoped, clientId ownership verified before export),
`src/app/api/track/route.ts` (clean — rate-limited both per-IP and per-tenant, no live gap found).
