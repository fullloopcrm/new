# /api/team + Entity/Provisioning Flows — Security Sweep

Read-only audit per LEADER order 22:27. No fixes applied — findings only.
Explicitly excluded per LEADER instruction: referrers, referral-commissions,
team-PIN routes (`/api/team-portal/auth/*` and anything checking a PIN at
login time).

## Routes reviewed

- `src/app/api/team/route.ts` (GET, POST)
- `src/app/api/team/[id]/route.ts` (GET, PUT, DELETE)
- `src/app/api/admin/team/route.ts` (GET — platform admin)
- `src/app/api/admin/team-availability-batch/route.ts` (GET)
- `src/app/api/team-availability/route.ts` (GET)
- `src/app/api/bookings/[id]/team/route.ts` (GET, PUT)
- `src/app/api/team-members/[id]/stripe-onboard/route.ts` (GET, POST)
- `src/app/api/team-members/[id]/stripe-status/route.ts` (GET, POST)
- `src/app/api/team-applications/route.ts` (GET, POST, PUT, DELETE)
- `src/app/api/team-applications/bulk-approve/route.ts` (POST)
- `src/app/api/team-applications/upload/route.ts` (POST — public)
- `src/app/api/settings/team/route.ts` (GET, PUT)
- `src/app/api/finance/entities/route.ts` (GET, POST)
- `src/app/api/finance/entities/[id]/route.ts` (PATCH, DELETE)
- `src/app/api/admin/businesses/[id]/provision/route.ts` (POST — admin)
- `src/lib/provision-tenant.ts`, `src/lib/team-provisioning.ts` (helpers called
  by the routes above)

## Result: no CRITICAL/HIGH findings

Every mutating route (`POST`/`PUT`/`DELETE`) either gates on
`requirePermission(...)` (tenant-scoped RBAC) or `requireAdmin()` (platform
admin), and every DB query chains `.eq('tenant_id', tenantId)` off the
authenticated context — never off a client-supplied tenant id. Spot-checked
patterns of note (all clean):

- **`/api/bookings/[id]/team` PUT** — `lead_id`/`extra_team_member_ids` are
  caller-supplied ids; the route explicitly re-verifies every id belongs to
  `tenant_members` scoped to `ctx.tenantId` before writing
  `booking_team_members` rows (see comment at line 64-68 in that file). This
  is the right pattern — flagging as a positive example, not a gap.
- **`team-applications/upload`** (public, unauthenticated by design — used
  before an applicant is a team member) — rate-limited 3/10min per IP
  (in-memory, resets on cold start, already documented in the codebase as
  "spam defense, not a security boundary" — pre-existing accepted risk, not
  new). File type is checked against the browser-supplied `file.type` MIME
  string rather than magic bytes; `ALLOWED_TYPES` excludes `image/svg+xml`
  so stored-XSS-via-SVG isn't possible, and the stored filename is
  server-generated (timestamp+random+sanitized extension), not attacker
  controlled. Low severity, not flagging as a finding.
- **`provision-tenant.ts` / `team-provisioning.ts`** — `overrides` body on
  the admin provision route is spread into DB writes, but the endpoint is
  `requireAdmin()`-gated and only touches the target tenant's own row
  (`tenantId` from the URL param, not the body). No cross-tenant write path.
- **PIN issuance** in `team-provisioning.ts` (`provisionApprovedApplicant`)
  reuses the same crypto-random 4-digit PIN scheme as `POST /api/team` —
  noted but not touched or assessed further per LEADER's "don't touch
  team-PIN routes" instruction; this is PIN *issuance*, not the PIN *auth*
  route, so it was read for context only, not modified.

No IDOR, no missing tenant scoping, no injection, no auth bypass found in
this route cluster. Sweep complete for `/api/team*`, `/api/team-members/*`,
`/api/team-applications/*`, `/api/settings/team`, `/api/finance/entities/*`,
`/api/admin/businesses/[id]/provision`, `/api/admin/team*`,
`/api/bookings/[id]/team`.
