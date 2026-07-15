# Unauthenticated cross-tenant conversation hijack in the public Selena/Yinez chat widgets

Found during LEADER 23:48 broad-hunt order ("continuing broad-hunt, fresh
area"). File-only, no fixes applied — findings only, per standing rules.

## Summary

`POST /api/yinez` and `POST /api/chat` both accept a client-supplied
`sessionId`/`sessionId`-equivalent (`sessionId` field in the JSON body) and,
if present, **reuse it as the `conversationId` for the AI agent with zero
verification that the conversation belongs to the caller's tenant (or to any
tenant at all)**. This is the exact same bug class already fixed in
`fix(security): close cross-tenant IDOR in /api/admin-chat sessionId`
(commit `e8052fb1`) — but neither of these two public, **unauthenticated**
sibling endpoints received the same fix. `/api/yinez` is strictly worse than
the admin-chat bug was: admin-chat required an authenticated staffer
(`settings.view`); `/api/yinez` requires **no authentication of any kind** —
it's listed as a public route in `src/middleware.ts:147`.

`src/lib/selena/agent.ts`'s `resolveTenantForConversation()` (line 159-172)
derives the AI agent's entire tenant context — Anthropic API key, business
config/persona, client PII, booking checklist, full SMS/web message
history — **purely from the `sms_conversations` row's `tenant_id`**, looked
up by `conversationId` alone:

```ts
async function resolveTenantForConversation(conversationId: string): Promise<string> {
  const { data } = await supabaseAdmin
    .from('sms_conversations')
    .select('tenant_id')
    .eq('id', conversationId)
    .single()
  const tid = (data as { tenant_id?: string } | null)?.tenant_id
  if (tid) return tid
  ...
}
```

Any caller who supplies a real `sms_conversations.id` UUID belonging to
**any tenant's customer** gets the agent to run as if it *were* that tenant
— using that tenant's own Anthropic key (billing/quota abuse), reading that
customer's name/phone/address/booking checklist/message history into the
LLM context, and returning an AI-generated reply built from that context
directly in the HTTP response. The agent's tool-calling layer
(`src/lib/selena/tools.ts`) then also writes (client creation, booking
checklist updates, deal/booking mutations) against that resolved tenant —
so a hijacked conversation isn't just readable, it's mutable.

## Two vulnerable entry points

### 1. `POST /api/yinez` (`src/app/api/yinez/route.ts`) — fully unauthenticated

```ts
const { message, sessionId, phone } = await req.json()
...
let conversationId = sessionId
if (!conversationId) { /* tenant-header-verified create path */ }
// else: conversationId = sessionId, used AS-IS, no ownership check at all
await supabaseAdmin.from('sms_conversation_messages').insert({ conversation_id: conversationId, ... })
const result = await askSelena('web', message, conversationId, phone || undefined)
...
return NextResponse.json({ reply, sessionId: conversationId, quickReplies: [] })
```

- `src/middleware.ts:147` lists `/api/yinez(.*)` as a public route — no
  Clerk session required.
- The *new*-conversation path (no `sessionId` supplied) does correctly
  verify `x-tenant-id`/`x-tenant-sig` (`verifyTenantHeaderSig`) before
  tagging `tenant_id` — that part is fine.
- The *reuse* path (`sessionId` supplied) does **no tenant check whatsoever**
  — not even the signed-header check used elsewhere in the same file.
- `route.isolation.test.ts` and `route.test.ts` (existing test coverage)
  only exercise the no-`sessionId` create path; neither test sends a
  `sessionId` at all, so this gap has zero regression coverage.
- No frontend page in this repo currently calls `/api/yinez` (the three
  `chat-with-yinez` pages are dead `redirect('/')` stubs) — but the route is
  live in production per the middleware public-route list, so it's reachable
  directly (`curl -X POST https://<any-host>/api/yinez -d '{"message":"hi","sessionId":"<any sms_conversations.id>"}'`)
  regardless of what the UI links to.

### 2. `POST /api/chat` (`src/app/api/chat/route.ts`) — tenant header verified, but sessionId ownership is not

```ts
const headerTenantId = req.headers.get('x-tenant-id')
const sig = req.headers.get('x-tenant-sig')
if (!headerTenantId || !verifyTenantHeaderSig(headerTenantId, sig)) { ...400... }
const tenantId = headerTenantId   // correctly verified

let conversationId = sessionId    // client-supplied, NOT checked against tenantId
...
if (isNycMaid(tenantId)) {
  const yz = await askYinez('web', message, conversationId, phone || undefined)
  // askYinez = agent.ts's askSelena → resolveTenantForConversation() re-derives
  // the tenant from conversationId, IGNORING the verified header tenantId.
} else {
  const result = await askSelena(tenantId, 'web', message, conversationId, phone || undefined)
  // legacy engine: passes tenantId explicitly for Anthropic key/config, but
  // loadChecklist()/updateChecklist() in selena-legacy.ts (lines 307-333)
  // read/write sms_conversations by `conversationId` alone — no tenant_id
  // filter — so a foreign conversationId still leaks/mutates another
  // tenant's booking_checklist under the CALLER's own tenant's AI config.
}
```

This route does the right thing for the *create* path (signed header,
`tenant_id` stamped on insert) but never verifies that a *reused*
`sessionId` is actually one of `tenantId`'s own conversations before handing
it to either agent. Concretely:

- **nycmaid path**: a visitor to nycmaid's own site can pass any other
  tenant's `sms_conversations.id` and the Yinez agent will silently switch
  to running as that foreign tenant end-to-end (their Anthropic key, their
  persona, their client data) — same mechanism as `/api/yinez` above, just
  gated behind "attacker's own verified tenant is nycmaid."
- **legacy path** (every non-nycmaid tenant): the agent still runs with the
  *caller's own* tenant's Anthropic key/business config, but
  `loadChecklist`/`updateChecklist` read and overwrite the **foreign**
  tenant's `sms_conversations.booking_checklist` (name, address, phone,
  service details, recap state) with zero tenant filter — a cross-tenant
  read of another business's customer's in-progress booking, and a
  cross-tenant write that can corrupt or hijack that customer's real booking
  flow (e.g. push it to `recap`/`confirmed` from an attacker's messages,
  which will collide with the real customer's next legitimate SMS/web
  reply).
- No test file exists for `/api/chat/route.ts` at all (confirmed: no
  `route.test.ts` / `*.test.ts` in `src/app/api/chat/`).

## Contrast with the already-fixed sibling (`/api/admin-chat`)

`e8052fb1` fixed the identical pattern for `/api/admin-chat` by adding an
ownership check before reuse:

```ts
if (sessionId) {
  const { data: owned } = await supabaseAdmin
    .from('sms_conversations')
    .select('id')
    .eq('id', sessionId)
    .eq('tenant_id', tenant.tenantId)
    .maybeSingle()
  if (!owned) sessionId = ''
}
```

The same shape of fix (verify `.eq('id', sessionId).eq('tenant_id', tenantId)`
before reuse; treat as `''`/falsy and fall through to the existing
lookup-or-create flow otherwise) is the natural remediation for both
`/api/yinez` and `/api/chat` — `/api/chat` already has a verified `tenantId`
in scope to check against; `/api/yinez` would need the same
`x-tenant-id`/`x-tenant-sig` verification extended to the reuse path (it's
already present for the create path in the same file, so this is a
same-file, same-mechanism gap, not a new capability).

## Severity

- **`/api/yinez`**: unauthenticated, cross-tenant, read (PII: client name,
  phone, address, booking details, full message transcript, via the AI
  reply and via prompt-injectable transcript recall) + write (message
  insert, and via agent tool-calls: client creation, booking/deal
  mutation) + resource abuse (burns the victim tenant's own Anthropic
  spend). Requires knowing/guessing a `sms_conversations.id` UUID — not
  brute-forceable at scale, but no secret/token gates it at all, unlike
  every comparable public-token flow in this codebase (`quotes/public/[token]`,
  `invoices/public/[token]`, `documents/public/[token]`, `cpa/[token]`),
  which all use a dedicated, purpose-built token column rather than the
  primary key of an internal table.
- **`/api/chat`**: same impact, gated behind either (a) being nycmaid's own
  site visitor (Yinez path) or (b) any tenant's site visitor for the legacy
  checklist-corruption variant, which needs no `isNycMaid` gate at all.

## Not touched

File-only per standing rules — no code changes made. Flagging for
leader/Jeff to decide whether to port the `e8052fb1` fix pattern to these
two routes now or schedule it.
