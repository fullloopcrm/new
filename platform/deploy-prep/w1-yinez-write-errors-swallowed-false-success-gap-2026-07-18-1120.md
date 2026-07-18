# selena/core.ts (Yinez SMS assistant): 6 write sites ignore the update's `error` and confirm success to the client anyway (2026-07-18 11:20)

## Bug
This exact bug class was already found and fixed once in this file —
`handleSendPin`'s comment (added in an earlier session pass) documents it
directly:

```ts
// idx_clients_tenant_pin_unique (2026_07_17_clients_pin_unique.sql)
// uniquely constrains (tenant_id, pin) -- regenerate-and-retry on
// 23505 instead of the prior behavior of ignoring the update's error
// entirely and texting the customer a "new" PIN that was never
// actually persisted (leaving them permanently unable to log in with
// the PIN they were just sent).
```

That fix was never swept to its siblings. Supabase-js does not throw on a
PostgREST-level write failure (RLS denial, constraint violation, transient
error) — `await supabaseAdmin.from(...).update(...)` resolves normally with
`{data: null, error: {...}}`, so a `try/catch` around the call never fires.
Six more write sites in this file did `await supabaseAdmin.from(...).update(...)`
without destructuring `error`, then unconditionally returned
`{success: true}` — which the AI relays to the client over SMS as a
confirmed action:

- `handleRescheduleBooking` — `bookings.update({start_time, end_time, ...})`.
  Client told "Rescheduled to [date] at [time]" when the booking may still
  be at its original time — crew shows up at the old slot, or doesn't show
  at the new one the client now expects.
- `handleCancelBooking` — `bookings.update({status: 'cancelled', ...})`.
  Highest-stakes instance: client told their cleaning is cancelled and has
  no reason to expect the crew to still show up (or, worse, to still be
  billed) if the write silently failed. The admin `notify({type:
  'booking_cancelled'})` also fired unconditionally, right after the
  possibly-failed write — an admin-facing false record on top of the
  client-facing one.
- `handleManageRecurring` (`pause`/`resume`/`cancel` on
  `recurring_schedules`) — same shape three times over. A client told
  "Recurring paused until [date]" whose write failed would still get
  billed/scheduled on the original cadence with zero indication anything
  went wrong; `cancel`'s admin `notify({type: 'recurring_cancelled'})` has
  the same fire-regardless issue as `handleCancelBooking`'s.
- `handleUpdateAccount` (the `email`/`phone`/`name` branch —
  `clients.update({[field]: value})`) — client told their contact info
  changed when it didn't; lower blast radius than the scheduling handlers
  (no crew-dispatch impact) but still a false confirmation of a real write.
  The sibling `address` branch already goes through `addProperty()`, which
  checks its own result (`if (!prop) return {error: ...}`) — this was the
  one field-update path in the function still exposed.

## Fix (file-only, no push/deploy/DB)
`src/lib/selena/core.ts` — all 6 sites now destructure `{ error }` from the
update call; on a truthy error, call `yinezError(context, error,
conversationId)` (same admin-notify + console.error path every other
failure in this file already uses) and return a failure JSON instead of
`{success: true}`, so the AI has an honest result to relay instead of a
false confirmation. `handleCancelBooking`'s and `handleManageRecurring`
`cancel`'s admin `notify()` calls now only fire after the write is
confirmed to have succeeded.

Investigated but not changed: `handleConfirmPayment`'s
`bookings.update({payment_method, ...})` also skips the error check, but
its own comment establishes the field is provisional/best-effort — the
real payment-verification source of truth is the email monitor / Stripe
webhook, which runs independently of this marker, and the admin `notify`
already fires either way to flag the claim for manual verification. Lower
stakes than the scheduling/cancellation writes above (no false "your
appointment changed" told to the client); flagging rather than fixing to
keep this pass scoped to the false-confirmation class. Several
`sms_conversations`-only updates in this file (conversation bookkeeping
fields, not client-visible state) were also left alone for the same
reason — internal, not a promise made to the client.

## Verification
New test file `core.write-error-swallowed.test.ts` covering the three
highest-stakes sites (`cancel_booking`, `manage_recurring cancel`,
`update_account`) via the exported `handleTool` dispatcher. Added a local
`forceUpdateError(table)` helper (self-contained to this test file, not
grown into the shared `fake-supabase.ts`, per that file's own "not a
general-purpose mock" note) that monkeypatches the fake's `.from(table)` to
return a builder whose `update()` always resolves `{error}` without
throwing, while leaving `select()`/other ops on the same table intact for
the handler's own read paths.

RED-confirmed via `git diff` + `git apply -R` on `core.ts` alone (the
established technique this session settled on over `git stash`, per an
earlier self-correction): all 3 tests failed pre-fix with
`parsed.success === true` despite the forced write failure — the exact
predicted shape. Restored the fix (`git apply` the same diff), GREEN after.

Full suite: 690/690 files, 3544 passed + 1 pre-existing expected-fail, 0
regressions. `tsc --noEmit` clean on touched files (4 pre-existing
unrelated baseline errors elsewhere: admin-auth generated route types, two
unrelated cron test files, and the untracked SEO-lane `site-nav.ts` — none
mine). ESLint: 0 errors, 0 new warnings on touched files (5 pre-existing
warnings in `core.ts`, unrelated to this change). File-only, no
push/deploy/DB.
