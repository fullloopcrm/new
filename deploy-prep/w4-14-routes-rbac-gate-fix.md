# W4 — 14 tenant-facing routes missing RBAC permission checks

**Commit:** 8a7866d8
**Branch:** p1-w4
**Status:** File-only. Not pushed/deployed. No DB writes.

## What was found

14 route files under `/api/admin/*`, `/api/sms`, `/api/send-booking-emails`,
and `/api/waitlist` called `getTenantForRequest()` (proves the caller is
*some* authenticated member of the tenant) but never called
`requirePermission()` — the same "zero permission check beyond tenant
resolution" gap already fixed on `/api/social/*`, `/api/campaigns/*`, and
other sibling routes in earlier sessions this week.

## Real fixes (staff, and in one case manager, previously had access with no override needed)

| Route | Permission | Who was blocked |
|---|---|---|
| POST `/api/admin/campaigns/generate` | `campaigns.create` | staff — could burn tenant's Anthropic key generating campaign copy |
| POST `/api/admin/campaigns/preview` | `campaigns.create` | staff — could pull full client list (name/email/phone/opt-outs) via audience preview |
| POST `/api/admin/message-applicants/send` | `team.edit` | staff + manager — could mass-SMS every un-hired job applicant |
| PUT `/api/admin/schedule-issues` | `schedules.edit` | staff — could resolve/dismiss schedule issues |
| POST `/api/admin/selena` | `clients.edit` | staff — could reset/restart a client's SMS conversation |
| POST `/api/admin/google/generate-reply` | `reviews.request` | staff — could burn Anthropic key generating review replies |
| POST `/api/admin/google/reply` | `reviews.request` | staff — could post a **live public reply** to a Google review |
| POST `/api/send-booking-emails` | `bookings.edit` | staff — could re-trigger confirmation email/SMS for any booking |
| POST `/api/sms` | `clients.edit` | staff — could send an outbound SMS to any client |
| GET `/api/waitlist` (admin panel) | `leads.view` | staff — could see every waitlisted lead's name/phone |

## Consistency fixes (default roles already had the permission; a per-tenant override revoking it was previously silently ignored on these routes)

- POST `/api/admin/find-cleaner/preview` → `bookings.create`
- GET `/api/admin/find-cleaner/recent` → `bookings.view`
- POST `/api/admin/find-cleaner/send` → `bookings.create`
- POST `/api/admin/message-applicants/preview` → `team.view`
- GET `/api/admin/schedule-issues` → `schedules.view`
- GET `/api/admin/selena` → `clients.view`
- GET `/api/sms` → `clients.view`

These don't change default-role behavior but close the "no gate at all"
architectural gap and make per-tenant `role_permissions` overrides actually
take effect on these routes, same as every sibling route already gated.

## Verification

- Added `route.permission-gate.test.ts` per route file (37 new tests): staff
  (or manager, where relevant) 403s on the ungranted permission; a role that
  has the permission passes through to the route's own logic (200, or the
  route's own validation 400/500 for cases where fully mocking the happy
  path wasn't warranted — either proves the gate itself was cleared).
- Fixed one now-stale test: `waitlist/route.tenantdb.test.ts` mocked
  `getTenantForRequest` without a `role` field, which the new
  `requirePermission()` call needs — added `role: 'owner'`.
- `npx tsc --noEmit`: clean.
- `npx vitest run`: 340/341 files pass, 1438/1442 tests pass (2 expected-fail
  + 1 skipped). The 1 failing file (`cron/tenant-health/status-coverage-divergence.test.ts`)
  is a pre-existing unrelated RED test (documented gap, not touched by this commit).

## Not touched

referrers/referral-commissions routes (per leader instruction — resolved
centrally). No DB migrations, no push, no deploy.
