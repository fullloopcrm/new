# Provisioning Failure Runbooks (5-mode set)

**Worker:** W6 · **Branch:** p1-w6 · **Date:** 2026-07-12 · **Status:** docs only, nothing applied
**Scope:** One runbook per provisioning failure mode the leader flagged for this pass: domain not
verified, payment failed mid-provision, DID (Telnyx number) not seeded, owner-invite expired, funnel_mode
wrong. No code, env, or DB rows changed.

**Relationship to `provisioning-runbooks.md`:** that existing doc (same directory) covers the same first
three failure modes (domain/payment/DID) plus a fourth, SEO gen fail — this pass swaps SEO gen fail out
and adds two failure modes that weren't covered before: owner-invite expired, funnel_mode wrong. §§1-3
below are condensed restatements of that doc's §§1-3 (kept self-contained so this file stands alone);
read `provisioning-runbooks.md` for the deeper code walkthrough of those three if needed. §§4-5 are new
research for this pass.

**Verification anchors read this pass:** `lib/activate-tenant.ts` (full file), `lib/provision-tenant.ts`
(full file), `lib/industry-presets.ts` (full file, 596 lines — `mapIndustry`, `SERVICE_PRESETS`,
`DEFAULT_SELENA_CONFIG`... actually defined in `provision-tenant.ts:36-49`), `lib/settings.ts:40-49,
214-223` (`funnel_mode` load + fallback), `lib/selena/agent-config-loader.ts` (full file —
`funnelToBooking`, `funnelToPricing`), `app/api/admin/invites/route.ts` (full file),
`app/join/[token]/accept/page.tsx` (full file), `lib/onboarding-verify.ts`, `lib/onboarding-gate.ts:1-140`.

---

## 0. The architecture every runbook below depends on

One provisioning entry point, `activateTenant(tenantId)` in `lib/activate-tenant.ts`, wired to the admin
"Activate" button. **Idempotent by construction** (every step no-ops if its work already exists) and
**not transactional** — ~10 steps run in sequence, each in its own `try/catch`; a failed step is recorded
as `status: 'failed' | 'action_needed'` and execution continues (`activate-tenant.ts:114-116, 156-158,
175-177`, etc.). No rollback, no automatic retry. Domain registration runs **last** on purpose
(`:317-320`) so an external-API failure never leaves DB-side provisioning half-seeded. Recovery for most
failure modes below is "fix the external config or DB field, then re-run activation" — always safe,
because every step is idempotent.

`activateTenant` only flips `tenants.status` to `'active'` when the onboarding gate passes, an owner login
exists, **and** the site actually serves (`:404-413`, the `siteServes` gate). That's the *only* hard gate
in this flow. As the table at the end of this doc shows, three of the five failure modes below have zero
automated detection at go-live — a tenant can be flipped fully `active` with any of them silently broken.

**Breadcrumb trail:** every phase boundary writes a best-effort row to `notifications`
(`type: 'activation_debug'`) via `crumb()` (`activate-tenant.ts:56-70`) — check this table first when a
tenant looks stuck mid-provision with no clear step status.

**Separate live-verification endpoint:** `POST /api/admin/businesses/[id]/verify-checklist` runs real
DNS/SSL/Resend/Telnyx/Stripe checks against the tenant's actual stored (decrypted) credentials via
`lib/onboarding-verify.ts`, independent of activation — every runbook below leans on it for diagnosis.

---

## 1. Domain unverified

**Symptom:** tenant never flips to `active`, or flips with a dead/unreachable custom domain.

**Detection:** activation steps `carrying_domain`/`custom_domain` show `action_needed`/`failed`
(`activate-tenant.ts:320-347`); `verify-checklist` → `dns_a`, `dns_cname_www`, `ssl_active`
(`onboarding-verify.ts:21-77`) give the precise DNS/TLS state. This is the one failure mode with a real
hard gate — `siteServes` (`:404,413`) keeps the tenant off `active` until the domain actually resolves.

**Root causes:**
1. `VERCEL_API_TOKEN`/`VERCEL_TEAM_ID` unset → domain registration short-circuits to `status: 'skipped'`
   (`vercel-domains.ts:52-55,147-149`) before ever calling Vercel.
2. Tenant's DNS isn't pointed at Vercel yet (apex `A` → `76.76.21.21`, `www` `CNAME` → a `vercel-dns`/
   `vercel.app` host).
3. Domain already attached to a different Vercel account/project — needs a one-time TXT
   ownership-challenge record (`vercel-domains.ts:186-192`).

**Blast radius:** contained to that tenant's public site — DB-side provisioning is unaffected since domain
runs last.

**Recovery:** read the step detail to distinguish cause #1 (env) from #2/#3 (DNS records) → for #1, Jeff
sets the Vercel env vars (no write access from this worktree) → for #2/#3, hand the tenant the exact
records from `customDomain.records` → poll `verify-checklist` until DNS/SSL go green → re-run activation
(idempotent) to flip `siteServes` and `status`.

**Prevention gap:** no alert fires while a tenant sits in domain-unverified limbo for days — ties to
`deploy-prep/health-monitor-coverage-gap.md`.

---

## 2. Payment failed mid-provision

**Gotcha first:** Stripe is **not** auto-provisioned during activation. `stripe_api_key`/
`stripe_account_id` are manually entered per tenant via the tenant-profile PATCH endpoint. "Payment failed
mid-provision" means a key/account was entered but isn't actually chargeable — **and the onboarding gate
does not catch this.**

**Detection:** `verify-checklist` → `stripe_account` (live `charges_enabled`/`payouts_enabled` check if a
Connect account is set, else a `balance.retrieve()` key check) and `stripe_webhook_configured`
(`onboarding-verify.ts:138-178`). **The gate's `payment` stage does NOT call Stripe at all** — it only
checks `settings.payment_methods.length > 0` (`onboarding-gate.ts:94-99`), and `provisionTenant()` seeds
`payment_methods: ['zelle','apple_pay','credit_card','cash']` by default for every tenant
(`provision-tenant.ts:155`), so a tenant can be flipped fully `active` with Stripe entirely broken. Do not
trust `gate.stages.payment.ok === true` as evidence Stripe works.

**Root causes:** wrong/missing key; Connect account created but KYC/bank-linking never finished (
`charges_enabled`/`payouts_enabled` false); webhook for `/api/webhooks/stripe` never registered at Stripe
(charges succeed, CRM never hears about it — dropped `checkout.session.completed`,
`payment_intent.payment_failed`, etc.).

**Blast radius:** highest of the five — real customer money with no confirmation reaching the CRM, or a
tenant that believes they're chargeable when they aren't, discovered by an angry client rather than
monitoring.

**Recovery:** `verify-checklist` first to get the exact cause (never guess from symptoms) → fix the key
via tenant-profile PATCH (encryption handled by `encryptTenantSecrets`, never write plaintext) or wait on
tenant-side KYC or register the missing webhook → re-run `verify-checklist` to confirm green. Do not rely
on re-running activation to reveal this — the gate's payment stage reports `ok` regardless.

**Prevention gap:** tighten `onboarding-gate.ts`'s payment stage to call `verifyStripeAccount` when a
`stripe_api_key` is present, instead of accepting the always-seeded default methods array. Not
implemented — flagged as follow-on.

---

## 3. DID (Telnyx number) not seeded

**Gotcha first:** there is **no automated Telnyx number-purchase flow** anywhere in this codebase.
`telnyx_phone`/`telnyx_api_key` are manually entered per tenant. "DID not seeded" means the operator never
entered a number, entered the wrong one, or entered one not fully wired at Telnyx.

**Detection:** `verify-checklist` → `telnyx_number_active` (`onboarding-verify.ts:107-134`) requires the
number to exist, be `active`, **and** have a `messaging_profile_id` attached. **There is no gate stage for
this at all** — `onboarding-gate.ts`'s `GateStageKey` union (`'site'|'lead'|'schedule'|'payment'|
'review'`) has no `telnyx`/`sms` entry. A tenant can go fully `active` with SMS completely non-functional.

**Root causes:** key/number never entered; number active at Telnyx but never attached to a messaging
profile (`status:'active'` but `hasMessagingProfile:false` — looks fine at a glance, SMS is dark);
formatting mismatch (exact-match filter on `phone_number`, no E.164 normalization —
`onboarding-verify.ts:111`).

**Blast radius:** SMS to/from that tenant's number is dark, discovered when a client texts and gets no
reply — nothing surfaces it at go-live time.

**Recovery:** `verify-checklist`, read `telnyx_number_active.detail` for the precise reason → fix E.164
formatting or attach the messaging profile in the Telnyx dashboard (not automatable from this codebase) →
re-run `verify-checklist` to confirm.

**Prevention gap:** add a `telnyx`/`comms` stage to `onboarding-gate.ts` wired to `verifyTelnyxNumber` —
same shape as the payment gotcha above. Not implemented here.

---

## 4. Owner-invite expired

**The mechanism:** `POST /api/admin/businesses/invites` (via `/api/admin/invites/route.ts`) creates a row
in `tenant_invites` with a random 32-byte token and a **hardcoded 7-day expiry**
(`expires_at = Date.now() + 7 * 24 * 60 * 60 * 1000`, `invites/route.ts`), then emails
`${appUrl}/join/${token}` to the invited owner. This is a **separate owner-onboarding path** from the PIN-
based `owner_login` team member that `activateTenant` seeds directly (`activate-tenant.ts:262-297`) — a
tenant can have a working PIN-based owner login *and* a dead invite link at the same time; they don't
gate each other.

**What actually happens on expiry:** `AcceptInvitePage` (`app/join/[token]/accept/page.tsx:26`) checks
`!invite || invite.accepted || new Date(invite.expires_at) < new Date()` and **silently redirects to
`/dashboard`** with no error message, no toast, no logged reason — the invited owner just lands on a
dashboard they can't access (or a login wall, since they were never added to `tenant_members`) with zero
indication *why* the link didn't work. There's no "resend invite" affordance visible in what was checked
this pass — a new invite has to be issued from scratch via the same admin POST.

**Detection:** query `tenant_invites` for the tenant: `accepted = false AND expires_at < now()` is a
silently-dead invite. There is no dashboard surface, alert, or cron that flags this — an admin only
discovers it by manually checking the table or because the tenant/owner reports "the link doesn't work."
The existing-invite check on the POST route
(`.eq('accepted', false).gte('expires_at', new Date().toISOString())`) prevents issuing a second *active*
invite for the same email, but does nothing to surface an already-expired one.

**Root causes:**
1. Owner didn't click the emailed link within 7 days (vacation, spam folder, ignored email) — by far the
   ordinary case.
2. Invite was sent to the wrong email (`email.toLowerCase()` normalizes but doesn't validate deliverability)
   and silently expired unopened, with nothing surfacing the bounce.
3. Owner clicked the link, was prompted to sign in/up via Clerk (`getOwnerUserId()`), abandoned that flow,
   and the invite expired before they returned to finish it — from their perspective they "already tried
   the link" and it now silently fails on retry with the same no-error redirect.

**Blast radius:** contained to that one tenant's owner-facing team access — `activateTenant`'s own
PIN-based `owner_login` seeding is unaffected (different mechanism, per the gotcha above), so the tenant
can usually still be operated by admin/PIN in the interim. The customer-facing risk is purely
"business owner locked out of their own dashboard with no clear explanation," which becomes a support
escalation, not a data-loss event.

**Recovery:**
1. Confirm the invite actually expired (query `tenant_invites` by `tenant_id`/`email`, check
   `expires_at`/`accepted`) rather than assuming — a "the link doesn't work" report could also mean the
   owner clicked the wrong URL or hit a Clerk auth error unrelated to expiry.
2. Re-issue: `POST /api/admin/invites` with the same `tenant_id`/`email`/`role` — this mints a fresh token
   and a fresh 7-day window; the existing-active-invite check on that route only blocks a second *active*
   invite, so re-issuing after expiry is unblocked by construction.
3. Resend the new `joinUrl` to the owner directly (the route already emails it via `sendEmail`, so
   re-POSTing is sufficient — no separate manual send needed).
4. If the owner instead needs immediate access while a new invite email is in flight, the PIN-based
   `owner_login` member from `activateTenant` (if activation already ran) is a working fallback login path
   — confirm with `SELECT` on `tenant_members WHERE role='owner'` before pointing the owner at it.

**Prevention gap (flagged, not fixed):** two real gaps here, neither implemented in this pass —
(a) `AcceptInvitePage`'s expiry branch redirects with zero user-facing explanation; a `?reason=expired`
query param + a message on `/join/[token]` (or `/dashboard`) would turn a silent dead-end into an
actionable "your invite expired, contact support" state; (b) nothing in the admin UI surfaces expired
invites proactively — an admin has to know to check `tenant_invites` directly. Recommend surfacing invite
status (pending/expired/accepted) on the tenant's admin detail page.

---

## 5. `funnel_mode` wrong

**The mechanism:** `funnel_mode` (`'booking' | 'pipeline' | 'lead_only'`, `lib/settings.ts:44`) is the
single switch that determines whether a tenant is run as an hourly-booking business (`'booking'`), a
quote-first sales pipeline (`'pipeline'`), or a pure lead-capture funnel (`'lead_only'`) —
`funnelToBooking`/`funnelToPricing` in `lib/selena/agent-config-loader.ts:14-23` derive Selena's entire
booking/pricing behavior from this one field: `pipeline`/`lead_only` both force `pricingModel:
'quote_only'` (Selena never quotes a number), while `booking` drives hourly/appointment behavior off the
tenant's actual services and rate.

**The bug this runbook documents:** `provisionTenant()`'s `DEFAULT_SELENA_CONFIG`
(`provision-tenant.ts:36-49`) **never sets `funnel_mode` at all** — it seeds `pricing_rows`,
`time_estimates`, `checklist_fields`, tone, language, everything else, but no `funnel_mode` key. Per the
read path (`lib/settings.ts:216-219`), an unset `funnel_mode` in `selena_config` **always falls back to
`'booking'`**, regardless of the tenant's industry. But `industry-presets.ts`'s own top-of-file comment
explicitly splits `IndustryKey` into two groups: "service (booking) verticals — short / 1-day" vs.
"project (lead) verticals — can run days → a year" (remodeling, roofing, siding, painting, flooring,
concrete, deck, fencing, demolition, drywall, epoxy, foundation, insulation, moving, paving,
windows_doors, stucco, solar, smart_home, accessibility, restoration, interior_design — 21 of the 53
industries). **Every one of those 21 "project" verticals is silently provisioned as `funnel_mode:
'booking'`**, the wrong mode for a multi-day/quote-driven trade, because nothing in `provisionTenant` maps
`IndustryKey` → `funnel_mode` the way it already maps `IndustryKey` → `SERVICE_PRESETS`/
`CHECKLIST_BY_INDUSTRY`.

**Symptom:** a roofing or remodeling tenant's Selena agent behaves as if it should quote an hourly rate
and book an appointment slot directly (`booking` mode's `hasHourly` check even evaluates true if the
tenant has active services with `standard_rate > 0` — which they will, since every industry's presets seed
`default_hourly_rate`), instead of running the quote-first pipeline flow the trade actually needs. This is
not a crash or a caught error anywhere — it's a silently-wrong default that only surfaces as "why does the
AI keep trying to book a same-day appointment for a kitchen remodel" once the tenant is live.

**Detection:** **there is no automated detection at all.** No gate stage, no activation step, no
`verify-checklist` entry checks `funnel_mode` against the tenant's `industry`. This is discovered purely
by an operator/tenant noticing the AI's behavior doesn't match the trade, or by a leader/worker manually
cross-referencing `tenants.industry` against `selena_config.funnel_mode` (or its absence) per tenant —
there's no query surface for this today short of a direct DB read.

**Root cause:** a straightforward provisioning gap, not a runtime bug — `DEFAULT_SELENA_CONFIG` was
written before (or without accounting for) the service/project split that `mapIndustry`'s own comment
documents. The fix is mechanical: add an `IndustryKey → funnel_mode` mapping (project verticals →
`'pipeline'`, service verticals → `'booking'`) and read it in `DEFAULT_SELENA_CONFIG`, mirroring how
`SERVICE_PRESETS[industry]` and `CHECKLIST_BY_INDUSTRY[industry]` are already looked up by key.

**Blast radius:** contained to Selena's conversational behavior for that tenant — no data loss, no billing
impact — but potentially significant lead-quality/conversion impact for any of the 21 project-vertical
tenants provisioned before this is fixed, since the AI is running the wrong sales motion for the entire
life of the tenant until someone notices and manually corrects `funnel_mode` via the tenant-profile
settings UI (confirmed to be an editable field per `lib/tenant-profile.ts`/`lib/settings.ts` — the fix for
an already-live tenant is a one-field settings update, not a re-provision).

**Recovery (per-tenant, once noticed):**
1. Confirm the tenant's `industry` is one of the 21 project verticals listed above.
2. `PATCH` the tenant's settings to set `funnel_mode: 'pipeline'` (or `'lead_only'` if the tenant is pure
   lead-gen, e.g. `interior_design`/`accessibility` consult-first models — judgment call per tenant, not
   mechanical).
3. No re-provisioning or re-activation needed — `funnel_mode` is read live by `getAgentConfig` on every
   Selena config build, so the fix takes effect on the next agent-config read with no redeploy.

**Prevention gap (flagged, not fixed):** add the `IndustryKey → funnel_mode` default mapping to
`provision-tenant.ts`'s `DEFAULT_SELENA_CONFIG`, and add a `verify-checklist` (or activation-step) check
that flags a mismatch between `industry` and `funnel_mode` for existing tenants so the ~21 already-live
project-vertical tenants (if any) can be audited and corrected in bulk rather than discovered one at a
time. Neither implemented in this file-only pass.

---

## Summary — shared recovery pattern

| Failure mode | Hard gate blocks `active`? | Primary diagnostic | Blast radius |
|---|---|---|---|
| Domain unverified | **Yes** — `siteServes` (§1) | `verify-checklist` DNS/SSL checks | Contained to that tenant's site |
| Payment failed | **No** — gate accepts default methods array | `verify-checklist` Stripe checks (gate is blind) | Highest — real money, silent |
| DID not seeded | **No** — no gate stage exists at all | `verify-checklist` Telnyx check (only place it's caught) | SMS dark, silent |
| Owner-invite expired | **No** — separate mechanism from the gate/`owner_login` entirely | Manual query on `tenant_invites` (no UI surface) | Owner locked out; admin/PIN login usually still works |
| `funnel_mode` wrong | **No** — no check exists anywhere | None today — manual `industry` vs `funnel_mode` cross-reference | Wrong AI sales motion for the tenant's entire life until manually caught |

Three of the five failure modes (§2 payment, §3 DID, §5 `funnel_mode`) have **zero automated go-live
detection** — a tenant can be flipped fully `active` with any of them silently broken. All five prevention
gaps are flagged above as follow-on work, not fixed in this pass (file-only, no code changes).
