# Error-Message Info-Leak Audit — stack traces / DB internals in responses

**Worker:** W6 · **Branch:** p1-w6 · **Date:** 2026-07-12
**Scope:** Docs-only. Find where error **detail** (Postgres error text, stack traces, internal identifiers)
crosses the trust boundary into a client-visible response. No code or routes changed. Gaps flagged in §4.

---

## TL;DR

- **GAP 1 (widespread): 142 API route files return the raw Supabase/Postgres `error.message` to the client**
  via `return NextResponse.json({ error: error.message }, { status: 500 })`. Postgres error text is verbose and
  schema-revealing — it leaks **table names, column names, unique-constraint names, foreign-key names, RLS
  policy names, and type-coercion details**. That is a free schema map for an attacker probing an endpoint.
- **GAP 2 (root cause): there is no central error-sanitization helper.** Grep across `src/lib` for
  `sanitize/scrubError/safeError/toClientError` returns nothing. Each route hand-rolls its error response, and
  the dominant hand-rolled shape leaks the DB message.
- **GAP 3 (stack traces into a chat channel): both Telegram webhooks concatenate `err.stack` into the reply
  that is sent back to the Telegram chat.** `webhooks/telegram/route.ts:129` and
  `webhooks/telegram/[tenant]/route.ts:131` build `errMsg = \`${err.message}\n${err.stack}\`` and then send
  `\`[agent error] ${errMsg.slice(0,…)}\`` via `sendTelegram(...)`. A framework stack trace (file paths,
  function names, sometimes secret-adjacent values) ends up in the conversation. The "This bot is private"
  gate limits the audience to authorized chats, so severity is **MEDIUM**, not critical — but stack traces in a
  user-facing surface is the wrong default.
- **The safe pattern already exists in the codebase and is under-used.** 123 handlers end an error branch with
  a bare `throw e`. In the Next.js App Router, an uncaught throw in a route handler returns a **generic 500 with
  no stack in the production response body** (the detail is logged server-side; the dev overlay shows more).
  So `throw e` is *safer* than `return { error: error.message }`. The fix direction is to funnel DB failures
  through generic client messages + server-side logging, not to invent new machinery.
- **Inbound side is the opposite direction and looks reasonable:** `api/errors/route.ts` *accepts* a
  client-submitted stack and stores it (a client error-reporting sink), and it is rate-limited (`rateLimitDb`).
  That is ingest, not leak — noted for completeness, not flagged.

**Method note (honesty):** counts come from grep over `src/app/api` (patterns in the appendix). I sampled
concrete lines to confirm the `error.message` values originate from destructured Supabase `{ data, error }`
results (DB errors), and I read both Telegram webhook catch-blocks end-to-end to confirm the stack reaches
`sendTelegram`. I did **not** run the app, so I did not capture a live 500 body — the leak is established by the
source, not by a reproduced response.

---

## 1. GAP 1 — raw Postgres error text returned (142 files)

**The idiom (everywhere):**
```
const { data, error } = await supabaseAdmin.from('clients').insert(...).select().single()
if (error) return NextResponse.json({ error: error.message }, { status: 500 })
```

Examples (first few of 142): `api/clients/route.ts:36,124`, `api/clients/[id]/route.ts:58,90`,
`api/clients/[id]/contacts/route.ts:21`, `api/settings/route.ts:57`, and ~137 more.

**Why it leaks.** `error.message` here is the PostgREST/Postgres message, e.g.:
- `duplicate key value violates unique constraint "clients_tenant_id_email_key"` → reveals table + a business
  uniqueness rule.
- `new row violates row-level security policy for table "tenants"` → reveals RLS is in play and on which table.
- `column "foo" of relation "bar" does not exist` → schema introspection for free.
- `insert or update on table "x" violates foreign key constraint "x_y_fkey"` → relationship map.

None of that should reach an untrusted caller. On **public** endpoints (the `[token]` invoice/quote/document
routes, intake POSTs) the caller is fully untrusted; on authenticated endpoints it is lower-risk but still
unnecessary detail.

**Count basis:** 142 unique files under `src/app/api` return a destructured DB `error.message`
(`error|insertError|updateError|dbError|deleteError|upsertError`). Not every one is on a public endpoint, but
the pattern is uniform enough that it should be fixed centrally rather than per-route.

## 2. GAP 2 — no central sanitizer

There is no `toClientError()` / `respondError()` helper. Consequences:
- Every route re-decides what to expose, and the copy-pasted default exposes the DB message.
- There is no single place to add environment-gating ("verbose in dev, generic in prod") or a **correlation id**
  (return `{ error: 'Internal error', ref: '<uuid>' }`, log the detail server-side against that ref).

**Fix direction (not applied):** add one helper, e.g. `jsonError(status, publicMsg, { cause })` that logs
`cause` server-side and returns only `publicMsg` (+ a ref) to the client; migrate the 142 DB branches to it.
This is a large mechanical change — **flagged for leader/Jeff to schedule**, not done here (out of scope: docs
only, and it edits routes).

## 3. GAP 3 — stack traces echoed into the Telegram reply

`src/app/api/webhooks/telegram/route.ts:129-131`:
```
const errMsg = err instanceof Error ? `${err.message}\n${err.stack?.slice(0, 1500) || ''}` : String(err)
await logEvent('telegram_error', 'Yinez threw', errMsg)        // fine — server log
reply = `[yinez error] ${errMsg.slice(0, 500)}`                 // LEAK — goes into the chat reply
```
`src/app/api/webhooks/telegram/[tenant]/route.ts:131-133` is the same shape (`reply = \`[agent error] …\``),
and both then `await sendTelegram(chatId, reply, …)`. The `[tenant]` route also sends setup errors verbatim:
`sendTelegram(chatId, \`[telegram setup error] ${errMsg}\`)` (line 113) and `convoErr?.message` (line 105).

**Audience:** the bot answers only authorized/private chats ("This bot is private." gate), so the stack goes to
the tenant's own operator rather than the public — **MEDIUM**. Still worth changing: send a generic
`[agent error — logged]` to the chat and keep `errMsg`/stack in `logEvent` only.

## 4. Flagged gaps (summary) — docs only, nothing applied

| # | Gap | Severity | Fix direction |
|---|---|---|---|
| 1 | 142 routes return raw Postgres `error.message` (schema/RLS/constraint leak) | **HIGH** on public endpoints, MEDIUM on authed | Central `jsonError()`; generic msg + server-log + ref |
| 2 | No error-sanitization helper anywhere in `src/lib` | HIGH (root cause) | Add one helper, migrate DB branches |
| 3 | Telegram webhooks echo `err.stack` into the chat reply | MEDIUM (private-bot gate) | Generic chat reply; keep stack in `logEvent` only |
| — | `api/errors` stores client-submitted stacks (inbound sink) | LOW / N-A | Already rate-limited; ingest not leak — noted only |

**Doing well (not gaps):**
- 123 `throw e` sites lean on Next.js's production behavior (generic 500, **no stack in the response body**) —
  this is the correct posture and should be the template the DB branches migrate toward.
- Server-side logging (`logEvent`, `console.error`) already captures the detail, so moving to generic client
  messages loses **no** diagnostic ability — the information just stops crossing the trust boundary.

---

## Appendix — verification commands used

```
grep -rlE 'error: (error|insertError|updateError|dbError|deleteError|upsertError)\.message' src/app/api | sort -u | wc -l   # 142
grep -rn  '\.stack' src/app/api                              # telegram webhooks + errors sink
sed  -n '125,135p' src/app/api/webhooks/telegram/[tenant]/route.ts   # stack -> reply -> sendTelegram
grep -rnE '^\s*throw (e|err|error)\b' src/app/api | wc -l    # 123 safe generic-500 sites
grep -rnE 'sanitiz|scrubError|safeError|toClientError' src/lib       # none — no central sanitizer
```

**Nothing in this audit was applied. No routes or error handlers were modified.**
