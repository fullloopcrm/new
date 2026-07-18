# W4 gap/fluidity checkpoint — 2026-07-18 07:00

Per the 06:48 LEADER order's 3-deep queue (closing out the
cleaners/clients `.pin` plaintext-leak round from the prior session).

## This pass

1. Verified and committed leftover uncommitted work from the prior round
   (GET `/api/cleaners`, `/api/clients`, `/api/clients/[id]` all leaked
   `team_members.pin`/`clients.pin`, the actual team-portal/client-portal
   login credentials, to any staff-tier user) — confirmed via `tsc`,
   `vitest`, and a grep of every frontend consumer for `.pin` reads (none),
   then committed `c1efcf4d`.
2. Fresh-ground surface: same vulnerability *class* (role tier holding a
   `*.view` permission gets sensitive credential-grade data meant for
   `*.edit`-tier roles only), different endpoint. `GET /api/settings`
   redacted its `SENSITIVE_TENANT_FIELDS` set (vendor API keys, IMAP pass,
   owner PII, billing) for callers without `settings.view` — but `manager`
   holds `settings.view` while lacking `settings.edit` entirely, so a
   manager-tier team member could still pull the tenant's live Stripe/
   Telnyx/Resend/Anthropic keys and owner phone/email/billing rate,
   confirmed rendered in plaintext `<input>`s on the dashboard Settings
   page with zero frontend role gating. Fixed by gating on `settings.edit`
   instead of `settings.view`. Committed `5fde4cbb`.
3. Continuation: audited adjacent tables for the same credential-in-a-
   view-gated-row pattern. `entities.ein` (business EIN) is gated by
   `finance.view`, which is the intended read tier per the `manager` role's
   documented scope ("no finance payroll," not "no finance view") — no
   mismatch. `bank_accounts` only stores a `mask` (last 4) via Stripe
   Financial Connections, no raw account/routing numbers ever land in the
   DB — nothing to leak. `finance/expenses` and `finance/payroll` both
   correctly split `finance.view` (GET) from `finance.expenses`/
   `finance.payroll` (mutating actions) — a deliberate read/write split,
   not the same bug shape as settings (those routes don't gate raw
   *credentials* behind view-tier, just financial figures a manager is
   meant to see). Surface confirmed closed — no second finding this pass.
4. Gap/fluidity: this file.

## Verification

- `npx vitest run src/app/api/cleaners/ src/app/api/clients/ src/app/api/settings/`
  — 19 files, 42 tests, all pass.
- `npx tsc --noEmit --pretty false` — clean (2 pre-existing baseline errors
  in `sunnyside-clean-nyc/_lib/site-nav.ts` only, untracked/untouched file
  belonging to another worker's in-progress session).
- Full suite: 693 test files, 2440/2443 tests pass, 1 expected fail
  (documented pre-existing `cron/tenant-health/status-coverage-divergence`
  RED, untouched), 1 skipped, 0 regressions.
- 2 commits this pass: `c1efcf4d` (pin-leak fixes), `5fde4cbb`
  (settings.edit gate fix).

## Aging items still open (carried forward, not re-litigated this pass)

Unchanged from the 0633 checkpoint's list: create-tenant-from-lead
atomic-claim migration, referrers atomic-bump migrations, clients dedup
unique indexes, admin/cleanup-test-bookings name-collision,
comhub_get_or_create_contact_by_email TOCTOU, post-labor.ts entity_id
design question, categorization_patterns semantics, team-portal
photo-upload unwired, comhub-email cron unread_count, CSRF-on-GET, 4 dead
clone email-templates files, nycmaid sms-templates dead exports,
post-adjustments.ts inert check, rate_limit_check_and_record atomic RPC,
inbound_emails dead storage, notify-cleaner.ts dead code, campaigns/preview
self-XSS, agreement.ts dead code, documents.status='expired' unreachable,
threads/[id] assignee_id (intentional), voice/cleanup unwired, voice/dial +
voice/control target whitelisting, 4 dead sendPushToClient exports,
notify()'s latent `channel:'push'` no-op, comhub voice
admin_phone/transfer-target whitelisting, invoices/quotes/documents
do_not_service product question, sendPushToTeamMember/AllTeamMembers
do_not_service applicability, the 0844 indirect-prompt-injection finding
on `agent.ts`/`tools.ts` (architectural, Jeff's call), `/api/yinez`
residual unverified-tenant edge and self-reported-phone-establishes-
client-identity items (Jeff's call), the `cleaners` vs `team_members`
ID-space mismatch in `cron/phone-fixup`, `client/confirm/[token]` dead
code, `telegram_webhook_events` pruning cron (not wired), Jefe's
non-refund owner tools lacking per-tool idempotency keys,
`lead-media/signed-url`'s 32-bit random path entropy note, `leads/block`/
`leads/verify` `leads.view`-tier write-gate observation, the
still-generated-but-never-consumed `team_member_token`/`cleanerToken` on
bookings, `bookings/[id]/team` PUT double-booking gap, `finance/periods/[id]`
PATCH / `reviews/[id]` PUT last-write-wins footguns, `admin/prospects/[id]`
PATCH `approve` re-approve footgun, `campaigns/send` top-level dead-code
implementation, `settings/services/[id]` DELETE no in-use check (UX, not
security).

## New aging items opened this pass

None net-new. The entities/bank_accounts/finance.view continuation
confirmed the settings surface is an isolated case (mixed-sensitivity
table design), not a broader pattern to keep chasing.

## Next-target candidates if continuing fresh-ground hunting

- The credential-in-a-view-gated-row class (pin leaks, settings vendor
  keys) is now closed out across the tables that mix credentials with
  general-purpose fields (`team_members`, `clients`, `tenants`).
- Worth checking whether any *other* role-permission pair in `rbac.ts`
  has the same "view held one tier below the corresponding edit" shape
  used to gate something sensitive — this pass only checked
  `settings.view`/`settings.edit`; `team.view`/`team.edit` and
  `campaigns.view`/`campaigns.send` weren't audited for equivalent
  view-tier-sees-too-much cases.
- Still worth the systematic `team-portal/*` "public form vs. staff form"
  cap-asymmetry read flagged in the prior checkpoint (not done this pass).

No push/deploy/DB this pass.
