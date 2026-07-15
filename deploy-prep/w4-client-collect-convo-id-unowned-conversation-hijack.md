# `/api/client/collect` links an attacker-chosen `convo_id` to a self-submitted client with zero ownership/state check — sibling route `/api/portal/collect` does this correctly

Found during LEADER 17:17 broad-hunt order ("continue broad-hunt, lower-risk
surface"). **File-only per LEADER order — no fix applied, findings only.**

## Where

`platform/src/app/api/client/collect/route.ts:192-205` (`POST`, public/unauthenticated —
tenant resolved via `getTenantFromHeaders()` from the signed middleware header;
no Clerk session, no token). `convo_id` is a client-supplied JSON body field,
sourced straight from a URL query param on the public booking pages
(`app/site/book/collect/page.tsx:12`, and the per-tenant clones at
`wash-and-fold-hoboken`, `wash-and-fold-nyc`, `the-florida-maid`):

```ts
// client/collect/route.ts:192-205
if (convo_id) {
  try {
    await tenantDb(tenant.id)
      .from('sms_conversations')
      .update({
        client_id: data.id,
        state: 'form_received',
        updated_at: new Date().toISOString(),
      })
      .eq('id', convo_id)
  } catch (e) {
    console.error('Conversation link error:', e)
  }
}
```

No existence check, no `completed_at` check, no verification the conversation
"belongs" to whoever is submitting this form. `data.id` is the client row this
same request just created/updated from **attacker-supplied** `name`/`email`/
`phone`/`address` — so this single write re-points an arbitrary `sms_conversations`
row (by guessed/leaked UUID) at a client record the caller fully controls.

`tenantDb()` does auto-scope the `.eq('tenant_id', tenantId)` (confirmed in
`lib/tenant-db.ts:44-48` — `update()` always appends the tenant filter), so this
is **same-tenant only**, not cross-tenant like the already-documented
`/api/yinez`/`/api/chat` sessionId-reuse bug
(`w4-selena-yinez-public-chat-conversation-hijack-audit.md`). That's why this is
"lower-risk surface" — but within one tenant, any customer hitting the public
collect form can hijack **any other customer's** SMS conversation on that
tenant, active or already completed.

## Why this is a real gap, not an accepted pattern

The sibling route `/api/portal/collect` — explicitly commented as "Ported from
nycmaid `/api/client/collect`" and solving the exact same funnel step — does
this correctly (`portal/collect/route.ts:251-269`):

```ts
if (convo_id) {
  const { data: convo } = await supabaseAdmin
    .from('sms_conversations')
    .select('*')
    .eq('id', convo_id)
    .eq('tenant_id', tenant.id)
    .is('completed_at', null)   // <-- refuses to touch an already-finished convo
    .single()

  if (convo) {   // <-- only links if the row actually exists / isn't done
    await supabaseAdmin.from('sms_conversations').update({ client_id: data.id, state: 'form_received', ... }).eq('id', convo_id)
    ...
  }
}
```

`client/collect` is missing both guards: it does the blind `UPDATE ... WHERE
id = convo_id` with no prior `SELECT`, so it will happily re-link a conversation
that's already `completed_at`-stamped (a finished booking) or that belongs to a
different customer's still-active thread.

## Impact

An attacker who has (or guesses/observes, e.g. via a forwarded link, browser
history, or a referrer leak from the collect page) another customer's
`sms_conversations.id` can, by submitting the public collect form with their
own attacker-controlled name/phone/email and that `convo_id`:

1. Reassign `client_id` on the victim's conversation to the attacker's own
   client row — any subsequent code that resolves "who is this conversation
   about" via `client_id` (rather than the conversation's own `phone` column)
   now resolves to the attacker.
2. Flip `state` to `'form_received'` on a conversation that may already be
   `completed_at`-stamped, resurrecting/corrupting a finished booking flow.
3. Since `data.id` came from the *same* request's client upsert (attacker-
   supplied fields), this is a data-integrity/identity-confusion primitive on
   another customer's in-progress booking, not just a self-service quirk —
   worst case it misdirects booking/billing context for a real customer's
   conversation toward the attacker's own contact record.

Not brute-forceable at scale (`sms_conversations.id` is `gen_random_uuid()`,
confirmed in `migrations/007_missing_tables.sql:84` — 122 bits of entropy) —
the realistic vector is a leaked/observed UUID (shared link, log line,
referrer header), same caveat as the already-documented yinez/chat finding.

## What I checked

- Confirmed `tenantDb()`'s `update()` always appends `.eq('tenant_id', tenantId)`
  (`lib/tenant-db.ts:44-48`) — so this is same-tenant scoped, not the
  cross-tenant variant already on file for `/api/yinez` / `/api/chat`.
- Confirmed `convo_id` is read from `searchParams.get('convo_id')` on the
  public `/book/collect` page in all 4 site variants that call this route.
- Confirmed the sibling `/api/portal/collect` (same funnel step, same "ported
  from nycmaid" lineage) already does the correct existence + `tenant_id` +
  `completed_at IS NULL` check before writing — this is a same-file-family
  inconsistency, not a novel design question.
- Did not find any rate limit or additional gate that would narrow this beyond
  the route's existing `rateLimitDb('client-collect:...', 3, 10*60*1000)`
  (3 submissions per IP per 10 min — throttles volume, not the single-shot
  hijack of one known `convo_id`).

## Suggested fix (not applied — file-only per LEADER order)

Port the `portal/collect` guard verbatim: `SELECT ... WHERE id = convo_id AND
tenant_id = tenant.id AND completed_at IS NULL` before the `UPDATE`, and skip
the link (log + continue, as the route already does on error) if that select
returns nothing.
