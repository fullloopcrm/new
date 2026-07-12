# Secrets Inventory & Rotation Plan

**Worker:** W6 · **Branch:** p1-w6 · **Date:** 2026-07-12
**Scope:** Docs-only. A complete inventory of every secret the platform reads from the environment (plus the
per-tenant vendor keys stored encrypted in Postgres): **where it lives, how to rotate it, its blast radius, and
whether rotation is breaking**. No code, env, keys, or DB rows were changed. This extends
[`secrets-at-rest-audit.md`](./secrets-at-rest-audit.md) (which drills into `SECRET_ENCRYPTION_KEY` specifically)
to the *whole* secret surface.

---

## TL;DR

- **~100 distinct `process.env.*` names** are referenced across `platform/src`. Roughly **45 are secrets**
  (rotation-sensitive), the rest are public config (`NEXT_PUBLIC_*`), feature toggles, or non-secret tuning.
- **The single most dangerous rotation remains `SECRET_ENCRYPTION_KEY`** — rotating it is a *breaking outage*
  with no re-encryption tooling (mass GCM-decrypt failure across all tenants). See the dedicated audit; it is
  reproduced in the "breaking on rotation" table below as item #1.
- **Storage is not centrally documented.** `platform/.env.example` lists ~13 of the ~45 secrets. The runtime
  source of truth is the host env (Vercel project env vars in prod; `platform/.env.local` in dev) plus each
  **provider dashboard** (Stripe/Telnyx/Resend/Clerk/Google/Anthropic) and, for per-tenant vendor keys, the
  **`tenants` table** (encrypted). No one file enumerates all of them — this doc is the first attempt.
- **Nine secrets are breaking-on-rotation** (require coordination, cause invalidation, or cause an outage if
  rotated naively). The rest are "create-new → swap → revoke-old" and are non-breaking if done in that order.
- **Honesty / method:** the env-var list is `grep -rhoE "process\.env\.[A-Z0-9_]+" src` (verified, appendix).
  Usage/blast-radius claims for the signing secrets (`PORTAL_SECRET`, `TEAM_PORTAL_SECRET`, `ADMIN_TOKEN_SECRET`,
  `TENANT_HEADER_SIG_SECRET`, `INGEST_SECRET`, `CRON_SECRET`) are **code-verified** (I read the token/HMAC
  helpers). Claims for vendor keys are grounded in how each is consumed (Bearer token / SDK client) plus the
  provider's documented rotation model. I did **not** open the live Vercel dashboard or the prod DB, so the
  *current provisioned value* of any secret is out of scope — this is the rotation *plan*, not a live audit of
  what is set.

---

## 1. Storage model — where secrets actually live

| Tier | Location | Which secrets | Source of truth? |
|---|---|---|---|
| **A. Runtime env (prod)** | Vercel project env vars | All `process.env.*` secrets | Runtime authority; mirrors B or C |
| **B. Local dev env** | `platform/.env.local` (git-ignored) | Same set for local runs | Dev only |
| **C. Provider dashboards** | Stripe, Telnyx, Resend, Clerk, Google, Anthropic, Vercel | Vendor API keys + webhook signing secrets | **Real** source of truth for those |
| **D. Postgres `tenants` table** | Encrypted columns (`ENCRYPTED_TENANT_FIELDS`) | **Per-tenant** vendor keys | Ciphertext at rest; key = `SECRET_ENCRYPTION_KEY` |
| **E. Documented** | `platform/.env.example` | ~13 of ~45 | **Incomplete** (gap) |

**Gap (carried from `secrets-at-rest-audit.md` GAP 2):** `.env.example` documents only a subset. Critically,
`SECRET_ENCRYPTION_KEY` is **not** in `.env.example` or `ENV-VARS-FOR-CUTOVER.md`, which is exactly the var
whose absence causes silent plaintext-at-rest. Recommendation (not applied): make `.env.example` the complete
list of *names* (never values), grouped as below.

**Two secret scopes exist and must not be confused:**
- **Platform/global secrets** — one value for the whole deployment, read from env (e.g. `STRIPE_SECRET_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`). Legacy single-tenant `NYCMAID_*` keys also live here.
- **Per-tenant vendor secrets** — one value *per tenant*, stored **encrypted in Postgres**
  (`stripe_api_key`, `telnyx_api_key`, `resend_api_key`, `imap_pass`, `anthropic_api_key`, `indexnow_key`,
  `telegram_bot_token`). Rotating one tenant's key is a per-tenant DB write (leader-run after Jeff approves,
  never a worker prod write); rotating `SECRET_ENCRYPTION_KEY` re-keys *all* of them at once (the breaking case).

---

## 2. The breaking-on-rotation set (rotate with a runbook, not ad hoc)

These nine **cannot** be rotated by "paste new value, redeploy" without breakage. Ordered by severity.

| # | Secret | Why rotation breaks | Safe procedure |
|---|---|---|---|
| 1 | **`SECRET_ENCRYPTION_KEY`** | Every `v1:` envelope was sealed with the old key; new key → GCM auth fails → `decryptSecret()` throws on **every** tenant's Stripe/Telnyx/Resend/Anthropic/IMAP/Telegram key → all money+comms paths 500. **No key id, no re-encrypt script.** | Blocked until keyring (`kid` envelope) + offline re-encrypt job exist. See `secrets-at-rest-audit.md` §5. Until then: rotation = downtime + manual re-entry of every tenant secret. **Do not rotate casually.** |
| 2 | **`PORTAL_SECRET`** | HMAC key for client-portal session tokens (`createToken`/`verifyPortalToken`, 24h exp). Rotate → every outstanding token fails `sig !== expected` → all portal clients logged out. | Self-healing within 24h (tokens expire anyway). Rotate at a low-traffic window; expect a re-auth wave. **Never** fall back to `SUPABASE_SERVICE_ROLE_KEY` (the helper throws to prevent a signature-oracle — keep it that way). |
| 3 | **`TEAM_PORTAL_SECRET`** | Same HMAC pattern for the team/referrer portal (`referrer-portal-auth.ts`, `team-portal/auth/token.ts`). | Same as #2 — re-auth wave, self-heals on token expiry. |
| 4 | **`ADMIN_TOKEN_SECRET`** | Signs admin-auth + impersonation tokens (`admin-auth`, `admin/impersonate`) **and** is the fallback key for `TENANT_HEADER_SIG_SECRET`. Rotate → active impersonation sessions invalidated **and** any tenant-sig minted under the fallback stops verifying. | Rotate at low traffic; admins re-auth. If `TENANT_HEADER_SIG_SECRET` is unset (fallback in use), see #5 — deploy atomically. |
| 5 | **`TENANT_HEADER_SIG_SECRET`** | Middleware signs `x-tenant-sig`; route handlers verify it. Secret lives only in the deployment; sigs are minted per-request, not persisted. **Breaking only if middleware and handlers run with different values** (mid-deploy skew). Fallback chain: `TENANT_HEADER_SIG_SECRET` → `ADMIN_TOKEN_SECRET` → `PORTAL_SECRET`. | **Non-breaking if the whole deployment cuts over atomically** (one Vercel deploy = one env snapshot). Do not rotate this and `ADMIN_TOKEN_SECRET`/`PORTAL_SECRET` such that the resolved value changes between middleware and handler builds. |
| 6 | **Webhook signing secrets** — `STRIPE_WEBHOOK_SECRET`, `STRIPE_PLATFORM_WEBHOOK_SECRET`, `RESEND_WEBHOOK_SECRET`, `CLERK_WEBHOOK_SECRET` | Inbound webhooks are HMAC-verified against these. Rotate the value while the provider still signs with the old one → signature check fails → events rejected/lost during the window. | Use the provider's **dual-secret / rollover** support (Stripe & Clerk allow multiple active signing secrets): add new, deploy env with new, then remove old at the provider. Never a hard swap. |
| 7 | **`CRON_SECRET`** | Bearer check on cron endpoints (`api/cron/*`, `admin/system-check`). Rotate env without updating the scheduler → cron calls 401 and silently stop. | Update the scheduler (Vercel cron config / external caller) **in the same change** as the env var. |
| 8 | **`INGEST_SECRET`** | Bearer check in `middleware.ts` for `api/ingest/lead` + `api/ingest/application` (external lead/application posters). Rotate → third-party posters 401 until they update. | Coordinate with every external integrator before rotating; consider accepting old+new for a bridge window (requires a small code change — flag to leader). |
| 9 | **DB god-keys** — `SUPABASE_SERVICE_ROLE_KEY` (+ `FULLLOOP_*`, `NYCMAID_*` variants), `FULLLOOP_DB_URL` | Every server DB call uses the service role; the DB URL embeds the password. Rotate at the provider without updating env → total DB outage. | Rotate at Supabase, paste new into Vercel env, redeploy — brief window; do at low traffic. `FULLLOOP_DB_URL` password rotation must land in the same deploy. |

---

## 3. Non-breaking secrets — "create-new → swap → revoke-old"

Vendor API keys generally support **overlapping keys**: mint a new one at the provider, deploy it, verify, then
revoke the old one. Zero downtime when done in that order.

| Secret | Where stored | Rotation | Blast radius if leaked |
|---|---|---|---|
| `STRIPE_SECRET_KEY` | Stripe dashboard → env | Roll key in Stripe, swap env, revoke old | **Critical** — full payments/account access. Roll immediately on any exposure. |
| `TELNYX_API_KEY` (+ `NYCMAID_TELNYX_KEY`) | Telnyx → env | New API key, swap, delete old | SMS/voice send on your number → toll fraud + spoofing. |
| `RESEND_API_KEY` (+ `NYCMAID_RESEND_KEY`) | Resend → env | New key, swap, revoke | Send email as your domain → phishing/deliverability harm. |
| `ANTHROPIC_API_KEY` | Anthropic console → env | New key, swap, revoke | Metered spend (bill), not data-at-rest. Cap with usage limits. |
| `CLERK_SECRET_KEY` | Clerk → env | Rotate in Clerk, swap | Full auth backend access. Pair with `CLERK_WEBHOOK_SECRET` (#6). |
| `GOOGLE_CLIENT_SECRET` | Google Cloud console → env | Regenerate, swap | OAuth client impersonation (reviews/GBP). |
| `FACEBOOK_APP_SECRET` | Meta app dashboard → env | Regenerate, swap | App impersonation. |
| `GSC_SERVICE_ACCOUNT_JSON` / `_PATH` | GCP service account key | Create new key, swap, delete old | Search Console API access for connected properties. |
| `SERPER_API_KEY`, `RADAR_API_KEY` (+ `NEXT_PUBLIC_RADAR_API_KEY`) | Provider → env | New key, swap | Metered spend. **`NEXT_PUBLIC_RADAR_API_KEY` ships to the browser by design** — treat as a scoped/publishable key, not a secret; if the private `RADAR_API_KEY` differs, keep them distinct. |
| `TELEGRAM_BOT_TOKEN`, `JEFE_BOT_TOKEN` | BotFather → env | `/revoke` in BotFather issues new token | Full control of the bot (send/read messages). |
| `VAPID_PRIVATE_KEY` | Generated pair | Regenerate pair (public+private together) | Web-push signing; rotating invalidates existing push subscriptions (mild breakage — re-subscribe). |
| `EMAIL_PASS` (SMTP) | Mailbox provider → env | Rotate mailbox app-password | IMAP/SMTP mailbox access. |
| `VERCEL_API_TOKEN`, `VERCEL_DEPLOY_TOKEN`, `VERCEL_DEPLOY_HOOK_SECRET` | Vercel account → env | Revoke+recreate in Vercel | Deploy/infra control — **high**. Scope tokens minimally. |
| `INTERNAL_API_KEY` | env (service-to-service) | New value, update both caller+callee | Internal endpoint access (`payments/finalize-match`). |
| `ADMIN_PASSWORD`, `ADMIN_PIN`, `ADMIN_AUTH_SECRET` | env | New value, redeploy | Admin console access — rotate on any staff change. |
| `ELCHAPO_MONITOR_KEY`, `SELENA_TEST_TOKEN` | env | New value | Monitoring/test-only access; low, but revoke if unused. |

**Webhook *verify* toggles** — `CLERK_WEBHOOK_VERIFY`, `RESEND_WEBHOOK_VERIFY`, `TELNYX_WEBHOOK_VERIFY`,
`IMPERSONATION_ALLOW_UNSIGNED` — read as **boolean flags**, not secrets. They gate whether signature
verification is enforced. Not rotation-sensitive, but **security-sensitive**: shipping prod with any verify
flag off (or `IMPERSONATION_ALLOW_UNSIGNED=true`) disables a signature check. Flag for the cutover checklist,
not for rotation. `TELNYX_PUBLIC_KEY` is Telnyx's *public* signing key (used to verify inbound webhooks) — not
a secret, but must track Telnyx's current key.

---

## 4. Per-tenant vendor keys (Postgres, encrypted)

The 7 `ENCRYPTED_TENANT_FIELDS` columns hold each tenant's own vendor keys, encrypted under
`SECRET_ENCRYPTION_KEY`. Rotation semantics differ from env secrets:

- **Rotating one tenant's key** (e.g. they issued a new Stripe key): the tenant re-enters it in settings; the
  write path re-encrypts. No global impact. If done as a bulk correction, it is a **prod DB write** → prepared
  as a file, run by the leader after Jeff approves (never a worker write).
- **Rotating `SECRET_ENCRYPTION_KEY`** re-keys the envelope for *all* of them at once — the breaking case (#1).
- **Leak of a tenant's stored key**: blast radius is that tenant only — *unless* they are on legacy plaintext
  (`secrets-at-rest-audit.md` GAP 1/5), in which case the key may also have shipped to the browser via
  `GET /api/settings`. Rotate at the vendor and re-enter.

---

## 5. Recommended rotation cadence (proposal — leader/Jeff decide)

| Class | Cadence | Trigger-based (rotate immediately) |
|---|---|---|
| DB god-keys, Stripe, Clerk | Annually + on any staff offboarding | Any suspected exposure, laptop loss, repo leak |
| Other vendor API keys | Annually | Provider breach notice, unexpected spend |
| Signing secrets (portal/admin/cron/ingest) | Annually | Staff offboarding, suspected token forgery |
| Webhook signing secrets | With provider rollover only | Provider rotates, or suspected replay |
| `SECRET_ENCRYPTION_KEY` | **Blocked** until keyring+re-encrypt tooling | Only via the (not-yet-built) safe procedure |

---

## 6. Gaps & recommendations (docs only — nothing applied)

| # | Gap | Severity | Fix direction |
|---|---|---|---|
| A | No safe rotation path for `SECRET_ENCRYPTION_KEY` (no `kid`, no re-encrypt job) | **HIGH** | Keyring + `v2:<kid>:…` envelope + offline re-encrypt script (leader-run) |
| B | `.env.example` documents ~13 of ~45 secrets; `SECRET_ENCRYPTION_KEY` absent | HIGH | Make `.env.example` the complete list of *names* (no values) |
| C | No single inventory of secrets → provisioning gaps likely at cutover | MEDIUM | This file becomes the source-of-truth; wire into `CUTOVER-CHECKLIST.md` |
| D | `INGEST_SECRET`/`CRON_SECRET` hard-swap breaks external callers | MEDIUM | Accept old+new during a bridge window (small code change) |
| E | Verify toggles (`*_WEBHOOK_VERIFY`, `IMPERSONATION_ALLOW_UNSIGNED`) can silently disable signature checks | MEDIUM | Assert "verify ON" in the cutover checklist |
| F | Duplicate/legacy key families (`NYCMAID_*`, `FULLLOOP_*`, `SUPABASE_*`) increase rotation surface | LOW | Consolidate post-cutover; document which is authoritative |

---

## Appendix — verification commands used

```
grep -rhoE "process\.env\.[A-Z0-9_]+" src platform | sort -u        # full env-var name list
sed -n '1,60p' src/app/api/portal/auth/token.ts                     # PORTAL_SECRET = HMAC session token (24h exp)
sed -n '1,40p' src/lib/tenant-header-sig.ts                         # TENANT_HEADER_SIG_SECRET + fallback chain
grep -rln "CRON_SECRET|INGEST_SECRET|ADMIN_TOKEN_SECRET" src         # bearer/signing usage sites
```

**Nothing in this plan was applied. No env files, provider settings, keys, or DB rows were modified. Any actual
rotation or DB re-key is a leader action after Jeff approves.**
