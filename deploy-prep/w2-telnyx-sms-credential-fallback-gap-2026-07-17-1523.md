# W2 gap/fluidity refresh — 2026-07-17 15:23

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). No master file (per W4's confirmed pattern) — continues directly from `w2-selena-legacy-email-deadcode-resolver-fix-2026-07-17-1500.md`.

Leader's fresh 3-deep queue this round (15:09 LEADER->W2): (1) telnyx_phone/telnyx_api_key fallback precedence. (2) per-tenant credential resolution (resend_api_key/stripe_api_key). (3) keep gap/fluidity current.

## (1) telnyx_phone/telnyx_api_key fallback precedence — real bug found, new resolver-precedence class (credential columns, not domain columns)

**Root cause:** `tenants.sms_number` predates `tenants.telnyx_phone` — added first, in `migrations/admin-onboarding-fields.sql`, documented there as *"SMS phone number (separate from business phone — this is the Telnyx number)"*. Both columns are still independently writable today via the admin settings API (`EDITABLE_TENANT_COLUMNS` in `app/api/admin/settings/route.ts` lists `sms_number` and `telnyx_phone` as two separate editable columns, not a synced pair). `telnyx_phone` is what every dedicated onboarding UI field writes and what `sms.ts`'s `sendSMS()` send path actually expects, so it's canonical; `sms_number` is the legacy fallback for a tenant whose only populated field is the older column.

**Confirmed not speculative:** `lib/jefe/actions.ts` already applies the exact precedence `t.telnyx_phone || t.sms_number` in two places (`provisionChecklist`'s presence check, `notifyTenantOwner`'s actual send) — proof the correct precedence was already decided and implemented once, just not centralized or adopted elsewhere. Same shape as the tenant_domains/tenants.domain bug class this session closed 18 mirrors of, but a different pair of columns (credential/contact fields on `tenants`, not domain-routing tables).

**Scale check before committing to an approach:** grepped every `.telnyx_api_key`/`.telnyx_phone` read site — found ~40 call sites across API routes, cron jobs, webhooks, and shared lib helpers, all reading `tenant.telnyx_phone` directly with no `sms_number` fallback except Jefe. That's an order of magnitude wider than any single prior mirror (the widest domain-fallback round was 6 files). Rather than a 40-file diff in one round (unreviewable, and no existing shared helper to route through — unlike the domain class, which already had `tenantSiteUrl()`/`getPrimaryTenantDomain()` built before this session started widening its adoption), built the resolver as a new shared helper and applied it to the **shared library layer** first — the highest-leverage, lowest-blast-radius slice, matching how a genuinely new resolver helper (not just wider adoption of an existing one) should land.

**Fixed this round:**
- New `lib/sms-credentials.ts` — `resolveTenantSmsCredentials()` / `hasTenantSms()`, the centralized `telnyx_phone || sms_number` resolver.
- Wired into: `lib/notify.ts` (`notify()` — the general dispatcher, ~50 API-route callers), `lib/payment-processor.ts` (`processPayment()` — team-member + client payment-confirmation SMS), `lib/notify-team.ts` (`notifyTeamMember()`), `lib/admin-contacts.ts` (`smsAdmins()`), `lib/comms-prefs.ts` (`deriveCapabilities()`/`getCapabilities()` — the SMS capability gate `isCommEnabled()` and dashboard "Connected" badges read).
- Refactored `lib/jefe/actions.ts`'s `notifyTenantOwner()` to consume the new shared helper instead of its own inline `||` chain (DRY — same precedence, now one source of truth instead of two).
- All six touched call sites now select `sms_number` alongside `telnyx_api_key`/`telnyx_phone` where they weren't already.

**Not fixed this round — real carry-forward, ~35 files:** every API route that queries `tenants` and reads `.telnyx_api_key`/`.telnyx_phone` directly for its own inline `sendSMS()` call, bypassing the shared lib layer entirely. Grepped and listed by area (not yet triaged individually — some may be low-traffic/edge, matching this session's convention of confirming before fixing):
- **Bookings:** `api/bookings/route.ts`, `api/bookings/[id]/route.ts` (×2 branches), `api/bookings/batch/route.ts` (already has its OWN — different — env fallback, see NOTICED below), `api/bookings/broadcast/route.ts`
- **Client-facing:** `api/client/book/route.ts`, `api/client/reschedule/[id]/route.ts`, `api/client/send-code/route.ts` (×2), `api/portal/collect/route.ts`, `api/portal/auth/route.ts`
- **Send/document flows:** `api/sms/route.ts`, `api/sms/send/route.ts`, `api/invoices/[id]/send/route.ts`, `api/quotes/[id]/send/route.ts`, `api/documents/[id]/send/route.ts`, `api/documents/public/[token]/sign/route.ts`, `api/routes/[id]/publish/route.ts`
- **Admin:** `api/admin/send-apology-batch/route.ts`, `api/admin/find-cleaner/send/route.ts`, `api/admin/comhub/send/route.ts`, `api/admin/payments/confirm-match/route.ts`, `api/admin/message-applicants/send/route.ts`, `api/admin/selena/route.ts`
- **Crons:** `api/cron/payment-followup-daily`, `retention`, `payment-reminder`, `post-job-followup`, `late-check-in`, `confirmations`, `outreach`, `reminders`, `daily-summary`, `system-check`/`health-check` (status checks only, no send)
- **Other:** `api/schedules/[id]/pause`, `api/selena/route.ts`, `api/campaigns/[id]/send`, `api/campaigns/send`, `api/team-portal/running-late`, `api/webhooks/stripe`, `api/webhooks/telnyx` (×5 branches), `api/pin-reset`, `api/email/monitor`, `api/reviews/request`, `lib/onboarding-verify.ts`, `lib/selena-legacy-handlers.ts`

Recommend widening the shared helper's adoption to these incrementally, same cadence as the domain-fallback mirrors — not a single giant round.

**NOTICED — real finding, flagged not fixed, needs a product/compliance call:** `api/bookings/batch/route.ts` is the ONE call site that does something none of the other ~40 do:
```
const telnyxApiKey = (tRow?.telnyx_api_key as string) || process.env.TELNYX_API_KEY || ''
const telnyxPhone = (tRow?.telnyx_phone as string) || process.env.TELNYX_PHONE || ''
```
It falls back to a **platform-shared** Telnyx account/number for a tenant with no Telnyx config of its own. Every other caller (all ~40) treats "tenant has no Telnyx config" as "skip SMS for this tenant" — no platform-shared fallback anywhere else. `comhub-voice-config.ts` does the same platform-fallback pattern, but explicitly and deliberately for the internal ComHub **softphone** (Jeff/ops placing calls), not customer-facing texting. The onboarding checklist tracks `telnyx_compliance_submitted`/`telnyx_compliance_approved`/`telnyx_messaging_profile` **per tenant** — 10DLC carrier registration is a per-business, per-use-case requirement; texting a tenant's own customers from a shared platform number on that tenant's behalf, without that tenant's own registered campaign, is a real carrier-compliance question, not a resolver bug. Did **not** touch this either direction (didn't extend the platform-fallback to other callers, didn't remove it from batch) — this needs Jeff's call on whether `bookings/batch`'s fallback is intentional (and should be the pattern replicated everywhere) or a pre-existing bug (and should be removed to match the other ~40 callers' skip-if-unconfigured behavior).

## (2) per-tenant credential resolution (resend_api_key/stripe_api_key) — investigated, no analogous bug found

Checked whether `resend_api_key` or `stripe_api_key` have grown a legacy-dual-column precedence gap the way `telnyx_phone`/`sms_number` did. Swept `lib/tenant.ts`'s `Tenant` type and every `ALTER TABLE tenants ADD COLUMN` across `migrations/*.sql` and `src/lib/migrations/*.sql` for any second resend/stripe key-shaped column. Found none — `resend_domain` (sending-domain verification, a different concept from the API key) and `stripe_account_id`/`stripe_pay_link`/`stripe_subscription_id` (Connect account ID, payment link URL, subscription ID — none of them a duplicate secret) are the only other resend/stripe-adjacent columns, and none of them duplicate the key itself.

Both credentials already have a correctly-established **platform-env fallback** (a different, and here deliberate, pattern from telnyx's): `email.ts`'s `sendEmail()` falls back to `defaultResend` (`process.env.RESEND_API_KEY`) when no tenant key is set; `payment-processor.ts`'s `getStripe()` falls back to `process.env.STRIPE_SECRET_KEY`. Both are pre-existing, already-shipped behavior (not something this session introduced), and — unlike the telnyx platform-fallback question above — Resend/Stripe don't carry the same per-tenant carrier-registration constraint, so a shared-account fallback there is a materially different risk profile. No fix needed; closing this as a real "checked, nothing to fix" — not a rubber-stamp.

## Verification this round

- New file `lib/sms-credentials.ts` + `lib/sms-credentials.test.ts` — 12 tests (precedence order, empty-string phone treated as unset, null tenant, api-key-independent-of-phone, wrong-tenant probe covering both fields).
- New file `lib/notify.sms-credentials-fallback.test.ts` — 3 tests against the real `notify()` SMS path (bug-class probe: sms_number-only tenant still sends; telnyx_phone-precedence-when-both-set; wrong-tenant probe: tenant B's sms_number never leaks into tenant A's resolved credentials when A has neither column set).
- Mutation-verified: reverted `notify.ts`'s fix via `git apply -R` on its diff alone, re-ran the new test file — the bug-class probe went RED for the right reason (`success: false`, SMS never sent, `sendSMS` never called) while the other two tests (precedence-when-both-set, wrong-tenant) stayed GREEN as expected since they don't exercise the reverted branch the same way. Reapplied — all green.
- `npx tsc --noEmit` clean (caught one real type error along the way: `admin-contacts.ts`'s `TenantLike` union includes a bare `{id: string}` variant that fails TS's weak-type-detection check against the new helper's all-optional-fields parameter type — fixed with an explicit `Pick<Tenant, ...>` cast at the one call site that needed it).
- `npx eslint` on all 9 touched/new files: 0 new warnings (2 pre-existing unrelated warnings confirmed via `git stash` diff — unused `dailyOpsRecapEmail`/`notificationDigestEmail` imports in `notify.ts`, predate this round; 2 more `_args` unused-param warnings in the new test file, matching the exact same pattern the pre-existing `notify.test.ts` already carries).
- Full repo suite: **601 files, 2636 tests passed, 37 skipped, 0 failed.** Zero regressions.
- File-only, no push/deploy/DB write.

## NOTICED — not fixed, flagging for the leader/Jeff

1. `bookings/batch/route.ts`'s platform-Telnyx-account fallback (detailed above under (1)) — needs a product/compliance decision, not a unilateral resolver fix either direction.
2. The ~35-file carry-forward list above (detailed under (1)) — real, not yet triaged individually, recommend incremental rounds matching the domain-fallback cadence rather than one large diff.

## MISSING-FEATURE GAPS / UX-FRICTION

Carried forward unchanged from prior rounds. Nothing new this round.

## Remaining candidates, not yet fixed (fresh ground for a future round)

The ~35-file telnyx direct-read carry-forward list above is the concrete next-round queue for this new resolver-precedence class, same shape as the domain-fallback mirrors (one caller or a small cluster per round, DRY through the shared helper, tests incl. wrong-tenant probe each time). `bookings/batch`'s platform-fallback anomaly needs Jeff's call before any of those carry-forward files are touched, in case the answer changes the target behavior (skip-if-unconfigured vs. platform-shared-fallback) rather than just which column to read.
