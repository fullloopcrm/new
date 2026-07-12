# Error-Response Leakage Audit — stack traces & secret/env values in HTTP responses

**Worker:** W6 · **Branch:** p1-w6 · **Date:** 2026-07-12
**Scope:** Docs-only + the companion regression test (`error-response-leakage.test.ts`). This audit asks a
**narrower, testable** question than the existing schema-leak audit: **do any HTTP error responses embed a
stack trace or a secret env value?** It exists to back the guard test in the queue (task c) so the current good
posture cannot silently regress.

> **Relationship to [`error-info-leak-audit.md`](./error-info-leak-audit.md):** that audit covers the *open,
> higher-volume* problem — 142 routes returning raw Postgres `error.message` (schema/RLS/constraint leak). This
> file does **not** re-litigate that. It covers two **different, currently-clean** leak classes (stack traces,
> secret values) and codifies them as a passing regression guard. Read both together: the schema leak is the
> work still to do; the stack/secret guard is the posture to lock in.

---

## TL;DR

- **Verified clean today (this is the point of the guard):** across **498 `route.ts` files**, **zero** construct
  an HTTP response (`NextResponse.json(...)`, `Response.json(...)`, `new Response(...)`) that embeds `.stack` or
  a `process.env.<secret>` value. Grep for `.stack` on a response-constructor line: **none**. Grep for
  `process.env` on a `NextResponse.json` line: **none**.
- **The three `.stack` references in `src/app/api` are NOT HTTP-response leaks:**
  1. `api/errors/route.ts:61` — `error.stack = stack` is the **inbound** client-error sink *storing* a submitted
     stack. Ingest, not egress. Rate-limited. Not a leak.
  2. `api/webhooks/telegram/route.ts:129` and `api/webhooks/telegram/[tenant]/route.ts:131` — echo `err.stack`
     into the **Telegram chat reply** via `sendTelegram(...)`. That is a **chat message**, not an HTTP response
     body, and it is gated to authorized/private chats. Real, but a **different surface** (MEDIUM) — carried
     from `error-info-leak-audit.md` GAP 3, unchanged here.
- **The safe default is already dominant:** 123 error branches end in a bare `throw e`. In the Next.js App
  Router a thrown error yields a **generic 500 with no stack in the production response body**. So the codebase
  already does not put stacks in HTTP responses — the guard test asserts that stays true.
- **What the guard does NOT claim:** it does not assert responses are free of *schema* detail (Postgres
  `error.message` still leaks — see the other audit). It asserts the strictly narrower, currently-true property:
  **no stack traces, no secret env values, in HTTP response bodies.**

**Method note (honesty):** counts are grep over `platform/src/app/api` (appendix). "Currently clean" is
established from the source, not from a booted server capturing live 500 bodies. The companion test encodes the
same source-level check so it runs in CI on every change.

---

## 1. Leak surfaces enumerated

| # | Surface | Leaks stack? | Leaks secret/env value? | Status |
|---|---|---|---|---|
| 1 | `NextResponse.json({ error }, { status })` bodies (the dominant idiom) | **No** | **No** | Clean re: stack/env. (Schema leak via `error.message` — see other audit.) |
| 2 | `throw e` → framework 500 (123 sites) | **No** (prod body is generic) | No | Correct posture — the template to migrate #1 toward. |
| 3 | `new Response(...)` / `Response.json(...)` streaming/file routes | **No** | **No** | Clean. |
| 4 | Telegram webhook chat reply (`sendTelegram`, 2 files) | **Yes** — `err.stack` | Possible (stack may carry adjacent values) | Chat surface, not HTTP. Private-bot gate → MEDIUM. Fix: generic chat reply, keep stack in `logEvent` only. |
| 5 | `api/errors` inbound sink storing a submitted stack | N/A (ingest) | No | Not a leak. Rate-limited. |

Only **#4** is an actual leak, and it is a chat surface already documented at MEDIUM. **#1–#3 (the HTTP response
surface) are clean for stacks and secrets** — that is exactly what the guard locks in.

## 2. Why "no stack in HTTP response" is currently true

- Route handlers that catch DB errors return `{ error: error.message }` — a **string**, the Postgres message.
  That string is schema-revealing (the open problem) but it is **not** a stack trace and **not** an env value.
- Handlers that don't catch let the error **throw**; Next returns a generic 500. The stack is logged
  server-side, never serialized into the response body in production.
- No handler does `NextResponse.json({ error: e.stack })` or `NextResponse.json({ key: process.env.X })`.
  (If one were added, the companion test goes RED.)

## 3. Fix guidance

| Item | Guidance | Owner |
|---|---|---|
| Keep HTTP responses stack-free & secret-free | The guard test enforces this on every change — no action needed unless it goes RED. | CI (this test) |
| Telegram chat stack echo (#4) | Send a generic `[agent error — logged]` to the chat; retain `err.stack` in `logEvent`/`console.error` only. | Leader-scheduled (route edit) |
| Schema leak via `error.message` (other audit) | Central `jsonError()` helper: generic client msg + `ref` id + server-side log; migrate the 142 DB branches. | Leader-scheduled (large mechanical change) |
| Never build a response body from `process.env.*` | Config/health endpoints must return booleans ("configured": true), never the value. Guard test covers this. | CI (this test) |

## 4. The companion guard test

`platform/src/app/api/error-response-leakage.test.ts` scans every `src/app/api/**/route.ts`, extracts each
HTTP-response construction (balanced-paren argument span of `NextResponse.json(`, `Response.json(`,
`new Response(`), and asserts **no span references `.stack` or a known secret env var**. It is deterministic
(no server boot, no mocking), whole-surface, and goes RED the moment a regression is introduced.

**Honest limits of the guard (documented in the test header too):**
- It is a **static** check over direct response construction. It will not catch a stack routed through an
  intermediate variable (`const b = { error: e.stack }; return NextResponse.json(b)`) or through a helper. That
  indirection does not exist today; if it appears, this guard is not a substitute for the schema-leak
  remediation.
- It intentionally does **not** flag `error.message` (schema leak) — that is the other audit's scope, and
  flagging it here would make the test RED against known-open work.
- The Telegram chat leak (#4) is **out of the test's scope** by design: it is a `sendTelegram` argument, not an
  HTTP response body. The test guards HTTP responses; #4 is tracked as a separate route edit.

---

## Appendix — verification commands used

```
grep -rnE "NextResponse\.json|new Response|Response\.json" src/app/api | grep -i "\.stack"   # NONE
grep -rn "\.stack" src/app/api                                                               # 3: errors sink + 2 telegram chat replies
grep -rnE "NextResponse\.json\(.*process\.env" src/app/api                                   # NONE
grep -rnE '^\s*throw (e|err|error)\b' src/app/api | wc -l                                     # 123 generic-500 sites
find src/app/api -name route.ts | wc -l                                                       # 498
```

**Nothing in this audit was applied. No routes or error handlers were modified. Only the docs + the new test
file were added.**
