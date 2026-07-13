# Env Var Inventory — where-set + failure-mode

**Worker:** W6 · **Branch:** p1-w6 · **Date:** 2026-07-12
**Scope:** Docs-only. Complete list of every env var the platform reads, grouped by function, with **where it's
set** and **what breaks if it's missing or wrong**. Nothing applied, no env/keys/DB touched. This is the
deploy-readiness angle (master `MASTER-TODO-LIST.md` line 70: "no single documented list"); it complements
[`secrets-inventory-and-rotation-plan.md`](./secrets-inventory-and-rotation-plan.md), which covers *rotation*
procedure for the same vars — read that one for "how to safely change a value," this one for "what happens if a
value is absent at deploy time."

**Method:** `grep -rhoE "process\.env\.[A-Z0-9_]+" platform` (full list, appendix) cross-checked by reading the
consuming code for each entry named explicitly in the task, plus a representative sample of the rest. Where I
did not read the consuming code directly, failure mode is marked "inferred" rather than "verified."

---

## 1. Auth / signing secrets (platform-wide)

| Var | Where set | Required | Failure mode if missing/wrong |
|---|---|---|---|
| `TENANT_HEADER_SIG_SECRET` | Vercel env (prod), `platform/.env.local` (dev) | Yes | **Verified.** `lib/tenant-header-sig.ts` falls back to `ADMIN_TOKEN_SECRET` → `PORTAL_SECRET` if unset, then **throws** if all three are unset ("required"). If set but different between the middleware build and the route-handler build (mid-deploy skew), every tenant-scoped request 401s — see rotation doc §2 item 5. |
| `ADMIN_TOKEN_SECRET` | Vercel env, `.env.local` | Yes | Signs admin-auth + impersonation tokens. Missing → admin login/impersonation cannot mint valid tokens (verified: consumed by `admin-auth`, `admin/impersonate`). Also the first fallback for `TENANT_HEADER_SIG_SECRET` above — missing this AND that means the whole tenant-sig chain throws. |
| `PORTAL_SECRET` | Vercel env, `.env.local` | Yes (client portal) | HMAC key for client-portal session tokens. Missing → `createToken`/`verifyPortalToken` cannot sign/verify → portal login broken. The code explicitly **refuses** to silently fall back to `SUPABASE_SERVICE_ROLE_KEY` (would be a signature oracle) — throws instead. |
| `TEAM_PORTAL_SECRET` | Vercel env, `.env.local` | Yes (team/referrer portal) | Same HMAC pattern, scoped to `referrer-portal-auth.ts` / `team-portal/auth/token.ts`. Missing → team-portal login broken. |
| `CRON_SECRET` | Vercel env; must also be pasted into the Vercel Cron config (or external scheduler) as the bearer value | Yes | **Verified** (`api/cron/reminders/route.ts` and siblings): `authHeader !== 'Bearer ' + CRON_SECRET` → 401. If the env var is set but the scheduler still sends the old value (or none), every cron job silently 401s and stops running — no alert fires on its own; see `deploy-prep/synthetic-canary-spec.md` for the gap this creates. |
| `INGEST_SECRET` | Vercel env; shared out-of-band with external lead/application posters | Yes (if external ingest is in use) | Bearer check in `middleware.ts` for `/api/ingest/lead` + `/api/ingest/application`. Missing or wrong → external integrators' POSTs 401; they see failed webhooks on their end, not an alert on ours. |
| `ADMIN_AUTH_SECRET`, `ADMIN_PASSWORD`, `ADMIN_PIN` | Vercel env | Yes (PIN-fallback auth path) | PIN-based admin fallback (used alongside Clerk). Missing → PIN login path fails closed (cannot authenticate via PIN); Clerk-based login is unaffected if Clerk is configured. |
| `INTERNAL_API_KEY` | Vercel env (service-to-service) | Yes (for internal calls, e.g. `payments/finalize-match`) | Missing/mismatched between caller and callee → internal endpoint calls fail with an auth error; this is service-to-service, so failure surfaces as a broken internal flow, not a user-facing error message. |
| `ELCHAPO_MONITOR_KEY`, `SELENA_TEST_TOKEN` | Vercel env | No (monitoring/test-only) | Missing → the monitoring/test endpoints that check for these reject unauthenticated calls; no production user path depends on them. |

---

## 2. Encryption

| Var | Where set | Required | Failure mode if missing/wrong |
|---|---|---|---|
| `SECRET_ENCRYPTION_KEY` | Vercel env only — **not currently in `platform/.env.example`** (gap, see rotation doc §6-B) | Yes | **Verified** (`lib/secret-crypto.ts`): `getKey()` throws `'SECRET_ENCRYPTION_KEY not set — cannot encrypt/decrypt secrets'` if unset, or a length error if not exactly 64 hex chars. Every `encryptSecret`/`decryptSecret` call (per-tenant Stripe/Telnyx/Resend/Anthropic/IMAP/Telegram key read/write) throws until this is set correctly. Because `decryptSecret()` is backwards-compatible with unmigrated plaintext (returns input unchanged if it doesn't start with `v1:`), a **missing key does not break already-plaintext tenants** — only ones already migrated to encrypted storage. This is the single highest-severity var in the whole inventory (see `secrets-at-rest-audit.md` for the full blast-radius writeup). |

---

## 3. Database / Supabase

| Var | Where set | Required | Failure mode if missing/wrong |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Vercel env, `.env.local` | Yes | **Verified, and this is a silent-failure trap:** `lib/supabase.ts` does **not** throw when these are unset — it falls back to `'https://placeholder.supabase.co'` / `'placeholder'` and constructs a client anyway. Every DB call then fails at request time with a connection/auth error instead of failing fast at boot. Recommend (not applied) adding a startup assertion; flagging as a gap rather than fixing it in this file-only pass. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel env, `.env.local` | Yes (client-side reads) | Same placeholder-fallback risk as above for any client-side Supabase usage. |
| `FULLLOOP_SUPABASE_URL`, `FULLLOOP_SUPABASE_SERVICE_ROLE_KEY`, `FULLLOOP_DB_URL` | Vercel env | Legacy/parallel naming — verify which is authoritative post-cutover (rotation doc §6-F) | If wrong/stale relative to the `NEXT_PUBLIC_SUPABASE_*` pair, whichever code path reads the stale var talks to the wrong project or fails auth — same silent-fallback risk as above if that code path also has a placeholder default. |
| `SUPABASE_ACCESS_TOKEN_FULLLOOP` (+ `_NYCMAID`) | **Not a Vercel/app env var — an operator PAT.** Set in the *operator's own* `~/.env.local` (Jeff's or a worker's shell), never in the deployed app. | Yes, for any script that hits the Supabase **Management API** (not the data API) | **Verified** (`platform/scripts/reconcile-tenant-config.mjs` line 30-31): script does `if (!TOK) { console.error('missing...'); process.exit(1) }` — fails fast and loud for that script. Other Management-API scripts (schema verification, `JEFE-TRACKING-SCOPE.md`) depend on the same var; per `deploy-prep/token-freshness-note.md`, it's a raw PAT with no fixed expiry, rotation-only. This is an **operator credential**, not part of the app's runtime env — do not add it to Vercel; it should never be reachable by the deployed app itself. |

---

## 4. Comms vendors (platform-wide keys)

| Var | Where set | Required | Failure mode if missing/wrong |
|---|---|---|---|
| `RESEND_API_KEY` (+ legacy `NYCMAID_RESEND_KEY`) | Vercel env, provider = Resend dashboard | Yes (platform-wide fallback; most tenants use their own encrypted key) | Missing → any email path relying on the platform-wide key (vs. a per-tenant key) fails to send; `sendEmail`-style helpers generally log-and-return-false rather than throw (verified pattern in `successor-monitor.mjs`'s own `sendEmail()`, which is representative of the platform's email helpers), so this is a **silent send failure**, not a crash. |
| `RESEND_WEBHOOK_SECRET`, `RESEND_WEBHOOK_VERIFY` | Vercel env | Yes if inbound Resend webhooks are used | Missing/wrong secret → inbound webhook signature check fails → events rejected. `RESEND_WEBHOOK_VERIFY` is a **boolean flag**, not a secret (rotation doc §3) — if left off, signature verification is skipped entirely; flag for the pre-deploy checklist. |
| `TELNYX_API_KEY` (+ legacy `NYCMAID_TELNYX_KEY`) | Vercel env, provider = Telnyx dashboard | Yes (platform-wide fallback) | Missing → SMS/voice send via the platform-wide key fails; per-tenant keys (`tenants.telnyx_api_key`, encrypted) are the primary path and unaffected. |
| `TELNYX_PUBLIC_KEY` | Vercel env, provider = Telnyx's published public signing key (not a secret you generate) | Yes | **Verified, and this is a documented fail-open bug** (`app/api/webhooks/telnyx-voice-failopen.witness.test.ts`): with `TELNYX_PUBLIC_KEY` unset, an **unsigned** inbound voice webhook request is **accepted**, not rejected. This is the opposite of a safe failure mode — missing this var doesn't just break a feature, it silently disables signature verification on an inbound telephony webhook (toll-fraud surface, per master Section B). Treat "is this set in prod" as a pre-deploy blocking check, not a nice-to-have. |
| `TELNYX_WEBHOOK_VERIFY` | Vercel env | — | Boolean flag gating whether the above check is enforced at all; same fail-open risk if left off regardless of whether `TELNYX_PUBLIC_KEY` is set. |
| `TELEGRAM_WEBHOOK_SECRET` | **Not yet provisioned anywhere — spec only.** Per `deploy-prep/telegram-tenant-webhook-auth-guard-spec.md`, this var does not exist in the codebase yet; the spec's own hard prerequisite is "must be provisioned AND every existing tenant bot re-registered with the matching `secret_token` before the verify ships, or all per-tenant Telegram traffic 401s (fail-closed)." | **Not yet required** — required once that spec is applied | Today: N/A, code doesn't read it. Post-spec-apply: missing → correctly fail-closed (401s all Telegram traffic) per the spec's own design — the opposite failure direction from `TELNYX_PUBLIC_KEY` above, and intentionally so. |
| `TELEGRAM_BOT_TOKEN`, `JEFE_BOT_TOKEN`, `TELEGRAM_OWNER_CHAT_ID`, `TELEGRAM_NOTIFY_CHAT_ID`, `TELEGRAM_EXTRA_CHAT_IDS`, `JEFE_OWNER_CHAT_ID` | Vercel env, provider = BotFather | Yes (for the specific bot each powers) | Missing bot token → that bot cannot call the Telegram API at all (auth error on every call). Missing chat-id vars → messages have nowhere to send; typically logged and dropped rather than crashing. |
| `EMAIL_HOST`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM` / `FROM_EMAIL` | Vercel env, provider = the IMAP mailbox itself | Yes (Zelle/Venmo email-monitor cron) | Missing/wrong password → IMAP auth fails; the `email-monitor` cron job (per-minute, per `docs/route.ts`'s own cron list) fails every run. Since it runs every minute, this fails loud in logs quickly but has no external alert wired (ties to the missing-uptime-monitor gap in `MASTER-TODO-LIST.md` §A). |

---

## 5. Payments

| Var | Where set | Required | Failure mode if missing/wrong |
|---|---|---|---|
| `STRIPE_SECRET_KEY` | Vercel env, provider = Stripe dashboard | Yes | Missing → all Stripe SDK calls throw immediately (Stripe's own client-init pattern requires a key); payment/payout flows hard-fail, not silently. |
| `STRIPE_WEBHOOK_SECRET`, `STRIPE_PLATFORM_WEBHOOK_SECRET` | Vercel env, provider = Stripe dashboard (per-endpoint signing secret) | Yes | Missing/wrong → inbound Stripe webhook signature verification fails → events rejected. Stripe retries failed webhooks for ~3 days, so a short misconfig window is usually recoverable, but a sustained one means payment-status updates (paid, refunded, disputed) never land. |

---

## 6. Auth provider (Clerk) + OAuth

| Var | Where set | Required | Failure mode if missing/wrong |
|---|---|---|---|
| `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Vercel env, provider = Clerk dashboard | Yes | Missing → Clerk SDK cannot initialize server-side (secret) or client-side (publishable) auth; login is broken platform-wide (Clerk is the primary admin/dashboard auth). |
| `CLERK_WEBHOOK_SECRET`, `CLERK_WEBHOOK_VERIFY` | Vercel env | Yes if user-sync webhooks are used | Missing/wrong secret → inbound Clerk webhook (user created/updated/deleted sync) signature check fails → user records drift from Clerk's actual state. `CLERK_WEBHOOK_VERIFY` is the boolean gate, same pattern as the Resend/Telnyx verify flags above. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Vercel env, provider = Google Cloud console | Yes (Google Business Profile / review-reply integration) | Missing → OAuth flow for GBP integration cannot complete; existing connected accounts with a live refresh token continue to work until that token needs re-auth. |
| `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` | Vercel env, provider = Meta app dashboard | Yes (if FB integration is live) | Same OAuth-flow-broken pattern as Google above. |

---

## 7. AI (Anthropic) — platform + per-tenant

| Var | Where set | Required | Failure mode if missing/wrong |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | Vercel env | Fallback only — used when a tenant has no key of its own | **Verified** (`app/api/ai/chat/route.ts` line 10): `if (!tenant.anthropic_api_key && !process.env.ANTHROPIC_API_KEY)` — the route explicitly checks both and only fails if **neither** is present. So this var's real failure mode is scoped to tenants that haven't set their own key; those tenants get an AI-feature error, tenants with their own key are unaffected. |
| Per-tenant Anthropic key | **Not an env var** — stored as `tenants.anthropic_api_key`, encrypted at rest under `SECRET_ENCRYPTION_KEY` (§2 above), set via `/dashboard/settings` (route: `api/settings/route.ts`, `sensitiveFields` list includes `anthropic_api_key`) | Per-tenant opt-in | If `SECRET_ENCRYPTION_KEY` is missing (§2), decrypting this at read time throws — so this var's failure mode is **downstream of** the encryption key, not independent. Same pattern applies to the tenant's `telnyx_api_key`, `resend_api_key`, `stripe_api_key`, `stripe_account_id`, `imap_pass`, `indexnow_key` — all in the same `sensitiveFields` / `ENCRYPTED_TENANT_FIELDS` set. |

---

## 8. Public / client-side (non-secret by design)

| Var | Where set | Required | Note |
|---|---|---|---|
| `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_BASE_URL`, `NEXT_PUBLIC_SITE_URL` | Vercel env (build-time, baked into client bundle) | Yes | Not secrets — ship to the browser by design. Wrong value → broken absolute links/redirects, not a security issue. |
| `NEXT_PUBLIC_RADAR_API_KEY` | Vercel env | Yes (if Radar/geo features used) | Publishable-scoped key per Radar's own model; distinct from any private `RADAR_API_KEY` if both exist (rotation doc §3 flags this distinction explicitly). |
| `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_CLARITY_ID`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` | Vercel env | No | Analytics — missing just disables that analytics integration, no functional break. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Vercel env (generated pair) | Yes (web push) | Missing/mismatched pair → push subscription/send fails. Regenerating the pair invalidates existing subscriptions (non-breaking, self-heals on re-subscribe — rotation doc §3). |

---

## 9. Feature flags / tuning (not secrets, listed for completeness)

`SIM_ONLY`, `SIM_PERSIST`, `MIGRATION_CUTOFF`, `SEO_AUTOPILOT_ENABLED`, `SEOMGR_AUTOVERIFY_ENABLED`,
`AUTOVERIFY_MAX_PER_RUN`, `CHECK_IN_GPS_ENABLED`, `CHECK_IN_HARD_BLOCK_MILES`, `CHECK_IN_MAX_MILES`,
`MISSED_CALL_SMS_BODY`, `MISSED_CALL_SMS_COOLDOWN_MIN`, `VOICEMAIL_MAX_LENGTH_SECS`, `VOICEMAIL_NOTIFY_PHONE`,
`VOICEMAIL_PROMPT`, `ADMIN_*_PHONE`/`ADMIN_RING_LIST`/`ADMIN_LEG_TIMEOUT_SECS`, `OWNER_PHONES`,
`OWNER_BCC_EMAIL`, `SUPER_ADMIN_CLERK_ID`. None of these gate a security control; missing values generally fall
back to a hardcoded default or disable the specific feature. Not enumerated row-by-row here — flag to leader if
a specific one needs a dedicated failure-mode writeup.

---

## 10. Infra / deploy tooling

| Var | Where set | Required | Failure mode if missing/wrong |
|---|---|---|---|
| `VERCEL_API_TOKEN`, `VERCEL_DEPLOY_TOKEN`, `VERCEL_DEPLOY_HOOK_SECRET`, `VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID` | Operator env (deploy scripts / CI), not the deployed app's own runtime env | Yes (for deploy automation scripts) | Missing → deploy-automation scripts fail to authenticate against the Vercel API; the already-deployed app itself is unaffected (these aren't read by app request handlers). |

---

## Gaps found while building this inventory (docs only, not fixed)

1. **`lib/supabase.ts` silently falls back to a placeholder URL/key instead of throwing** when
   `NEXT_PUBLIC_SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` are unset — every other secret-consuming module
   checked for this pass either throws (`secret-crypto.ts`, `tenant-header-sig.ts`) or fails a specific request
   (bearer-check routes). This one is the odd one out and the least safe: a misconfigured deploy would come up
   "successfully" and fail on first real DB call instead of failing at boot. Flagging, not fixing (file-only
   scope).
2. **`TELNYX_PUBLIC_KEY` unset = fail-open**, confirmed by the codebase's own witness test. This is the one
   var in this inventory where "missing" is actively dangerous rather than merely broken — should be a
   hard pre-deploy gate (fail the build/deploy if unset in a prod env), not just documented.
3. **`platform/.env.example` covers ~13 of the ~100 vars found by grep** (same gap noted in the rotation doc
   §6-B) — this file is a stopgap until `.env.example` is made the authoritative name list.

---

## Cross-references

- [`secrets-inventory-and-rotation-plan.md`](./secrets-inventory-and-rotation-plan.md) — rotation procedure,
  breaking-vs-non-breaking classification, provider dashboards, per-tenant vs. platform-wide scope model.
- [`secrets-at-rest-audit.md`](./secrets-at-rest-audit.md) — deep dive on `SECRET_ENCRYPTION_KEY` specifically.
- [`telegram-tenant-webhook-auth-guard-spec.md`](./telegram-tenant-webhook-auth-guard-spec.md) — the
  not-yet-provisioned `TELEGRAM_WEBHOOK_SECRET` spec.
- [`token-freshness-note.md`](./token-freshness-note.md) — `SUPABASE_ACCESS_TOKEN_FULLLOOP` liveness checks.
- `platform/src/app/api/docs/route.ts` — the app's own partial self-documented env var list (13 vars); this
  file supersedes it in completeness but doesn't replace it (that endpoint is a live admin-facing reference).

**Nothing in this file was applied. No env values were read, set, or changed — only var *names* and the code
paths that consume them.**
