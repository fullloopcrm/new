# Design note — fail-closed check-and-insert webhook dedupe helper

**Status:** design only. No handler is wired up in this pass (W6, 2026-07-12,
branch `p1-w6`). Pairs with the migration file
`platform/src/lib/migrations/2026_07_12_processed_webhook_events.sql` and the
findings in `deploy-prep/webhook-idempotency-audit.md` (finding #3).

## Problem

`telnyx` (`message.received`), all three `telegram/*` routes, and `resend`
(`email.received`) do side-effecting work — run AI agents, send outbound
SMS/Telegram, insert rows — **without deduping on the provider's event id.**
Providers retry on any slow/failed/non-2xx response, so a normal-operation
redelivery re-runs the agent and re-sends messages (real money, customer-facing
duplicates). The delivery-status branches are already effectively idempotent
(blind updates keyed by message id); only the *inbound* branches are exposed.

## Helper shape

A single helper that every non-idempotent handler calls **once, at the top of
the branch, before any side effect**:

```ts
// platform/src/lib/webhook-dedupe.ts  (NOT created in this pass)
import { supabaseAdmin } from '@/lib/supabase'

/**
 * Claim a webhook event id. Returns true if THIS call won the claim (first
 * time we've seen it) and the caller should proceed; false if it was already
 * processed (a replay) and the caller must short-circuit.
 *
 * Fail-CLOSED: if the id is missing/blank we cannot dedupe, so we DO NOT
 * process (return false) rather than risk a duplicate agent run / SMS send.
 */
export async function claimWebhookEvent(
  provider: string,
  eventId: string | null | undefined,
  tenantId?: string | null,
): Promise<boolean> {
  if (!eventId) return false // no id → cannot dedupe → fail closed

  const { error } = await supabaseAdmin
    .from('processed_webhook_events')
    .insert({ provider, event_id: eventId, tenant_id: tenantId ?? null })

  if (!error) return true              // we claimed it first → proceed
  if (error.code === '23505') return false // unique violation → replay → skip
  throw error                          // unexpected DB error → let caller 5xx so provider retries
}
```

### Why check-and-insert (not select-then-insert)

A `SELECT ... then INSERT` has a race: two concurrent redeliveries both see "not
present" and both proceed. The **insert-first, catch-unique-violation** pattern
is atomic at the DB — exactly one insert wins even under concurrency. `23505` is
Postgres' `unique_violation` SQLSTATE.

### Why fail-closed on a missing id

If a provider ever sends an event with no usable id, we can't dedupe it. The
safe default for money/customer-facing side effects is **do not process** and
log loudly, rather than let an un-deduplicatable event through. (Contrast: the
telnyx-*voice* signature gate today fails *open* — see audit finding #1 — which
is the bug we don't want to repeat here.)

### Why unexpected errors re-throw (5xx), not swallow

If the ledger insert fails for a non-unique reason (e.g. DB down), the handler
should return non-2xx so the provider retries later — better a retried event
than a silently-dropped inbound message.

## Per-handler wiring (follow-up work, leader-gated)

Each call happens **after** signature verification, **before** side effects:

| Handler | provider | event id source | Claim site |
|---|---|---|---|
| `telnyx/route.ts` `message.received` | `'telnyx'` | `event.payload?.id` (Telnyx message id) | right after `eventType === 'message.received'`, before tenant/agent work |
| `telegram/route.ts` | `'telegram'` | `body.update_id` | top of `POST`, after allowlist check |
| `telegram/[tenant]/route.ts` | `'telegram'` | `body.update_id` | same |
| `telegram/jefe/route.ts` | `'telegram'` | `body.update_id` | same |
| `resend/route.ts` `email.received` | `'resend'` | `data.email_id ?? data.id` (fallback svix-id header) | top of `email.received` branch, before insert |

Handler pattern:

```ts
if (!(await claimWebhookEvent('telnyx', event.payload?.id, tenantId))) {
  return NextResponse.json({ received: true, deduped: true })
}
// ...existing side-effecting work runs only on first delivery...
```

Note: `telegram/update_id` is unique per bot, not globally; because the three
telegram routes serve different bots, prefer namespacing the id
(`` `${botScope}:${update_id}` ``) if two bots could ever emit the same
`update_id`. Decide at wiring time.

## What this does NOT cover

- Signature verification gaps (voice fail-open, telegram secret-token) — those
  are separate, additive, and need no schema change (audit findings #1, #2).
- `stripe` / `stripe-platform` already dedupe (or delegate to an idempotent
  `createTenantFromLead`) and are out of scope here.
