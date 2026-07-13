# Third-Party Dependency Ledger — Part 0 Cutover

_Status: DEPLOY-PREP REFERENCE. Docs only — nothing here executes anything._
_Owner: platform on-call / leader. Authored: 2026-07-12 (W4, branch `p1-w4`)._

## Purpose

One row per external service the running app depends on: pinned SDK/package
version (from `platform/package.json`), what breaks when it's down or
misconfigured, and the actual kill-switch/degrade path today — not an
aspirational one. Where no real kill-switch exists, this says so explicitly
rather than inventing one.

Cross-refs: `deploy-prep/env-var-inventory.md` (the vars named below),
`platform/docs/runbooks/incident-response.md` (live incident cards for
Supabase/Stripe/Telnyx/Telegram), `deploy-prep/dr-restore-drill-runbook.md`
(Supabase backup/restore posture).

---

## 1. Supabase — primary datastore

- **Package:** `@supabase/supabase-js` `^2.98.0`
- **Client construction:** `src/lib/supabase.ts` — two clients, `supabase`
  (anon) and `supabaseAdmin` (service role). **The app is
  service-role-everywhere**: nearly all API routes use `supabaseAdmin`, which
  bypasses RLS entirely (see `046_rls_deny_on_new_tables.sql` comment: "this is
  a no-op for current code paths").
- **Failure mode:**
  - Missing env → clients silently construct against
    `https://placeholder.supabase.co` / key `'placeholder'`
    (`src/lib/supabase.ts:3`) → every DB call fails at request time, not boot.
  - Supabase **outage** (upstream) → every DB-backed route fails; per
    incident-response card #1, this presents as platform-wide 5xx and is **not
    fixable by any code rollback** — it's a vendor incident.
- **Kill-switch:** **None exists.** There is no read-only/degraded mode — the
  app has no code path that serves without Supabase. The only mitigation is
  confirming Supabase status and waiting, or (per DR runbook) restoring to a
  scratch project — which does not restore prod traffic, only proves the
  backup.
- **Backup/DR posture:** see `dr-restore-drill-runbook.md` in full — TL;DR:
  Supabase managed daily backup exists; **PITR enabled/not enabled is
  unconfirmed** (Jeff-gated console check, not verifiable from this lane); an
  app-level partial JSON backup (11 tables, active tenants) runs nightly to a
  bucket **in the same project** (single point of failure, flagged in that doc).

---

## 2. Stripe — payments (platform + per-tenant Connect)

- **Packages:** `stripe` `^20.4.0` (server), `@stripe/stripe-js` `^8.8.0`
  (client Elements/Checkout)
- **Client construction:** `src/lib/payment-processor.ts:56-58` — resolves
  key **per-tenant first** (`tenants.stripe_api_key`, decrypted), falls back
  to platform `STRIPE_SECRET_KEY`. Pinned API version:
  `2025-04-30.basil`.
- **Two separate webhook surfaces**, two separate secrets:
  `STRIPE_WEBHOOK_SECRET` (per-tenant charges) and
  `STRIPE_PLATFORM_WEBHOOK_SECRET` (platform Connect,
  `webhooks/stripe-platform/route.ts:19`).
- **Failure mode:**
  - Webhook secret wrong/rotated → signature verify fails, webhook 4xxs,
    events dropped silently from Stripe's perspective (it retries, but nothing
    lands until fixed) — incident card #5.
  - Ledger write on webhook uses a `23505` unique-violation as an idempotent
    no-op — a **replayed** webhook must not double-post. Do not "fix" doubles
    by removing that guard.
- **Kill-switch:** No app-level flag to disable Stripe/Connect. Practical
  kill-switch is provider-side: pause the webhook endpoint in the Stripe
  dashboard (stops delivery, does not stop outbound charge attempts) or rotate
  the secret to intentionally reject inbound webhooks while investigating.
  Outbound charge/Connect calls have no circuit breaker — a Stripe outage
  fails each call individually (uncaught unless the call site handles it).
- **API version drift risk:** pinned to a dated API version string
  (`2025-04-30.basil`); Stripe deprecates old API versions on a schedule —
  this is a forward-looking maintenance item, not a Part-0 blocker.

---

## 3. Telnyx — SMS + voice

- **Package:** `@telnyx/webrtc` `^2.26.4` (client-side voice widget only).
  **There is no Telnyx server SDK in `package.json`** — outbound SMS and
  number-lookup are plain `fetch()` calls to `https://api.telnyx.com/v2/...`
  (`src/lib/sms.ts:25`, `src/lib/nycmaid/sms.ts:95`,
  `src/lib/onboarding-verify.ts:111`).
- **Auth:** per-tenant `tenants.telnyx_api_key` → fallback `TELNYX_API_KEY`
  (Bearer token on each fetch call, not an SDK client).
- **Inbound verification:** `TELNYX_PUBLIC_KEY` (Ed25519) verifies both SMS
  (`webhooks/telnyx/route.ts:19`) and voice (`webhooks/telnyx-voice/route.ts:432`)
  webhooks.
- **Failure mode:**
  - Outbound SMS: a plain fetch failure (network, 4xx/5xx from Telnyx, wrong
    key) is a per-call failure — no retry/queue layer observed in the fetch
    call sites; check the specific route for error handling before assuming a
    retry happens.
  - Inbound: wrong/missing `TELNYX_PUBLIC_KEY` → all inbound SMS **and** voice
    webhooks fail signature verify and are rejected (both share the one key).
- **Kill-switch:** `TELNYX_WEBHOOK_VERIFY=off` **disables inbound signature
  checking** — this is a real, working kill-switch for verification, but it is
  explicitly a **local-dev-only** flag per `env-var-inventory.md` §3 — setting
  it in prod removes the inbound-forgery guard, it does not "safely disable"
  Telnyx. There is no equivalent switch for outbound sending; removing/blanking
  `TELNYX_API_KEY` (or the per-tenant key) is the only way to stop outbound SMS,
  and it does so by making every send fail, not gracefully.

---

## 4. Resend — transactional email

- **Package:** `resend` `^6.9.2`
- **Client construction:** `src/lib/email.ts`, `src/lib/nycmaid/email.ts` —
  `new Resend(...)`, per-tenant `tenants.resend_api_key` → fallback
  `RESEND_API_KEY`.
- **Failure mode:** missing/bad key → send calls fail (caller-dependent
  whether this throws or is swallowed — check the specific call site, several
  notification paths in this codebase log-and-continue rather than hard-fail
  on notification errors, matching the pattern in the backup cron
  (`dr-restore-drill-runbook.md` §5.3)).
- **Inbound:** `RESEND_WEBHOOK_SECRET` verifies delivery/bounce events;
  `RESEND_WEBHOOK_VERIFY=off` is the same dev-only bypass pattern as Telnyx —
  do not set in prod.
- **Kill-switch:** None for outbound. No dashboard-level pause is scripted
  here; the only lever from this codebase's side is blanking the key, which
  fails every send rather than degrading gracefully.

---

## 5. Anthropic — AI features (Selena, ai-chat, generate-reply, receipt-ai, categorize-ai, google-reviews, google-posts)

- **Package:** `@anthropic-ai/sdk` `^0.78.0`
- **Client construction:** `src/lib/anthropic-client.ts` — full resolution
  order documented in `env-var-inventory.md` §5. Short version: tenant-scoped
  callers use `tenants.anthropic_api_key` if set, else construct against
  platform `ANTHROPIC_API_KEY`. Two platform-internal callers (Jefe agent,
  anthropic-health cron) go straight to `process.env.ANTHROPIC_API_KEY` with
  **no tenant fallback**.
- **Failure mode:** no stored tenant key **and** platform key unset → SDK
  constructed with no key, **throws lazily at first call**, not at boot — so
  this fails silently until a user exercises an AI feature, per feature, not
  as one big outage signal.
- **Kill-switch:** None. No feature flag disables AI call sites independently
  of the key being valid; the only "off" is an invalid/missing key, which
  fails each feature individually rather than being a deliberate switch.
- **Cost/rate-limit exposure:** platform key is the fallback for **every**
  tenant without their own key — a runaway tenant on the shared key is a
  shared-bill and shared-rate-limit risk with no per-tenant throttle observed
  in this lane's read.

---

## 6. Vercel — hosting, deploy, domains

- **Packages:** `@vercel/analytics` `^2.0.1`, `@vercel/speed-insights`
  `^2.0.0` (both client telemetry only — not on any critical path).
- **Deploy mechanism:** `scripts/deploy.sh` → `vercel --prod --yes`, then
  `scripts/post-deploy-alias.sh` re-points every carrying domain
  (`*.fullloopcrm.com` + every `<slug>.fullloopcrm.com`) to the new
  deployment. **A bare `vercel --prod` without the alias step orphans every
  tenant's carrying domain** — this is a documented footgun the script exists
  specifically to prevent (see script header comment).
- **Failure mode:** a bad prod deploy is the #1 platform-wide-5xx cause per
  incident-response card #1.
- **Kill-switch (this one is real and fast):** **Vercel instant rollback** —
  promote the last known-good deployment. Per incident-response.md, this is
  explicitly called out as **faster than a git revert** and the first move for
  a platform-wide 5xx. This is the one dependency in this ledger with a
  genuine, fast, low-blast-radius kill-switch.
- **Related vars:** `VERCEL_API_TOKEN`, `VERCEL_DEPLOY_TOKEN`,
  `VERCEL_DEPLOY_HOOK_SECRET`, `VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID` — deploy
  plumbing, not on the request-serving path (per `env-var-inventory.md` §10).

---

## 7. Clerk — admin auth (not in the original ask, included because it's a hard external dependency gating admin access)

- **Not in `package.json`** as a direct dependency I could confirm by name in
  this grep pass — `CLERK_SECRET_KEY` / `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
  are read directly (`env-var-inventory.md` §1). Flagging as **unverified**:
  I did not find a `@clerk/nextjs` line in `platform/package.json`'s
  dependency list above — if admin auth is live, confirm the actual Clerk
  package and pin before relying on this section for Clerk specifically.
- **Failure mode:** admin auth (server + UI) fails — locks out all admin
  access, not customer-facing.
- **Kill-switch:** None identified.

---

## 8. Cross-cutting notes

- **No circuit breakers found** for any outbound third-party call in this
  lane's read (Stripe, Telnyx, Resend, Anthropic). Every one fails per-call,
  not gracefully-degrades. If Jeff wants graceful degradation (e.g. "AI down
  → hide the AI button" rather than "AI down → button throws on click"), that
  is net-new work, not something already in place.
- **The only two dependencies with a genuine working kill-switch** in this
  codebase today are: (1) **Vercel** — instant rollback, and (2) **inbound
  webhook verification** for Telnyx/Resend/Clerk via the `*_WEBHOOK_VERIFY=off`
  flags — and that second one is a dev-only bypass, not a safe prod lever.
- **Version pins are single-version strings in `package.json`** (`^` ranges,
  not lockfile-audited in this pass) — `pnpm-lock.yaml`/`package-lock.json`
  has the exact resolved versions if an exact-pin audit is needed; this ledger
  reflects the declared ranges only.

---

## 9. What I verified vs. did not

- **Verified (static, this working tree):** every package name/version cited
  above is a literal line in `platform/package.json`; every client-construction
  and fallback-resolution claim is a direct code read (line numbers cited);
  the `TELNYX_WEBHOOK_VERIFY`/`RESEND_WEBHOOK_VERIFY` dev-only-bypass framing
  matches `env-var-inventory.md` §3, which I spot-checked against
  `tenant-header-sig.ts` and `secret-crypto.ts` this session.
- **Did NOT verify:** whether Clerk's actual npm package is present (flagged
  above), whether any given fetch/SDK call site has retry logic (would require
  reading every call site, not done for this pass — flagged as unknown rather
  than assumed), current PITR/backup status for Supabase (Jeff-gated, see DR
  runbook), and exact resolved versions from the lockfile (ranges only).
