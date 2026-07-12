# Join-Table Ownership Audit — writes to `tenant_id`-less join tables

**Status:** audit / file-only (no route code changed by this doc or its witness tests)
**Author:** W2 (resolver + tenant-isolation lane)
**Date:** 2026-07-12
**Scope:** every write (`insert` / `delete` / `update` / `upsert`) to a join table
that has **no `tenant_id` column**, reachable from an API route with a
**caller-supplied PARENT id**.

---

## 1. Why this exists

The platform runs every query through the **service_role** key, which **bypasses
RLS**. `tenantDb(tenantId)` (`src/lib/tenant-db.ts`) closes the common case by
auto-adding `.eq('tenant_id', …)` on reads and stamping `tenant_id` on writes.

**But `tenantDb` cannot protect a table that has no `tenant_id` column.** Pure
join tables (`crew_members`, `booking_assignees`) are keyed only by
`(parent_id, child_id)`. A write to one of these is safe **only if the route has
already proven the caller owns the PARENT row** — because the join write itself is
scoped by `parent_id` alone, and a `parent_id` supplied in a request body can name
another tenant's parent.

This audit enumerates every such write, states whether the parent-ownership guard
is present, and — for the one site that is missing it — specifies the exact guard.
Each finding has a **WITNESS** test (new files, listed in §5) that proves the
current behavior: exploitable, or already blocked.

---

## 2. The `tenant_id`-less join tables (authoritative)

Confirmed against `platform/migrations/`:

| Table | Key | `tenant_id`? | Migration |
|---|---|---|---|
| `crew_members` | `(crew_id, team_member_id)` | **NO** | `2026_07_03_crews.sql` |
| `booking_assignees` | `(booking_id, team_member_id)` | **NO** | `2026_07_03_booking_assignees.sql` |

**Considered and EXCLUDED** (they *look* like join tables but carry `tenant_id`, so
`tenantDb` already scopes them — not in scope for this audit):

| Table | Why excluded |
|---|---|
| `booking_team_members` | Has `tenant_id NOT NULL` (`2026_05_19_ratings_team_bookings.sql`); its route (`api/bookings/[id]/team`) writes via `tenantDb`, which scopes the delete/insert and 404s a foreign `booking_id`. |
| `comhub_mentions` | Has `tenant_id NOT NULL` (`2026_05_19_comhub.sql`); insert stamps `tenant_id` and uses a freshly-created `message_id`. |

---

## 3. Every write to a `tenant_id`-less join table

Enumerated from `grep "from('crew_members'|'booking_assignees')"` across
`src/` (test files excluded). Three write sites. Read-only uses in
`src/lib/team-portal-auth.ts` (lines 87, 94) are **selects**, not writes — excluded.

### 3.1 `crew_members` — `crews` `setMembers()` — ⚠️ **LEAK (missing guard)**

- **File:** `src/app/api/crews/route.ts`
  - `setMembers()` L105–112: `supabaseAdmin.from('crew_members').delete().eq('crew_id', crewId)` then `.insert(rows)`.
- **Callers:**
  - **POST** L51 — `setMembers(tenantId, crew.id, …)` where `crew.id` came from a
    `tenantDb(tenantId).from('crews').insert(...)` a line earlier. **Parent is
    freshly created and tenant-owned → SAFE.**
  - **PATCH** L74–76 — `setMembers(tenantId, id, body.member_ids)` where
    **`id = body.id` is caller-supplied and is NEVER verified to belong to the
    caller's tenant.** ⚠️ **LEAK.**
- **Why the existing code does not catch it:** The `crews` UPDATE on L72 *is*
  tenant-scoped (`tenantDb`), but:
  1. it is **skipped entirely** when the body carries only `member_ids` (no
     `name`/`color`/`active`), because `Object.keys(patch).length === 0`; and
  2. even when it runs, a foreign `id` simply matches **zero** rows and returns no
     error — the handler proceeds to `setMembers` anyway.
  So `setMembers` runs against a caller-supplied `crew_id` with **no ownership
  check**. The route already carries a self-flag (L100–104) noting exactly this.
- **Impact (two distinct cross-tenant writes):**
  - **Destructive:** `delete().eq('crew_id', <victim crew id>)` **wipes another
    tenant's crew roster.** Reachable with `PATCH { id: <victim>, member_ids: [] }`.
  - **Pollution:** the follow-up insert adds the *attacker's own* team members
    (validated against `tenantDb(attacker)`) into the **victim's** crew row,
    corrupting the victim's crew composition.
- **Required manual parent-ownership guard** (to be applied by LEADER — **not**
  applied here, this is a file-only audit; **no route edits in this lane**):

  Verify the crew belongs to the caller's tenant **before** any `crew_members`
  write. Preferred: 404 at the top of PATCH so the foreign-id no-op on the `crews`
  UPDATE is also fixed.

  ```ts
  // PATCH, before touching members:
  const { data: owned } = await tenantDb(tenantId)
    .from('crews').select('id').eq('id', id).maybeSingle()
  if (!owned) return NextResponse.json({ error: 'Crew not found' }, { status: 404 })
  // …then the existing patch/update + setMembers(tenantId, id, member_ids)
  ```

  Equivalent alternative: pass an `ownerVerified` boolean into `setMembers`, or
  re-check ownership as the first line of `setMembers` itself, so **both** callers
  are covered by construction. (POST is already safe, but a guard inside the helper
  is the most leak-proof shape.)
- **WITNESS:** `src/app/api/crews/route.witness.test.ts` — proves the cross-tenant
  wipe **and** pollution are **currently possible** (test asserts the leak; flip to
  expect 404 once the guard lands).

### 3.2 `booking_assignees` — job-session POST — ✅ **SAFE (parent not caller-supplied)**

- **File:** `src/app/api/jobs/[id]/sessions/route.ts` L94–98 —
  `supabaseAdmin.from('booking_assignees').insert(... booking_id: booking.id ...)`.
- **Why safe:** `booking.id` is the id of a booking **just inserted** on L74–91
  with `tenant_id: tenantId`. The parent is created inside the request, not named
  by the caller, so no foreign `booking_id` is reachable here. The job parent
  (`id`, caller-supplied) is separately verified tenant-owned on L33–39
  (`.eq('tenant_id', tenantId).eq('id', id)`), and assignee ids are validated
  against `team_members` scoped to the tenant (L67–68). **No guard needed.**

### 3.3 `booking_assignees` — job-session PATCH / DELETE — ✅ **SAFE (guard present)**

- **File:** `src/app/api/jobs/[id]/sessions/[sessionId]/route.ts`
  - PATCH L153–158: `booking_assignees` delete-then-insert on the caller-supplied
    `sessionId`.
  - DELETE L191–196: deletes the booking; `booking_assignees` rows cascade via FK.
- **Why safe:** both handlers call `loadOwnedSession(tenantId, jobId, sessionId)`
  (L25–35) **before** any write. It selects the booking with
  `.eq('id', sessionId).eq('tenant_id', tenantId)` **and** re-checks
  `data.job_id === jobId`, returning `null` → **404** on any mismatch. A foreign
  `sessionId` never reaches the `booking_assignees` write. **Guard present — this
  is the pattern §3.1 is missing.**
- **WITNESS:** `src/app/api/jobs/[id]/sessions/[sessionId]/route.witness.test.ts` —
  proves the guard **already blocks** the cross-tenant `booking_assignees` write
  (regression lock: a foreign `sessionId` 404s and leaves the victim's assignees
  untouched).

---

## 4. Summary

| # | Table | Route / op | Parent id | Guard | Verdict |
|---|---|---|---|---|---|
| 3.1a | `crew_members` | `crews` POST → `setMembers` | fresh `crew.id` | tenant-owned by construction | ✅ SAFE |
| 3.1b | `crew_members` | `crews` **PATCH** → `setMembers` | `body.id` (caller) | **NONE** | ⚠️ **LEAK** |
| 3.2 | `booking_assignees` | `jobs/[id]/sessions` POST | fresh `booking.id` | tenant-owned by construction | ✅ SAFE |
| 3.3 | `booking_assignees` | `jobs/[id]/sessions/[sessionId]` PATCH/DELETE | `sessionId` (caller) | `loadOwnedSession` (tenant+job) | ✅ SAFE |

**One leak: crews PATCH → `setMembers` (3.1b).** Guard specified in §3.1. All other
join-table writes either create their own parent inside the request or verify a
caller-supplied parent before writing.

---

## 5. Witness tests (new files)

| File | Proves |
|---|---|
| `src/app/api/crews/route.witness.test.ts` | crews PATCH wipes **and** pollutes another tenant's `crew_members` — **leak is live** |
| `src/app/api/jobs/[id]/sessions/[sessionId]/route.witness.test.ts` | session PATCH 404s a foreign `sessionId` and leaves `booking_assignees` untouched — **already blocked** |

Both use the in-memory `createTenantDbHarness` (`src/test/tenant-isolation-harness.ts`),
which actually applies `tenantDb`'s `.eq('tenant_id', …)` scoping, so the leak
witness is a real exploit reproduction — not a structural assertion that can rot.

**When the §3.1 guard lands, flip `route.witness.test.ts` to expect a 404 and an
untouched victim roster.** That assertion turns the witness into a permanent
regression lock for the fix.
