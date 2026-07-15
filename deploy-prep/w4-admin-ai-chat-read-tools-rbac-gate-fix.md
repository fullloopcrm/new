# W4 — admin/ai-chat read-only tools missing RBAC gate (sibling of 37cb395f)

**Commit:** fda03527
**Branch:** p1-w4
**Status:** File-only. Not pushed/deployed. No DB writes.

## Finding

`POST /api/admin/ai-chat` is a near-duplicate of `/api/ai/assistant`
(fixed earlier this week in 37cb395f), used by the tenant-clone dashboards
(`wash-and-fold-nyc`, `wash-and-fold-hoboken`, `nyc-mobile-salon` —
`AiAssistant.tsx`). It had the exact same gap that route had before its fix:
`TOOL_PERMISSIONS` only covered the mutating tools (`update_bookings`,
`cancel_bookings`, `update_client`, `create_booking`, `get_revenue_stats`).
The read-only tools — `search_clients`, `search_team_members`,
`query_bookings`, `get_schedule_summary`, `get_client_details` — had no
permission requirement at all.

The chat widget's client component has no role gate of its own, so
`TOOL_PERMISSIONS` is the only enforcement point. Any tenant member could
ask the assistant to search clients/team members and get full PII back,
bypassing the same `clients.view`/`team.view`/`bookings.view` RBAC
overrides already enforced on the equivalent REST endpoints
(`GET /api/clients`, `/api/team`, `/api/bookings`).

## Fix

Mirrored `ai/assistant/route.ts`'s fix exactly — added the same 5 entries
to `TOOL_PERMISSIONS`:
- `search_clients` → `clients.view`
- `get_client_details` → `clients.view`
- `search_team_members` → `team.view`
- `query_bookings` → `bookings.view`
- `get_schedule_summary` → `bookings.view`

## Verification

- New `route.read-tools-rbac.test.ts` (6 tests, same shape as
  `ai/assistant`'s): a permission-less role is blocked from `search_clients`/
  `search_team_members`/`query_bookings` (PII redacted from the tool
  result); `staff` (which has all 3 view permissions by default) passes.
- `npx tsc --noEmit`: clean.
- `npx vitest run`: 342/343 files, 1446/1450 tests pass. The 1 failing file
  is the pre-existing unrelated `cron/tenant-health` RED test, unchanged.

## Not touched

referrers/referral-commissions routes (per leader instruction). No DB
migrations, no push, no deploy.
