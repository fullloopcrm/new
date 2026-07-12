# Credential Rotation Policy

_Author: worker W5, branch `p1-w5`, 2026-07-12. **Docs only — policy artifact, nothing rotated.**_

## What this is

A rotation **cadence + procedure per secret** for every credential the platform holds. This
is a **proposed policy**, not a record of rotations performed. It is the input to the actual
rotation runbook the leader/Jeff execute against Vercel + the upstream providers.

## ⚠️ Method, scope, and honesty notes — read first

- **Inventory source:** distinct `process.env.*` reads under `platform/src` plus
  `platform/.env.example`. This captures secrets the **code references**. It will **miss** any
  secret that lives only in Vercel/provider dashboards and is never read by name in code, and
  any per-tenant secret stored in the DB (those are covered separately in §D).
- **I did not read any secret value** and none is reproduced here — per the access-save rule,
  this file names secrets and points at where they live, never the raw value.
- **Where secrets live (pointer, not value):** production values live in **Vercel project env
  vars** (per environment: Production/Preview/Development) and, for local dev, `.env.local`
  (gitignored; `.env.example` is the committed template). Account-routing for which
  Vercel/gh/Supabase project this maps to is in `~/.claude/access.json` — **update that file
  if a rotation changes a project binding.**
- **Cadence values below are policy recommendations** (industry-standard: 90d for
  high-privilege server secrets, 180d for lower-blast-radius keys, immediate on compromise/
  offboarding). They are not derived from any existing schedule in the repo — there is no
  rotation schedule in the repo today. Treat them as the proposed baseline to ratify, not as
  facts about current practice.
- **Rotation is a prod/outward action.** Every step here is gated: Jeff/leader executes against
  live providers. This worker did not and cannot perform rotations.

## Rotation cadence tiers

| Tier | Cadence | Applies to |
|------|---------|-----------|
| **T0 — Critical** | **90 days**, or **immediately** on suspected exposure/offboarding | Full-DB / full-account / money-movement / signing keys |
| **T1 — Standard** | **180 days**, or immediately on exposure | Scoped API keys, provider integrations |
| **T2 — Low** | **On exposure only** (or provider-forced) + review at each T0 cycle | Public/publishable keys, non-secret config URLs |
| **Event** | **Immediately**, out of cycle | Any secret that appears in a log, a client bundle, a git commit, a screen-share, a support ticket, or a departed contractor's access |

---

## A. T0 — Critical (90-day, or immediate on exposure)

Rotate these first; each is a full-blast-radius credential.

| Secret | What it unlocks | Rotation procedure (per secret) |
|--------|-----------------|-------------------------------|
| `SUPABASE_SERVICE_ROLE_KEY` | **Bypasses all RLS**; full read/write to every tenant's data. Highest-value secret in the system. | Supabase → Project → API → **roll `service_role` JWT secret** (this rolls anon + service together — see note). Update Vercel Prod/Preview/Dev. Redeploy. Verify a service-role query still works. **Coordinate with `NEXT_PUBLIC_SUPABASE_ANON_KEY` (rolls together).** |
| `SECRET_ENCRYPTION_KEY` | AES-256 envelope key that encrypts **per-tenant secrets stored in the DB** (Stripe keys, IMAP creds, AI/SEO keys — see §D). Loss = those secrets unreadable; leak = they are all decryptable. | **Special: needs a re-encrypt migration, not a swap.** See §D procedure — you must decrypt-with-old / re-encrypt-with-new every stored envelope, or dual-key during transition. `secret-crypto.ts` already tolerates plaintext fallback but NOT a wrong key. Never rotate this in isolation. |
| `STRIPE_SECRET_KEY` | Live money movement, refunds, customer data across the platform Stripe account. | Stripe Dashboard → Developers → API keys → **roll secret key** (Stripe supports create-new-then-revoke-old for zero downtime). Update Vercel, redeploy, verify a test charge/read, then **revoke old** in Stripe. |
| `STRIPE_WEBHOOK_SECRET`, `STRIPE_PLATFORM_WEBHOOK_SECRET` | Signature verification for Stripe webhooks; wrong value = dropped events. | Stripe → Webhooks → roll signing secret for that endpoint. Update Vercel, redeploy, send a test event, confirm 200. |
| `CLERK_SECRET_KEY` | Full Clerk backend API — user/session management. | Clerk Dashboard → API Keys → rotate secret key. Update Vercel, redeploy, verify a sign-in + a backend user read. |
| `ADMIN_AUTH_SECRET`, `ADMIN_TOKEN_SECRET`, `ADMIN_PASSWORD` | Platform-admin authentication / admin session signing. Compromise = full admin console. | Generate new random (≥32 bytes for secrets; strong unique for password). Update Vercel, redeploy. **Rotating a signing secret invalidates existing admin sessions — expected; notify admins.** |
| `SECRET`-class session signers: `PORTAL_SECRET`, `TEAM_PORTAL_SECRET`, `TENANT_HEADER_SIG_SECRET` | Sign portal/team-portal sessions and the internal tenant-header signature (trust boundary between edge and app). | Rotate to new random ≥32 bytes. `TENANT_HEADER_SIG_SECRET` especially: mismatched value breaks tenant resolution platform-wide — rotate in a single deploy, verify tenant routing immediately after. Invalidates live portal sessions (expected). |
| `VERCEL_API_TOKEN`, `VERCEL_DEPLOY_TOKEN`, `VERCEL_DEPLOY_HOOK_SECRET` | Programmatic deploy / project management on the Vercel account. | Vercel → Account/Team → Tokens → revoke + reissue. Update wherever consumed (CI, cron, `access.json` pointer). |

**Note on Supabase key coupling:** Supabase's legacy anon/service keys are both signed by the
project JWT secret; rolling that secret rotates **both** `NEXT_PUBLIC_SUPABASE_ANON_KEY` and
`SUPABASE_SERVICE_ROLE_KEY` at once. Plan them as one atomic change: update both in Vercel,
redeploy, verify anon (client) + service (server) paths in the same window.

---

## B. T1 — Standard (180-day, or immediate on exposure)

| Secret | What it unlocks | Rotation procedure |
|--------|-----------------|-------------------|
| `ANTHROPIC_API_KEY` | Claude API billing/usage on the account. | console.anthropic.com → API keys → create new, update Vercel, redeploy, revoke old. |
| `RESEND_API_KEY` + `RESEND_WEBHOOK_SECRET` / `RESEND_WEBHOOK_VERIFY` | Transactional email send + inbound webhook verify. | Resend dashboard → rotate key & webhook secret. Update Vercel, redeploy, send a test email + confirm a webhook 200. |
| `TELNYX_API_KEY`, `TELNYX_PUBLIC_KEY`, `TELNYX_WEBHOOK_VERIFY`, `TELNYX_CREDENTIAL_CONNECTION_ID`, `TELNYX_TELEPHONY_CREDENTIAL_ID` | SMS/voice send + webhook signature verification. | Telnyx portal → rotate API key & webhook signing key. Connection/credential IDs are identifiers (rotate only if the credential itself is reissued). Verify an SMS send + inbound webhook. |
| `TELEGRAM_BOT_TOKEN`, `JEFE_BOT_TOKEN` | Bot control (Telegram / Jefe assistant). | BotFather / issuer → revoke + reissue token. Update Vercel, redeploy, verify bot responds. |
| `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` | Google OAuth app. | Google Cloud Console → Credentials → reset client secret. Update Vercel, redeploy, verify an OAuth round-trip. (Client ID is public; secret is the sensitive half.) |
| `FACEBOOK_APP_SECRET` | Facebook app server auth. | Meta App Dashboard → reset app secret. Update Vercel, redeploy, verify. |
| `SERPER_API_KEY`, `RADAR_API_KEY` (+ `NEXT_PUBLIC_RADAR_API_KEY`) | Search / geocoding APIs. | Provider dashboard → rotate. `NEXT_PUBLIC_RADAR_API_KEY` is client-exposed — restrict by domain/referrer at the provider rather than relying on secrecy. |
| `CLERK_WEBHOOK_SECRET` / `CLERK_WEBHOOK_VERIFY` | Clerk webhook signature verify. | Clerk → Webhooks → roll signing secret. Verify a test event 200. |
| `CRON_SECRET`, `INGEST_SECRET`, `INTERNAL_API_KEY`, `TENANT`-scoped internal callers | Bearer secrets guarding internal/cron/ingest endpoints. | Generate new random, update Vercel + the cron/caller config in the same deploy, verify the protected route rejects old and accepts new. |
| `VAPID_PRIVATE_KEY` (+ `NEXT_PUBLIC_VAPID_PUBLIC_KEY`) | Web-push signing keypair. | Regenerate VAPID keypair. **Rotating invalidates all existing push subscriptions** — clients must re-subscribe; schedule with that in mind. |
| `EMAIL_PASS` | SMTP/IMAP password (platform mailbox). | Rotate at the mail provider, update Vercel, verify send/receive. |
| `ELCHAPO_MONITOR_KEY`, `SELENA_TEST_TOKEN` | Monitoring / test harness tokens. | Reissue at source; `SELENA_TEST_TOKEN` is non-prod — rotate on exposure only. |

---

## C. T2 — Low / public (rotate on exposure or provider-forced only)

These are publishable or non-secret; they are listed so they are not mistaken for secrets and
so they get a **review** (not a mandatory rotation) at each T0 cycle.

- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — public by design **but** rolls with the service key (§A note); rotate *only* as part of that atomic change.
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — publishable; rotate only if Clerk forces it.
- `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `NEXT_PUBLIC_RADAR_API_KEY` — public halves; secure via provider-side domain/referrer restrictions, not secrecy.
- Config URLs (not secrets, do not rotate): `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_BASE_URL`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_URL`, `VERCEL_URL`.

---

## D. Per-tenant secrets stored IN the database (special case)

The platform stores **per-tenant** provider secrets encrypted in the DB, not in env:
- `platform/src/lib/migrations/012_imap_credentials.sql` — tenant IMAP/email creds
- `platform/src/lib/migrations/023_missing_per_tenant_api_keys.sql` — per-tenant API keys
- `platform/src/lib/migrations/025_tenant_ai_seo_keys.sql` — per-tenant AI/SEO keys

These are encrypted at rest via **`SECRET_ENCRYPTION_KEY`** (AES-256-GCM envelope; see
`platform/src/lib/secret-crypto.ts`: `encryptSecret` / `decryptSecret`, 64-hex-char key).

**Two distinct rotation concerns:**

1. **Rotating an individual tenant's provider secret** (e.g. a tenant's Stripe key leaks):
   the **tenant** rotates it at their provider and re-saves it in the app; `encryptSecret`
   re-wraps it. No platform-wide action. Cadence: **on exposure / on the tenant's own policy.**

2. **Rotating `SECRET_ENCRYPTION_KEY` itself** (T0): you **cannot** just swap the env var — every
   stored envelope was sealed with the old key and would become undecryptable. Procedure:
   1. Introduce a **new** key alongside the old (dual-key: keep `SECRET_ENCRYPTION_KEY_OLD`).
   2. Write a **migration/script** (FILE ONLY until approved) that, per stored envelope:
      `decryptSecret(old) → encryptSecret(new)`, updating the row.
   3. Verify a sample tenant's IMAP/API/AI key still decrypts under the new key.
   4. Promote new key to `SECRET_ENCRYPTION_KEY`, remove the old.
   `secret-crypto.ts` returns plaintext unchanged for un-enveloped legacy values, but it does
   **not** try multiple keys — so the re-encrypt pass is mandatory, not optional.

---

## E. General zero-downtime rotation procedure (default for provider keys)

For any secret whose provider supports multiple concurrent credentials:

1. **Create** a new credential at the provider (do not revoke the old yet).
2. **Add** the new value to Vercel (Production + Preview + Development as applicable).
3. **Redeploy** so running instances pick it up (env changes need a new deployment/restart).
4. **Verify** the live path works on the new value (send/read/webhook 200 as relevant).
5. **Revoke** the old credential at the provider.
6. **Confirm** nothing broke (error dashboards, a second verify pass).
7. **Update `~/.claude/access.json`** if a project binding/pointer changed. Record the rotation
   date somewhere durable (this file's changelog or a rotation log) so the next cadence is known.

For **signing secrets** (session/webhook/header) that cannot dual-run, rotate in a **single
deploy** and accept the one-time invalidation (users re-auth, push clients re-subscribe). Say
so to affected parties beforehand.

## F. Emergency rotation (compromise / exposure event)

Trigger: a secret appears in a log, a client bundle, a commit, a shared screen, a support
message, or a contractor offboards.

1. **Rotate immediately, out of cycle**, highest-blast-radius first (T0 order in §A).
2. For `SUPABASE_SERVICE_ROLE_KEY` / `STRIPE_SECRET_KEY` / `SECRET_ENCRYPTION_KEY`: assume data
   access occurred — **revoke old immediately** even at the cost of brief downtime; do not wait
   for a clean dual-run.
3. **Purge** the exposed value from wherever it leaked (rewrite git history if committed; delete
   the log line/artifact).
4. Review adjacent secrets that may share the same exposure surface and rotate them too.
5. Record the incident + which secrets rotated.

---

## G. Handoff / what this policy does NOT do

- **Nothing was rotated.** This is a policy file only; execution is Jeff/leader against live
  providers and Vercel.
- **Cadences are proposals to ratify**, not current practice (there is no existing schedule in
  the repo).
- **Coverage gap:** any secret held only in a provider/Vercel dashboard and never read by name
  in `platform/src` is not in this inventory. Recommend a one-time reconciliation of the live
  **Vercel env var list** against §A–§C to catch anything code-grep missed.
- **Recommended next artifact:** a running **rotation log** (secret → last rotated → next due)
  so the cadence tiers above become actionable rather than aspirational.
