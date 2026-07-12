# Provisioning Failure Runbooks

**Worker:** W6 · **Branch:** p1-w6 · **Date:** 2026-07-12 · **Status:** docs only, nothing applied
**Scope:** One runbook per provisioning failure mode the leader flagged: domain unverified, payment
failed mid-provision, DID (Telnyx number) not seeded, SEO gen fail. No code, env, or DB rows changed.

**Verification anchors (read directly this pass):** `lib/activate-tenant.ts` (full file, 433 lines),
`lib/provision-tenant.ts` (full file), `lib/vercel-domains.ts` (full file), `lib/onboarding-verify.ts`
(full file), `lib/onboarding-gate.ts:1-140`, `lib/seo/onboarding.ts` (full file),
`app/api/admin/businesses/[id]/verify-checklist/route.ts:1-40`, `app/api/webhooks/stripe/route.ts`
(case list), `lib/tenant-profile.ts` (grep), `lib/secret-crypto.ts:16-27`.

---

## 0. The architecture every runbook below depends on

There is **one** provisioning entry point: `activateTenant(tenantId)` in `lib/activate-tenant.ts`,
wired to the admin "Activate" button. It is **idempotent by construction** — every step no-ops if its
work already exists — and it is **not transactional**: it runs ~10 steps in sequence, each wrapped in
its own `try/catch`, and a failed step just gets recorded as `status: 'failed' | 'action_needed'` while
execution continues to the next step (`activate-tenant.ts:114-116`, `156-158`, `175-177`, etc.). There
is no rollback and no automatic retry anywhere in this file.

Three facts this implies for every failure mode below:

1. **A failed step never corrupts or blocks another step.** Domain registration deliberately runs
   **last** (`activate-tenant.ts:317-320`, comment: "external Vercel API calls are the slowest part
   and must never block the essential DB provisioning above") specifically so a domain/payment/Telnyx
   problem never leaves settings/services/owner-login half-seeded.
2. **Recovery is almost always "fix the external config, then re-run activation."** Because every step
   is idempotent, re-running `activateTenant` (or hitting "Activate" again) is always safe — it will
   skip everything already done and retry only what previously failed.
3. **`activateTenant` only flips `tenants.status` to `'active'` when the onboarding gate passes, an
   owner login exists, AND the site actually serves** (`activate-tenant.ts:404-413`, the `siteServes`
   gate — added specifically because `VERCEL_API_TOKEN`/`VERCEL_TEAM_ID` being unset used to still flip
   tenants active with no live domain, per the comment at `:399-403`). A tenant stuck `action_needed` on
   domain will correctly stay non-active; the other three failure modes below are **not** covered by any
   equivalent hard gate — see each section's "detection" for what actually catches it.

**Breadcrumb trail:** every phase boundary writes a best-effort row to `notifications`
(`type: 'activation_debug'`) via the `crumb()` helper (`activate-tenant.ts:56-70`), specifically so a
hard-killed activation run (timeout, crash) leaves a trace of exactly where it stopped. Check this table
first when a tenant looks stuck mid-provision with no clear step status.

**Separate live-verification endpoint:** `POST /api/admin/businesses/[id]/verify-checklist` runs real
DNS/SSL/Resend/Telnyx/Stripe checks against the tenant's actual stored (decrypted) credentials via
`lib/onboarding-verify.ts`, independent of activation. Use this to **diagnose** a failure precisely
before touching anything — every runbook below leans on it.

---

## 1. Domain unverified

**Symptom:** tenant never flips to `active`, or flips with a dead/unreachable custom domain.

**Detection:**
- Activation step `carrying_domain` or `custom_domain` shows `status: 'action_needed'` or `'failed'`
  (`activate-tenant.ts:320-347`).
- `verify-checklist` → `dns_a`, `dns_cname_www`, `ssl_active` (`onboarding-verify.ts:21-77`) give the
  precise DNS/TLS state.
- The tenant will correctly never show `status:'active'` until `siteServes` is true
  (`activate-tenant.ts:404,413`) — this is the one failure mode with a real hard gate.

**Root causes, grounded in code:**
1. `VERCEL_API_TOKEN` / `VERCEL_TEAM_ID` unset in the deploy env → `registerCarryingDomain` /
   `registerCustomDomain` both short-circuit to `status: 'skipped'`
   (`vercel-domains.ts:52-55, 147-149`) before ever calling Vercel. This is the historical root cause
   of dead auto-created tenant sites (see the `:399-403` comment) — now caught by the `siteServes` gate
   instead of silently going live.
2. The tenant's custom domain DNS isn't pointed at Vercel yet: apex `A` must resolve to `76.76.21.21`,
   `www` `CNAME` must target a `vercel-dns`/`vercel.app` host (`vercel-domains.ts:129-135`,
   `onboarding-verify.ts:21-48`). Ordinary "tenant hasn't updated their registrar yet" case.
3. The domain is already attached to a **different** Vercel account/project. Vercel requires a one-time
   TXT ownership-challenge record, which `registerCustomDomain` surfaces in its `records` array
   (`vercel-domains.ts:186-192`) — if that TXT record isn't set, `verified` never flips true no matter
   how correct the A/CNAME records are.

**Blast radius:** contained to the one tenant's public site. DB-side provisioning (services, Selena
config, owner login, founding team member, onboarding tasks) is already done and unaffected — domain
runs last specifically so this failure mode never touches those.

**Recovery:**
1. Read the activation step detail — `'... — Vercel env not configured'` means cause #1 above; anything
   else means cause #2 or #3.
2. If cause #1: confirm `VERCEL_API_TOKEN`/`VERCEL_TEAM_ID` are set in the platform's Vercel project env
   (Jeff/leader — this worktree has no env write access).
3. If cause #2/#3: hand the tenant the exact records from `customDomain.records` (apex A, www CNAME,
   plus any TXT challenge) to set at their registrar.
4. Poll with `POST verify-checklist` (cheap, no re-seeding) until `dns_a`/`dns_cname_www`/`ssl_active`
   go green.
5. Re-run activation (safe — idempotent) so `customDomain.verified` and the `siteServes` gate flip, and
   `status` moves to `active`.

**Prevention gap (flagged, not fixed):** no alert fires while a tenant sits in domain-unverified limbo
for days. Ties to the broader finding in `deploy-prep/health-monitor-coverage-gap.md` (no synthetic
monitor watches per-tenant domain health at all).

---

## 2. Payment failed mid-provision

**Read this section's gotcha first — it changes what "failed" even means here.** Stripe is **not**
auto-provisioned during activation at all. `stripe_api_key` (encrypted) and an optional Connect
`stripe_account_id` are **manually entered per tenant** via the tenant-profile PATCH endpoint
(`lib/tenant-profile.ts`, `routeProfileWrite`/`encryptTenantSecrets`). "Payment failed mid-provision"
in practice means: a key/account was entered, but it isn't actually chargeable yet — and **the
onboarding gate does not catch this**.

**Detection — use `verify-checklist`, not the activation gate:**
- `verify-checklist` → `stripe_account` calls Stripe live: if a Connect `accountId` is set, it checks
  `charges_enabled` **and** `payouts_enabled`; if not, it just validates the key against
  `balance.retrieve()` (`onboarding-verify.ts:138-160`).
- `verify-checklist` → `stripe_webhook_configured` confirms an **enabled** webhook endpoint exists at
  `${appUrl}/api/webhooks/stripe` (`onboarding-verify.ts:162-178`).
- **The onboarding gate's `payment` stage does NOT call Stripe at all.** It only checks
  `settings.payment_methods.length > 0` (`onboarding-gate.ts:94-99`) — and `provisionTenant()` seeds
  `payment_methods: ['zelle','apple_pay','credit_card','cash']` **by default for every tenant**
  (`provision-tenant.ts:155`). A tenant can be flipped fully `active` by the gate with Stripe entirely
  broken or never configured, because the default non-Stripe methods always satisfy this stage.
  **Do not trust `gate.stages.payment.ok === true` as evidence Stripe works.**

**Root causes, grounded in code:**
1. `stripe_api_key` never entered, or the wrong key pasted → `verifyStripeAccount` returns "No Stripe
   secret key" or a live 401 from Stripe.
2. `stripe_account_id` set but the tenant never finished Stripe's own onboarding (KYC / bank linking) →
   `charges_enabled`/`payouts_enabled` are `false` even though the account exists and the key is valid.
3. Webhook endpoint for `/api/webhooks/stripe` never registered in the Stripe dashboard for that
   key/account → charges can succeed at Stripe while the CRM never hears about it. The route handles
   `checkout.session.completed`, `charge.refunded`, `charge.dispute.created`,
   `payment_intent.payment_failed`, `account.updated`, `invoice.paid`, `invoice.payment_failed`,
   `customer.subscription.deleted` (`app/api/webhooks/stripe/route.ts`, case list) — any of these
   silently dropped means bookings can look unpaid/unreconciled despite a real charge.

**Blast radius:** highest of the four — real customer money with no confirmation reaching the CRM if
the webhook is dark, or a tenant that believes they're chargeable when they aren't (declined charges at
the point of sale, discovered by an angry client, not by monitoring).

**Recovery:**
1. `POST verify-checklist` first — get the exact failure (no key / bad key / KYC incomplete / webhook
   missing). Don't guess from symptoms.
2. Missing/wrong key: PATCH the tenant-profile field with the correct key — encryption is handled by
   `encryptTenantSecrets`; never write a plaintext key directly to the `tenants` row.
3. KYC/bank-linking incomplete: this is on the tenant, not the CRM — nothing to re-run until they
   complete Stripe's own onboarding link.
4. Webhook missing: register `${appUrl}/api/webhooks/stripe` in the Stripe dashboard for that
   key/account, subscribed at minimum to the event types listed above.
5. Re-run `verify-checklist` to confirm green. **Do not** rely on re-running activation to reveal this —
   the gate's payment stage will report `ok` regardless, per the gotcha above.

**Prevention gap (flagged, not fixed):** propose tightening `onboarding-gate.ts`'s payment stage to call
`verifyStripeAccount` when a `stripe_api_key` is present, instead of accepting the always-seeded default
methods array as sufficient. Not implemented in this file-only pass — flag to leader as a follow-on.

---

## 3. DID (Telnyx number) not seeded

**Read this section's gotcha first, same shape as §2.** There is **no automated Telnyx number-purchase
flow anywhere in this codebase** (confirmed by grep for Telnyx's number-order API — no hits outside
`onboarding-verify.ts`'s read-only lookup). `telnyx_phone` and `telnyx_api_key` are manually entered per
tenant, the key encrypted at rest. "DID not seeded" means the operator either never entered a number,
entered the wrong one, or entered one that isn't fully wired at Telnyx.

**Detection:**
- `verify-checklist` → `telnyx_number_active` (`onboarding-verify.ts:107-134`) requires **all three**:
  the number exists in the Telnyx account, `status === 'active'`, and a `messaging_profile_id` is
  attached.
- **There is no gate stage for this at all.** `onboarding-gate.ts`'s `GateStageKey` union is
  `'site' | 'lead' | 'schedule' | 'payment' | 'review'` — no `telnyx`/`sms` stage exists. A tenant can
  be flipped fully `active` with SMS completely non-functional and nothing in the activation flow will
  ever flag it. `verify-checklist` is the *only* place this is checked.

**Root causes, grounded in code:**
1. `telnyx_api_key`/`telnyx_phone` never entered → immediate "No Telnyx API key" / "No Telnyx phone
   configured" from the checker.
2. Number purchased and active at Telnyx, but never attached to a messaging profile → `status:'active'`
   but `hasMessagingProfile: false` (`onboarding-verify.ts:123-129`). Inbound SMS/webhook routing
   depends on the messaging profile, so this looks fine at a glance (number is "active") but SMS is
   completely dark.
3. Formatting mismatch: the lookup is an **exact-match** Telnyx filter on `phone_number`
   (`onboarding-verify.ts:111`, `filter[phone_number]=...`, no normalization). A number stored without
   strict E.164 formatting (`+1XXXXXXXXXX`) returns "not found in Telnyx account" even if the number is
   real and owned.

**Blast radius:** SMS to/from that tenant's number is dark — no inbound webhook fires, Selena never
sends outbound replies. Silent: no gate stage means nothing surfaces this at go-live time; it's
discovered when a client texts and gets no reply.

**Recovery:**
1. `POST verify-checklist`, read `telnyx_number_active.detail` for the precise reason.
2. Not found → check E.164 formatting matches Telnyx's record exactly.
3. No messaging profile → attach the number to a messaging profile in the Telnyx dashboard (not
   automatable from this codebase today).
4. Re-run `verify-checklist` to confirm `active` + `messaging_profile_id` present.

**Prevention gap (flagged, not fixed):** recommend adding a `telnyx`/`comms` stage to
`onboarding-gate.ts` wired to `verifyTelnyxNumber`, since today this failure mode has zero automated
detection at go-live — same shape as the payment gotcha in §2. Not implemented here.

---

## 4. SEO gen fail

**Disambiguation first — two different things share this name in the codebase:**
1. `registerSeoProperty()` (`lib/seo/onboarding.ts`) — the **only** SEO step wired into activation
   (`activate-tenant.ts:377-396`). Registers the tenant's domain into `seo_properties` as
   `awaiting_grant`. **This runbook covers this step.**
2. The geo/service page content generator (`lib/seo/content.ts`, ~945 lines of pure template
   functions) plus the decoupled `cron/seo-autopilot` / `seo-ingest` / `seo-propose` routes. These run
   at page-render/scheduled time, are **not part of activation**, and a failure there is a live-site
   rendering or cron bug, not a provisioning failure — out of scope for this doc.

**Detection:** activation step `seo_monitoring` shows `status: 'failed'` with the caught error message
(`activate-tenant.ts:394-395`) — a `try/catch` around `registerSeoProperty`, so this never blocks
activation (same best-effort pattern as domain registration).

**Root causes, grounded in `lib/seo/onboarding.ts:26-53`:**
1. **Not actually a failure — a documented no-op.** If the tenant has no custom domain and only a
   carrying domain (`<slug>.fullloopcrm.com`), `registerSeoProperty` deliberately returns `null`
   (`:36` — carrying/preview hosts are explicitly excluded, "not standalone public sites"). This
   surfaces as `'no valid domain to track'` in the step detail (`activate-tenant.ts:392`) — this is
   correct behavior for a tenant with no custom domain yet, not a bug. Don't chase this as a real
   failure; recheck once a custom domain is set.
2. A genuine DB error on the `seo_properties` upsert (constraint violation, connection issue) — thrown
   and caught, surfaces as a real `failed` status with the DB error message.

**Blast radius:** low relative to the other three — a tenant not tracked in `seo_properties` only means
Search Console metrics / `seo-autopilot` never touch that domain. No customer-facing breakage, no data
loss. Purely a missed-monitoring gap.

**Recovery:**
1. Read the `seo_monitoring` step detail (or the `activation_debug` breadcrumbs) to distinguish the
   expected "no valid domain to track" no-op from a genuine DB error.
2. If it's the no-op: set the tenant's custom domain, then re-run activation — idempotent, and the
   upsert uses `ignoreDuplicates: true` so it never overwrites an already-live property
   (`lib/seo/onboarding.ts:22-24`, doc comment).
3. If it's a genuine DB error: check the `seo_properties` table/constraints directly (Jeff/leader — no
   prod DB access from this worktree), then re-run activation.
4. For bulk recovery after a systemic failure (not just one tenant): `backfillUntrackedDomains()`
   (`lib/seo/onboarding.ts:59-74`) sweeps every active `tenant_domains` row not yet in `seo_properties`
   — safer than re-running full activation per tenant one at a time.

---

## Summary — shared recovery pattern

| Failure mode | Hard gate blocks `active`? | Primary diagnostic | Blast radius |
|---|---|---|---|
| Domain unverified | **Yes** — `siteServes` (§1) | `verify-checklist` DNS/SSL checks | Contained to that tenant's site |
| Payment failed | **No** — gate accepts default methods array | `verify-checklist` Stripe checks (gate is blind) | Highest — real money, silent |
| DID not seeded | **No** — no gate stage exists at all | `verify-checklist` Telnyx check (only place it's caught) | SMS dark, silent |
| SEO gen fail | **No** — best-effort, never blocks | Activation step detail | Lowest — monitoring only |

Two of the four failure modes (§2 payment, §3 DID) have **no automated go-live detection** — a tenant
can be flipped fully `active` with either broken. Both prevention gaps are flagged above as follow-on
work, not fixed in this pass (file-only, no code changes).
