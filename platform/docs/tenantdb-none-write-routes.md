# tenantDb() — the 16 NONE+write routes that are NOT wrapper-shaped

**Status:** reference / review queue. **Owner:** resolver lane (W2). **Date:** 2026-07-11.

Context: `tenantDb(tenantId)` (see `src/lib/tenant-db.ts`) makes the safe path the
default by auto-scoping every query to a **trusted** `tenantId`. It only adds
isolation when the `tenantId` is a real trust boundary established *before* the
query (a session, a signed header, or an HMAC-bound token).

During the tenantDb rollout (batches 1–6) the flagged queue included **19
NONE/UNCLEAR routes that perform writes** (W1's `w1-route-tenant-filter-map.md`).
Three were genuinely wrapper-shaped and were migrated in batch-1
(`team-portal/checkin`, `team-portal/checkout` — member id is HMAC-bound in the
portal token; `chat` — partial). The remaining **16 are structurally NOT
tenantDb-shaped**: for each, the `tenantId` is either an *output* of the query,
absent at entry, or derived from a caller-supplied id — so `tenantDb(x)` is a
no-op or circular. **Forcing the wrapper here is theater, not isolation.** Do
not migrate these; give each the correct per-route guard below.

Legend for "why not wrapper-shaped":
- **circular** — `tenantId` is read *from* the row the route then writes (caller
  supplies the row id), so scoping to it protects nothing.
- **output** — `tenantId` is resolved *by* a lookup keyed on an external id; it
  doesn't exist at request entry.
- **pre-tenant** — no tenant exists yet at this point in the lifecycle.

---

## A. External webhooks (4) — trust boundary = signature, not a session

| Route | Writes | Why not wrapper-shaped | Correct guard |
|---|---|---|---|
| `webhooks/telnyx` | notifications, campaign_recipients, campaigns, clients (update) | **output** — tenant resolved by global lookup on `telnyx_phone` / `telnyx_message_id` after verifying the Telnyx signature | Verify Telnyx webhook signature (the real gate); keep the global-id lookups exact-match; SMS/money-critical — signature verification must stay airtight. tenantDb adds nothing (tenant came from the looked-up row). |
| `webhooks/resend` | campaign_recipients, campaigns (update) | **output** — tenant resolved from `resend`/campaign id in the verified payload | Verify Resend signature; update by the resolved recipient/campaign id. |
| `webhooks/telegram` | notifications (insert) | **output** — tenant resolved from the chat/bot mapping in the verified update | Verify Telegram secret token; resolve tenant from the bot→tenant map. (`webhooks/telegram/[tenant]` is the token-scoped variant.) |
| `webhooks/clerk` | tenant_members (update) | **output** — keyed on `clerk_user_id`, a GLOBAL identity map by design | Verify Clerk/svix signature; `tenant_members` is intentionally keyed by global `clerk_user_id`. Do NOT add a tenant filter — it would break the identity mapping. |

## B. Pre-session / provisioning (3) — no trusted tenantId exists yet

| Route | Writes | Why not wrapper-shaped | Correct guard |
|---|---|---|---|
| `portal/auth` | portal_auth_codes (update/delete) | **pre-tenant** — issues/consumes one-time login codes *before* a tenant session exists | Rate-limit + short code TTL + single-use consume (fail-closed on the throttle — already hardened by W4). No tenant to scope by. |
| `tenants` | service_types (insert), tenant_members | **pre-tenant** — this route CREATES the tenant; there is no pre-existing id | Platform-admin / super-admin auth; stamp the freshly-created tenant id onto the seeded rows. tenantDb is circular (tenant doesn't exist until this runs). |
| `yinez` | sms_conversations (insert) | tenant is **optional** here (wrapper throws without an id) | Scope only when a tenant is resolved; the route tolerates the no-tenant path by design. |

## C. Public intake / platform tables (2) — cross-tenant by design

| Route | Writes | Why not wrapper-shaped | Correct guard |
|---|---|---|---|
| `leads` | leads (insert) | **pre-tenant** — public lead capture; a lead has no owning tenant until claimed | Input validation + rate-limit + honeypot; tenant assigned on claim, not at intake. |
| `track` | lead_clicks (insert/update) | **pre-tenant** — referrer/click tracking captured before attribution | Validate the tracking token; attribution assigns tenant later. No in-request tenant filter. |

## D. Caller-supplied id → derived tenant (5) — **IDOR-class, needs real auth**

These take an entity id straight from the request (body/query) with **no token
verification**, then derive `tenantId` from that row. `tenantDb(derivedTenant)`
is a no-op: an attacker supplies another tenant's id and the route "scopes" to
that tenant. The fix is an **auth binding**, not the wrapper.

| Route | Writes | Correct guard |
|---|---|---|
| `client/preferred-cleaner` | clients, client_preferred_* (update) | Bind to an authenticated client/portal session (signed portal token) so `client_id` can't be an arbitrary UUID. Currently reads/writes any client by caller-supplied `client_id`. |
| `client/recurring` | clients, booking_team_members (upsert) | Same — require a signed client/portal token before trusting `client_id`. |
| `team-portal/15min-alert` | bookings (update) | Require the verified team-portal token (`auth.tid`, HMAC-bound) like `checkin`/`checkout`; then the member/booking id is trusted and tenantDb becomes valid. Today `team_member_id` is unauthenticated. |
| `team-portal/messages` | comhub_contacts, comhub_threads (update), comhub_messages (insert) | Same — `team_member_id` comes from the request body with no token check; an unauthenticated caller can read/post to any member's thread. Require the portal token, THEN scope. |
| `team-portal/update-phone` | team_members (update) | Same — verify the portal token before allowing a member to change their phone. |

> **Follow-up for the leader:** the five Section-D routes are the real security
> value here — they are unauthenticated writes gated only by a guessable id.
> Once they gain a verified token (the `checkin`/`checkout` pattern), they become
> straightforward tenantDb migrations. This is an auth change, out of scope for a
> file-only wrapper batch.

## E. Test-only routes (2) — should not ship enabled

| Route | Writes | Correct guard |
|---|---|---|
| `test/email-selena` | sms_conversations (update) | Gate behind a non-production env check (or remove from the prod build). Not a tenant-isolation concern. |
| `test/email-selena/cleanup` | sms_conversations (delete) | Same — test fixture teardown; ensure it can't run against prod data. |

---

### Note on `sms_conversation_messages` (learned during batch-6)
This table is in `TENANT_TABLES` (it HAS a `tenant_id` column) but **no insert
anywhere stamps it** — every row is written scoped only by `conversation_id`
(the conversation is tenant-owned). Its rows therefore have `tenant_id = NULL`.
Routing a read of this table through `tenantDb` would add `.eq('tenant_id', …)`
and return **zero rows**, breaking SMS/Selena. Until a backfill stamps
`tenant_id` on message rows, keep `sms_conversation_messages` reads/inserts on
`supabaseAdmin` (scoped via the tenant-verified `conversation_id`). Optional
future hardening: stamp `tenant_id` on message inserts + backfill, then the
table becomes wrapper-safe.
