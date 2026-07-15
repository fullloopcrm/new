# W4 — AI assistant read-tool RBAC gap (2026-07-15)

## Commits
- `5456cc27` fix(security): gate GET /api/social/posts on campaigns.view (committed pending fix from prior cycle)
- `c5ccbd8f` fix(security): gate GET stripe-status/stripe-onboard on team.view
- `37cb395f` fix(security): gate read-only AI-assistant tools on clients/team/bookings.view

## Findings

### 1. GET `/api/team-members/[id]/stripe-status` and GET `/api/team-members/[id]/stripe-onboard` — asymmetric gating
Both GET handlers called `getTenantForRequest()` with no permission check while their own POST siblings already require `team.edit`. Any authenticated tenant member (incl. a role with `team.view` revoked via RBAC override) could pull live Stripe Connect onboarding status (charges/payouts enabled, details submitted, account id) for any team member on the tenant. Neither GET has a live caller in the current frontend (confirmed via repo-wide grep — only the POST handlers are fetched from `dashboard/hr/[id]/page.tsx`), so this was override-only exposure, not a default-role priv-esc. Gated both on `team.view`, matching the GET/write split already used by `/api/team/[id]`.

Also noted, not acted on: `src/app/stripe-onboard/complete/page.tsx` is dead code — it POSTs to stripe-status expecting an unauthenticated cleaner-return-from-Stripe flow, but the only live `accountLinks.create()` call (in stripe-onboard's POST) sets `return_url` to `/dashboard/team/[id]`, never to `/stripe-onboard/complete`. No live caller reaches that page. Flagging in case it's cleanup-worthy, not fixing (out of scope / no live risk).

### 2. AI assistant (`/api/ai/assistant`) — 5 of 9 tools missing from TOOL_PERMISSIONS
This route already has a well-designed enforcement mechanism (`TOOL_PERMISSIONS` map + `hasPermission()` check per tool, added in a prior session specifically because "the AI tool-execution path bypassed [REST] checks entirely"). But only the 4 mutating/finance tools were covered:
- `update_bookings`, `cancel_bookings` → `bookings.edit`
- `update_client` → `clients.edit`
- `get_revenue_stats` → `finance.view`

The 5 **read-only** tools had zero permission requirement:
- `search_clients` / `get_client_details` — full client PII (name/email/phone/address/notes)
- `search_team_members` — includes `pay_rate` (the same field gated by `team.view` on `/api/team`)
- `query_bookings` / `get_schedule_summary` — booking price/status/client name/address

The chat widget (`dashboard/selena-bar.tsx`) has **no client-side role gate** — it's rendered for any dashboard user — so `TOOL_PERMISSIONS` was the only enforcement point for this data, and it was silently absent for every read tool. Any tenant member (including a role with `clients.view`/`team.view`/`bookings.view` revoked via the tenant's own RBAC override) could ask the assistant to "search for client X" or "list team members" and get full PII/pay_rate back through the chat widget, bypassing the exact same overrides already enforced on the equivalent REST endpoints (`GET /api/clients`, `/api/team`, `/api/bookings`).

Gated all 5 on the matching REST-endpoint permission:
```
search_clients: 'clients.view',
get_client_details: 'clients.view',
search_team_members: 'team.view',
query_bookings: 'bookings.view',
get_schedule_summary: 'bookings.view',
```

## Verification
- New test file `route.read-tools-rbac.test.ts` (6 tests) + existing `route.rbac.test.ts` (2 tests) + 2 new `stripe-status`/`stripe-onboard` permission-gate test files (4 tests) — all pass.
- Mutation-verified RED→GREEN via cp-based backup/restore against `git show HEAD:...` (not git stash, per this session's process change): pre-fix code returned raw PII/pay_rate/booking data for a permission-less role; post-fix returns the `"You don't have permission..."` error.
- `npx tsc --noEmit` clean.
- Full suite: 326/327 files, 1403/1407 tests pass (1 pre-existing, self-documented, unrelated intentional-RED `cron/tenant-health` test — flagged repeatedly by this worker across the session, not touched).

## Scope
File-only. No push/deploy/DB. Did not touch referrers/referral-commissions/team-PIN routes.
