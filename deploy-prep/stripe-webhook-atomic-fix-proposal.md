# FOR JEFF REVIEW — Stripe webhook money-race fix proposal

**Status:** Proposal only. Nothing in this doc has been applied to `route.ts` or `jobs.ts`. No DB changes required for any of the 4 fixes below (verified against live schema — see "Schema facts checked" per fix).

**Origin:** LEADER HIGH finding (14:50) — real money-race in `platform/src/app/api/webhooks/stripe/route.ts`: double-pay cleaner via missing Stripe idempotency key, non-atomic select-then-insert on `payments.stripe_session_id` (×2 call sites), quote-deposit TOCTOU, and a non-atomic job-conversion guard in `platform/src/lib/jobs.ts`. Report-only was correct per W3's scope (reconcile gate + CI wiring only — this file does not touch stripe route/jobs code). This proposal applies the same atomic **UPDATE ... WHERE ... RETURNING** pattern already proven at `route.ts:87-97` (the `prospects` claim) to all 4 sites.

---

## Pattern being replicated (already live, `route.ts:87-97`)

```ts
const { data: claim } = await supabaseAdmin
  .from('prospects')
  .update({ status: 'paid', paid_at: new Date().toISOString(), stripe_checkout_session_id: session.id })
  .eq('id', prospectId)
  .in('status', ['approved', 'reviewing', 'new'])
  .select('id')
  .maybeSingle()

if (!claim) {
  return NextResponse.json({ received: true, already_processed: true })
}
```

One atomic `UPDATE ... WHERE <not-yet-claimed> ... RETURNING` decides the winner when two Stripe webhook deliveries race (Stripe retries on timeout/5xx, so concurrent/duplicate deliveries for the same event are a normal occurrence, not an edge case). The loser's `UPDATE` matches zero rows, gets `null` back, and returns idempotent. No select-then-branch-then-write gap exists.

---

## Fix 1 — Invoice payment path (`route.ts:213-238`)

**Current (racy):**
```ts
if (invoiceId && tenantId && !bookingId) {
  const { data: existing } = await supabaseAdmin
    .from('payments').select('id').eq('stripe_session_id', session.id).limit(1)
  if (existing && existing.length > 0) {
    return NextResponse.json({ received: true, idempotent: true })
  }
  const { data: invPayment } = await supabaseAdmin.from('payments').insert({ /* ... */ }).select('id').single()
  // insert `error` is discarded — a unique-violation on retry is silently swallowed
  if (invPayment?.id) { postPaymentRevenue({ tenantId, paymentId: invPayment.id }).catch(...) }
  return NextResponse.json({ received: true, invoice_paid: true })
}
```

**Schema fact checked:** `payments.stripe_session_id TEXT UNIQUE` already exists (`platform/src/lib/migrations/011_parity_with_nycmaid.sql:85`). **No migration needed** — the constraint is already there; the application code just never checks the insert error.

**Proposed:**
```ts
if (invoiceId && tenantId && !bookingId) {
  const { data: invPayment, error: payErr } = await supabaseAdmin
    .from('payments')
    .insert({
      tenant_id: tenantId,
      invoice_id: invoiceId,
      amount_cents: session.amount_total || 0,
      method: 'stripe',
      status: 'succeeded',
      stripe_session_id: session.id,
      stripe_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : null,
    })
    .select('id')
    .single()

  if (payErr) {
    // 23505 = unique_violation on stripe_session_id → a concurrent/retried
    // delivery already inserted this payment. Idempotent, not an error.
    if (payErr.code === '23505') {
      return NextResponse.json({ received: true, idempotent: true })
    }
    console.error('[stripe] invoice payment insert failed:', payErr)
    return NextResponse.json({ received: true, error: 'insert_failed' })
  }
  if (invPayment?.id) {
    postPaymentRevenue({ tenantId, paymentId: invPayment.id })
      .catch(err => console.error('[stripe] invoice revenue post failed:', err))
  }
  return NextResponse.json({ received: true, invoice_paid: true })
}
```

Drops the pre-check `select` entirely — the insert itself is the atomic decision point, same as the prospects claim.

---

## Fix 2 — Booking payment path (`route.ts:326-484`) — **this is the double-pay-cleaner path**

**Current (racy, and the swallowed error is the actual root cause of double-pay):**
```ts
// Idempotency — skip if we already processed this session
const { data: existing } = await supabaseAdmin
  .from('payments').select('id').eq('stripe_session_id', session.id).limit(1)
if (existing && existing.length > 0) {
  return NextResponse.json({ received: true, idempotent: true })
}
// ... booking lookup, tip math ...
const { data: bookingPayment } = await supabaseAdmin.from('payments').insert({ /* ... */ }).select('id').single()
// insert `error` is NOT destructured/checked — processing continues unconditionally
// ... booking update, then step 4 unconditionally calls stripe.transfers.create() for the cleaner
```

**Why this is worse than Fix 1:** the same `UNIQUE` constraint on `stripe_session_id` already exists here too, so a second concurrent insert *does* fail in Postgres — but because the code never checks `error` on that insert, it falls straight through to the cleaner Stripe Connect transfer (`stripe.transfers.create`, `route.ts:436-442`) regardless of whether this delivery's payment row actually landed. Two concurrent/retried Stripe webhook deliveries for the same `checkout.session.completed` event can both reach the transfer call and both pay the cleaner.

**Proposed (two changes, both needed):**

1. Replace select-then-insert with insert-and-check-conflict (same shape as Fix 1), and **return before reaching the payout section** on conflict:

```ts
const { data: bookingPayment, error: payInsertErr } = await supabaseAdmin
  .from('payments')
  .insert({
    tenant_id: tenantId,
    booking_id: bookingId,
    client_id: booking.client_id,
    amount_cents: amountCents,
    tip_cents: tipCents,
    method: 'stripe',
    status: isPartial ? 'partial' : 'completed',
    stripe_session_id: session.id,
    stripe_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : null,
  })
  .select('id')
  .single()

if (payInsertErr) {
  if (payInsertErr.code === '23505') {
    return NextResponse.json({ received: true, idempotent: true })
  }
  console.error('[stripe] booking payment insert failed:', payInsertErr)
  return NextResponse.json({ received: true, error: 'insert_failed' })
}
```

2. **Defense in depth** — pass an explicit Stripe idempotency key on the cleaner transfer itself, so even a delivery that reaches the transfer call under some other retry path (e.g. a process crash between the payment insert committing and the transfer completing, followed by manual replay) can't double-transfer:

```ts
const transfer = await stripe.transfers.create({
  amount: cleanerCents,
  currency: 'usd',
  destination: tm.stripe_account_id,
  transfer_group: bookingId,
  metadata: { booking_id: bookingId, tenant_id: tenantId },
}, {
  idempotencyKey: `cleaner-payout:${bookingId}:${session.id}`,
})
```

This second change is the direct fix for "missing idempotencyKey" named in the finding — it's Stripe-side protection independent of our own DB state.

---

## Fix 3 — Quote-deposit path (`route.ts:241-285`) — TOCTOU on `deposit_paid_at`

**Current (racy):**
```ts
const { data: q } = await supabaseAdmin
  .from('quotes').select('id, deal_id, deposit_paid_at, deposit_cents, quote_number')
  .eq('id', quoteId).eq('tenant_id', tenantId).maybeSingle()
if (!q) return NextResponse.json({ received: true, quote_not_found: true })
if (q.deposit_paid_at) return NextResponse.json({ received: true, idempotent: true })
// ... later, unconditional update:
await supabaseAdmin.from('quotes')
  .update({ deposit_paid_cents: amt, deposit_paid_at: nowIso, deposit_session_id: session.id })
  .eq('id', quoteId).eq('tenant_id', tenantId)
```
Two concurrent deliveries can both read `deposit_paid_at: null`, both pass the check, and both proceed to post the deposit to the ledger, advance the deal, and call `convertSaleToJob` — direct financial duplication (double deposit-post to ledger) independent of Fix 4.

**Proposed:**
```ts
if (session.metadata?.quote_deposit === 'true' && session.metadata?.quote_id && tenantId) {
  const quoteId = session.metadata.quote_id

  // Read-only lookup — used only for the deposit_cents fallback + not-found
  // reporting, NOT to decide whether to proceed. That decision is made
  // atomically by the UPDATE below.
  const { data: qLookup } = await supabaseAdmin
    .from('quotes').select('deposit_cents').eq('id', quoteId).eq('tenant_id', tenantId).maybeSingle()
  if (!qLookup) return NextResponse.json({ received: true, quote_not_found: true })

  const amt = session.amount_total || qLookup.deposit_cents || 0
  const nowIso = new Date().toISOString()

  // Atomic claim: flip deposit_paid_at null -> now in one UPDATE so only one
  // concurrent/retried delivery wins.
  const { data: claim } = await supabaseAdmin
    .from('quotes')
    .update({ deposit_paid_cents: amt, deposit_paid_at: nowIso, deposit_session_id: session.id })
    .eq('id', quoteId).eq('tenant_id', tenantId)
    .is('deposit_paid_at', null)
    .select('id, deal_id, quote_number')
    .maybeSingle()

  if (!claim) {
    return NextResponse.json({ received: true, idempotent: true })
  }
  const q = claim
  // ... rest of the block (ledger post, deal advance, convertSaleToJob, owner alert)
  // is unchanged — it already reads `q.deal_id` / `q.quote_number`, both present
  // in the new `.select()` above.
}
```

**Schema fact checked:** `deposit_paid_at`, `deposit_paid_cents`, `deposit_session_id`, `deposit_cents` are all plain columns on `quotes` (migration adding these not re-verified column-by-column here, but all four are read/written by the *current* code already, so no new column is introduced).

---

## Fix 4 — Job-conversion guard (`platform/src/lib/jobs.ts:106-116, 210-213`)

**Current (racy):**
```ts
const { data: quote, error: qErr } = await supabaseAdmin
  .from('quotes').select('*').eq('tenant_id', tenantId).eq('id', quoteId).single()
if (qErr || !quote) throw new Error('Quote not found')

if (quote.converted_job_id) {
  return { job_id: quote.converted_job_id as string, already_converted: true }
}
if (quote.status !== 'accepted') {
  throw new Error(`Can only convert accepted quotes (current: ${quote.status})`)
}
// ... client resolution, job insert, payment-plan insert, booking inserts ...
await supabaseAdmin.from('quotes')
  .update({ status: 'converted', converted_job_id: jobId, converted_at: new Date().toISOString() })
  .eq('id', quoteId)
```
This is called from Fix 3's quote-deposit path (`route.ts:274`, `convertSaleToJob` → `createJobFromQuote`). Two concurrent invocations (e.g. a Stripe retry racing the first delivery, before Fix 3 is applied — or even after, if two *different* legitimate triggers both attempt conversion) can both pass the `converted_job_id` check and both create a full duplicate job + payment plan + bookings before either writes `converted_job_id`.

**Schema fact checked — important, changed my original approach:** `quotes.status` has a `CHECK (status IN ('draft','sent','viewed','accepted','declined','expired','converted'))` constraint (`platform/src/lib/migrations/026_quotes.sql:13-14`). **There is no `'converting'` value available** — an atomic claim via a new intermediate status (the naive mirror of the prospects `approved|reviewing|new → paid` pattern) would violate this CHECK constraint and fail outright. Flagging this because I initially assumed a `status='converting'` claim would work; it does not, and using it would need a migration. Instead, this fix reuses the existing `converted_at` column as the atomic claim marker (set early instead of only at the end) — **no migration needed**. `converted_at` is otherwise only read in two read-only UI display contexts (`admin/referrals/page.tsx`, `dashboard/sales/quotes/[id]/page.tsx`) and is not used to gate any other logic, so setting it earlier is safe.

**Proposed:**
```ts
export async function createJobFromQuote(
  tenantId: string,
  quoteId: string,
  opts: CreateJobFromQuoteOptions = {},
): Promise<{ job_id: string; already_converted: boolean }> {
  const { data: quote, error: qErr } = await supabaseAdmin
    .from('quotes').select('*').eq('tenant_id', tenantId).eq('id', quoteId).single()
  if (qErr || !quote) throw new Error('Quote not found')

  if (quote.converted_job_id) {
    return { job_id: quote.converted_job_id as string, already_converted: true }
  }
  if (quote.status !== 'accepted') {
    throw new Error(`Can only convert accepted quotes (current: ${quote.status})`)
  }

  // Atomic claim: only a still-'accepted', not-yet-converted, not-yet-claimed
  // quote can proceed. Concurrent callers race here — the loser gets null
  // back instead of creating a duplicate job.
  const { data: claim } = await supabaseAdmin
    .from('quotes')
    .update({ converted_at: new Date().toISOString() })
    .eq('id', quoteId).eq('tenant_id', tenantId)
    .eq('status', 'accepted')
    .is('converted_job_id', null)
    .is('converted_at', null)
    .select('id')
    .maybeSingle()

  if (!claim) {
    // Already claimed (in flight or finished) by a concurrent call. If the
    // winner already finished, return its job id; otherwise surface a
    // retryable conflict instead of silently creating a second job.
    const { data: latest } = await supabaseAdmin
      .from('quotes').select('converted_job_id').eq('id', quoteId).maybeSingle()
    if (latest?.converted_job_id) {
      return { job_id: latest.converted_job_id as string, already_converted: true }
    }
    throw new Error('Quote conversion already in progress')
  }

  // ... existing client-resolution / job-insert / payment-plan / booking logic unchanged ...

  await supabaseAdmin
    .from('quotes')
    .update({ status: 'converted', converted_job_id: jobId, converted_at: new Date().toISOString() })
    .eq('id', quoteId)
  // ... rest unchanged
}
```

---

## Noticed, not part of this proposal

- `platform/src/app/api/quotes/[id]/convert/route.ts:28-34` has the identical check-then-act shape (`converted_booking_id` guard), but it's an admin-triggered manual click (not an auto-retrying webhook), so concurrency risk is far lower. Not included above — flagging in case Jeff wants the same treatment for consistency.

## Verification not yet done

- `error.code === '23505'` is confirmed as the existing pattern in this codebase (`platform/src/lib/create-tenant-from-lead.ts:109`, `platform/src/lib/territories/data.ts:149`, `platform/src/app/api/admin/comhub/channels/route.ts:39`) — same `PostgrestError.code` field, no new pattern introduced.
- None of this has been applied. `npx tsc --noEmit` was not run against these snippets since no files were changed.
