# Dashboard Widget Endpoints + Tenant Clone Routes — RBAC Audit

Read-only audit per LEADER order 20:16. No fixes applied — findings only.

## Tenant clone routes (CLAUDE.md known-debt note)

CLAUDE.md flags three per-tenant operator clones as known debt:
- `src/app/site/wash-and-fold-nyc/(app)/admin/*` + `/dashboard/*`
- `src/app/site/wash-and-fold-hoboken/(app)/admin/*` + `/dashboard/*`
- `src/app/site/the-florida-maid/clients/dashboard`

**Status update: the CLAUDE.md note is stale for wash-and-fold.** Commit
`a1cea0ba` ("refactor: remove per-tenant operator dashboard clones") already
deleted the wash-and-fold-nyc and wash-and-fold-hoboken `(app)/admin` and
`(app)/dashboard` trees — confirmed by `find`, neither directory exists in
this worktree. Only `team/`, `book/`, `apply/`, `referral/`, `feedback/`,
`login/` remain under `(app)/` for both tenants, which are customer/cleaner
portals (allowed per the rule), not operator clones. CLAUDE.md's known-debt
list should be updated to drop these two entries — leaving this for the
leader/doc-owner to confirm and edit, not doing it myself (out of scope for
a read-only audit).

`the-florida-maid/clients/dashboard` still exists and is genuinely a
customer-facing client portal (not operator tooling), so it doesn't violate
the global-operator rule. Checked its API surface
(`/api/client/bookings`, `/api/client/notes`, `/api/client/book`,
`/api/client/preferred-cleaner`, `/api/client/recurring`) — all gate on
`protectClientAPI(tenantId, clientId)`, which verifies a signed, tenant-bound
HMAC session cookie server-side and rejects any `client_id` that doesn't
match the cookie's subject. The page component reads `client_id` from
`localStorage` client-side, but that value is never trusted by the API —
only the cookie is. No IDOR found here. `/api/client/smart-schedule` is
intentionally public/unauthenticated (documented in its own comment) and
only returns cleaner names + availability, not client PII — not a finding.

## Dashboard widget data endpoints — real gaps found

The RBAC catalog (`platform/src/lib/rbac.ts`) defines a `finance.view`
permission that `staff`-role users do **not** get by default, and a
`settings.edit` permission gating things like go-live activation. Two
endpoints under `/api/dashboard` don't enforce any permission check at all —
only `getTenantForRequest()` (proves "some authenticated member of this
tenant," not "this permission"):

1. **`src/app/api/dashboard/route.ts` (GET, main dashboard aggregator)** —
   returns `financials` (today/week/month/pending revenue), full client
   records embedded in `todayJobs`/`upcomingBookings`/`allJobs`
   (`clients(*)` — name, phone, address, notes), and team roster, gated only
   by `getTenantForRequest()`. No `requirePermission('finance.view')` or
   similar. A `staff`-role user — whose default permission set excludes
   `finance.view` — can pull full revenue figures and pending-payment totals
   through this endpoint even though the RBAC catalog was clearly designed
   to keep that from them (there's a dedicated `finance.view` permission for
   exactly this data). This is the dashboard's main widget/summary source,
   so it's a meaningful gap, not an edge case.

2. **`src/app/api/dashboard/comms-preview/route.ts` (GET, `?send=<email>`)**
   — decrypts the tenant's live Resend API key and sends a real email to any
   address supplied in the query string, gated only by
   `getTenantForRequest()`. No permission check at all (compare
   `settings.integrations`/`settings.edit`, which gate email/config elsewhere
   in this codebase). Any authenticated tenant member — any role — can
   trigger an arbitrary-recipient send through the tenant's real transactional
   email domain/reputation. Low likely usage (looks like a dev preview tool
   left in a production route), but it's a live send path with a real
   external side effect and zero role gate.

## Inconsistency (not exploitable, but worth flagging for cleanup)

**`src/app/api/dashboard/import/analyze/route.ts` (POST)** uses only
`getTenantForRequest()`, while its siblings in the same import flow —
`import/stage/route.ts` and `import/batch/[id]/route.ts` — both correctly
require `clients.create` via `requirePermission()`. `/analyze` doesn't write
to the DB, but it does spend the tenant's Anthropic API budget per call and
is the same feature gated everywhere else by `clients.create`. A `staff`
role member without `clients.create` can still hit `/analyze` repeatedly.

**`src/app/api/dashboard/onboarding/route.ts` (PATCH)** — updates
`onboarding_tasks.status` (which feeds `checkActivationReadiness()`) using
only `getTenantForRequest()`, no permission check. Its sibling
`onboarding/activate/route.ts` requires `settings.edit` to flip the tenant
live, and `onboarding/profile/route.ts` requires `settings.edit` for its
PUT/POST. A `staff`-role member can mark onboarding tasks
completed/skipped/blocked and influence the readiness state that gates
go-live, even though they can't trigger activation itself.

## Scope note

Per the leader order this was a read-only audit ("do not extend, just check
for missing RBAC") — no code changes made. Verification: `npx tsc --noEmit`
not run since no files were edited.
