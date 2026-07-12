# `/api/sms` conversation-ownership guard spec [NOT APPLIED]

**Author:** W6 · **Date:** 2026-07-12 · **File:**
`platform/src/app/api/sms/route.ts`
**Status:** proposal + witness test only. No route edited (route edits are
outside this lane's standing charter — flagging per rule, same posture as
every other `[NOT APPLIED]` guard spec in this directory).

## Context

W4's IDOR scan (`deploy-prep/idor-scan-note.md`, p1-w4, unmerged into
`p1-w6`) flagged `GET /api/sms?conversation_id` as "P1: guarded-but-fragile
(ownership check runs AFTER msg fetch, only blocks return)". That's real —
confirmed by reading the route below — but reading the full file for this
spec surfaced a **second, more serious** gap in the same file that wasn't in
that scan: `POST /api/sms` performs **no ownership check at all** when the
caller supplies `conversation_id` directly in the body. This spec covers
both, ranked by severity.

## Finding 1 (HIGH, new this session): `POST /api/sms` — no ownership check on caller-supplied `conversation_id`

```ts
// platform/src/app/api/sms/route.ts:64-121 (abridged)
export async function POST(request: NextRequest) {
  const { tenantId } = await getTenantForRequest()
  const { conversation_id, client_id, message } = await request.json()
  let convoId = conversation_id
  if (!convoId) {
    // ... only THIS branch looks up/creates a conversation scoped to tenantId
  }
  // convoId falls straight through to here if the caller supplied one —
  // NO check that convoId belongs to tenantId:
  await supabaseAdmin.from('sms_conversation_messages').insert({
    conversation_id: convoId, direction: 'outbound', message,
  })
  await supabaseAdmin.from('sms_conversations').update({ last_message_at: now }).eq('id', convoId)
```

Any tenant-authenticated caller can supply an **arbitrary `conversation_id`**
belonging to a different tenant. The route:
1. Inserts a fabricated `outbound` message row into the victim tenant's
   `sms_conversation_messages` — a real cross-tenant **write**, not just a
   read leak. The victim's operator dashboard/SMS thread now shows a message
   that was never actually sent to their client.
2. Updates `last_message_at` on the victim's `sms_conversations` row —
   pollutes their conversation ordering/recency.
3. `client_id` (used for the *actual* Telnyx send at line ~156-171) is
   correctly `.eq('tenant_id', tenantId)`-scoped to the caller's own tenant,
   so the real SMS is delivered to the caller's own client, not the victim's
   — this is **not** a message-interception or send-hijack bug. It's a
   **conversation-record injection** bug: the caller's own message gets
   written into someone else's conversation, silently, with no error.

Blast radius: any tenant operator (normal authenticated dashboard user, not
an admin) can inject fabricated messages into another tenant's SMS history
purely by guessing/enumerating a `conversation_id` (UUID — not guessable by
brute force, but obtainable via any prior cross-tenant leak, log line, or
`GET /api/sms?conversation_id` response from Finding 2, or simply by having
been a prior owner of that conversation ID space in a multi-tenant test/demo
environment).

## Finding 2 (P1, per W4's idor-scan-note.md, re-verified): `GET /api/sms?conversation_id` — check-after-fetch

```ts
// platform/src/app/api/sms/route.ts:14-38
if (conversationId) {
  const { data: messages } = await supabaseAdmin
    .from('sms_conversation_messages')
    .select('*')
    .eq('conversation_id', conversationId)   // <- unscoped fetch happens FIRST
    .order('created_at', { ascending: true })

  const { data: convo } = await supabaseAdmin
    .from('sms_conversations')
    .select('id').eq('id', conversationId).eq('tenant_id', tenantId).single()

  if (!convo) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  return NextResponse.json({ messages: messages || [] })
}
```

Re-verified: the ownership check (`convo` lookup) DOES gate the return —
`messages` is never sent in the response when `!convo`, so **there is no
live leak today**. The fragility is real, not cosmetic: (a) it does a wasted
cross-tenant DB read of another tenant's SMS transcript before deciding
whether the caller is allowed to see it, which is the wrong order for a
service-role query with no RLS backstop (`sms_conversation_messages` has no
tenant_id column at all per W2's finding in the channel — see
"Cross-references"); (b) any future edit that reorders these two blocks, adds
a log line between them, or short-circuits the response before the `if
(!convo)` check silently reintroduces a real cross-tenant read leak with no
test currently pinning the correct order.

## Fix (not applied — spec only)

### Finding 1 fix
Whenever `conversation_id` is supplied in the POST body, verify ownership
before using it — mirror the same pattern the `!convoId` branch already
uses for client-derived conversations:

```ts
let convoId = conversation_id
if (convoId) {
  const { data: owned } = await supabaseAdmin
    .from('sms_conversations')
    .select('id')
    .eq('id', convoId)
    .eq('tenant_id', tenantId)
    .single()
  if (!owned) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  }
} else {
  // existing lookup-or-create branch, unchanged
}
```
Fail closed (404, matching the GET route's existing convention) rather than
silently falling through to the lookup-or-create branch — a caller who
supplies a bogus/foreign `conversation_id` should not get a NEW conversation
silently substituted either, since that could mask the attempted injection
from the caller without alerting anyone.

### Finding 2 fix
Reorder: run the ownership check first, fetch messages only after it passes.
```ts
if (conversationId) {
  const { data: convo } = await supabaseAdmin
    .from('sms_conversations')
    .select('id').eq('id', conversationId).eq('tenant_id', tenantId).single()
  if (!convo) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  }
  const { data: messages } = await supabaseAdmin
    .from('sms_conversation_messages')
    .select('*').eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
  return NextResponse.json({ messages: messages || [] })
}
```
No behavior change for legitimate callers (same 404 on mismatch, same 200
shape on success) — purely a check-before-fetch reorder plus one fewer query
on the unauthorized path.

Both fixes reuse the existing `sms_conversations.tenant_id`-scoped lookup
pattern already present in this same file — no new dependency, no schema
change, no migration.

## Cross-references

- `deploy-prep/idor-scan-note.md` (p1-w4, unmerged) — original source of
  Finding 2 as "P1 guarded-but-fragile"; this spec re-verifies it and adds
  Finding 1 (POST, not covered by that scan) plus concrete fixes for both.
- Channel note (W2, 21:05): `sms_conversation_messages` has **no
  `tenant_id` column at all** — every row is implicitly scoped only via its
  `conversation_id` FK to `sms_conversations`, which IS tenant-scoped. This
  is exactly why Finding 1's injected row is a real cross-tenant write with
  no secondary tenant check to catch it — `sms_conversation_messages` has no
  independent tenant boundary of its own, so `sms_conversations` ownership
  is the *entire* guard, and Finding 1 shows the POST path skips it.
- `deploy-prep/admin-webhook-idor-audit.md` (W6, this branch) — same "every
  by-id read/write must pair with `.eq(tenant_id)`" discipline applied
  across the admin/webhook surface; this spec applies the identical
  discipline to `/api/sms`.

## Verification

Added `platform/src/app/api/sms/conversation-ownership.witness.test.ts` —
drives the real `POST` handler against a recording Supabase stub and proves
Finding 1 exists today: a foreign `conversation_id` in the request body gets
a message inserted against it with no ownership check, `200`/`201` response,
no error. Expected to flip red the moment the fix above lands — that flip is
the fix signal, mirrors the shape of
`finance-expenses-mass-assignment.witness.test.ts`. `tsc --noEmit` clean;
witness test passes (documents current gap, does not fail the build).
