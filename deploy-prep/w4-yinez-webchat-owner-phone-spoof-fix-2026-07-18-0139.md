# Unauthenticated owner-tool takeover via self-reported `phone` on the public Yinez web-chat endpoints

W4, 2026-07-18 01:39. File-only, no push/deploy/DB.

## Context

Per the 01:30 LEADER order item 1 (new fresh-ground surface). Audited the
Selena/Yinez agent files never opened this session
(`src/lib/selena/agent-config.ts`, `agent-config-loader.ts`, `build-playbook.ts`,
`prompt-assembler.ts`, `persona-file.ts`, `metrics.ts` — all clean, scaffolding
not yet wired into the live agent, or read-only tenant-scoped). Then re-checked
`src/lib/selena/tools.ts` for the FK-ownership-guard class the LEADER's 01:30
message described (the `selena-legacy-handlers.ts` fix) — that class is already
comprehensively covered there (`idInTenant()` guards every cross-tenant FK
write: `handleAssignCleaner`, `handleCreateManualBooking`, `handleUpdateBooking`,
`handleCreateDeal`, `handleBlockCleanerDates`, `handleScoreCleaners`). Not fresh
ground.

Continuing into `src/lib/selena/agent.ts` itself (the dispatcher `tools.ts`
bridges to) surfaced a different, more severe bug in the SAME trust boundary
the LEADER's order was pointing at: the identity check gating owner-only tools
never verifies the identity is real.

## Bug

`isOwnerOfTenant(phone, tenantId)` (`agent.ts:186`) is the ONLY gate — both the
system-prompt hint in `loadContext` ("You are talking to the business owner.
Use admin tools freely.") and the hard server-side check in `tools.ts:81`
(`runTool`'s owner-only-tool refusal) — deciding whether a caller gets
`get_revenue`, `approve_refund`, **`process_stripe_refund`**, `mark_payout_paid`,
`send_broadcast` (SMS to every client/cleaner), `block_client`, `update_setting`,
`trigger_cron`, `seo_status`, and more. It works by comparing the caller's
`phone` against the tenant's `owner_phone` column.

On the SMS channel (`api/webhooks/telnyx/route.ts`) that `phone` is the
Telnyx-signature-verified carrier sender (`payload.from.phone_number`) — a
caller cannot forge it. On Telegram (`api/webhooks/telegram/route.ts` +
`[tenant]/route.ts`) it's `requireAdmin()`-gated and the phone is a
server-derived constant, never request input. Same for the two internal admin
routes that also call `askSelena` (`admin-chat/route.ts`,
`admin/comhub/yinez/send/route.ts` — both `requireAdmin()`/`requirePermission()`
gated, phone comes from `OWNER_PHONES` env, not the request body).

But TWO live, fully public, **unauthenticated** routes exist for the exact same
agent: `POST /api/chat` and `POST /api/yinez` — the web-chat-widget endpoints
embedded on every tenant's own marketing site. Both destructure `phone` straight
out of the raw, unauthenticated JSON body and pass it verbatim into
`askYinez(...)` / `askSelena(...)`, which thread it into `loadContext()` and
`runTool()` exactly like a verified SMS sender:

```ts
// api/chat/route.ts (before fix)
const { message, sessionId, phone, tenantId: bodyTenantId } = await req.json()
...
const yz = await askYinez('web', message, conversationId, phone || undefined)
```

```ts
// api/yinez/route.ts (before fix)
const { message, sessionId, phone } = await req.json()
...
const result = await askSelena('web', message, conversationId, phone || undefined)
```

**Any anonymous visitor to a tenant's own public site could open the chat
widget, send one message with `phone` set to that tenant's registered
`owner_phone`, and the agent would treat them as the verified business owner** —
no SMS possession proof, no session, no OTP, nothing. From there a single
conversation could walk the model into calling `process_stripe_refund` (moves
real money), `send_broadcast` (spam every client/cleaner's phone), `get_revenue`
/ `get_outstanding_payments` (financial data disclosure), `update_setting`,
`trigger_cron`, or `block_client` — all server-side-enforced admin actions, not
just prompt-level suggestion. `owner_phone` is not necessarily secret (personal
cell numbers leak via public records, prior correspondence, social engineering,
or simply being told to a competitor/disgruntled ex-employee), and the endpoint
had **no brute-force friction beyond the existing per-tenant+IP rate limit**
(20 req/min) — a targeted guess against a known number costs one request.

## Fix

In both `api/chat/route.ts` and `api/yinez/route.ts`: before the caller-supplied
`phone` is ever forwarded to the agent, check it against `isOwnerOfTenant()`
(now exported from `agent.ts`, reusing the exact same comparison the agent
itself would make) for the request's verified tenant. If it matches, the phone
is stripped to `undefined` before reaching `askYinez`/`askSelena` — the
conversation proceeds as an unidentified visitor instead of a spoofed owner.
Non-owner phones are unaffected (still used for the existing, already-hardened
exact-match returning-client lookup).

`/api/chat` always has a verified tenant (400s otherwise), so the check always
runs when a phone is present. `/api/yinez` tolerates an unverified tenant
(anonymous fallback path, pre-existing behavior) — the check only runs when
`reqTenantId` is verified, matching how the rest of that route already treats
an unverified tenant as "no tenant-scoped action taken" (no client-linking, no
`tenant_id` stamp). Did not add a `getCurrentTenantId()` fallback for the
unverified case — that function depends on host/cookie context not available
in this route's existing "proceed anonymously" branch, and pulling it in would
add a new failure mode (throw) to a path that today never fails. This leaves a
narrower residual edge (unverified-tenant request whose new conversation later
defaults to nycmaid inside `resolveTenantForConversation`) — same shape as an
existing, separate, already-narrow gap, not introduced by this fix; noted below
as an aging item rather than blocking this fix.

## Verification

Two new test files:
- `api/chat/route.owner-phone-spoof.test.ts` — 2 tests: a caller claiming the
  owner's phone does NOT reach the agent with that phone; a normal phone still
  passes through unchanged.
- `api/yinez/route.owner-phone-spoof.test.ts` — same 2 tests for the sibling
  route.

Both new tests import a mocked `isOwnerOfTenant` that replicates the real
matching logic (last-10-digit compare) to prove the strip actually fires on a
match and is a no-op otherwise.

Had to update 4 pre-existing test files that mock `@/lib/selena/agent` with
only `{ askSelena }` — since the fix now also imports `isOwnerOfTenant` from
that module, the existing mocks would leave it `undefined` and throw on any
test that supplies a phone: `chat/route.phone-match.test.ts`,
`chat/route.msg-tenant-tag.test.ts`, `yinez/route.msg-tenant-tag.test.ts`,
`yinez/route.isolation.test.ts`, `yinez/route.test.ts`. Added
`isOwnerOfTenant: vi.fn(async () => false)` to each mock (matches real
non-owner-phone behavior, doesn't change what those tests are proving).

`npx vitest run src/app/api/chat src/app/api/yinez`: 7 files, 17 tests, all
pass. `npx tsc --noEmit`: clean except the 2 pre-existing baseline errors in
`sunnyside-clean-nyc/_lib/site-nav.ts` (untracked, unrelated, present before
this session).

## Aging items opened by this pass

- The residual unverified-tenant edge on `/api/yinez` noted above (narrow: no
  verified tenant header AND the resulting new conversation later resolves to
  nycmaid's default tenant AND the attacker specifically targets nycmaid's
  `owner_phone`) — lower priority than the fixed path since it requires
  omitting the tenant header entirely, unlike normal widget traffic.
- Broader, separate, larger question NOT fixed this pass: the same
  unauthenticated `phone` field also establishes **client** identity (via the
  already-hardened exact-match lookup in both routes) for `CLIENT_TOOLS`
  (`reschedule_booking`, `cancel_booking`, `resend_confirmation`,
  `update_account`, etc.) — an attacker who knows a *specific* real client's
  phone number (not just the one owner number) could still open the web widget
  and act on that client's booking/account without SMS possession. Lower
  severity than the owner-tool bypass (bounded to one known client at a time,
  vs. every owner-gated tool across the whole tenant) and the prior session's
  IDOR-fix authors were already aware the endpoint is unauthenticated for this
  purpose (see the "short/garbage phone must never resolve to an arbitrary
  client" comments in both routes) — but full closure needs a "verified vs.
  self-reported phone" flag threaded through `agent.ts`/`tools.ts` across all
  ~11 `askSelena` call sites, a bigger architectural change than fits a
  file-only worker pass. Flagging for Jeff's call, same disposition as the
  0844 indirect-prompt-injection finding on this same file.

No push/deploy/DB this pass.
