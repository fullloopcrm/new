# NONE+write routes — tenant-scope triage (18-of-19)

**Status:** READ-ONLY classification. No route code changed by this doc or its
research — the goal is a triage table for the leader to prioritize actual
fixes; W3's tenantDb-adoption work continues unblocked on these files.
**Author:** W2 (resolver lane). **Date:** 2026-07-12.
**Method:** Every route below was re-read from the current worktree (not
assumed from prior reports) — including `src/middleware.ts`'s header-injection
logic where a route depends on it. One finding here (`yinez/route.ts`,
§ below) reverses/upgrades a severity from the earlier
`platform/docs/tenantdb-none-write-routes.md` pass.

Source list: W1's `w1-route-tenant-filter-map.md` flagged 19 `NONE/UNCLEAR`
routes that perform writes — the true-priority subset of the 87-route flagged
queue. This doc covers all 19; **1 of the 19** (`chat/route.ts`) is now fully
tenantDb-migrated + signature-verified and needs no further action, leaving
**18 live classification rows** below (matching the leader's "18-of-19"
framing — `chat` is the one that's actually done).

## 0. Headline

**`yinez/route.ts` has a live, unauthenticated cross-tenant read path** — more
severe than the prior doc recorded (which only flagged it as "tenant
optional"). Details in row 19. Everything else confirms or refines the
existing classification; no other new CRITICAL findings.

## 1. Classification legend

- **needs-tenant-scope** — the route (or a specific write/delete in it) is
  missing a guard that would actually close a cross-tenant or IDOR gap. These
  are the real fix candidates.
- **endpoint-scoped-OK** — correctly scoped today: either genuinely
  cross-tenant by design (webhook/public-intake/test-harness) with the right
  guard already in place (signature, token, or explicit tenant filter), or a
  transitive/derived-tenant write where the derivation path is itself
  authenticated.
- **provisioning-path** — creates the tenant (or a pre-tenant identity), so
  there is no pre-existing `tenantId` to scope against by construction.

## 2. Table

| # | Route | Classification | `.eq(tenant_id)` guard genuinely missing? | Notes |
|---|---|---|---|---|
| 1 | `chat/route.ts` | **endpoint-scoped-OK — RESOLVED** | No | Fully `tenantDb(tenantId)`-scoped; tenant comes only from `verifyTenantHeaderSig(headerTenantId, sig)` (rejects unsigned/forged headers, 400). Caller-supplied `sessionId` is safe — `insertConversationMessage(..., {expectedTenantId})` rejects a conversation_id belonging to another tenant. **Correction:** prior doc called this "partial" (batch-1); current code is fully closed, no gap remains. |
| 2 | `client/preferred-cleaner/route.ts` | **needs-tenant-scope** (real gap is auth, not the `.eq`) | No — writes ARE correctly scoped to the tenant derived from `client_id` | GET/PUT take `client_id` from query/body with **zero authentication**. Tenant is derived circularly from the client row; the sub-check on `preferred_cleaner_id` correctly does `.eq('tenant_id', client.tenant_id)`. The actual hole: any caller who knows/guesses a `client_id` UUID can read a client's preferred cleaner + full "familiar cleaners" list, and **change** their preferred cleaner — no session required. Needs a client/portal session binding (same shape as `checkin`/`checkout`'s `verifyToken`), not a wrapper migration. |
| 3 | `client/recurring/route.ts` | **needs-tenant-scope** (auth gap, HIGH — creates real bookings + price) | No — `recurring_schedules`/`bookings`/`booking_team_members` all correctly stamp `tenant_id` from the (unauthenticated) derived tenant | Same shape as #2 but higher impact: `client_id` from body, no auth, tenant derived from that row. An unauthenticated caller can create a live 6-week recurring booking series (with real pricing) against **any** client, and silently overwrite that client's `preferred_team_member_id` (L72–77). Needs the same session binding as #2. |
| 4 | `leads/route.ts` | **endpoint-scoped-OK / provisioning-path (pre-tenant)** | N/A — no `tenant_id` column, public marketing intake by design | Correctly cross-tenant/tenant-less; a lead has no owner until claimed. Side note (not a tenant-scope issue): no rate-limiting on this insert, unlike `track`/`portal/auth` — spammable, flag for whoever owns abuse-hardening. |
| 5 | `portal/auth/route.ts` | **needs-tenant-scope — genuine gap found** | **Yes, one real miss** | `verify_code` path is correctly tenant-scoped throughout (`.eq('tenant_id', tenant.id)` on lookup + mark-used). But the `send_code` cleanup delete (L50–54) — `portal_auth_codes.delete().eq('phone', phone).eq('used', false)` — has **no `tenant_id` filter**. If the same phone is a client of two different tenants, requesting a code for tenant A deletes tenant B's still-valid pending code (cross-tenant interference / mini-DoS on their login flow). One-line fix: add `.eq('tenant_id', tenant.id)` to that delete. |
| 6 | `team-portal/15min-alert/route.ts` | **needs-tenant-scope** (auth gap — worse than previously documented) | No — the booking update is transitively tenant-safe (fetch by id) | **Zero authentication** — no `verifyToken`, no `team_member_id` field at all (unlike the prior doc's description). Just a bare `bookingId` from the POST body. Tenant is derived from the booking row, so no cross-tenant *data* leak, but anyone who knows/guesses a booking UUID can trigger a real client-facing "pay now" SMS + admin alerts on demand — a harassment/abuse vector, not an isolation leak. Needs either the portal `verifyToken` pattern (if team-triggered) or a `CRON_SECRET` check (if meant to be server-triggered only — it reads like the latter, given no `team_member_id`). |
| 7 | `team-portal/checkin/route.ts` | **endpoint-scoped-OK — RESOLVED** | No | Already tenantDb-migrated; `verifyToken` + `booking.team_member_id !== auth.id` ownership check before any write. Clean. |
| 8 | `team-portal/checkout/route.ts` | **endpoint-scoped-OK — RESOLVED** | No | Same pattern as checkin — tenantDb + `verifyToken` + ownership check. Clean. |
| 9 | `team-portal/messages/route.ts` | **needs-tenant-scope — CONFIRMED IDOR** | No — writes stamp `tenant_id` from the (unauthenticated) derived tenant | Re-verified, still true today: `team_member_id` comes straight from query/body with **no token check anywhere in the file**. `resolveThread()` derives tenant from that row. Any unauthenticated caller can read AND post to any team member's admin-comms thread. Needs the `verifyToken` binding before `resolveThread` runs. |
| 10 | `team-portal/update-phone/route.ts` | **endpoint-scoped-OK** (re-classified — prior doc undersold this) | No | Uses its own HMAC-signed magic-link token (`parseToken`: `teamMemberId.expiry.sig`, signed with `ADMIN_PASSWORD`) that cryptographically binds to one `teamMemberId` with an expiry — this is a real auth mechanism, not an open IDOR like the prior doc implied. Separate, smaller note: signing with the same secret as `ADMIN_PASSWORD` (reused across an unrelated purpose) is a key-hygiene smell worth a follow-up, but it is not a tenant-isolation gap. |
| 11 | `tenants/route.ts` | **provisioning-path** | N/A — no tenant exists yet | `getOwnerUserId()` (Clerk session) required; blocks double-membership via `tenant_members.clerk_user_id`; seeded `service_types` correctly stamp the freshly-created `tenant.id`. Clean. |
| 12 | `test/email-selena/cleanup/route.ts` | **endpoint-scoped-OK** | No | Gated by `SELENA_TEST_TOKEN` (404 if unset in env, 401 on bad key) + every query explicit `.eq('tenant_id', tenantId)`. Confirm `SELENA_TEST_TOKEN` stays unset in prod env (deploy-config concern, not code). |
| 13 | `test/email-selena/route.ts` | **endpoint-scoped-OK** | No | Same token gate; every client/conversation read/write is `.eq('tenant_id', tenantId)` or stamped `tenant_id: tenantId`. Clean. |
| 14 | `track/route.ts` | **endpoint-scoped-OK, with a flagged caveat** | Not a missing `.eq` (insert-only, no cross-tenant read) — but a missing binding | Public analytics beacon; `tenant_id` is nullable and taken **verbatim from the client body with no verification it matches `domain`** (unlike `chat/route.ts`'s signed-header pattern). No data is read cross-tenant, but an attacker can post `cta_clicked:true` + a victim's `tenant_id` + a fresh `session_id` per request (bypasses the 1-hr per-session dedupe) to email-bomb that tenant's `lead_notification_email` and pollute their analytics. Real gap, low-to-medium severity. Correct fix: resolve `tenant_id` server-side from `domain`, don't trust the client value. |
| 15 | `webhooks/clerk/route.ts` | **endpoint-scoped-OK** | N/A — `tenant_members` intentionally global, keyed by `clerk_user_id` | Svix-signature verified (env off-switch is a dev escape hatch — confirm it's never left off in prod). Correct by design. |
| 16 | `webhooks/resend/route.ts` | **endpoint-scoped-OK** | No | Svix-verified; `campaign_recipients`/`campaigns` mutated by row-id after a unique `resend_email_id` lookup (transitively safe, external id is globally unique). |
| 17 | `webhooks/telegram/route.ts` | **endpoint-scoped-OK for tenant isolation** (separate non-tenant flag) | N/A — single hardcoded `NYCMAID_TENANT_ID` sentinel, no cross-tenant surface | Not a tenant-scope gap, but genuinely verified missing: **no Telegram signature/secret-token check** (`X-Telegram-Bot-Api-Secret-Token`) — the only gate is an env-allowlisted `chatId`, which is spoofable by anyone who discovers the (unlisted) webhook URL. Out of this triage's core ask, flagging since I verified it directly. |
| 18 | `webhooks/telnyx/route.ts` | **endpoint-scoped-OK** | No | `verifyTelnyx` signature-gated; tenant resolved via `telnyx_phone`/message-id lookups (Telnyx-controlled values, not attacker input); every downstream write correctly `.eq('tenant_id', tenantId)`. Re-verified, matches prior doc. |
| 19 | `yinez/route.ts` | **needs-tenant-scope — CONFIRMED LIVE GAP (most severe in this batch)** | **Yes** | See §3 below — this is the headline finding. |

## 3. `yinez/route.ts` — confirmed live cross-tenant read

Unlike its sibling `chat/route.ts`, this route does **not** call
`verifyTenantHeaderSig`. It just reads `req.headers.get('x-tenant-id')` raw
(L33) and uses it directly:

```ts
const reqTenantId = req.headers.get('x-tenant-id')
if (reqTenantId) insertData.tenant_id = reqTenantId
if (phone && reqTenantId) {
  const { data: client } = await supabaseAdmin
    .from('clients')
    .select('id, name')
    .eq('tenant_id', reqTenantId)      // reqTenantId is unverified
    .ilike('phone', `%${digits}%`)
    .limit(1).single()
  ...
}
```

I traced `src/middleware.ts` to check whether this header can actually be
forged in practice (not just in theory):

- On a **tenant subdomain or custom domain**, `middleware.ts` calls
  `rewriteToSite()`, which **always** strips any caller-supplied
  `x-tenant-sig` and injects its own signed `(x-tenant-id, x-tenant-sig)`
  pair (L322–325, L353–356, etc.) — so on that path the header is
  trustworthy even though this route doesn't check the signature.
- On the **main host** (`homeservicesbusinesscrm.com`, `fullloopcrm.com`,
  `platform-ten-psi.vercel.app`, `localhost`) — the "Main site / dashboard"
  branch (L250+) — middleware does **not** touch `x-tenant-id`/`x-tenant-sig`
  at all. And `/api/yinez(.*)` is explicitly listed in `isPublicRoute` (so it
  skips Clerk auth entirely) and the main host is directly internet-reachable.

So: `curl -X POST https://homeservicesbusinesscrm.com/api/yinez -H "x-tenant-id: <any-tenant-uuid>" -d '{"message":"hi","phone":"5551234567"}'` reaches this code with an attacker-chosen `x-tenant-id` that was never verified — the exact attack `chat/route.ts`'s own inline comment says it exists to close ("POST /api/chat with body.tenantId targeting any tenant would otherwise let an attacker impersonate them"). Effect here: cross-tenant **client name lookup by phone number** (enumerate phone numbers against any tenant, get back the client's name embedded in the chat reply/booking_checklist).

I found no current frontend caller of `/api/yinez` in `src/` — `chat/route.ts` already has the same `askYinez` NYC-Maid branch built in, so this route may be a superseded predecessor. That does not reduce exposure: it is still a deployed, whitelisted-public, unauthenticated API route reachable by direct HTTP regardless of frontend usage.

**Recommendation for whoever picks this up:** either delete `yinez/route.ts` if `chat/route.ts` has fully superseded it, or backport the identical `verifyTenantHeaderSig(headerTenantId, sig)` guard `chat/route.ts` already uses. Did not touch route code — read-only pass per the leader's order.

## 4. Summary counts

- **RESOLVED / no action needed:** 3 (`chat`, `team-portal/checkin`, `team-portal/checkout`)
- **provisioning-path:** 1 (`tenants`)
- **endpoint-scoped-OK (correctly guarded, by design or by existing token):** 10 (`leads`, `team-portal/update-phone`, `test/email-selena` x2, `track` — with caveat, `webhooks/{clerk,resend,telegram,telnyx}`)
- **needs-tenant-scope (real gap, ranked by severity):**
  1. `yinez/route.ts` — unauthenticated cross-tenant client-name read (LIVE, main-host reachable)
  2. `client/recurring/route.ts` — unauthenticated caller creates real bookings + overwrites client data
  3. `team-portal/messages/route.ts` — unauthenticated read/write on any member's comms thread
  4. `client/preferred-cleaner/route.ts` — unauthenticated read/write of a client's preferred cleaner
  5. `team-portal/15min-alert/route.ts` — unauthenticated trigger of client-facing payment SMS (abuse, not a data leak)
  6. `portal/auth/route.ts` — one missing `.eq('tenant_id', ...)` on the OTP-cleanup delete (cross-tenant OTP interference)

Four of these six are auth gaps (caller-supplied id, no session/token), not missing `.eq(tenant_id)` clauses — the wrapper migration W3 is doing elsewhere would not close them; they need a real auth binding. Only #6 (`portal/auth`) is a literal one-line missing tenant filter. #1 (`yinez`) is the only one immediately live on the public internet without any prerequisite (no UUID-guessing needed beyond the tenant id itself, which is not treated as a secret elsewhere in this codebase).
