# `GET /api/webhooks/telegram` diagnostic endpoint — ready-to-apply spec (FOR-JEFF-REVIEW, docs only)

**Worker:** W6 · **Branch:** p1-w6 · **Date:** 2026-07-13
**Status:** read-only source review. No code changed, no DB touched, no live script run.

**Distinct from prior findings on this same route.** `secrets-in-logs-audit.md` already flags this
handler's response body as a **credential-disclosure** finding (`owner_chat_id` + `bot_token_len`
leaked to any unauthenticated caller). `webhook-auth-throttle-guard-spec.md` covers the **POST**
handler's cost-amplification risk (unthrottled agent/LLM calls). Neither prior doc treats the **GET**
handler itself as its own finding — this spec does, because the GET handler isn't just leaking data
passively, it performs a live, unauthenticated, unthrottled *action* every time it's hit.

---

## The gap (verified in source, `platform/src/app/api/webhooks/telegram/route.ts:38-47`)

```ts
export async function GET() {
  if (!BOT_TOKEN) return NextResponse.json({ error: 'BOT_TOKEN missing' })
  if (!OWNER_CHAT_ID) return NextResponse.json({ error: 'OWNER_CHAT_ID missing' })
  const send = await sendTelegram(OWNER_CHAT_ID, `GET diag fired at ${new Date().toISOString()}`)
  return NextResponse.json({
    bot_token_len: BOT_TOKEN.length,
    owner_chat_id: OWNER_CHAT_ID,
    send_result: send,
  })
}
```

This is a leftover manual-diagnostic route (its own reply text is literally `"GET diag fired at
..."`) left live in production with **zero auth, zero rate limit, zero method restriction beyond
Next.js routing itself.** Three separate problems, not one:

1. **Unauthenticated outbound action, not just a read.** Every `GET` call — curl, a browser tab, a
   link crawler, a security scanner walking `/api/*` — makes this route call `sendTelegram()` for
   real, which sends a live Bot API message **to Jeff's own Telegram** (`OWNER_CHAT_ID`). This is an
   annoyance/notification-spam vector today; it becomes a real cost/noise problem the moment this URL
   is discovered by an automated scanner (which routinely enumerate `/api/webhooks/*` looking for
   exactly this pattern) and hit in a loop. No `rateLimit`/`rateLimitDb` call anywhere in this handler.
2. **Credential disclosure** (already flagged in `secrets-in-logs-audit.md`, cross-referenced here for
   completeness, not re-litigated) — `owner_chat_id` is the *exact* value the POST handler's only
   auth gate (`ALLOWED_CHAT_IDS.has(String(chatId))`) trusts. Anyone who calls this `GET` first can
   then forge a POST body with that `chat_id` and pass the sole gate on the owner bot.
3. **No production purpose.** Nothing in-repo calls this route as a health check, cron target, or
   monitoring probe (`grep -rn "webhooks/telegram'" src --include="*.ts"` outside the route/tests
   itself returns no callers). It reads as a debug tool the author hit manually during development
   and never removed or gated behind an env check.

## Why this is worth a dedicated fix, not just folding into the POST-handler guard specs

The two existing telegram guard specs (`webhook-auth-throttle-guard-spec.md`,
`telegram-tenant-webhook-auth-guard-spec.md`) both add a `secret_token`/HMAC gate to the **POST**
path. None of their proposed diffs touch `GET`, because Telegram itself never calls `GET` on a
webhook URL — so a POST-only fix leaves this diagnostic handler exactly as exposed as it is today.
Closing the POST gap does not close this one.

## Proposed fix (ready-to-apply, not applied)

Simplest correct fix: **remove the diagnostic `GET` handler from production entirely.** It has no
caller and no operational purpose; a `curl`-able side-effecting debug route has no reason to exist in
a deployed Next.js route file once the developer is done using it.

```ts
// platform/src/app/api/webhooks/telegram/route.ts — DELETE the GET export entirely.
// If a manual diagnostic is still wanted for local dev, run it as a one-off script
// (node -e '...') or gate it behind a non-production check, never a live route:
//
// export async function GET() {
//   if (process.env.NODE_ENV === 'production') {
//     return NextResponse.json({ error: 'not found' }, { status: 404 })
//   }
//   ... existing diagnostic body ...
// }
```

If Jeff wants to keep a lightweight liveness probe at this path instead of deleting it outright, the
safer replacement is a no-op that proves the route is deployed without leaking secrets or sending a
message:

```ts
export async function GET() {
  return NextResponse.json({ ok: true })
}
```

Either version closes all three problems above: no outbound send, no secret in the body, and (in the
delete-entirely option) no route surface for a scanner to find at all.

## Recommendation

1. **Preferred:** delete the `GET` export. Zero known callers, zero regression risk — verified via
   repo-wide grep above.
2. **If Jeff wants a keepalive/liveness check at this path:** replace with the no-op `{ ok: true }`
   version, not the current diagnostic body.
3. Either fix is a **single-file, few-line change** — no migration, no env var, no coordination with
   other lanes needed. Low-risk enough to land same-window as the POST-side telegram guard specs
   already queued for this route family, but does not block on them (this fix is independent).

**Cross-refs:** `secrets-in-logs-audit.md` (credential-disclosure framing of this same route),
`webhook-auth-throttle-guard-spec.md` Finding 2 (the POST-side fix for the owner bot),
`webhook-rate-limit-coverage.md` (names this route's POST path as unthrottled; this doc is the first
to name the GET path specifically).

Not applied. FOR-JEFF-REVIEW per standing rule — no code changed this pass.
