# W4 — Social media RBAC gate fix

## Finding
`POST /api/social/post`, `DELETE /api/social/accounts`, and
`GET /api/social/connect/facebook` / `GET /api/social/connect/instagram`
called `getTenantForRequest()` with **zero permission check**. Any
authenticated tenant member — including `staff`, the lowest role — could:

- Post arbitrary content to the tenant's live, connected Facebook Page or
  Instagram Business account (`POST /api/social/post`).
- Disconnect the tenant's Facebook/Instagram integration
  (`DELETE /api/social/accounts`).
- Kick off the OAuth "connect" flow and bind their *own* Facebook Page /
  Instagram account as the tenant's integration, hijacking where future
  posts publish (`GET /api/social/connect/{facebook,instagram}`).

Sibling campaign-send routes (`/api/campaigns/send`,
`/api/campaigns/[id]/send`) already gate on `campaigns.send`/
`campaigns.create`, and `/api/dashboard/comms-preview` already gates on
`settings.integrations`. These four routes were the odd ones out.

## Fix
- `POST /api/social/post` → gated on `campaigns.send` (owner/admin only by
  default; `staff`/`manager` lack it).
- `DELETE /api/social/accounts` → gated on `settings.integrations`
  (owner-only by default).
- `GET /api/social/connect/facebook` and `GET /api/social/connect/instagram`
  → gated on `settings.integrations` (owner-only by default), matching
  disconnect.
- `GET /api/social/accounts` (listing, already token-redacted per a prior
  fix) left ungated — read-only metadata, no elevated risk.

Also fixed `tenant.id` → `tenant.tenantId` references broken by switching
from `getTenantForRequest()` (returns `{ tenant: Tenant }`) to
`requirePermission()` (returns `{ tenant: TenantContext }`).

## Tests
- 4 new `route.permission-gate.test.ts` files (staff → 403, nothing
  mutated; owner/admin → 200).
- Updated 2 pre-existing `route.test.ts` files (facebook/instagram connect)
  whose mocks lacked a `role`, which now default-403 under the new gate —
  bumped their mock role to `owner`.
- Full `src/app/api/social` suite: 9 files, 38 tests, all passing.
- `npx tsc --noEmit --pretty false`: clean, zero errors repo-wide.

## Scope note
File-only, no DB/prod writes. Did not touch referrers, referral-commissions,
team-PIN routes, `GET /api/team`, `GET /api/team/[id]`, or `GET /api/dashboard`
per current leader instruction.
