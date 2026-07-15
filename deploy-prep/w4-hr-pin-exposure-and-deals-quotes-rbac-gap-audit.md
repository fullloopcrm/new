# HR Module PIN Credential Exposure + Deals/Quotes Missing RBAC

Found during LEADER 20:36 broad-hunt order ("HR module, deal-to-invoice
conversion flow"). File-only, no fixes applied — findings only. Finding 1 is
CRITICAL and mirrors the referrer-code IDOR already escalated to Jeff (a
design-level tradeoff, not a unilateral patch), so it needs the same call
before anyone touches it.

## Finding 1 (CRITICAL) — team_members.pin leaks via `select('*')` + missing/weak RBAC

`pin` is the **sole authentication credential** for the team-portal login
(`POST /api/team-portal/auth` — `.eq('pin', pin)` + `tenant_slug`, no other
factor, see `src/app/api/team-portal/auth/route.ts:8-46`). It's a
cryptographically-random 4-digit code (`src/app/api/team/route.ts:68-69`).
Team-portal access is real: check-in/checkout (attendance), job
claim/release/reassign, earnings, ratings, running-late reports, phone
number changes, video upload, and internal messaging — see the full route
list under `src/app/api/team-portal/*`.

That `pin` column is returned to the admin dashboard via `select('*')` /
wildcard nested selects on `team_members` in multiple places, several with
**no permission gate at all**:

| Route | Auth check | Leaks `pin`? |
|---|---|---|
| `GET /api/team` (list) | `getTenantForRequest()` only — **no permission check** | Yes — `select('*')`, `src/app/api/team/route.ts:15` |
| `GET /api/team/[id]` | `getTenantForRequest()` only — **no permission check** | Yes — `select('*')`, `src/app/api/team/[id]/route.ts:18`. Feeds `src/app/dashboard/team/[id]/page.tsx:434`, which **renders it directly**: `<dd className="font-mono">{member.pin}</dd>` |
| `GET /api/dashboard` (main dashboard aggregator, loads for every tenant user on login) | `getTenantForRequest()` only — **no permission check** | Yes — `team_members!bookings_team_member_id_fkey(*)` wildcard nested select, `src/app/api/dashboard/route.ts:41,70,83`, for any team member with a booking today/this year |
| `GET /api/cleaners` (legacy nycmaid path, still live) | Gated on `team.view` | Yes — `select('*')`, `src/app/api/cleaners/route.ts:16`. `team.view` is granted to **every role including the lowest 'staff' role** by default (`src/lib/rbac.ts` `ROLE_PERMISSIONS.staff` includes `'team.view'`) |

**Impact:** any authenticated tenant member — including the lowest-privilege
`staff` role, which by default only has `clients.view`, `bookings.view`,
`bookings.create`, `team.view`, `schedules.view`, `reviews.view`,
`sales.view`, `notifications.view` — can pull every coworker's team-portal
PIN just by loading the dashboard homepage (`/api/dashboard`, zero
permission gate) or the roster (`/api/team`, also zero permission gate).
With a coworker's PIN + the tenant slug, `staff` can then log into that
coworker's team-portal session and: falsify attendance (check
in/out on jobs they didn't work), claim/release jobs, view the coworker's
earnings and personal address/phone, submit ratings, and send messages as
them. This is a credential-harvesting → account-takeover chain, live on
`main`, reachable by the least-trusted internal role.

**Why this needs Jeff's call, not a unilateral fix** (same shape as the
referrer-code IDOR): `dashboard/team/[id]/page.tsx` **intentionally** shows
the PIN today — it's how an owner/admin currently retells a new hire their
login code (PINs aren't emailed anywhere; `src/app/dashboard/users/page.tsx`
also surfaces a freshly-issued PIN once at creation time). So the fix isn't
"strip `pin` from every response" — it's a product decision about **which
roles should be able to see teammates' PINs at all**. Candidates:
- Gate PIN visibility to `team.edit` (owner/admin only by default — `manager`
  and `staff` both lack it), not `team.view`, and explicitly drop `pin` from
  every list/aggregate endpoint (`/api/team` list, `/api/dashboard`,
  `/api/cleaners`) — only the single-member detail view under `team.edit`
  would ever include it.
- Or: never return raw `pin` after initial issuance at all; add a
  owner/admin-only "reissue PIN" action instead of persistent display.

Either direction changes current UX for whichever roles currently rely on
seeing it, which is why this is flagged rather than patched.

## Finding 2 (HIGH) — deals/* and quotes/* have zero RBAC gating

Contrast with the sibling `invoices` module, which is properly gated
(`requirePermission('finance.view' | 'finance.expenses')` on every handler —
`src/app/api/invoices/route.ts`, `[id]/route.ts`, `[id]/send/route.ts`,
`[id]/record-payment/route.ts`). Every `deals` and `quotes` endpoint instead
uses only `getTenantForRequest()` (tenant-scoped, but **any authenticated
role**, no `requirePermission()` call anywhere in either module):

- `src/app/api/deals/route.ts` (list/create)
- `src/app/api/deals/[id]/route.ts` (get/update/delete)
- `src/app/api/deals/[id]/stage/route.ts` (pipeline stage change — **moving a
  deal to `sold` auto-creates a Job/booking** from the deal's quote via
  `convertSaleToJob`, line 72-90)
- `src/app/api/deals/manual/route.ts`, `deals/[id]/activities/route.ts`
- `src/app/api/quotes/route.ts` (list/create), `quotes/[id]/route.ts`
  (get/update/delete), `quotes/[id]/send/route.ts`,
  `quotes/[id]/convert/route.ts` (quote → booking, creates a client if
  needed), `quotes/[id]/convert-to-job/route.ts`

`quotes` maps directly onto the existing `sales.view` / `sales.edit`
permissions already in the catalog ("View proposals & documents" / "Create /
edit / send documents" — `src/lib/rbac.ts` `PERMISSION_CATALOG`), but no
route actually calls `requirePermission('sales.view'|'sales.edit')`. `deals`
has no permission concept in the RBAC catalog at all — it looks like an
oversight relative to every other CRM module (team, invoices,
referral-commissions, import-clients) that has recently been RBAC-gated.

**Impact:** any authenticated tenant member of any role can view, create,
edit, or delete deals; move deals through pipeline stages (triggering
booking/job creation on `sold`); and create, send, or convert quotes into
bookings — regardless of what permissions a tenant owner has explicitly
configured for that role. Lower severity than Finding 1 (no credential
exposure, no cross-tenant reach — `.eq('tenant_id', tenantId)` is present
throughout), but it's the same missing-RBAC-gate defect class as four of the
last five security fixes on this branch.

**Suggested fix (once approved):** wire `quotes/*` to
`requirePermission('sales.view')` for reads and `'sales.edit'` for
writes/send/convert, matching the invoices pattern. For `deals/*`, either
reuse `sales.view`/`sales.edit` (deals and quotes are the same pipeline) or
add a dedicated `deals.view`/`deals.edit` permission pair to the catalog —
Jeff's call on which, since it also determines whether `manager`/`staff`
(who currently have `sales.view`/`sales.edit` by default) keep today's
implicit access or lose it.

## Follow-up pass (20:42 LEADER order) — fixed

Finding 2 fix applied: wired `requirePermission('sales.view')` (reads) /
`requirePermission('sales.edit')` (writes) onto every tenant-scoped
`deals/*` and `quotes/*` handler, matching the existing invoices pattern —
reused the catalog's existing `sales.view`/`sales.edit` pair rather than
adding new `deals.*` permissions (the lower-risk option from the two
proposed above; no catalog/UI changes needed, `manager` keeps today's
implicit write access since it already has `sales.edit`, `staff` keeps read
via `sales.view` but loses the write access it implicitly had before).
Public `quotes/public/[token]/*` routes are untouched (token-authenticated,
not a tenant session). `src/app/api/pipeline/route.ts` (the Kanban snapshot,
same `deals` table, previously `getTenantForRequest()` only) got the same
`sales.view` gate. `tsc --noEmit` clean; updated 8 test files whose mocks
either asserted the pre-fix no-gate behavior (`deals/manual` XSS test — role
bumped from `staff` to `manager` since staff no longer has `sales.edit`) or
didn't set a `role` in their `getTenantForRequest` mock at all (7
client-scope/lifecycle/race tests — added `role: 'owner'`, which bypasses
the permission check entirely, keeping those tests focused on their actual
subject). All 27 tests in `deals`/`quotes` pass.

Finding 1 (PIN exposure) — **not touched**, still needs Jeff's call per the
original writeup.

- `team-applications/*` (list/bulk-approve/route.ts) — checked, already
  correctly gated on `team.view`/`team.edit`. `upload/route.ts` is
  intentionally public + rate-limited (photo upload before an applicant is a
  tenant member), no PIN exposure — no fix needed.
- `team-members/*` (stripe-status, stripe-onboard) — already gated. No
  bare `route.ts` under `team-members/` itself.
- **New finding, not fixed:** `src/app/api/team-availability/route.ts`
  (GET) — authenticated (`getCurrentTenant()`, 401s if no tenant) but no
  `requirePermission()` call, same missing-RBAC-gate class as Finding 2.
  Read-only (team member skills/workload/assignment-history for the
  scheduling UI, no PIN), called from `dashboard/calendar/CalendarBoard.tsx`
  which sits under the nav's `bookings.view`-gated Production section — so
  `requirePermission('bookings.view')` is the obvious target permission.
  Not patched because this route uses `getCurrentTenant()`
  (`src/lib/tenant.ts`) instead of `getTenantForRequest()`
  (`src/lib/tenant-query.ts`) — a different tenant-resolution path that also
  serves custom-domain and Clerk/admin-PIN impersonation flows and doesn't
  carry a `role` through to the caller. `requirePermission()` is built on
  `getTenantForRequest()`; swapping the auth helper on this route to gain a
  permission check is an architecture-level change, not a one-line gate
  addition — needs verification that the header-tenant and impersonation
  paths aren't relied upon here before changing it. Flagging for a dedicated
  pass rather than patching under this order's "if straightforward" bar.
- `team-portal/*` (~25 routes) — separate auth model entirely (PIN-based
  team-member session, not admin RBAC). Out of scope for this admin-RBAC
  sweep; not audited here.
