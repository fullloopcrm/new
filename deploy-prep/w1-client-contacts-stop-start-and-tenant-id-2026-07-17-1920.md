# client_contacts: STOP/START never reached it + createPrimaryContact never scoped it (2026-07-17 19:20)

## Bug 1 — webhooks/telnyx STOP/START only ever matched clients.phone / team_members.phone
`client_contacts` (added via `POST /clients/[id]/contacts`) lets a client have
secondary contacts — e.g. a spouse or property manager — with their own
`phone_e164` and a per-contact `receives_sms` opt-in, independent of the
parent client's `clients.sms_consent`. `sendClientSMS`'s fan-out
(`getClientContacts`) reads `client_contacts.receives_sms` directly, not
`clients.sms_consent`.

`webhooks/telnyx/route.ts`'s STOP/START handlers only ever looked up
`clients` (`.eq('phone', from)`) and `team_members` (`.eq('phone', from)`).
A secondary contact replying STOP from their own number matched neither —
their `client_contacts` row never got touched, so `getClientContacts` kept
returning them as an active recipient forever. Live TCPA gap: `sendClientSMS`
is called from `cron/confirmation-reminder`, `cron/rating-prompt`,
`team-portal/15min-alert`, and `nycmaid/payment-reminder`.

## Bug 2 — createPrimaryContact's insert never carried tenant_id
Found while fixing Bug 1: every other `client_contacts` write path (the
route above, `set_primary_client_contact`'s `p_tenant_id`) sets `tenant_id`.
`createPrimaryContact` (in `src/lib/nycmaid/client-contacts.ts`) didn't. Its
only caller, `selena/core.ts`'s `createOrLinkClient` (the SMS/AI-chatbot
new-client path), wraps the call in `.catch(() => {})`. If `tenant_id` is
`NOT NULL` on this table — every populated column on every other write path
suggests it is — the insert has been failing silently for every client
created through the chatbot, meaning zero primary `client_contacts` row and
`sendClientSMS`/`getClientContacts` silently having nothing to send to for
those clients. Even if the column is nullable, a null `tenant_id` makes the
row invisible to any tenant-scoped lookup, including Bug 1's own fix.

## Fix (file-only, no push/deploy/DB — pure application code, no schema change)
- `src/app/api/webhooks/telnyx/route.ts` — STOP and START now also update
  any `client_contacts` row (scoped `.eq('tenant_id', tenantId)`) whose
  `phone_e164` matches the inbound number: STOP sets
  `receives_sms:false, sms_opted_out_at:now()`; START sets
  `receives_sms:true, sms_opted_out_at:null, sms_consent_at:now()`. This
  also covers the primary contact's own row, created alongside `clients`.
- `src/lib/nycmaid/client-contacts.ts` — `createPrimaryContact` now takes
  `tenantId` and includes it on insert.
- `src/lib/selena/core.ts` — call site passes `tid` (already resolved
  earlier in `createOrLinkClient`), no new lookup needed.

## Tests
- `src/app/api/webhooks/telnyx/route.contacts-opt-out.test.ts` (new) — STOP
  opts out the matching `client_contacts` row scoped to this tenant and
  leaves a different tenant's contact sharing the same phone untouched;
  START re-subscribes a previously opted-out row.
- `src/lib/nycmaid/client-contacts.tenant-scope.test.ts` (new) —
  `createPrimaryContact` inserts with the given `tenant_id`.
- Mutation-verified both independently: `git diff > patch`, `git apply -R`
  to revert (stash is disabled in this worktree — shared `.git` dir across
  all 4 workers), confirmed RED against pre-fix code with the exact
  expected assertion failures (not just "some test failed" — the
  tenant-scope test's RED run is notable: the old 2-arg signature silently
  swallowed the extra arg and no-opped, producing a real 0-vs-1-row failure,
  not a type error, which is exactly the silent-failure shape the fix
  closes), `git apply` to restore, confirmed GREEN.

## Verification
- `tsc --noEmit`: clean on all touched files (same pre-existing unrelated
  baseline errors elsewhere — admin-auth route typing, other workers'
  in-progress uncommitted files, untouched by this pass).
- `eslint`: 0 new errors/warnings on touched files (5 pre-existing warnings
  in `selena/core.ts`, unrelated to the touched lines).
- Targeted suite: `webhooks/telnyx` + `clients` + `selena` + `nycmaid` +
  new tests — 302 tests passed, 0 regressions.

## Not touched (flagged, not fixed)
- `matchInboundPhone` (`client-contacts.ts`) is a correctly-implemented,
  already-tenant-agnostic phone->contact resolver that has zero call sites
  anywhere in the repo — same no-live-caller class as tonight's other
  dead-feature notes. Didn't wire it in; the inline `.update()` in the
  webhook is simpler and naturally takes the tenant scope it needs.
- `src/app/api/unsubscribe/route.ts` (marketing-campaign opt-out) is
  correctly client-level only — campaigns query `clients` directly, never
  fan out to `client_contacts` — so it's a different, correctly-scoped
  feature, not the same bug class. Confirmed, not touched.
- tenant_domains schema lane reconfirmed intact, no drift
  (043/055/056/059/068/069 + prior session's primary-invariant/normalization
  fixes).

File-only. No push/deploy/DB.
