# W4 broad-hunt: /api/sms conversation_id FK-injection

Scope: fresh area per LEADER order (continuing broad-hunt after committing
prior session's pending fixes). Did NOT touch referrers, referral-commissions,
or team-PIN routes (`team-portal/auth`, `admin/users/[id]/pin`).

## Fixed

**`src/app/api/sms/route.ts` POST — client-supplied `conversation_id` trusted
with no tenant-ownership check before insert.**

`getTenantForRequest()` proves the caller is *some* authenticated member of
*some* tenant — the route then reads `client_id`/`conversation_id` straight
from the request body. When `conversation_id` was omitted, the "find or
create" branch was correctly tenant-scoped (`.eq('tenant_id', tenantId)`).
But when a caller supplied `conversation_id` directly, it was used as-is:

```ts
let convoId = conversation_id
if (!convoId) { /* tenant-scoped lookup/create */ }
// convoId used directly below with NO ownership check
await supabaseAdmin.from('sms_conversation_messages').insert({ conversation_id: convoId, ... })
await supabaseAdmin.from('sms_conversations').update({ last_message_at: now }).eq('id', convoId)
```

Any authenticated tenant member (any role — this route has no
`requirePermission` gate at all, same as `connect/*` and `attribution/*`,
which I did NOT flag since there's no analogous `Permission` defined for
either) could supply another tenant's `conversation_id` and:
- insert an arbitrary "outbound" message row into that tenant's SMS thread
  (visible in the victim tenant's dashboard conversation history), and
- bump that victim conversation's `last_message_at`.

Same bug class as the finance FK-injection ownership checks (409cd020) and
the cpa-tokens foreign `entity_id` fix (ae527e02) — a client-supplied ID
that references another table gets used in a write with no ownership
re-verification. Sibling of the already-fixed selena convoId IDOR
(722ed11d) referenced in `route.cross-tenant.test.ts`, which only locked
down the **GET** path — this is the **POST** path, not covered by that test.

Fix: when `conversation_id` is supplied, verify
`sms_conversations.id = conversation_id AND tenant_id = <caller tenant> AND
client_id = <supplied client_id>` before using it; 404 if not found.

Verified:
- `npx tsc --noEmit` — clean.
- New `src/app/api/sms/route.post-cross-tenant.test.ts` — negative (foreign
  conversation_id → 404, zero inserts/updates) + positive control (own
  conversation_id → 201, message inserted). 2/2 pass.
- Existing `src/app/api/sms/route.cross-tenant.test.ts` (GET-path regression
  lock) still passes — 2/2.

## Reviewed, no issue found

- `invoices/public/[token]/*` (view + Stripe checkout): token-scoped lookups,
  response redacted to an explicit allowlist, Stripe errors never surfaced
  to the public caller.
- `jobs/[id]/{payments,sessions,sessions/[sessionId]}`: all
  `requirePermission`-gated, foreign `crew_id`/`team_member_id`/`assignee_ids`
  re-verified against tenant before use, session ownership double-checked
  against both tenant AND parent job (`loadOwnedSession`).
- `reviews/{submit,upload,request,route,[id]}`: public submit/upload both
  rate-limited (DB-backed) with MIME/size allowlists; admin-side
  request/list/update all `requirePermission`-gated.
- `contact/route.ts`: rate-limited, tenant resolved from host, no
  cross-tenant write paths.
- `pin-reset/route.ts`: already hardened in a prior pass (ILIKE-escaped
  lookup + fail-closed rate limits on both send and verify steps) — operates
  on `tenant_members` (operator PIN), not the excluded team-PIN flow.
- `availability/route.ts`: public by design, tenant resolved from an
  explicit slug/id param, no writes.
- `attribution/{route,manual/route}`, `connect/{messages,channels,unread}`:
  tenant-scoped via `getTenantForRequest()`, no permission gate exists for
  these features in `lib/rbac.ts` (no analog to port), and no client-supplied
  foreign-id writes — noted but not treated as a bug since there's nothing to
  gate against.
- `sms/send/route.ts` (separate admin-triggered manual SMS): already
  `requirePermission('campaigns.send')`-gated, no client-supplied ids.

## Not touched (per LEADER order)

`referrers/**`, `referral-commissions/**`, `team-portal/auth/**`,
`admin/users/[id]/pin/**`.
