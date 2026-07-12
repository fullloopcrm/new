# Prospect-to-Live Pipeline Runbook — intake → payment → domain → SEO → AI → go-live

**Worker:** W6 · **Branch:** p1-w6 · **Date:** 2026-07-12 · **Status:** docs only, nothing applied
**Scope:** the end-to-end path from "someone becomes a tenant" to "tenant's site is live and
serving," each stage grounded in the actual code path (not the idealized version), plus a proposed
15-day timeline check that does **not** exist in the codebase today.

**Verification anchors read this pass:** `lib/create-tenant-from-lead.ts` (full file),
`app/api/webhooks/stripe/route.ts:60-207` (the "Full Loop signup" branch), `lib/provision-tenant.ts`,
`lib/onboarding-tasks.ts` (full file), `lib/onboarding-gate.ts` (full file), `lib/activate-tenant.ts`
(full file, reused from `provisioning-runbooks.md`), `lib/settings.ts:64-69` (AI chatbot fields).
Builds directly on `deploy-prep/provisioning-runbooks.md` — that doc has the deep dive on payment,
domain, and SEO failure modes; this doc does not re-derive them, it places them in the full pipeline
and links to the relevant section.

---

## 0. First finding: there are TWO intake paths, and they are NOT the same pipeline

This matters before anything else in this doc makes sense. The leader's ask assumes one linear
pipeline. There are actually two, and they diverge on the single most important gate in the system —
whether `status` is allowed to be `'active'` before setup is verified.

| | Path A — sold lead (`createTenantFromLead`) | Path B — self-serve signup (`webhooks/stripe/route.ts` prospect-paid branch) |
|---|---|---|
| Source table | `partner_requests` | `prospects` |
| Trigger | Admin comp override (`/api/admin/requests/convert`) **or** the paid-proposal payment webhook | Stripe Checkout session completes with `metadata.full_loop_signup==='true'` (or a Payment Link `client_reference_id`) |
| `onboarding_tasks` seeded? | **Yes** — `seedOnboardingTasks()` called (`create-tenant-from-lead.ts:192`) | **No** — grep-confirmed, `seedOnboardingTasks` is never imported or called in `webhooks/stripe/route.ts`. This tenant gets **zero** onboarding checklist rows. |
| `tenants.status` at creation | `'new'` (paid proposal) or `'pending'` (comp override) — per `CreateFromLeadOptions.status` doc comment | **`'active'` — set directly at INSERT** (`webhooks/stripe/route.ts:131`), before any gate, before domain, before SEO, before anything |
| Reaches `runOnboardingGate` / `activateTenant`? | Yes — this is the path the rest of this doc (and `provisioning-runbooks.md`) describes | **No — never called in this branch.** `provisionTenant()` runs (seeds default services/settings/payment_methods), an owner-invite email goes out, and the webhook returns. That's the entire server-side flow. |

**What this means concretely:** a self-serve-signup tenant is `status: 'active'` — indistinguishable
in the tenants table from a fully verified, live tenant — the instant Stripe confirms the charge, with
no domain, no DID, no Selena config, and (per the table above) no onboarding checklist to even track
that those things are missing. "Go-live" for this path is not a gate the system enforces; it's
whatever state the tenant happens to be in when someone notices `status='active'` and assumes it means
what it means for Path A. **This is a real gap, not a stylistic difference — flagging it, not fixing
it (file-only pass).** The rest of this doc walks Path A, since that's the one the leader's ordered
stage list (intake → payment → domain → SEO → AI → go-live) actually describes; §7 comes back to Path
B for the timeline-check proposal, because Path B is the one most likely to silently blow past any SLA
since nothing tracks it at all.

---

## 1. Intake

**Path A, sold-lead branch:** `createTenantFromLead(leadId, opts)` (`lib/create-tenant-from-lead.ts`)
is the single conversion path for both the admin comp override and the paid-proposal webhook — same
function either way, so intake behavior doesn't fork later. It is **idempotent**: a lead with
`converted_tenant_id` already set returns the existing tenant instead of creating a duplicate
(`:56-60`). On a fresh lead it:

1. Slugifies the business name, computes seat pricing (`computeMonthly`), resolves timezone from zip.
2. Inserts the `tenants` row (status per `opts.status`, `'new'` or `'pending'` — see §0 table).
3. Calls `provisionTenant({ tenantId, industry })` — seeds default entity, chart of accounts, service
   types, and the `payment_methods` default array (see `provisioning-runbooks.md` §2 for why that
   default array matters later).
4. Calls `seedOnboardingTasks(tenantId)` — inserts the 6-item checklist (§2 below), idempotent (no-ops
   if the tenant already has any rows, `onboarding-tasks.ts:38-42`).
5. Links the lead (`partner_requests.converted_tenant_id`), marks it `'sold'`.

**Path B, self-serve signup:** intake and "payment" (§3) are the same event — there is no separate
intake step, the Stripe webhook branch in §0 IS intake for this path.

## 2. The setup checklist (what "in progress" actually tracks)

`DEFAULT_ONBOARDING_TASKS` (`onboarding-tasks.ts:23-30`), seeded in intake order:

1. `create_stripe` — Connect Stripe (take payments) → §3
2. `create_telnyx` — Provision phone/SMS (Telnyx) → covered in `provisioning-runbooks.md` §3 (DID)
3. `create_resend` — Set up sending email (Resend domain)
4. `configure_dns` — Point the domain (DNS) → §4
5. `verify_10dlc` — Register 10DLC (SMS compliance)
6. `create_google_business` — Link Google Business (reviews)

These are **manually worked** by the tenant/admin — nothing in this codebase automates completing
them. `checkActivationReadiness(tenantId)` (`onboarding-tasks.ts:66-82`) is the read-only status
check: ready when every task is `completed`/`skipped` **and** `runOnboardingGate` passes (§5). This
function is the correct thing to poll for "is this tenant done with setup," not eyeballing individual
task rows.

## 3. Payment

Two genuinely different "payment" concepts live in this pipeline — don't conflate them:

- **Platform payment** (Path B, or the paid-proposal trigger for Path A): the prospect pays **FullLoop
  CRM's own subscription** via Stripe Checkout. This is what actually creates the tenant in Path B (§0)
  or triggers `createTenantFromLead` in Path A's paid-proposal case. Seat-based pricing is recomputed
  server-side from checkout metadata, never trusted from the stored row (`webhooks/stripe/route.ts:105-108`
  comment: "a corrupted row can't mint a $0 tenant").
- **Tenant payment** (the `create_stripe` checklist item, §2): the tenant's **own** Stripe key/account
  for taking *their customers'* payments. Fully manual entry, not verified by the onboarding gate's
  `payment` stage — **this is the gotcha covered in full in `provisioning-runbooks.md` §2, not
  duplicated here.** Read that section before assuming a tenant's `payment` gate stage passing means
  their Stripe is actually chargeable — it doesn't (`onboarding-gate.ts:94-99` only checks
  `settings.payment_methods.length > 0`, and `provisionTenant()` seeds four non-Stripe defaults for
  every tenant regardless).

## 4. Domain

Runs as part of `activateTenant()` (§5), **last** of its ~10 steps, deliberately — see
`provisioning-runbooks.md` §1 for the full failure-mode breakdown (`VERCEL_API_TOKEN` unset, DNS not
pointed, domain already claimed elsewhere). Not re-derived here. One addition specific to the pipeline
view: domain is the step that gates `status → 'active'` for Path A via the `siteServes` check
(`activate-tenant.ts:404-413`) — it is the **only** one of the six checklist items in §2 with a hard
gate behind it in this codebase. The other five (Telnyx, Resend, DNS-is-also-here, 10DLC, Google
Business) can all be incomplete with the tenant still flipping active, per `checkActivationReadiness`'s
`ready` boolean only checking task-row status, not re-verifying each integration live.

## 5. SEO

`registerSeoProperty()` (`lib/seo/onboarding.ts`), the one SEO step wired into activation
(`activate-tenant.ts:377-396`) — full failure-mode breakdown already in `provisioning-runbooks.md` §4
(not duplicated). Pipeline-relevant note: this step is a documented no-op for any tenant without a
custom domain yet (carrying-domain-only tenants return `null` — `:36`), so in the natural pipeline
order it doesn't produce a real result until *after* §4 domain is actually set, even though it runs
earlier in `activateTenant()`'s step sequence. Don't read a `'no valid domain to track'` detail on a
tenant that hasn't finished domain setup as a bug.

## 6. AI (Selena config)

**Naming note:** "AI training" is not a literal training/fine-tuning step anywhere in this codebase —
there is no ML training job. What the pipeline actually has is **AI *configuration***: three fields
mirrored into `tenants.selena_config` jsonb and read by `getSettings()` (`lib/settings.ts:64-69`):

- `chatbot_enabled` — master on/off for Selena responding to inbound SMS/chat at all.
- `chatbot_greeting` — the first-contact message text (used e.g. `webhooks/telnyx/route.ts:604-651` on
  a reset/new-conversation inbound).
- `auto_respond_leads` — whether Selena auto-responds to new leads without a human trigger; when
  `false`, the inbound SMS handler explicitly routes to an `'auto_respond_leads_disabled'` no-reply
  branch (`webhooks/telnyx/route.ts:604`) rather than silently doing nothing — that's a real, findable
  state, not a bug if you see it in logs for a tenant that's deliberately keeping Selena off.
- Also config-driven, not covered by any onboarding checklist item at all: `conversation-scorer.ts`'s
  per-tenant scoring rules (`selena_config.scorer`) and `rbac.ts`/`portal-rbac.ts`'s role-permission
  deltas — both defaults are safe if left unset, so their absence isn't a go-live blocker, just an
  unconfigured-default state.

**No onboarding checklist item exists for this step** (§2's six tasks don't include it), and no
`onboarding-gate.ts` stage checks it either. A tenant can go fully `active` with `chatbot_enabled:
false` and nobody has to acknowledge that on the way there. Flagging as a real gap consistent with the
DID/payment gotchas already documented in `provisioning-runbooks.md` §2/§3 — not fixed here.

## 7. Go-live

**Path A:** `activateTenant(tenantId)` (`lib/activate-tenant.ts`) — full architecture already described
in `provisioning-runbooks.md` §0 (idempotent, non-transactional, `crumb()` breadcrumbs, the
`siteServes` hard gate). Pipeline-relevant summary: `status` only flips to `'active'` when (a) the
onboarding gate's 5 stages (`site`/`lead`/`schedule`/`payment`/`review`, `onboarding-gate.ts:18`) all
pass, (b) an owner login exists, and (c) the site actually serves. Of the pipeline stages in this doc,
only **domain** (via `siteServes`) and indirectly **payment** (via the gate's `payment` stage, which —
per §3 — is a weak check) are hard-gated. SEO and AI are not gated at all; they can be entirely broken
or unset at the moment `status` flips.

**Path B:** already `'active'` from the moment Stripe confirms the charge (§0). There is no "go-live"
gate to describe for this path — it went live at intake.

## 8. Proposed 15-day timeline check — NOT IMPLEMENTED, this codebase has no SLA tracking today

**Confirmed by grep this session:** no `days_since`, no staleness cron, no onboarding-age check
anywhere in `platform/src`. `tenants` has no `activated_at` column distinct from `created_at` (the
gate's pass/fail is computed live, never persisted with a timestamp) — so "how long has this tenant
been stuck" is not a queryable fact today, only inferable from `tenants.created_at` and current live
status.

**One real, code-grounded number exists and is worth knowing before setting a 15-day policy:** the
Path-B owner-invite link expires in **14 days**
(`webhooks/stripe/route.ts:169` `expires_at = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)`, and the
email body literally says "This link expires in 14 days," `:194`). If a 15-day go-live SLA is adopted,
a self-serve tenant whose owner hasn't clicked the join link by day 14 is **already locked out of their
own onboarding** one day before the proposed SLA deadline would even flag them — the invite doesn't
auto-renew and nothing currently alerts on an expired, unused invite. This is the sharpest edge case a
15-day check needs to handle, not a coincidence to note in passing.

**Proposed check (design only, no cron/table added by this pass):**

- **Definition:** a tenant is "over timeline" when `now() - tenants.created_at > 15 days` AND
  `checkActivationReadiness(tenantId).ready === false` (Path A) OR the tenant is Path B and its
  `onboarding_tasks` table has zero rows (i.e., never even started tracked setup, per §0's finding).
- **Query shape** (illustrative, not a migration): join `tenants` (age) against `checkActivationReadiness`
  per tenant, or — cheaper — a periodic scan of `tenants` where `created_at < now() - interval '15 days'`
  and `status != 'active'` for Path A tenants, plus a **separate** check for Path B tenants where
  `status='active'` but a proxy for "never finished setup" is true (e.g., no row in `onboarding_tasks`,
  or the `tenant_invites` row for that tenant's owner has `expires_at < now()` and was never accepted).
  Path A and Path B need genuinely different queries because Path B's `status` doesn't mean "done."
- **Alert path:** reuse the existing `alertOwner()` Telegram mechanism used elsewhere
  (`platform/src/lib/telegram.ts`, same single-channel caveat already flagged in
  `deploy-prep/health-monitor-coverage-gap.md` §4c — a 15-day-stale-tenant alert should not ship without
  that fallback-channel gap being closed first, or it inherits the same silent-failure risk).
- **Not implemented in this pass:** no cron route, no new column, no migration. This is a design
  proposal responding to the leader's ask for "a 15-day timeline check," honestly scoped as a gap
  analysis + proposal, consistent with this lane's file-only charter.

---

## Summary — pipeline stage vs. gate coverage

| Stage | Path A gated before `active`? | Path B gated at all? | Runbook detail |
|---|---|---|---|
| Intake | N/A (this IS the entry) | N/A (fused with payment) | §1, §0 |
| Payment (tenant-level Stripe) | **No** — gate accepts non-Stripe defaults | **No** — no gate runs | §3, `provisioning-runbooks.md` §2 |
| Domain | **Yes** — `siteServes` | **No** | §4, `provisioning-runbooks.md` §1 |
| SEO | No — best-effort, never blocks | **No** | §5, `provisioning-runbooks.md` §4 |
| AI (Selena config) | No — no gate stage exists | **No** | §6 (new finding, not previously documented) |
| Go-live | Gated (5-stage + siteServes) | **Not gated — active at intake** | §7, §0 |

Four of six stages have no hard gate on Path A; Path B has no gate on any of them. The 15-day check in
§8 is proposed specifically because nothing else in this pipeline currently notices when a tenant
stalls in that unguarded space.

## Cross-references

- `deploy-prep/provisioning-runbooks.md` — the deep per-failure-mode detail for payment/domain/DID/SEO;
  this doc is the pipeline view, that doc is the failure-mode view. Read both.
- `deploy-prep/health-monitor-coverage-gap.md` — the single-Telegram-channel alert-path caveat referenced
  in §8.
- `deploy-prep/incident-runbooks.md` (this session) — what to do when a stage that DID reach go-live
  later breaks in production; this doc covers getting there, that one covers staying up.
