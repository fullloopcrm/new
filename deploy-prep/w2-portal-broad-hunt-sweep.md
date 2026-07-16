# W2 — portal/* broad-hunt sweep (13 files), deferred-round follow-up

Swept all 13 `api/portal/*` route files (the batch deferred from the P40
round: `auth/route.ts`+`token.ts`, `availability`, `bookings`+`bookings/[id]`,
`collect`, `config`, `connect`+`connect/unread`, `feedback`, `messages`,
`notes`, `request`, `services`). Looking specifically for the P40-class bug
(caller-supplied id trusted without a tenant/ownership check before
insert/select) and any missing tenant scoping.

## Result: 12/13 clean, correctly hardened

Every file except `messages` correctly:
- Requires a Bearer token via `verifyPortalToken` (or, for the unauthenticated
  `collect` route, resolves tenant from host via `getTenantFromHeaders`).
- Scopes every query by `tenant_id` (+ `client_id` where the row is
  client-owned).
- Where a caller-supplied id is used (`connect`'s `channel_id`, `feedback`'s
  `booking_id`, `bookings/route.ts`'s `service_type_id`), it's verified
  against `tenant_id`+`client_id`/`tenant_id` before trusting it — with
  inline comments already documenting the exact attack these checks close
  (e.g. `connect/route.ts` POST: "Never trust a caller-supplied channel_id
  directly... a forged id could inject a message into another client's (or
  another tenant's) channel").

This directory has clearly already been through multiple hardening passes
(P1/P11/P17/P20-class fixes referenced inline). No new leak found.

## 1 file NOT fixed: `api/portal/messages/route.ts` — confirmed dead/orphaned, not a live leak

- Uses the legacy `lib/nycmaid/auth.ts` `protectClientAPI()`, which checks a
  `client_session` cookie signed by single-arg `createClientSession(clientId)`
  (no tenant claim in the payload, signed with the same global
  `getAdminSecret()`/`ADMIN_PASSWORD`-derived secret documented in my prior
  `admin_session` finding — `deploy-prep/w2-legacy-admin-session-dead-code-audit.md`).
- **That single-arg `createClientSession` has zero live callers anywhere in
  the repo** (grep confirms) — no login flow ever sets this cookie, so
  `GET`/`POST /api/portal/messages` always returns 401.
- The frontend page (`src/app/portal/messages/page.tsx`) matches: it does a
  plain `fetch('/api/portal/messages')` with no `Authorization` header, unlike
  every other portal page (`book`, `feedback`, `connect`, `layout`), which all
  send `Authorization: Bearer ${auth.token}` from the `portal_auth`
  localStorage blob set at login.
- The page is also **not linked from the portal nav** (`src/app/portal/layout.tsx`
  `navItems` only has Home/Book/Feedback/Chat→`/portal/connect`) — unreachable
  through the live UI.
- `/portal/connect` (+`/api/portal/connect`) is the actual, working chat
  feature — already reviewed above and correctly tenant/client-scoped. It
  appears `messages` (comhub-backed) was superseded by `connect`
  (connect_channels/connect_messages-backed) and left orphaned.
- Not exploitable as shipped (always 401s, unreachable from UI), same
  "known-debt, do not extend, not a live attack surface" shape as the prior
  `admin_session` finding — so not fixed here, consistent with that prior
  decision and with staying in the literal scope of this round's ask
  (cross-tenant leak hunt, not feature completion).

**Flagging for whoever next touches the client portal chat surface:** if this
is intentionally being kept for a future revival, it needs porting to
`verifyPortalToken` (same Bearer-token pattern as the other 12 portal routes)
+ the frontend needs to send the Bearer header — `api/team-portal/messages/route.ts`
is an exact template for this exact fix (it had the identical
comhub-thread-resolution shape and was already IDOR-fixed there). If it's
dead weight instead, `portal/messages/page.tsx` + `api/portal/messages/route.ts`
are safe to delete.

No code changed. File-only. No push/deploy/DB.
