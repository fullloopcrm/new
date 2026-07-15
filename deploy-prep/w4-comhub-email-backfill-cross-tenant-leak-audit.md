# ComHub — `POST /api/admin/comhub/email/backfill` Cross-Tenant Email/PII Contamination

Found during LEADER 23:33 broad-hunt order ("fresh area"). File-only, no
fixes applied — findings only, per standing rules.

Scope covered: all 19 route files under `src/app/api/admin/comhub/**`
(threads, messages, contacts, templates, send, search-recipients, channels,
voice/{dial,control,token,settings,presence,active,cleanup,log-softphone-call},
yinez/send, email/backfill), plus their auth baseline (`requireAdmin` →
`verifyAdminToken`, `src/app/api/admin-auth/route.ts`) and the sibling cron
job `src/app/api/cron/comhub-email/route.ts`.

## Finding 1 (CRITICAL) — `email/backfill` writes ONE shared mailbox's mail into WHATEVER tenant is currently impersonated, permanently mislabeled

`src/app/api/admin/comhub/email/backfill/route.ts` is a manual "deep IMAP
sweep" endpoint (up to `days=365`) that:

1. Connects to a **single, hardcoded, env-based** mailbox —
   `process.env.EMAIL_HOST` / `EMAIL_USER` / `EMAIL_PASS` (line 22-24) — with
   **no per-tenant lookup at all**. The route's own comment admits this:
   `// IMAP credentials currently env-based; per-tenant IMAP not yet wired.`
2. Tags every imported message with `tenantId = await getCurrentTenantId()`
   (line 17) — i.e. **whichever tenant the calling admin happens to be
   impersonating at the moment**, not the tenant that actually owns the
   mailbox.
3. Inserts into `comhub_messages` (contact, thread, subject, body, from
   address — full email PII) scoped only by that arbitrary `tenantId`.

Compare this to the sibling **cron** job, `src/app/api/cron/comhub-email/route.ts`,
which does this correctly: it builds a `MailAccount[]` from each tenant's own
saved `imap_host`/`imap_user`/`imap_pass` profile fields (`collectAccounts()`,
lines 46-97), and falls back to the `EMAIL_HOST`/`EMAIL_USER`/`EMAIL_PASS` env
vars **only** for the one hardcoded `NYCMAID_TENANT_ID` (`'00000000-0000-0000-0000-000000000001'`,
line 29) when nycmaid has no profile row yet — i.e. the env vars are
nycmaid's own inbox, not a platform-shared one. `email/backfill` skips all of
that account-resolution logic and just always uses the env vars, no matter
which tenant is "current."

**Concrete impact:** a super-admin (the only role that can currently reach
`requireAdmin()` — see Finding 2) who is impersonating **any tenant other
than nycmaid** and calls `POST /api/admin/comhub/email/backfill?days=365`
will pull up to a year of **nycmaid's real customer email correspondence**
(names, addresses, subjects, full body text) into that **other tenant's**
live `comhub_messages`/`comhub_threads`/`comhub_contacts`, permanently and
visibly, as if those were the other tenant's own customers. Re-running it
while impersonating a second, third, Nth tenant replicates the same
nycmaid mailbox into every one of them — dedup (`existing` check, line 57-64)
is scoped by `tenant_id`, so it does **not** prevent the same email from
being cloned into multiple different tenants. This is data contamination,
not just disclosure: it can't be un-seen by the wrong tenant's operators
once it's rendered in their ComHub UI, and it silently corrupts that
tenant's CRM contact/thread records (`comhub_get_or_create_contact_by_email`
will create real contact rows keyed to nycmaid's customers under the wrong
tenant).

**Mitigating factors (why this hasn't fired yet, as far as I can tell):**
- Not wired to any button in `src/app/admin/comhub/page.tsx` — grepped, zero
  references. It's a standalone endpoint, presumably curl'd manually during
  nycmaid-era setup/testing and never removed or tenant-scoped when the
  platform went multi-tenant.
- Only reachable via `requireAdmin()` (global super-admin token) — see
  Finding 2 — so today's exposure is "a platform operator could
  self-inflict this by running it against the wrong tenant," not an
  external/tenant-triggerable leak. That changes if/when tenant-admin
  self-service access to `/api/admin/*` is wired up (comhub's UI is already
  reused verbatim at `/dashboard/comhub`, see Finding 2), at which point any
  tenant could pull nycmaid's mailbox into their own CRM on demand.

**Recommend** (not applied — file-only): either delete this route (the cron
job already does the correct per-tenant version continuously) or, if a
manual/on-demand trigger is still wanted, rebuild it on `collectAccounts()`
from the cron job so it resolves the *calling tenant's own* IMAP profile
(or refuses to run when the current tenant has no profile row, instead of
silently falling back to nycmaid's mailbox).

## Finding 2 (INFO, not a vulnerability) — comhub is currently unreachable via tenant-admin auth

Every comhub route (and 79/118 files under `src/app/api/admin/**`) gates on
`requireAdmin()` (`src/lib/require-admin.ts`), which calls
`verifyAdminToken()` — and `verifyAdminToken()` explicitly accepts **only**
`role === 'super_admin'` tokens (`src/app/api/admin-auth/route.ts:35`,
comment: *"Tenant-admin tokens are validated separately... so they can NEVER
pass a platform-super-admin gate"*). `verifyTenantAdminToken()` (the
per-tenant-member PIN token minted by the same `/api/admin-auth` login for
the custom-domain `<domain>/fullloop` flow) is checked in exactly one place
in the whole codebase outside its own file/tests: `src/app/dashboard/layout.tsx:32`,
which gates **page rendering** on a tenant custom domain. It is never
checked by any `/api/admin/*` route handler.

Net effect: `src/app/dashboard/comhub/page.tsx` re-exports
`src/app/admin/comhub/page.tsx` verbatim ("one shared codebase") and that
component's every `fetch()` call targets `/api/admin/comhub/*`. A tenant
member who authenticates via the legitimate tenant-admin PIN path
(`verifyTenantAdminToken`, custom domain) can load the `/dashboard/comhub`
**page**, but every API call it makes will 401, because `requireAdmin()`
rejects their token. This is a fail-closed gap (feature breakage, not
exposure) — flagging because it's the direct reason Finding 1 is
currently super-admin-only, and because it means ComHub has apparently never
been exercised end-to-end by an actual tenant-admin session, which is likely
why Finding 1 was never caught.

## Reviewed, no issue found

- **Tenant scoping on the rest of comhub**: every other route (threads,
  messages, contacts/context, contacts/notes, templates, send, channels,
  search-recipients, voice/{active,cleanup,control,dial,presence,settings,
  log-softphone-call}, yinez/send) consistently pairs every by-id lookup and
  mutation with `.eq('tenant_id', tenantId)`. `voice/control`'s
  `customer_call_id`-supplied-directly path (no `active_call_id`) does a
  tenant-scoped existence check against `comhub_active_calls` before acting,
  so a foreign tenant's Telnyx `call_control_id` can't be driven cross-tenant
  even if guessed.
- **ILIKE wildcard injection**: `contacts/[id]/context` and
  `cron/comhub-email` both correctly escape `%`/`_` in attacker-controlled
  `email`/`phone` values before building `ilike()` patterns
  (`escapeLike()`), matching the established `lib/inbound-email-tenant.ts`
  pattern — this is the exact bug class documented in `postgrest-filter-injection-branch-audit.md`,
  and both instances here are already hardened.
- **`search-recipients` / `templates` PostgREST `.or()` filters**: both
  build the filter string through `sanitizePostgrestValue()` before
  interpolating user input — no injection.
- **`send` route (SMS/email)**: Telnyx/Resend credentials
  (`telnyx_api_key`, `resend_api_key`) are read server-side only, never
  echoed in the JSON response. Outbound email body is HTML-escaped
  (`escapeHtml`) before being wrapped in the branded shell — no stored/reflected
  XSS via a crafted comhub message body.
- **`voice/token`**: mints a short-lived, per-session Telnyx WebRTC
  credential scoped by `cfg.credentialConnectionId`/`telephonyCredentialId`,
  which are resolved per-tenant (`resolveTenantVoiceConfig`) — did not find a
  path where one tenant's config leaks another's Telnyx API key.

No fixes applied — read-only, file-only per LEADER order.
