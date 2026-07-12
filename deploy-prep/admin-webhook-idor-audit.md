# IDOR / Authz Audit — ADMIN + WEBHOOK routes

**Author:** W6 · **Scope:** every route under `platform/src/app/api/admin*`, `platform/src/app/api/webhooks/*` (129 route files). Distinct surface from W1 (billing) and W4 (selena). **No code changed** except one witness-test file (below). One route flagged for the leader; **no route edits made**.

**Method:** read the auth model end-to-end, then classified every route by which principal can reach it, then checked every by-id (`.eq('id', …)`) read/write for a sibling tenant scope. IDOR is only *exploitable* on routes a **tenant operator** (not the trusted platform owner) can reach.

---

## The auth model (verified by reading source, not assumed)

Three gates, three principals:

| Gate | Helper | Principal | Cross-tenant? |
|---|---|---|---|
| Super-admin | `requireAdmin()` → `verifyAdminToken()` | Global platform owner (Jeff). Token `role:'super_admin'`, one shared `ADMIN_PIN`. | **By design** — god-mode over all tenants. |
| Tenant operator | `requirePermission(p)` / `getTenantForRequest()` | Any tenant's member (PIN `tenant_admin` token bound to one tenant, or Clerk membership). | **No** — `tenantId` is always server-derived. |
| Internal | `x-internal-key` == `INTERNAL_API_KEY` | Automated reconcilers. | N/A |

Two facts make the admin surface robust and were confirmed in source:

1. **`verifyAdminToken()` returns true *only* for `role === 'super_admin'`** (`admin-auth/route.ts`). A per-tenant `tenant_admin` token can **never** pass a `requireAdmin()` gate — they are validated by a separate `verifyTenantAdminToken(token, expectedTenantId)` that also rejects a token minted for a different tenant. So `requireAdmin`-gated routes have **no IDOR**: the only caller is the fully-trusted owner, for whom cross-tenant access is the intended behavior.

2. **`getTenantForRequest()` never reads a tenant id from the request body or params.** It derives `tenantId` from: impersonation cookie + super-admin token; a middleware-signed `x-tenant-id` header (domain) + admin/tenant token; or Clerk membership lookup. A tenant operator therefore *cannot* obtain a `tenantId` other than their own. IDOR on these routes is possible **only** if the handler then queries `.eq('id', <param>)` on a tenant-owned table **without** a paired `.eq('tenant_id', tenantId)`.

Middleware (`src/middleware.ts`) marks `/api/admin(.*)` and `/api/webhooks(.*)` as **Clerk-public** — each route must self-enforce. Confirmed only **one** admin route lacks any recognizable self-gate: `admin/google/callback` — and it validates a signed OAuth `state` (`verifyOAuthState`) instead of a session, which is correct for an OAuth callback.

---

## Findings, ranked

### 1 — HIGH · REAL · **NEW** — per-tenant Telegram webhook: null `telegram_chat_id` = no auth at all
`platform/src/app/api/webhooks/telegram/[tenant]/route.ts`

The only request authentication is:
```ts
if (tenant.telegram_chat_id && String(chatId) !== String(tenant.telegram_chat_id)) { reject }
```
The `&&` short-circuits when `telegram_chat_id` is **NULL** — the default state for a tenant that has provisioned a bot token but not yet registered its owner chat. In that state the reject branch is skipped and there is **no `X-Telegram-Bot-Api-Secret-Token` check anywhere** in the route. A caller who knows the tenant **slug** (it is in the public webhook URL, and usually the tenant's own domain) can POST a forged update with an **arbitrary** `chat.id` and reach `askSelena(...)`.

Severity driver: the route calls `askSelena` with `ownerPhone()` (route header: *"reaching this bot … IS the auth"*), so a forged request runs the agent with **owner-level tools** (DB read/write, outbound SMS/Telegram) scoped to the victim tenant — no chat_id to guess.

- **Witness test (passing, documents current behavior):** `platform/src/app/api/webhooks/telegram-tenant-auth-bypass.witness.test.ts` — a forged update with an attacker-chosen chat_id and no/ wrong secret token reaches `askSelena`. Should start failing once a fail-closed secret-token gate is added.
- **Distinct from** the existing `telegram-auth-bypass.witness.test.ts`, which covers the **global** owner bot (`telegram/route.ts`), a body-supplied-chat_id-as-bearer gap. This per-tenant route is strictly worse (null chat_id → *zero* gate).
- **Fix direction (SPEC only — not applied, flagged for leader):** verify a per-tenant `X-Telegram-Bot-Api-Secret-Token` set at `setWebhook` time, fail-closed; keep the chat_id check as a second authorization layer. This is the same mechanism as, and should be folded into, `webhook-auth-throttle-guard-spec.md` Finding 2 (which currently covers only the global route) — plus an unconditional `rateLimitDb` ceiling per the P2 pattern.

### 2 — HIGH · REAL · already-specced — telnyx-voice signature verification is OPTIONAL
`platform/src/app/api/webhooks/telnyx-voice/route.ts` (~line 387) verifies the Telnyx ed25519 signature **only if `TELNYX_PUBLIC_KEY` is set**; unset ⇒ unauthenticated, and all writes are bound to a hardcoded `NYCMAID_TENANT_ID`. Not cross-tenant IDOR (single hardcoded tenant), but an unauthenticated-write / financial-DoS gap. **Already documented** in `webhook-auth-throttle-guard-spec.md` (Finding 1, NOT APPLIED) and witnessed by `telnyx-voice-failopen.witness.test.ts`.

### 3 — MEDIUM · REAL · already-specced — telegram/telnyx-SMS request auth + throttle
Global `telegram/route.ts` (body-only chat_id, no secret token) and the SMS `telnyx/route.ts` kill-switch path. **Already documented**: `webhook-auth-throttle-guard-spec.md` Finding 2 + `telnyx-sms-verify-killswitch-guard-spec.md`; witnessed by `telegram-auth-bypass.witness.test.ts`.

### 4 — LOW · chained-trust, not exploitable today — comhub contact notes update by FK without re-scope
`admin/comhub/contacts/[id]/notes/route.ts` fetches the contact **tenant-scoped** (`.eq('id', id).eq('tenant_id', tenantId)`), then updates `clients` by `contact.client_id` **without** a `.eq('tenant_id', …)`. Safe *today* because `client_id` came from an already-tenant-verified row; would only break under a data-integrity violation (a contact pointing at another tenant's client). Also this route is `requireAdmin`-gated (super-admin only), so no tenant-operator reach. **Note, not a fix blocker.** Defense-in-depth: add `.eq('tenant_id', tenantId)` to the `clients` update.

---

## What was checked and came back CLEAN (evidence of coverage, not omission)

Every **tenant-operator-reachable** admin route with an id-keyed read/write was read and confirmed to pair `.eq('id', …)` with `.eq('tenant_id', tenantId)` on the same query:

- `admin/users/[id]`, `admin/users/[id]/pin`, `admin/users/route` — `requirePermission('settings.edit')`, all scoped.
- `admin/recurring-schedules/[id]` + `/pause` `/regenerate` `/exception`, and `recurring-schedules/route` (creates verify the `client_id` belongs to the tenant first, comment *"prevents cross-tenant writes"*).
- `admin/reviews`, `admin/schedule-issues`, `admin/travel-times` (both `clients` geocode-writes scoped), `admin/payments/confirm-match` (both lookups scoped), `admin/cleanup-phones`.
- `admin/ai-chat` — LLM tool-calling; **every** `update_booking`/`cancel_bookings`/`update_client`/`get_client_details` tool scopes by `tenantId` derived from `getTenantForRequest()`.
- Mass-messaging (`send-apology-batch`, `find-cleaner/send`, `message-applicants/send`) — recipient lists scoped by `tenantId`; no cross-tenant fan-out.

`requireAdmin`-gated super-admin routes (`businesses/[id]/*`, `tenants/[id]`, `prospects/[id]`, `announcements/[id]`, `impersonate`, `businesses/[id]/site-export`, `businesses/[id]/users`) are cross-tenant **by design** and correctly gated — confirmed `requireAdmin()` on each. No IDOR.

Webhooks verify provider signatures and resolve tenant from **signed** data (`stripe.webhooks.constructEvent`, `verifyTelnyx`, `verifySvix`) or a phone/slug lookup, then write with the resolved `tenant_id`. `stripe`/`stripe-platform` use `metadata.tenant_id` / `client_reference_id` echoed back inside the signed event — trusted, not attacker-forgeable.

**Bottom line:** the admin/webhook by-id surface is disciplined and free of exploitable cross-tenant IDOR. The one **new** real gap is Finding 1 (per-tenant Telegram null-chat_id bypass); the rest are already-specced webhook-auth items. No route was edited; Finding 1's fix is flagged for the leader before any route change.
