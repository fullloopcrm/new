# W4 — public `/api/chat` + `/api/yinez` message-length cap (2026-07-18 07:56)

## Where this came from

Direct continuation of the 07:47 checkpoint's own "next-target candidates"
list: the AI cost-abuse class (rate-limit-without-size-cap) had just been
closed on `ai/chat` and `ai/assistant`, both of which require an
authenticated tenant caller. This pass checked the two fully **public,
unauthenticated** web-chat-widget siblings — `/api/chat` (per-tenant,
resolved via signed `x-tenant-id` header) and `/api/yinez` (nyc-maid's own
widget, same shape) — for the identical gap.

## Finding

Both routes:
- Rate-limit call **volume** only: `rateLimitDb(..., 20, 60 * 1000)` — 20
  requests/min per tenant+IP.
- Never capped the **size** of the `message` field before forwarding it,
  unbounded, into a paid Anthropic call (`askSelena`/`askYinez` →
  `anthropic.messages.create`).
- Also insert the raw message into `sms_conversation_messages` on every
  call, so oversized messages compound as unbounded DB growth too.
- Being fully unauthenticated (anyone who can load the tenant's public
  marketing site can hit these), the practical exposure is worse than the
  authenticated `ai/chat`/`ai/assistant` gap just closed: no login, no rate
  limit trip needed below 20/min, and message history re-sent on every
  turn compounds the per-request token cost as a conversation continues.

This is exactly the shape `ai/chat`route.ts's own comment names as "the
documented convention" (`admin/translate`'s `MAX_TEXT_LENGTH`) — it had
just never been ported to these two public siblings.

## Fix

Added the same `MAX_MESSAGE_LENGTH = 4000` cap (matching `ai/chat`,
`ai/assistant`, `admin/translate`) to both routes, checked immediately
after the existing `typeof message !== 'string'` guard and before any
DB/rate-limit/Anthropic work:

- `platform/src/app/api/chat/route.ts`
- `platform/src/app/api/yinez/route.ts`

Oversized messages now get a `400` with `Message too long — max 4000
characters` instead of reaching the rate limiter or Anthropic at all.

## Verification

- New regression tests: `route.message-length-cap.test.ts` in both
  `api/chat/` and `api/yinez/`, mirroring the existing
  `ai/chat`/`ai/assistant` test pattern (mock the Anthropic-calling
  function, assert a >4000-char message gets 400 with zero calls, assert a
  normal message still gets 200 with exactly one call).
- `npx tsc --noEmit --pretty false`: 0 new errors (same 2 pre-existing
  unrelated `sunnyside-clean-nyc` MarketingNav/Footer errors carried
  forward every pass, untouched by this change).
- Directory-scoped: `npx vitest run src/app/api/chat/ src/app/api/yinez/`
  — 9 files, 21/21 tests pass (17 pre-existing + 4 new).
- Full suite: `npx vitest run` (run from `platform/`, not the repo root —
  confirmed the local vitest/jsdom resolve correctly from there) — 702/703
  files, 2462/2465 tests pass, 1 pre-existing expected-fail
  (`cron/tenant-health/status-coverage-divergence.test.ts`, documented
  aging item, untouched this pass), 0 regressions.
- `git status` re-checked before commit: only the 2 route files + 2 new
  test files staged and committed (`153af166`). No push/deploy/DB.

## Aging items

No new aging items opened. Carrying forward the unchanged list from the
07:47 checkpoint (create-tenant-from-lead atomic-claim migration,
referrers atomic-bump migrations, clients dedup unique indexes, and the
rest — see that checkpoint for the full list; not re-litigated here).

## Next-target candidates if continuing fresh-ground hunting

- The AI cost-abuse class (rate-limit-without-size-cap) now looks closed
  across `admin/translate`, `ai/chat`, `ai/assistant`, `/api/chat`,
  `/api/yinez`. `admin/selena`, `selena/route.ts`, and `selena/metrics`
  were checked this pass too — none of them call Anthropic directly (they
  read/reset conversation state only), so they're not in this class.
- The `team-portal/*` staff-facing cap-asymmetry read carried from the
  07:22/07:47 checkpoints is still open — worth a dedicated pass.
