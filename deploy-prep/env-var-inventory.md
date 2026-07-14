# Env Var Inventory — Part 0 Cutover

_Status: DEPLOY-PREP REFERENCE. Docs only — nothing here executes anything._
_Owner: platform on-call / leader. Last authored: 2026-07-11 (W4, branch `p1-w4`)._

## Purpose

One row per environment variable the platform reads, with three fields the
person setting Vercel env vars actually needs:

1. **Where set** — the surface the value lives on (Vercel env, a provider
   dashboard, a per-tenant DB column, or self-generated).
2. **Failure mode** — the concrete thing that breaks if it is missing/wrong,
   quoted from the code path where practical (not guessed).
3. **Part-0 stage** — which watched deploy phase (A/B/C/D) first depends on it.

Built by grepping every `process.env.*` reference in `platform/**` and
`scripts/**`, then reading the validating code path for each. This supersedes
nothing — the older `platform/ENV-VARS-FOR-CUTOVER.md` is the nycmaid-tenant
cutover checklist; this file is the phase-keyed superset for the Part-0 release.

### ⚠️ Source-of-truth caveat (read first)

The **authoritative** phase→artifact mapping is meant to live in
`deploy-prep/deploy-runbook.md` (owner: p1-w3). **As of this writing that file
is not committed on any branch tree** (`p1-w1..w4`, `p3-*`, integration
branches all absent). The Part-0 phase definitions used here are therefore
taken from the A/B/C/D table in `platform/docs/runbooks/incident-response.md`.
**When `deploy-runbook.md` lands, reconcile the "Part-0 stage" column against
it — deploy-runbook.md wins on any disagreement.**

## Part-0 phase recap (from incident-response.md)

| Phase | What it ships |
|-------|---------------|
| **A** | Low-risk, non-behavioral: migrations, RLS enable commit |
| **B** | Resolver flip — `tenant_domains` becomes source of truth + `TENANT_DIVERGENCE` assert-guard |
| **C** | Auth-behavior: `owner_phone` gating, OTP/PIN lockout, full Telnyx voice verify |
| **D** | Webhook idempotency: Telegram secret + re-register, journal dedup |

**Stage notation used below:**
- **Pre-req** — must already be set before Phase A; not introduced by Part 0,
  but the release assumes it is live (steady-state runtime dependency).
- **A / B / C / D** — the phase that first hard-depends on this var.
- **Tooling** — used only by a migration/reconcile script run by hand during a
  phase (never by the running app); phase noted in the row.

---

## 1. Platform-critical — app will not serve without these

Set on the fullloop Vercel project (Production + Preview). Missing → boot or
first-request failure across all tenants.

| Var | Where set | Failure mode | Part-0 stage |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase dashboard → Vercel | Client falls back to `https://placeholder.supabase.co` (`src/lib/supabase.ts:3`) → every DB call fails | Pre-req (all phases) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase dashboard → Vercel | Falls back to `'placeholder'` → client SDK unauthenticated | Pre-req |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase dashboard → Vercel | Falls back to `'placeholder'` → every API route (`supabaseAdmin`) fails; app is service-role-everywhere | Pre-req (all phases) |
| `CLERK_SECRET_KEY` | Clerk dashboard → Vercel | Admin auth (server) fails | Pre-req; hardens at **C** |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk dashboard → Vercel | Admin login UI cannot render | Pre-req; **C** |
| `ANTHROPIC_API_KEY` | Anthropic console → Vercel | Platform-billed fallback key. See §5 (per-tenant Anthropic) for exact behavior | Pre-req |
| `STRIPE_SECRET_KEY` | Stripe dashboard → Vercel | Stripe Connect + charges fail (platform fallback; per-tenant override in §4) | Pre-req |

---

## 2. Auth / signing secrets (self-generated)

Generate once (`openssl rand -hex 32` unless noted), store in `~/.env.local`
per the access-save rule, set on Vercel. These gate auth and internal trust.

| Var | Where set | Failure mode | Part-0 stage |
|---|---|---|---|
| `SECRET_ENCRYPTION_KEY` | Self-gen, **64 hex chars (32 bytes)** | Unset → tenant secrets stored **PLAINTEXT** with a `console.warn` (graceful, `secret-crypto.ts:106`). Set-but-wrong-length → `throw "SECRET_ENCRYPTION_KEY must be 64 hex chars"`. **Changed after secrets encrypted** → `decryptSecret` fails ("Malformed encryption envelope") → per-tenant Anthropic/Telnyx/Resend keys unreadable | Pre-req (set **before** any tenant secret is saved) |
| `TENANT_HEADER_SIG_SECRET` | Self-gen (falls back to `ADMIN_TOKEN_SECRET`, then `PORTAL_SECRET`) | None of the three set → `throw "TENANT_HEADER_SIG_SECRET (or ADMIN_TOKEN_SECRET / PORTAL_SECRET fallback) is required."` (`tenant-header-sig.ts:17`) → signed tenant-identity header cannot be minted/verified | **B** (resolver-trust boundary) |
| `ADMIN_TOKEN_SECRET` | Self-gen | PIN-based admin impersonation cookie cannot be signed/verified | **C** (PIN lockout) |
| `PORTAL_SECRET` | Self-gen | Client portal token signing fails | Pre-req; also `TENANT_HEADER_SIG_SECRET` fallback |
| `TEAM_PORTAL_SECRET` | Self-gen | Team portal token signing fails | Pre-req |
| `CRON_SECRET` | Self-gen | Unset in prod → `500 "CRON_SECRET not configured"` and **all `/api/cron/*` blocked** (`nycmaid/auth.ts:179`) | Pre-req (crons run every minute) |
| `INTERNAL_API_KEY` | Self-gen | Internal `finalize-match` endpoint rejects internal callers | Pre-req |
| `ELCHAPO_MONITOR_KEY` | Self-gen | Monitoring endpoints (Selena core) reject | Pre-req |
| `ADMIN_PIN` | Self-gen, first-run bootstrap | Only needed to bootstrap first admin before a Clerk owner is seeded | **C** (first-run only) |
| `VAPID_PRIVATE_KEY` / `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | `web-push generate-vapid-keys` | Web push notifications fail | Pre-req (optional feature) |

---

## 3. Webhook signing secrets — inbound verification

Missing/wrong → the corresponding inbound webhook fails signature check and is
rejected. Phase D is where webhook idempotency + Telegram re-register ship, so
Telegram is D; the others are steady-state pre-reqs whose *idempotency* changes
in D but whose signing was already required.

| Var | Where set | Failure mode | Part-0 stage |
|---|---|---|---|
| `TELEGRAM_WEBHOOK_SECRET` | Self-gen master; per-bot secret is **HMAC-derived** from it (`telegram-webhook-auth.ts`) | Unset → verify returns `webhook_secret_unconfigured` → all inbound Telegram webhooks rejected. **DEPLOY DEPENDENCY:** after setting, **every bot's webhook must be re-registered** with the derived secret or verify returns `bad_secret_token` and bots go dark | **D** (secret + re-register + dedup) |
| `TELNYX_PUBLIC_KEY` | Telnyx portal (Ed25519 public key) | Passed to `verifyTelnyx()` for **inbound SMS** (`webhooks/telnyx/route.ts:19`) and **voice** (`webhooks/telnyx-voice/route.ts:432`). Missing/wrong → both inbound SMS and voice webhooks fail sig verify and are rejected | **C** (full Telnyx voice verify); SMS is Pre-req |
| `STRIPE_WEBHOOK_SECRET` | Stripe → webhook endpoint | Payment webhook signature verify fails (`webhooks/stripe/route.ts:30`) → payment events dropped | Pre-req; idempotency hardens at **D** |
| `STRIPE_PLATFORM_WEBHOOK_SECRET` | Stripe → **platform Connect** endpoint (separate from above) | Unset → `console.error "[stripe-platform] STRIPE_PLATFORM_WEBHOOK_SECRET not set"` and platform Connect webhook rejected (`webhooks/stripe-platform/route.ts:19`) | Pre-req |
| `RESEND_WEBHOOK_SECRET` | Resend → webhook | Email event webhook (delivery/bounce) sig verify fails | Pre-req |
| `CLERK_WEBHOOK_SECRET` | Clerk → webhooks | Clerk user/org sync webhook sig verify fails | Pre-req; **C** |
| `TELNYX_WEBHOOK_VERIFY` / `CLERK_WEBHOOK_VERIFY` / `RESEND_WEBHOOK_VERIFY` | Vercel (flag) | Set to `"off"` **disables** the corresponding sig check — **local dev only, NEVER in prod** | Guardrail — assert unset before **D** |

---

## 4. Per-tenant (DB-first, env fallback)

These resolve from the tenant's own DB column when set, otherwise fall back to
the platform env var. For nycmaid specifically, set the tenant row, not env.
Stored per-tenant secrets are encrypted with `SECRET_ENCRYPTION_KEY` (§2).

| Var | Tenant column | Fallback env | Failure mode |
|---|---|---|---|
| Anthropic key | `tenants.anthropic_api_key` | `ANTHROPIC_API_KEY` | See §5 |
| Telnyx API key | `tenants.telnyx_api_key` | `TELNYX_API_KEY` | Outbound SMS for that tenant fails |
| Telnyx from-number | `tenants.telnyx_phone` | `TELNYX_PHONE` (formerly `TELNYX_FROM_NUMBER`) | SMS has no valid from-number |
| Resend key | `tenants.resend_api_key` | `RESEND_API_KEY` | Outbound email for that tenant fails |
| Email from | `tenants.email_from` | `EMAIL_FROM` | Email has no from-address |
| Stripe key | `tenants.stripe_api_key` | `STRIPE_SECRET_KEY` | Per-tenant charges/Connect fail |
| IMAP host/user/pass | `tenants.imap_host/user/pass` | — | Zelle/Venmo email monitor cron can't read inbox |
| Zelle email | `tenants.zelle_email` | — | Missing from SMS recap copy |

**Part-0 stage:** Pre-req — these are steady-state per-tenant config, not
introduced by any phase. Confirm the nycmaid row is fully populated before
Phase A (see §7).

---

## 5. Per-tenant Anthropic — exact resolution

Single source of truth: `src/lib/anthropic-client.ts`.

- **Tenant-scoped callers** (`resolveAnthropic`/`resolveAnthropicKey`/
  `anthropicFromStoredKey`): use `tenants.anthropic_api_key` (decrypted) if the
  tenant set one, **else construct `new Anthropic()` against the platform
  `ANTHROPIC_API_KEY`**. Call sites: Selena, ai-chat, generate-reply, receipt-ai,
  categorize-ai, google-reviews, google-posts.
- **Platform-internal callers that are NOT tenant-scoped** (Jefe agent
  `jefe/agent.ts:26`, anthropic-health cron): construct `new Anthropic({ apiKey:
  process.env.ANTHROPIC_API_KEY })` **directly** — they do not fall back to a
  tenant key.

**Failure mode:** If a tenant has no stored key **and** platform
`ANTHROPIC_API_KEY` is unset, the SDK is constructed with no key and **throws at
call time** (missing API key) — not at boot. So AI features fail lazily on first
use, per feature, not loudly at deploy. Set the platform key before any AI path
is exercised.

**Part-0 stage:** Pre-req.

---

## 6. Migration / reconcile tooling (scripts only — never the running app)

Read only by hand-run scripts during cutover. `!` non-null assertions mean the
script crashes immediately if the var is absent.

| Var | Where set | Failure mode | Part-0 stage |
|---|---|---|---|
| `SUPABASE_ACCESS_TOKEN_FULLLOOP` | `~/.env.local` (Supabase **Management API** token; ref `cetnrttgtoajzjacfbhe`) | `reconcile-tenant-config.mjs:31` → `console.error('missing SUPABASE_ACCESS_TOKEN_FULLLOOP'); process.exit(1)`. Also the manual-curl schema-verify path in `JEFE-TRACKING-SCOPE.md` (python UA is WAF-blocked — use curl) | Tooling — **A** (schema/config reconcile) |
| `FULLLOOP_SUPABASE_URL` | `~/.env.local` | `migrate-storage.ts` / `migrate-from-nycmaid.ts` assert non-null → crash if missing | Tooling — **A** (data migration) |
| `FULLLOOP_SUPABASE_SERVICE_ROLE_KEY` | `~/.env.local` | Same scripts, same crash | Tooling — **A** |
| `FULLLOOP_DB_URL` | `~/.env.local` | Direct-DB migration tooling can't connect | Tooling — **A** |

---

## 7. Verification checklist (per phase)

**Before Phase A:**
- [ ] §1 all set on Vercel Production.
- [ ] `SECRET_ENCRYPTION_KEY` set **and 64 hex chars** BEFORE any tenant secret
      is saved (otherwise secrets land in plaintext and must be re-saved).
- [ ] `CRON_SECRET`, `INTERNAL_API_KEY`, `ELCHAPO_MONITOR_KEY` set (crons run
      every minute — a missing `CRON_SECRET` 500s all of them).
- [ ] Tooling vars (§6) present in the operator's `~/.env.local` for the
      migration/reconcile scripts.
- [ ] nycmaid tenant row populated (§4): `telnyx_api_key`, `telnyx_phone`,
      `resend_api_key`, `email_from`, `stripe_api_key`, `imap_host/user/pass`,
      `zelle_email`, `anthropic_api_key` (or accept platform fallback),
      `domain`, `phone`, `email`, `name`, `primary_color`.

**Before Phase B (resolver flip):**
- [ ] `TENANT_HEADER_SIG_SECRET` set (or a fallback of `ADMIN_TOKEN_SECRET` /
      `PORTAL_SECRET` present) — the signed tenant-identity header is on the
      resolver trust path.

**Before Phase C (auth behavior):**
- [ ] `ADMIN_TOKEN_SECRET`, Clerk keys, `CLERK_WEBHOOK_SECRET` set.
- [ ] `TELNYX_PUBLIC_KEY` set (voice webhook sig goes strict this phase).
- [ ] `ADMIN_PIN` bootstrap done or a Clerk owner seeded.

**Before Phase D (webhook idempotency):**
- [ ] `TELEGRAM_WEBHOOK_SECRET` set **and every bot re-registered** with its
      derived secret (else bots go dark on `bad_secret_token`).
- [ ] `TELEGRAM_BOT_TOKEN` + any `TELEGRAM_*_CHAT_ID` recipients set.
- [ ] Confirm `TELNYX_WEBHOOK_VERIFY` / `CLERK_WEBHOOK_VERIFY` /
      `RESEND_WEBHOOK_VERIFY` are **NOT** `"off"` in Production.

---

## 8. Test-mode / simulation flags — MUST be unset (or false) in prod

| Var | Risk if set in prod |
|---|---|
| `SIM_ONLY` | Routes run in simulation-only mode (no real sends) |
| `SIM_PERSIST` | Simulation state persistence toggled |
| `IMPERSONATION_ALLOW_UNSIGNED` | Accepts unsigned impersonation — cutover grace only; remove within 24h post-cutover |
| `AUTOVERIFY_MAX_PER_RUN`, `SEO_AUTOPILOT_ENABLED`, `SEOMGR_AUTOVERIFY_ENABLED` | Feature/throttle flags — verify intended value, not a leftover test value |

---

## 9. Deprecated — do NOT copy to fullloop

Present in legacy nycmaid env; replaced by per-tenant DB fields. (From
`ENV-VARS-FOR-CUTOVER.md`; listed here so nobody re-adds them.)

- `NEXT_PUBLIC_BASE_URL` / `NEXT_PUBLIC_SITE_URL` → replaced by `tenant.domain` + `tenantSiteUrl()`
- `NEXT_PUBLIC_RADAR_API_KEY` / `RADAR_API_KEY` → fullloop geocodes via Nominatim (free)
- `ADMIN_PASSWORD` → replaced by Clerk + PIN auth
- `TELNYX_FROM_NUMBER` → renamed `TELNYX_PHONE` + per-tenant `tenants.telnyx_phone`
- `NYCMAID_*` (`NYCMAID_RESEND_KEY`, `NYCMAID_SUPABASE_URL`, `NYCMAID_SERVICE_ROLE_KEY`, `NYCMAID_SUPABASE_SERVICE_ROLE_KEY`, `NYCMAID_TELNYX_KEY`, `NYCMAID_TELNYX_PHONE`) → single-tenant hardcodes; superseded by per-tenant columns in §4

---

## 10. Not audited for phase-gating (steady-state; listed for completeness)

Grepped from `process.env` but not on the Part-0 critical path — email SMTP
(`EMAIL_HOST/USER/PASS`, `FROM_EMAIL`, `OWNER_BCC_EMAIL`), Google/Facebook OAuth
(`GOOGLE_CLIENT_*`, `FACEBOOK_APP_*`, `GSC_SERVICE_ACCOUNT_*`), analytics
(`NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_POSTHOG_*`, `NEXT_PUBLIC_CLARITY_ID`),
`SERPER_API_KEY`, `SUPER_ADMIN_CLERK_ID`, admin-contact fallbacks
(`ADMIN_EMAIL`, `ADMIN_PHONE`, `ADMIN_FORWARD_PHONE`, `ADMIN_NOTIFICATION_EMAIL`,
`ADMIN_RING_LIST`, `ADMIN_LEG_TIMEOUT_SECS`), voice/voicemail tunables
(`VOICEMAIL_*`, `MISSED_CALL_SMS_*`, `TELNYX_VOICE_CONNECTION_ID`,
`TELNYX_CREDENTIAL_CONNECTION_ID`, `TELNYX_TELEPHONY_CREDENTIAL_ID`),
check-in tunables (`CHECK_IN_*`), Vercel deploy plumbing (`VERCEL_*`),
`JEFE_BOT_TOKEN` / `JEFE_OWNER_CHAT_ID`, `INGEST_SECRET`, `MIGRATION_CUTOFF`,
`SELENA_TEST_TOKEN`. Set as needed; none blocks a Part-0 phase.
