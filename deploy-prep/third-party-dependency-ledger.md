# Third-Party Dependency Ledger (A9)

**Author:** W1 (schema + backfill lane) · **Date:** 2026-07-12 · **Status:** FILE ONLY — reference doc, nothing here was run or changed.

Per-dependency ledger for the external services the platform hard-depends on at
runtime: **pinned version, failure mode, kill-switch, blast radius.** Written for
the Q3 cutover so that when a vendor degrades mid-release the on-call knows the
exact lever and how far the blast reaches.

---

## How versions are "pinned" here (read first)

`platform/package.json` declares most deps with a **caret** (`^`), i.e. floating
within the current major. The **exact** resolved version is frozen in
`platform/package-lock.json`, and **CI + Vercel install with `npm ci`**
(`.github/workflows/ci.yml` → `npm ci`), which installs the lockfile-exact tree
and fails if `package.json` and the lock disagree. So the *effective* pin is the
lockfile, not the caret. Two columns below:

- **Declared** = the range in `package.json` (what a fresh `npm install` may bump to).
- **Effective** = lockfile-exact via `npm ci` (what actually ships).

> Action item (not done here): to make prod truly reproducible, either commit to
> `npm ci`-only everywhere (already true in CI) or drop the carets to exact. The
> risk today is a stray `npm install` on a dev box silently bumping a major-safe
> minor into the lockfile. Low, but real.

---

## 1. Supabase — `@supabase/supabase-js`

| | |
|---|---|
| **Declared / Effective** | `^2.98.0` / lockfile-exact via `npm ci` |
| **Role** | Primary datastore (Postgres) + Storage. The app runs on the **`service_role`** key, which **bypasses RLS** — tenant isolation is enforced in application code (`.eq('tenant_id', …)`), not the database. |
| **Credentials** | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| **Failure mode** | Full outage = **total platform down** (every read/write path). Partial: connection-pool exhaustion → 500s under load; a bad migration → constraint/relation errors on specific routes. |
| **Kill-switch** | None soft. There is no read-only/degraded mode — the app cannot serve tenant data without Supabase. Recovery = restore Supabase (Vercel-side you can only show an error page). |
| **Blast radius** | **ALL 22 brands, all data, auth, money.** This is the single largest dependency. Because tenant scoping is app-level, a service_role key leak is also a cross-tenant data breach, not just downtime. |
| **Q3 note** | The Part-0 release adds/enforces `tenant_domains` columns and freezes `tenants.domain`. A bad migration here is a Supabase-side failure — see `rollback-note-per-migration.md` for the exact reverse SQL. |

## 2. Stripe — `stripe` (server) + `@stripe/stripe-js` (client)

| | |
|---|---|
| **Declared / Effective** | server `^20.4.0`, client `^8.8.0` / lockfile-exact |
| **API version pin** | **`2025-04-30.basil`** — pinned in code at every `new Stripe(...)` (e.g. `api/invoices/public/[token]/checkout/route.ts:43`, `team-members/[id]/stripe-status`, `stripe-onboard`). This pin is independent of the SDK version; upgrading the SDK does **not** change the wire API version. |
| **Credentials** | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| **Failure mode** | Outage = checkout / invoice pay / deposit / Connect onboarding fail. Webhook endpoint down or signature mismatch = payment state (`paid`/`succeeded`) never lands even though money moved → **silent revenue/state drift**. |
| **Kill-switch** | Disable/rotate the restricted key in the Stripe dashboard to stop new charges. Individual flows fail closed if `STRIPE_SECRET_KEY` is unset (route returns error rather than charging). |
| **Blast radius** | Money-movement for any tenant using payments. Scoped per-tenant by which tenants have Stripe configured; not a data-isolation risk by itself. |
| **Q3 note** | Deploy-time one-liner still pending: `idempotencyKey` on `stripe.transfers.create` (belt-and-suspenders). See BATCH-REVIEW-MANIFEST §C. Not applied by design. |

## 3. Telnyx — `@telnyx/webrtc` (+ REST for SMS/voice)

| | |
|---|---|
| **Declared / Effective** | `@telnyx/webrtc ^2.26.4` / lockfile-exact. SMS/voice call the Telnyx **REST API** directly (keyed by `TELNYX_API_KEY`), not through a pinned server SDK. |
| **Credentials** | `TELNYX_API_KEY`, `TELNYX_PHONE` (per-tenant DID lives in `tenants.telnyx_phone`) |
| **Failure mode** | Outage = outbound SMS + voice fail. A **missing per-tenant DID** (`tenants.telnyx_phone` empty) makes that tenant's calls 404 — a config failure, not a Telnyx outage. Inbound webhooks down = missed inbound SMS/calls. |
| **Kill-switch** | Unset `TELNYX_API_KEY` (or the tenant's DID) to stop that channel; messaging paths are best-effort and should not take down page renders. |
| **Blast radius** | Comms only (SMS/voice), per-tenant by DID config. **No** data or money path. Voice `ADMIN_RING` routing is still nycmaid-global (known follow-up, not a Telnyx issue). |
| **Q3 note** | Any 2nd voice tenant must have its DID seeded in `tenants.telnyx_phone` **before** the voice-hardening deploy (Phase C) or its calls 404. |

## 4. Resend — `resend`

| | |
|---|---|
| **Declared / Effective** | `^6.9.2` / lockfile-exact |
| **Credentials** | `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET` |
| **Failure mode** | Outage = transactional email (receipts, notifications, OTP-by-email if any) not sent. Inbound-email webhook down = inbound parsing stalls. |
| **Kill-switch** | Unset `RESEND_API_KEY`; email sends are best-effort and must not block the triggering request. |
| **Blast radius** | Email channel only, per-tenant. **Second-order auth risk** only if any login/verification path depends on email delivery — confirm before treating as "cosmetic." |
| **Q3 note** | Inbound-email scoping (`062_add_tenant_id_inbound_emails` + route `42b5a39`) must land migration-first (Phase C / DB order step 6). |

## 5. Anthropic — `@anthropic-ai/sdk`  (the "Anthropic/xAI" line)

| | |
|---|---|
| **Declared / Effective** | `@anthropic-ai/sdk ^0.78.0` / lockfile-exact |
| **Model pin** | **`claude-sonnet-4-20250514`** — hard-coded at the call sites (e.g. `site/nyc-mobile-salon/_lib/selena.ts`). Client is `new Anthropic()` (reads `ANTHROPIC_API_KEY` from env). |
| **Credentials** | `ANTHROPIC_API_KEY` |
| **Failure mode** | Outage / rate-limit / model retirement = the "Selena" AI assistant + lead-filter features degrade. There is a text fallback path in `selena.ts` (retries without tools), but a hard 5xx from Anthropic surfaces as a failed assistant turn. |
| **Kill-switch** | Unset `ANTHROPIC_API_KEY` (feature should degrade, not crash the page). A retired model string is a **code change**, not an env flip. |
| **Blast radius** | AI assistant / lead-qualification features on the tenant sites that use them. **No** data-isolation, auth, or money path. Lowest-criticality external dep. |
| **⚠️ xAI / Grok** | The A9 order names "Anthropic/xAI." **No xAI/Grok SDK, endpoint, or `XAI_*`/`GROK_*` env var exists in this worktree** (grep of `platform/src` + `package.json` = 0 hits). The only LLM dependency in code is Anthropic. Flagging rather than inventing an xAI row. If a Grok integration is planned/landed on another branch, this ledger needs a row added at merge. |

## 6. Vercel — hosting + `@vercel/*` client libs

| | |
|---|---|
| **Declared / Effective** | `@vercel/analytics ^2.0.1`, `@vercel/speed-insights ^2.0.0`, `@next/third-parties ^16.2.6`; runtime is **Next.js `16.1.6`** on **React `19.2.3`** (both exact-pinned in `package.json`). |
| **Role** | Deploy target + edge/middleware host. `middleware.ts` (Edge) runs the tenant resolver (`rewriteToSite` → `x-tenant-slug`). Preview + prod deploys, DNS, and env vars all live here. |
| **Failure mode** | Platform outage = **everything down** (Vercel serves the app). Edge/middleware regression = wrong-tenant routing (the exact failure the resolver-flip smoke suite guards). A bad env var propagation = features silently mis-keyed. |
| **Kill-switch** | **Rollback to the previous production deployment** in the Vercel dashboard (instant, no rebuild) — the primary deploy-side lever for Q3. Promote-previous is faster than any code revert. |
| **Blast radius** | ALL brands (shared deploy). The `vercel_project` column (migration `059`) maps tenants→projects; a mis-map routes a tenant to the wrong project. |
| **Q3 note** | Phase B resolver-flip deploys here; the **Vercel promote-previous** is the first-line rollback for a bad flip (see `rollback-per-wave.md`), ahead of any `git revert`. |

---

## Criticality ranking (for on-call triage)

| Rank | Dependency | If it's down |
|---|---|---|
| 1 | **Supabase** | Total outage — no data, no auth, no money. Also the breach surface (service_role bypasses RLS). |
| 1 | **Vercel** | Total outage — nothing serves. Rollback = promote-previous deploy. |
| 2 | **Stripe** | Money stops / state drift; scoped to payment tenants. |
| 3 | **Telnyx** | Comms (SMS/voice) stop; per-tenant by DID. |
| 3 | **Resend** | Email stops; confirm no auth path depends on it. |
| 4 | **Anthropic** | AI assistant degrades; has a fallback; no data/money path. |

## Cross-cutting facts

- **Effective pin = lockfile via `npm ci`.** Carets in `package.json` are not the ship pin.
- **API version pins are separate from SDK versions:** Stripe wire API `2025-04-30.basil` and Anthropic model `claude-sonnet-4-20250514` are pinned in code and won't move on an SDK bump.
- **Secrets inventory** for these lives per `deploy-prep` env docs / W6's secrets-at-rest audit; this ledger names the keys but is not the rotation runbook (see W5 `credential-rotation-policy.md`).
- **Standing risk carried:** Supabase `service_role` bypasses RLS, so tenant isolation is app-level and load-bearing — a Supabase-layer bug or key leak is a cross-tenant event, not just downtime.
