# `GET/POST/PATCH /api/client/properties` — legacy admin_session cross-tenant IDOR

Found + fixed during LEADER 01:39 broad-hunt order ("continuing broad-hunt,
fresh area"). File-only per standing rules. Excluded referrers,
referral-commissions, and team-PIN routes per LEADER instruction — not touched.

## Summary

`src/app/api/client/properties/route.ts` (multi-address management: list,
add, update, set-primary, deactivate a client's properties) trusted
`isAdminAuthenticated()` from `lib/nycmaid/auth.ts` as an unconditional bypass
of the per-client ownership check. That legacy `admin_session` cookie carries
**no tenant binding at all** — and per the comment already sitting in
`client-analytics/route.ts` ("dead: admin_users table removed, /api/auth/login
orphaned"), its `admin_users` table is gone from the schema. The *only* thing
that can still mint a valid `admin_session` today is the global
`ADMIN_PASSWORD` PIN fallback in `POST /api/auth/login` (`email`/`password`
omitted, just `{ password: <ADMIN_PASSWORD> }` — no tenant, no email, no
per-tenant scoping of any kind).

Anyone holding that one shared platform secret could therefore call:

- `GET /api/client/properties?client_id=<any tenant's client uuid>` — dump
  that client's saved addresses (label, unit, primary flag) across tenant
  boundaries, plus (with `include_history=true`) their full property-change
  audit log.
- `POST /api/client/properties` with a foreign `client_id` — inject a
  fabricated address into another tenant's client record.
- `PATCH /api/client/properties` (`set_primary` / `deactivate` / plain edit)
  with a foreign `client_id` + `property_id` — silently rewrite or deactivate
  another business's customer's address book. In a home-services CRM this is
  not just a PII leak: a rewritten primary address can redirect a cleaning
  crew's dispatch to an attacker-controlled location.

This is the exact bug class already named and fixed in three sibling routes —
`admin-chat/route.ts` ("FL auth (replaces legacy admin_session)"),
`client-analytics/route.ts` ("Replaced the legacy nycmaid admin_session gate"),
and `clients/[id]/contacts/route.ts` + `[contactId]/route.ts` ("FL auth
(replaces legacy admin_session)") — all migrated to tenant-bound
`requirePermission()`. `client/properties` was the one route still on the old
gate; its own test file even already carried the comment "same class as the
Selena IDOR" for the (narrower) `include_history` sub-branch, which a prior
W4 pass had partially patched — but the base GET/POST/PATCH CRUD paths were
never touched and remained fully exposed.

Bonus finding: this route is called from exactly one place in the app —
`app/dashboard/bookings/BookingsAdmin.tsx` (operator dashboard, GET only),
which authenticates via Clerk/`tenant_members`, not `admin_session`. Since the
operator dashboard never holds an `admin_session` cookie, `isAdminAuthenticated()`
was always `false` for that real caller, and it doesn't hold a `client_session`
cookie either (that's the customer-portal identity) — so `protectClientAPI()`
also failed. In practice this endpoint likely returned 401 for every real
admin-dashboard user and silently degraded to an empty property list in the
UI (the `fetch(...).then(d => d.properties || [])` call swallows the error).
The fix below closes the security hole and fixes this functional breakage in
the same change.

## Fixed

Replaced the `isAdminAuthenticated()` bypass with a two-path `authClient()`:

1. **Operator dashboard** — `requirePermission('clients.view' | 'clients.edit')`
   (Clerk/`tenant_members`, same mechanism as every other tenant-scoped
   route), then an explicit `.eq('id', clientId).eq('tenant_id', opTenant.tenantId)`
   check that the target client actually belongs to the authenticated
   operator's tenant before treating the caller as admin.
2. **Customer portal** — swapped `protectClientAPI` from `lib/nycmaid/auth`
   (3-part, non-tenant-bound, dead cookie format) to `lib/client-auth`'s
   version (4-part `clientId.tenantId.timestamp.hmac`, `PORTAL_SECRET`-signed,
   already used by every other `/api/client/*` route — bookings, notes,
   preferred-cleaner, recurring, reschedule). Requires `getTenantFromHeaders()`
   + a session whose `tenantId` matches the resolved tenant AND whose
   `clientId` matches the request's `client_id`.

The `include_history` branch now reads `property_changes` scoped to the
*authenticated operator's own* `tenantId` (returned from `authClient()`)
instead of re-resolving a tenant from the target client row after the fact —
so a client belonging to a different tenant is rejected (404) at the
ownership check, before any property or history data is ever read.

Updated the two existing test files for this route
(`route.property-changes-tenant-scope.test.ts`,
`route.tenantdb-history-guard.test.ts`) to mock the new
`requirePermission` / `getTenantFromHeaders` / `client-auth` dependencies
instead of the removed `lib/nycmaid/auth` mock, and added a case asserting an
operator whose tenant does NOT own the target client gets a 404 with no
history leak (stronger than the prior "resolve tenant from the client row,
return empty history on failure" behavior).

Verified:
- `npx tsc --noEmit` — clean.
- `npx vitest run src/app/api/client/properties/route.property-changes-tenant-scope.test.ts src/app/api/client/properties/route.tenantdb-history-guard.test.ts` — 6/6 pass.
- Confirmed `clients.view` / `clients.edit` are valid `Permission` values in `lib/rbac.ts`.
- Confirmed via `grep` that `/api/client/properties` has exactly one caller in
  the app (`BookingsAdmin.tsx`, GET) and no other route imports
  `createClientSession`/`protectClientAPI` from `lib/nycmaid/auth` for a live,
  reachable client-facing flow (the per-tenant clone copies of that file under
  `app/site/wash-and-fold-{nyc,hoboken}/_lib/auth.ts` define their own local
  `createClientSession`/`protectClientAPI` but neither function is actually
  called anywhere in either clone — dead code, not exercised by this fix).

No DB/migration involved — pure code + test fix, file-only per instructions.

## Noticed, not fixed (flagging only)

`src/app/api/portal/messages/route.ts` also imports `protectClientAPI` from
`lib/nycmaid/auth` (same non-tenant-bound legacy gate). Did not investigate
or touch it — out of scope for this pass, flagging for a future sweep since
it's likely the same bug class.

## Reviewed, no issue found (this sweep)

Broad pass across previously-unaudited surface, tenant-scoping and auth
checks all held up:
- **Finance/sales CRUD**: `invoices/[id]/*` (GET/PATCH/DELETE/record-payment/send),
  `documents/[id]/*` (duplicate/void/fields/signers/send — re-confirmed, matches
  the prior W4 e-sign audit), `deals/[id]/*`, `quotes/[id]/convert*`,
  `jobs/[id]/*` + `sessions/*`, `catalog`, `pipeline`.
- **Client-portal auth flows** (`lib/client-auth.ts`): `client/login`,
  `client/send-code`, `client/verify-code`, `client/check`, `client/bookings`,
  `client/notes`, `client/preferred-cleaner`, `client/recurring`,
  `client/reschedule/[id]`, `client/booking/[id]`, `client/confirm/[token]` —
  all rate-limited, ILIKE-escaped, exact-match phone/email lookups, and
  `protectClientAPI(tenant.id, clientId)`-gated as expected.
- **AI tool-calling routes** (`ai/chat`, `ai/assistant`): every DB call
  correctly `.eq('tenant_id', tenantId)`-scoped; tool permission gate
  (`TOOL_PERMISSIONS`) matches the equivalent REST endpoint's RBAC
  requirement; no client-supplied conversation/session id reused across
  tenants (the bug class already found+fixed on `/api/yinez` and `/api/chat`).
- **Webhooks**: `telnyx`, `telnyx/[tenant]` (per-tenant Telegram, HMAC-secret
  scoped to `tenant:<id>`), `resend` (Svix signature + fail-closed tenant
  resolution for inbound email) — signature verification intact, no bypass.
- **Public intake**: `ingest/lead` (shared-secret + timing-safe compare, same
  pattern as `ingest/application`), `prospects`, `sales-applications`,
  `apply-ceo`, `waitlist`, `requests` (partner applications) — rate-limited,
  validated, tenant resolution not attacker-controlled.
- **Social OAuth**: `social/connect/facebook/callback` — signed CSRF state
  (`verifyOAuthState`) required before any token exchange.
- **Misc**: `connect/*` (internal messaging, channel ownership checked),
  `booking-notes`, `schedules/[id]/*`, `security/events`, `user/preferences`,
  `google/reviews`, `google/posts` — all `requirePermission`/`getTenantForRequest`
  gated with consistent `tenant_id` filters.
