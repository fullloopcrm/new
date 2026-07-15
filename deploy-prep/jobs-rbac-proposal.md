# Jobs Module — Missing RBAC Permission Concept (Proposal, No Code)

Drafted per 20:58 LEADER order ("rbac.ts has zero permission concept for the
jobs feature at all, unlike every sibling module"). File-only — options and
tradeoffs for Jeff to react to, mirroring the format of
`flwork-p1-w4/deploy-prep/w4-hr-pin-exposure-and-deals-quotes-rbac-gap-audit.md`
(Finding 2, the deals/quotes RBAC gap Jeff already resolved). No routes
touched. Scope excludes `/api/referrers`, `/api/referral-commissions`, and
the `team_members.pin`-related routes (`/api/team`, `/api/team/[id]`,
`/api/dashboard`) per this order — both already gated on a separate Jeff
decision, not part of this doc.

## Current state

`src/lib/rbac.ts`'s `Permission` union has no `jobs.*` entry at all — every
other CRM module (`clients`, `bookings`, `team`, `finance`, `campaigns`,
`settings`, `schedules`, `reviews`, `referrals`, `sales`, `leads`,
`notifications`, `audit`) has its own permission pair or triple. Jobs has
none. Route-by-route, as this gap currently stands **in this worktree**
(`p1-w1`):

| Route | Method | What it does | Auth today |
|---|---|---|---|
| `src/app/api/jobs/route.ts` | GET | List every job for the tenant with a per-job **and tenant-wide** $ rollup (`contracted`/`paid`/`due`/`overdue`, in cents) | `getTenantForRequest()` only — **no permission check** |
| `src/app/api/jobs/[id]/route.ts` | GET | Single job + its payment plan, scheduled sessions, timeline events | `getTenantForRequest()` only — **no permission check** |
| `src/app/api/jobs/[id]/route.ts` | PATCH | Update status/title/notes/dates. `status → 'completed'` releases stage-gated payments and fires an owner-alert email/SMS | `getTenantForRequest()` only — **no permission check** |
| `src/app/api/jobs/[id]/sessions/route.ts` | POST | Schedule a work session — creates a `bookings` row carrying `job_id`, assigns a team member/crew | `getTenantForRequest()` only — **no permission check** |
| `src/app/api/jobs/[id]/sessions/[sessionId]/route.ts` | PATCH | Move/reassign/retitle/renote/progress a session. Completing a session releases stage-gated payments | `getTenantForRequest()` only — **no permission check** |
| `src/app/api/jobs/[id]/sessions/[sessionId]/route.ts` | DELETE | Remove a scheduled session | `getTenantForRequest()` only — **no permission check** |
| `src/app/api/jobs/[id]/payments/route.ts` | PATCH | Mark a payment on a job's plan invoiced/paid/void | `requirePermission('finance.expenses')` — **already gated** (the one exception) |

There is no `POST /api/jobs` — jobs are only ever created indirectly, via
quote conversion or a deal moving to `sold` (`convertSaleToJob`), both of
which are their own routes with their own gates (already RBAC'd, see the
deals/quotes writeup).

**Note for whoever merges branches:** commit `de919add` on the unmerged
`p1-w4` branch already applied a fix to 3 of the 4 currently-open mutation
routes (`PATCH /jobs/[id]` → `bookings.edit`, `POST /sessions` →
`bookings.create`, `PATCH`/`DELETE /sessions/[sessionId]` →
`bookings.edit`/`bookings.delete`) — reusing the existing `bookings.*`
permissions rather than adding new ones. That diff is real and tested but
**not present in this worktree** and does not touch the two GET routes
(list + detail), which remain fully open on every branch checked. It's
included below as a decision that's effectively already been made once
(Option A), not a proposal — flagging so it isn't duplicated or reverted
during merge.

## Impact

Today, on this worktree, **any authenticated tenant member of any role** —
including `staff`, whose defaults are only `bookings.view` +
`bookings.create` (no edit/delete, no `finance.view`) — can: view every
job's full financial rollup tenant-wide (contracted/paid/due/overdue, in
cents — data `staff` cannot see anywhere else without `finance.view`), view
any single job's detail and payment plan, force a job's status to
`completed` (which **releases payments and sends an owner alert**), and
create/reassign/delete scheduled work sessions. This is a wider hole than
the deals/quotes gap (tenant-scoped but no role check) — it also has a
live money-release side effect gated behind nothing at all on the
non-payments routes, until `p1-w4`'s fix (or an equivalent) lands.

One existing signal about intended shape: the sidebar nav entry for
`/dashboard/jobs` is already gated on `perm: 'bookings.view'`
(`src/app/dashboard/dashboard-shell.tsx:51`, the "Production" section,
alongside Calendar/Bookings/Crews) — i.e. the product's current mental
model already treats Jobs as living under Bookings, UI-side. No API route
enforces that same boundary yet.

## Options

### Option A — Reuse `bookings.*` (no catalog changes)

Gate every jobs route on the existing `bookings.view` / `bookings.create` /
`bookings.edit` / `bookings.delete` permissions (leave `payments` on
`finance.expenses`, unchanged):

- `GET /jobs`, `GET /jobs/[id]` → `bookings.view`
- `PATCH /jobs/[id]` → `bookings.edit`
- `POST /jobs/[id]/sessions` → `bookings.create`
- `PATCH /jobs/[id]/sessions/[sessionId]` → `bookings.edit`
- `DELETE /jobs/[id]/sessions/[sessionId]` → `bookings.delete`

This is the direction `p1-w4`'s unmerged `de919add` already took for 3 of
the 4 mutation routes.

**Pros**
- Zero catalog/UI changes — `PERMISSION_CATALOG`, `ROLE_PERMISSIONS`, and
  the tenant-facing Permissions matrix are all untouched.
- Matches the nav's existing `bookings.view` gate on `/dashboard/jobs` — no
  mismatch between "can see the page" and "can hit the API behind it."
- Matches the precedent already coded (if unmerged) on `p1-w4` — landing
  this option is a merge + porting the two missing GET gates, not a new
  pattern.
- Sessions genuinely **are** `bookings` rows carrying `job_id` — same
  table, same access model, so `bookings.*` isn't a stretch for that half
  of the surface.

**Cons**
- Permanently couples "who can touch jobs" to "who can touch bookings" —
  a tenant that wants to grant one without the other (e.g. dispatch staff
  who schedule visits but shouldn't see job financials) can't separate
  them later without a catalog change anyway.
- The jobs list/detail payload carries real money figures
  (contracted/paid/due/overdue). Gating those reads on `bookings.view`
  means `staff` — who has `bookings.view` by default and does **not** have
  `finance.view` — gets full job-level $ visibility it can't get anywhere
  else in the product today.

### Option B — New dedicated `jobs.view` / `jobs.edit` permission pair

Add `jobs.view` / `jobs.edit` to `Permission` and `PERMISSION_CATALOG` (own
group, "Jobs"), assign defaults per role, gate all 6 open routes on it
(reads → `jobs.view`, all mutations → `jobs.edit`). `payments` PATCH either
stays `finance.expenses` or folds into `jobs.edit` — separate call.

**Pros**
- Clean separation matching every other module's granularity — jobs
  becomes a first-class permission group instead of the one CRM feature
  that has none, which is the actual gap this order flagged.
- Default role assignments can be tuned independently of bookings (e.g.
  `staff` could get `jobs.view` without `jobs.edit`, matching its
  read-only-by-default posture elsewhere: `sales.view` w/o `sales.edit`,
  `bookings.view`+`bookings.create` w/o `bookings.edit`).

**Cons**
- Needs Jeff to make the same call he already made once for
  `sales.view`/`sales.edit` (deals/quotes) — which roles default to view
  vs. edit — more surface to review than reusing an existing pair.
- Touches `PERMISSION_CATALOG` (additive — the tenant Permissions matrix UI
  already renders new groups automatically, so this isn't a UI redesign,
  but it is a code change beyond the 6 route files).
- Diverges from `p1-w4`'s already-written `de919add` fix — landing this
  option means discarding that diff's 3 route changes and redoing them
  against the new pair instead of a straight merge.

### Option C — Split by data sensitivity: `bookings.*` for scheduling, `finance.view` for money-bearing reads

Recognize that the module has two different kinds of exposure — scheduling
actions (session CRUD, status changes) vs. money exposure (the $ rollup on
list/detail) — and gate each accordingly:

- `PATCH /jobs/[id]`, session POST/PATCH/DELETE → `bookings.edit` /
  `bookings.create` / `bookings.delete` (same as Option A)
- `GET /jobs`, `GET /jobs/[id]` → `finance.view` instead of `bookings.view`
  (or, more invasively: keep `bookings.view` but redact the $ fields from
  the response for roles lacking `finance.view` — a bigger change, not
  scoped here)
- `payments` PATCH → `finance.expenses`, unchanged

**Pros**
- Nobody gains $ visibility they don't already have elsewhere — `manager`
  has `finance.view` by default, `staff` doesn't, and that split is
  preserved.
- No catalog changes — reuses `bookings.*` and `finance.view`, both
  already exist.

**Cons**
- `staff` currently sees `/dashboard/jobs` via the nav's `bookings.view`
  gate but would lose API-level access to the underlying `GET /jobs` list
  under `finance.view` — nav and API would disagree unless the nav gate is
  also changed to `finance.view` (or a redaction is built), which is scope
  creep beyond "add a permission check," and the page render breaks for
  `staff` today without that follow-up.
- Two different permissions gating what a caller sees as "one Jobs
  feature" is more fragile going forward — a future field added to the
  list/detail payload needs a judgment call on which gate it falls under.

## Recommendation framing (not a decision)

Option A is the lowest-friction path — zero catalog changes, matches the
nav's existing intent, and `p1-w4` has already written and tested most of
it. Its real cost is the `staff`-sees-job-financials side effect, which is
a genuine behavior change (today `staff` can already see this — it's not
new exposure from picking this option — the mutation gates just close the
*write* half). Option B is the "do it right, like every other module"
answer but costs a role-mapping decision. Option C threads the money
exposure precisely but reopens a nav/API sync question that Option A and B
don't have. This is Jeff's call, same shape as the deals/quotes
`sales.view`/`sales.edit` decision — flagging with options rather than
picking one.
