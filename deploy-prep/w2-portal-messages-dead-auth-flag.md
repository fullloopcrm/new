# Flag (not fixed): `/api/portal/messages` — orphaned page wired to the wrong, non-tenant-bound auth module

## What I found

`src/app/api/portal/messages/route.ts` is the only file under `src/app/api/portal/*` that does **not**
use the portal's real auth scheme (`verifyPortalToken` from `../auth/token`, a Bearer token containing
both `id` (client) and `tid` (tenant), stored client-side in `localStorage` and sent as
`Authorization: Bearer <token>` — see `src/app/portal/layout.tsx` and every sibling route:
`bookings`, `notes`, `services`, `availability`, `config`, `connect`, `connect/unread`).

Instead it imports `protectClientAPI` from `@/lib/nycmaid/auth` — a **third**, older legacy cookie-based
auth module (distinct from both the Bearer-token scheme above and the separately-tenant-scoped
`@/lib/client-auth` used by `/api/client/*`). That module:

- Reads a `client_session` cookie, expects a 3-part format `clientId.timestamp.signature` signed with
  the **global** `ADMIN_PASSWORD` secret (no tenant binding in the token at all).
- Its own `createClientSession(clientId)` (the only function that could mint a cookie in that format) has
  **zero live callers anywhere in the repo** — confirmed via `grep -rn "createClientSession("`. The only
  callers of *any* `createClientSession` are `/api/client/login` and `/api/client/verify-code`, both of
  which use the **different**, tenant-scoped `@/lib/client-auth.ts` (`clientId.tenantId.timestamp.hmac`,
  4-part format, signed with `PORTAL_SECRET`).

Net effect: no code path in the live app ever sets a cookie in the 3-part format
`src/app/api/portal/messages` expects. The route is **currently dead** — `GET`/`POST` always return 401
for every real user, same "inert until someone 'fixes' the mismatch" shape as W1's `wash-and-fold-nyc`
push.ts finding this session.

The frontend (`src/app/portal/messages/page.tsx`) matches: it's the *only* page under `src/app/portal/*`
that calls `fetch('/api/portal/messages')` **without** an `Authorization: Bearer` header (every sibling
page reads `usePortalAuth().auth.token` and attaches it). It's also not linked from anywhere — not in
`PortalLayout`'s nav (`Home` / `Book` / `Feedback` / `Chat`), not from any other portal page. Only reachable
by typing the URL directly, and it always dead-ends at the 401 → redirect-to-`/portal` in
`fetchMessages()`.

There is a second, apparently-live client-chat feature at `/portal/connect` (nav item "Chat") whose
backend (`src/app/api/portal/connect/route.ts`) already uses the correct Bearer-token scheme and already
has an isolation test. It writes to `connect_channels`/`connect_messages`. `messages/route.ts` instead
targets a **different** table set (`comhub_contacts`/`comhub_threads`/`comhub_messages` — the CRM's
omnichannel comm-hub, also used by SMS). These look like two parallel, non-interoperating client-chat
surfaces, and `/portal/messages` + `comhub` looks superseded by `/portal/connect`.

## Why I'm not fixing this

Not a live cross-tenant leak today (route is unreachable — always 401, no valid cookie can exist). Fixing
the auth mismatch is mechanical (swap to `verifyPortalToken`, thread `auth.tid`/`auth.id` through
`getClientThreadId`, add the missing `Authorization` header client-side) — but that would silently
resurrect a duplicate, unlinked messaging surface (comhub) alongside the already-working, already-hardened
one (`connect`), which is a product/architecture call, not a bug fix. Per this session's established
pattern (see W1's `wash-and-fold-nyc/_lib/push.ts` flag, ~02:55), I'm flagging instead of guessing which
of "delete `/portal/messages` + its route" vs. "wire it up properly to comhub" vs. "leave as dead code" is
intended.

## Suggested triage options for Jeff

1. Delete `src/app/portal/messages/page.tsx` + `src/app/api/portal/messages/route.ts` (and the comhub
   contact/thread helper glue it alone depends on, if unused elsewhere) — `connect` already does this job.
2. Or: if comhub-based portal messaging is still wanted (e.g. to unify with SMS/omnichannel threads),
   fix the auth mismatch (swap to `verifyPortalToken`, add `Authorization` header client-side, link it
   into nav) and decide how it coexists with `connect`.

No code changed. File-only, no push/deploy/DB.
