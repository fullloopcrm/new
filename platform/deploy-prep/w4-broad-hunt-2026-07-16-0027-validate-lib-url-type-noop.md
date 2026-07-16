# Broad-hunt sweep — 00:23 order — W4, 2026-07-16

File-only, no push/deploy/DB. Lower-risk surface: shared validation utility
rather than a single route.

## Fixed: `validate()`'s `type: 'url'` field was a silent no-op

`src/lib/validate.ts` is the shared mass-assignment-prevention / field
validator used across API routes (via `validate(body, schema)`). It exposes
a `'url'` `FieldType`, which reads as "validate this field as a URL." Its
actual implementation:

```ts
case 'url':
  if (typeof val !== 'string') return { data: null, error: `${field} must be a string` }
  result[field] = val.trim()
  break
```

This does not check scheme, format, or anything beyond "is a string" — it's
functionally identical to `type: 'string'` with no `max`. Any value,
including `javascript:alert(1)` or `data:text/html,...`, passes.

Two call sites declare `type: 'url'`, both presumably trusting it to do more
than string-typecheck:

- `src/app/api/requests/route.ts:86` — `website` field on the **public,
  unauthenticated** partner-signup POST (`partner_requests.website`).
- `src/app/api/finance/expenses/route.ts:50` — `receipt_url` field on the
  `finance.expenses`-permission-gated expense POST (`expenses.receipt_url`).

Traced both columns' render paths and found neither is currently rendered
as `<a href>`/`<img src>` anywhere in the live UI (`partner_requests` is
absorbed into the sales/leads pipeline per `admin/requests/page.tsx`, which
just redirects to `/admin/leads`, and neither `website` nor `receipt_url`
appears in `LeadsPanel.tsx`/`ContactsPanel.tsx`/any finance dashboard page).
So — same as the `reviews.images` case in the 0157 report — this is
currently dormant, not a live trigger.

Fixed anyway, at the library level rather than per-call-site, because:
1. A field type named `'url'` that performs zero URL validation is a
   footgun independent of today's render paths — any future route (or
   future UI added for these two existing columns) that adopts
   `type: 'url'` inherits a false sense of security from the name alone.
2. It's the same stored-URL-injection bug class fixed repeatedly this
   session, and fixing the shared helper closes it for both current call
   sites and any future one in a single low-blast-radius change, rather than
   requiring a fresh audit every time a new route uses `type: 'url'`.

**Fix**: `'url'` now requires an `^https?://` prefix (matching the
`isHttpUrl`/scheme-check pattern used in every prior fix this session) and
also honors `def.max` (previously `url` fields silently ignored any `max`
set in their schema — neither of the two current call sites sets one, so
no behavior change there, just closing a second latent gap in the same
case block). Non-conforming values now return the existing
`${field} must be a valid http(s) URL` error path instead of silently
storing whatever was given.

## Verification

- `npx tsc --noEmit` — clean (only the same pre-existing unrelated
  `bookings/broadcast/route.xss.test.ts:52` failure flagged in every prior
  W4 report this session).
- `npx vitest run src/lib/validate.test.ts` — 18/18 pass (no existing test
  covered the `url` type; none broke).
- `npx vitest run src/app/api/finance/expenses/route.witness.test.ts
  "src/app/api/finance/expenses/[id]/route.mass-assign.test.ts"` — 7/7 pass
  (neither exercises `receipt_url` with a value, so no behavior collision).
- No test file exists for `requests/route.ts`.

## Also committed this pass (pre-existing uncommitted work, verified done)

Found `admin/notes/route.ts` and `ingest/application/route.ts` modified but
uncommitted in the worktree, matching a prior session's own report
(`w4-broad-hunt-2026-07-16-0016-...md`) claiming the fix was already
verified. Re-ran `tsc --noEmit` to confirm still clean, then committed as
`a35c86cc` — this was leftover state, not new work from this pass.

## Noticed, not fixed (out of scope)

- `partner_requests.website` and `expenses.receipt_url` have no render
  path today, so no admin-facing exposure exists yet to independently
  verify beyond the library fix. If either column gets a UI added later,
  it now inherits real validation from `validate()` automatically.
