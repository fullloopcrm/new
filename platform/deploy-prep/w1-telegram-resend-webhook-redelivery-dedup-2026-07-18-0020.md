# Fixed: none of the 3 Telegram webhooks nor the Resend webhook had a dedup guard against their provider's own documented at-least-once redelivery

**From:** W1, 00:06 order item (1) (fresh-ground surface) + item (2) (continuation).
**Scope:** continues the inbound-webhook redelivery-dedup sweep started last
round on Telnyx (`w1-telnyx-webhook-redelivery-dedup-2026-07-17-2358.md`) —
this round covers the remaining webhook surfaces: all 3 Telegram routes and
the previously-flagged-but-unaudited Resend route.

## Why this surface

Last round's Telnyx doc explicitly listed `src/app/api/webhooks/resend/route.ts`
as "not re-audited for this specific redelivery-dedup class this round." The
3 Telegram routes (`telegram/route.ts` owner bot, `telegram/jefe/route.ts`
platform-GM bot, `telegram/[tenant]/route.ts` per-tenant bots) weren't
mentioned at all — a genuinely fresh corner. `find src/app/api/webhooks -type f`
showed exactly these plus clerk/stripe/stripe-platform/telnyx, all already
ruled clean or fixed.

## Fixed — Telegram (item 1)

All 3 routes await a full AI-agent round-trip (`askSelena`/`askJefe`, which
can include Anthropic tool calls) before responding 200, with zero dedup key.
Telegram's own webhook docs (core.telegram.org/bots/webhooks, confirmed via
WebSearch this round) + a corroborating real-world GitHub issue
(`openclaw/openclaw#71392`, "webhook handler holds 200 ack until middleware
completes — causes Telegram-side delivery timeouts on slow turns") confirm:
if the endpoint doesn't respond 200 within a few seconds, Telegram resends
the SAME update (identical `update_id`), starting quickly and backing off to
a few minutes, until it gets a 200.

A redelivery today re-runs the whole handler: a second inbound/outbound
`sms_conversation_messages` row, a second (possibly *different*, since it's a
fresh LLM call) agent reply, and a second real `sendTelegram()` send.

**Worse on `telegram/jefe/route.ts`:** Jefe (the platform GM agent) has
confirm-gated action tools — `notify_tenant_owner` (real SMS/email to a
tenant owner), `send_tenant_message` (real in-platform post), `rerun_cron`
(re-fires a background job) — see `src/lib/jefe/agent.ts` /
`src/lib/jefe/actions.ts`. The confirm flow is two conversational turns: Jeff
sees a preview, then sends a plain "yes" as a *separate* message to trigger
the `confirm=true` call. If **that confirm message** is the one Telegram
redelivers, the `confirm=true` tool call — a real SMS/email, a real cron
re-fire — runs **twice**. Nothing downstream of the webhook route dedupes
this; the confirm gate is single-turn-only by design (Jeff typing "yes" twice
*on purpose* is expected to double-fire, so the guard has to live at the
webhook layer, not inside the tool).

**Fix (all 3 routes):** insert-first-claim on a new shared
`telegram_webhook_updates(dedup_key text PRIMARY KEY)` table, keyed on
Telegram's own `update_id`, scoped per bot as `${botKey}:${update_id}` —
`'owner'`, `'jefe'`, or `` `tenant:${tenant.id}` `` — since `update_id` is
only unique *within one bot token's own sequence*: the owner bot, Jefe's
bot, and every tenant's own bot each have an independently-numbered
sequence that would collide on a bare `update_id` alone (verified with a
dedicated test: same `update_id` number for two different tenants both
process normally, not treated as a duplicate). Single text column (not a
composite PK) to match `telnyx_webhook_events.event_id`'s shape and avoid
adding composite-unique-constraint support to the test fake for one call
site. `23505` short-circuits as an idempotent no-op before the agent (or any
tool it calls) ever runs; any other claim error falls through and processes
anyway. Migration `2026_07_18_telegram_webhook_updates_dedup.sql`, file-only,
not applied. No backfill — brand-new table.

**Self-caught issue during verification:** adding `supabaseAdmin` to
`telegram/jefe/route.ts` (it never imported it before) meant its existing
`route.auth.test.ts` would have made a **real network call** to the
placeholder Supabase URL on its "accepts" test case, since that file never
had a reason to mock `@/lib/supabase`. Same class of self-introduced live-call
risk flagged in last round's Telnyx doc, caught before running the suite
rather than after. Fixed by adding the mock to that test file.

## Fixed — Resend (item 2, continuation of the same webhook sweep)

Resend delivers webhooks via Svix (confirmed by this route's own
`verifySvix()` call and its `svix-id`/`svix-timestamp`/`svix-signature`
headers). Svix's own retry docs (docs.svix.com/retries, confirmed via
WebSearch) document a retry schedule — immediately, 5s, 5min, 30min, 2h, 5h,
10h, 10h — on any non-2xx or slow (>15s) response, and Svix's own
idempotency guidance is to dedupe on the `svix-id` header, which stays
constant across retries of the same logical event.

This route has **no `maxDuration` override** (unlike most other
webhook/cron routes fixed this session) and its top-level `catch` always
returns 200, so the realistic redelivery trigger isn't an app error — it's
missing Svix's 15s window on a cold start or a slow
`resolveTenantIdForInboundEmail`/DB round-trip.

Two branches weren't idempotent on redelivery: `email.received`
unconditionally inserts a **new** `inbound_emails` row with zero dedup key
at all — a redelivery creates a duplicate email in the admin inbox, a real
item an admin could see and act on twice. `email.complained`/`email.bounced`'s
`clients.email_marketing_opt_out` UPDATE is idempotent (setting `true` twice
is harmless), but the `marketing_opt_out_log` INSERT isn't — a redelivery
writes a second audit row that misleadingly looks like a second, independent
complaint/bounce event for the same client. The remaining
`email.delivered`/`email.opened`/`email.bounced`'s `campaign_recipients`
status UPDATE + aggregate recount are naturally idempotent re-derived state
— reprocessing those is harmless, same class as Telnyx's
`message.sent/delivered/failed` branches.

**Fix:** insert-first-claim on a new `resend_webhook_events(event_id text
PRIMARY KEY)` table, keyed on the `svix-id` header. Claimed once, before any
`type` branch (same shape as `telnyx-voice`'s whole-handler claim — simpler
than scoping to only the 2 unsafe branches, harmless no-op overhead on the
already-idempotent ones). `23505` short-circuits as an idempotent no-op; any
other claim error falls through. Migration
`2026_07_18_resend_webhook_events_dedup.sql`, file-only, not applied. No
backfill — brand-new table.

## Verification

**Telegram:** 10 new tests across 3 first-ever duplicate-delivery test files
(owner: 3, jefe: 3, tenant: 4 — the tenant file also proves per-tenant
`update_id` scoping with a same-number-different-tenant case). Mutation-
verified via `git diff`/`apply -R` isolated to each `route.ts` alone — all 3
RED for the exact predicted reason (redelivery processed normally instead of
short-circuiting), restored GREEN. No regression on the 4 existing
Telegram auth/diag test files (12 tests). Caught and fixed one of my own
test-authoring bugs first (passed a function instead of a `Promise` for
`params` in the per-tenant cross-tenant test — surfaced as `askSelena` called
once instead of twice; traced to the route silently treating it as an
unknown-tenant skip, not a dedup failure, before fixing the test itself).

**Resend:** 4 new tests in a first-ever duplicate-delivery test file.
Mutation-verified the same way — both the `email.received` and
`email.complained` cases RED for the exact predicted reason, restored GREEN.
No regression on the existing `complaint-bounce-suppression` test file (its
requests never set `svix-id`, so the best-effort dedup guard correctly no-ops
for it).

tsc clean on touched files (same 5 pre-existing unrelated baseline errors
as every round this session: stale `.next` admin-auth types, cron/outreach +
cron/payment-reminder pre-existing test-signature mismatches, untracked
`sunnyside-clean-nyc/site-nav.ts` — none touched by this fix). eslint 0 new
errors/warnings on touched files. Full suite 620/620 files, 3308 passed + 1
pre-existing expected-fail, **zero regressions** (net +14 tests across both
fixes). No wall-clock-flake repeat this round (last round's
`dashboard/route.day-boundary.test.ts` flake near ET midnight didn't
recur — run happened well outside that window).

## Not yet independently swept

`webhooks/clerk/route.ts` — still read-only-idempotent-by-design (last-write-wins
DB syncs, no side effects beyond that), not re-checked this round since
nothing changed there. `webhooks/stripe`/`stripe-platform` — already hardened
with their own dedicated idempotency tests, confirmed again by exclusion (no
change needed, not touched). Every route under `src/app/api/webhooks/*` has
now been either fixed or explicitly ruled clean for the redelivery-dedup
class across this round and last round's Telnyx pass — this sweep is
complete for the webhook surface as it exists today.

## tenant_domains schema lane

Reconfirmed intact, untouched this round — this round's fixes are all
webhook-layer dedup tables (`telegram_webhook_updates`, `resend_webhook_events`),
outside `tenant_domains`.

File-only, no push/deploy/DB run this round.
