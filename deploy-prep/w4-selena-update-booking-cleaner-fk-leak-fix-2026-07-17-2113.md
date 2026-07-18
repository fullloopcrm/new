# W4 — Selena `update_booking` cross-tenant cleaner_id FK leak (2026-07-17 21:13)

## Fresh-ground surface

Per the 21:03 checkpoint's next-target candidate: "whether any Jefe/Selena
tool accepts a raw tenant_id/entity_id parameter from LLM output without a
matching ownership check (the same class just fixed, but from the
agent-tool-call surface instead of the HTTP-route surface)." This is the
same P3-5 class already fixed across `assign_cleaner_to_booking`,
`create_manual_booking`, `create_deal`, and `block_cleaner_dates` in
`src/lib/selena/tools.ts` (each verifies a referenced FK resolves inside the
caller's tenant via the `idInTenant()` helper before the write).

## Finding

`update_booking`'s handler (`handleUpdateBooking`, `src/lib/selena/tools.ts`)
is a generic field-whitelist updater:

```ts
const allowed = ['status', 'payment_status', 'cleaner_id', 'hourly_rate',
  'start_time', 'end_time', 'notes', 'service_type']
```

`cleaner_id` is a cross-tenant FK into the `cleaners` table — the exact same
field `assign_cleaner_to_booking` guards with `idInTenant()` two functions
above it in the same file. `update_booking` never got the equivalent check:
it wrote `fields.cleaner_id` straight into the `bookings` row after only
scoping the *booking* itself by `tenant_id`, not the cleaner id being written
into it.

**Confirmed exploitable, not just theoretical.** `src/lib/selena/core.ts`
line 1386 — the client-facing `check_payment`/`confirm_payment` bridge —
does:

```ts
.select('id, cleaner_id, start_time, clients(name), cleaners(name, phone, sms_consent)')
.eq('tenant_id', tid).eq('client_id', convo.client_id)
```

The outer query is tenant-scoped, but the embedded `cleaners(name, phone,
sms_consent)` join follows `cleaner_id` verbatim regardless of the joined
row's own `tenant_id` — Supabase FK embeds don't re-filter on unrelated
columns. So: a tenant owner (legitimate, or an owner session steered by a
prompt-injected message) calls `update_booking` with
`fields: { cleaner_id: <some other tenant's cleaner id> }` on their own
booking → that other tenant's cleaner's real name, phone number, and SMS
consent flag get served straight to the CLIENT the next time that client's
booking is looked up via chat. Cross-tenant PII leak to an end customer, not
just an internal dashboard artifact.

Same underlying bug class as the Stripe `owner_email` binding fixed at 21:03
and the original P3-5 sweep — a caller-supplied FK trusted without checking
which tenant it actually belongs to — just a sibling site the original sweep
missed because it's reached through the generic multi-field updater instead
of a dedicated single-purpose action.

## Fix

Added the `idInTenant('cleaners', ...)` guard to `handleUpdateBooking`,
gated on `cleaner_id` actually being present in the requested field update
(so plain field updates like `status` or `notes` skip the extra lookup):

```ts
if (typeof update.cleaner_id === 'string' && update.cleaner_id && !(await idInTenant('cleaners', update.cleaner_id, tid))) {
  return JSON.stringify({ error: 'cleaner not found' })
}
```

## Surface swept for the same sibling-site shape

Grepped every `const allowed = [...]` field-whitelist in `tools.ts`/`core.ts`
for a cross-tenant FK column: `update_skill` (when_to_use/body/active — no
FK), `update_cleaner` (name/phone/email/zone/status/sms_consent/hourly_rate/
has_car/labor_only — no FK), `update_deal` (stage/value_dollars/
follow_up_at/follow_up_note/notes — no FK), `trigger_cron`'s allowlist (cron
names, not a DB FK), core.ts's `update_account` (address/email/phone/name —
client's own fields only). `update_booking` was the only site with this gap;
class closed within the Selena tool layer.

Also checked every other `.update({ client_id: ... })` / `.update({
cleaner_id: ... })` call in `core.ts` (client account linking, conversation
linking) — all write an id that was itself just resolved from a
tenant-scoped lookup a few lines earlier, not an attacker-supplied raw
value, so none share this shape.

Checked `src/lib/jefe/actions.ts` for the analogous pattern: Jefe has no
`client_id`/`cleaner_id`-style tenant-scoped FK parameters at all — its
tenant lookups (`findTenant`) are deliberately platform-wide (Jefe operates
across all tenants for Jeff, by design), so the "wrong tenant's FK" shape
doesn't apply there. No fix needed.

## Files changed

- `platform/src/lib/selena/tools.ts` — added the FK ownership check to
  `handleUpdateBooking`.
- `platform/src/lib/selena/owner-fk-authz.test.ts` — added 3 tests under a
  new `update_booking — FK tenant-ownership (cleaner_id field)` block
  (reject foreign cleaner_id, allow own-tenant cleaner_id, allow a
  cleaner_id-free field update to pass through untouched).

## Verification

- RED/GREEN mutation-verified: `git diff > patch && git apply -R patch` →
  reran `owner-fk-authz.test.ts` → new REJECT test failed
  (`expected undefined to be 'cleaner not found'`) as expected on the
  pre-fix code, 15/16 other tests unaffected → `git apply patch` → 16/16
  pass again.
- `npx tsc --noEmit`: same 3 pre-existing baseline errors only
  (`bookings/broadcast/route.xss.test.ts`, `site/sunnyside-clean-nyc/_lib/
  site-nav.ts` ×2), none touched by this change.
- `npx vitest run src/lib/selena/`: 8/8 files, 64/64 tests passing.

## Not done / out of scope

- Did not add tenant scoping to `notifyCleaner()`
  (`src/lib/nycmaid/notify-cleaner.ts:79-81`, looks up a cleaner by `id`
  with no `tenant_id` filter) — confirmed it has zero live callers anywhere
  in the app (dead code), so no live exploit path through it today. Flagged
  below as a hardening candidate for whoever wires it up.
- File-only change, no push/deploy/DB migration, per standing instructions.
