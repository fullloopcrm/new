# W4 — GET /api/settings exposed vendor API keys + owner PII/billing to `manager` role (fresh-ground surface)

## Finding

A prior session (see `w4-broad-hunt-2026-07-15-2130.md`, and the existing
test `route.settings-view-redaction.test.ts`) fixed the original bug where
`GET /api/settings` returned the full `tenants` row with **no** permission
check at all — any team member, including `staff`, got the raw row. The fix
redacted a `SENSITIVE_TENANT_FIELDS` set (vendor API keys, IMAP creds, owner
PII, billing) for any caller without `settings.view`.

That fix under-scoped the gate. Per `src/lib/rbac.ts`, `settings.view` is
held by **`manager` as well as `admin`/`owner`** — but `manager` does **not**
hold `settings.edit`. So the existing redaction test only ever exercised
`staff` (redacted) vs `admin` (full) and never caught that `manager` also
sails through the `settings.view` check and gets the full row, including:

- `stripe_api_key`, `telnyx_api_key`, `resend_api_key`, `anthropic_api_key`,
  `indexnow_key`, `imap_pass`/`imap_host`/`imap_user` — live vendor
  credentials for the tenant's own Stripe, Telnyx, Resend, Anthropic, and
  mail accounts
- `owner_email`, `owner_phone`, `owner_name` — the business owner's personal
  contact info
- `monthly_rate`, `setup_fee`, `admin_notes` — what FullLoop (the platform)
  bills *this tenant* monthly, plus internal notes about them

Confirmed exploitable end-to-end, not just via direct API call: the
dashboard Settings > Integrations tab (`src/app/dashboard/settings/page.tsx`)
renders these values straight into `<input>` fields (several not even
`type="password"` — `stripe_api_key`, `telnyx_api_key`, `resend_api_key`,
`indexnow_key` show in plaintext text inputs). There's no role check in the
page component; it's driven entirely by what the API returns. A `manager`-
tier team member — e.g. a shift supervisor a tenant owner assigned that role
to, not an owner/admin-trust employee — can open Settings and read the
tenant's live Stripe secret key, plus the owner's personal phone/email and
what they pay FullLoop monthly.

Notably `manager` **cannot** even edit these fields (`settings.edit` is
owner/admin only per `rbac.ts`), so read access served no functional purpose
for that role — a sign this was unintended over-exposure, not a deliberate
grant.

## Fix

`src/app/api/settings/route.ts` GET now gates `SENSITIVE_TENANT_FIELDS` on
`settings.edit` instead of `settings.view`:

```ts
const canViewSecrets = hasPermission(ctx.role, 'settings.edit', overridesFor(ctx))
```

`settings.edit` is held by exactly `owner` and `admin` — the only two roles
that can actually write these fields — so this is a same-behavior no-op for
`owner`/`admin`/`staff` (who already had/lacked both permissions together)
and only tightens exposure for `manager`.

Considered gating on `settings.integrations` instead (which reads as the
more obviously "sensitive-integrations" permission name), but per
`rbac.ts` that permission is **owner-only** — `admin` explicitly lacks it
(`ROLES` catalog even documents admin as "Full access except deleting team
and integrations"). Gating on it would have broken `admin`'s legitimate
ability to view the vendor keys they're allowed to set via `settings.edit`,
so `settings.edit` is the correct boundary here, not `settings.integrations`.

## Verification

- Extended `src/app/api/settings/route.settings-view-redaction.test.ts`
  with a `manager` case (expects full redaction) and an `owner` case
  (expects full row), alongside the existing `staff`/`admin` cases.
- `npx vitest run src/app/api/settings/` — 5 files, 13 tests, all pass.
- `npx tsc --noEmit` clean (2 pre-existing unrelated errors in
  `sunnyside-clean-nyc/_lib/site-nav.ts`, untracked, another worker's
  in-progress file — not touched by this change).

## Scope note

File-only change, no DB write, no push/deploy. Two files touched:
`src/app/api/settings/route.ts` + its existing test file.
