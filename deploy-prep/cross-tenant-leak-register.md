# Cross-Tenant Leak Register — proven leaks, prioritized for Q3 fix ordering

**Status:** consolidation / file-only (no route code changed by this doc or its witness tests)
**Author:** W2 (resolver + tenant-isolation lane)
**Date:** 2026-07-12
**Purpose:** one prioritized register of every cross-tenant leak this lane has
**proven with an executable witness** — so Q3 can fix them in impact order and lock
each fix with the witness already written. Structural claims that lack a witness
are NOT in the priority list; they live in §4 (open suspicions) so nothing is
smuggled in as "proven."

Every finding below is backed by a test that runs against
`src/test/tenant-isolation-harness.ts` (`createTenantDbHarness`), an in-memory fake
that **actually applies `tenantDb`'s `.eq('tenant_id', …)` scoping and `tenant_id`
stamping**. So a "proven-LIVE" row is a real exploit reproduction (the attack
succeeds through the same scoping the route really uses), and an "already-blocked"
row proves the guard fires — neither is a structural assertion that can rot.

---

## 0. How to read this

- **proven-LIVE** = witness test asserts the cross-tenant effect **happens today**.
  These are the Q3 fix list. Each has a **required guard**; when it lands, **flip
  the witness** to expect rejection and it becomes the permanent regression lock.
- **already-blocked** = witness/control proves an existing guard stops the
  cross-tenant path. No fix needed; the test is a regression lock so a future edit
  can't silently remove the guard.
- **Why `tenantDb` doesn't already cover these:** every platform query uses the
  service_role key (RLS bypassed). `tenantDb(tenantId)` closes the common case by
  auto-scoping reads and stamping writes — but it **cannot** protect (a) a table
  with no `tenant_id` column, or (b) a caller-supplied **foreign-key id** that the
  route inserts without an ownership check. Every leak below is one of those two
  shapes.

---

## 1. Priority fix list — PROVEN-LIVE leaks

Ranked by blast radius (destructive + data-exfil first, reference-pollution after).

### P0 — `crews` PATCH → `crew_members` roster wipe + pollution  ⚠️ **DESTRUCTIVE** — ✅ **FIXED**

| | |
|---|---|
| **Route / op** | `PATCH /api/crews` → `setMembers()` (`src/app/api/crews/route.ts`) |
| **Table** | `crew_members` — **no `tenant_id` column**, keyed `(crew_id, team_member_id)` |
| **Attack vector** | `PATCH { id: <victim crew id>, member_ids: [...] }`. `body.id` was caller-supplied and never verified tenant-owned. `setMembers` scoped its `delete`/`insert` by `crew_id` alone. |
| **Effect** | **(1) Destructive:** `delete().eq('crew_id', <victim>)` **wiped another tenant's crew roster** (`member_ids: []`). **(2) Pollution:** the follow-up insert added the *attacker's own* members into the victim's crew. |
| **Verdict** | **FIXED** (was proven-LIVE) |
| **Fix** | PATCH now does a `tenantDb(tenantId).from('crews').select('id').eq('id', id).maybeSingle()` ownership check and 404s before any member write. `setMembers()` re-checks the same ownership as its first line (no-ops if the crew isn't tenant-owned), so every current and future caller is covered by construction, not just this one call site. |
| **Regression lock** | `src/app/api/crews/route.witness.test.ts` — flipped from LEAK to LOCK (3 tests: foreign-id 404 + untouched roster, foreign-id can't be polluted, positive control on own crew still works) |
| **Verified** | `npx tsc --noEmit` clean; full `vitest run` 158 files / 555 passed / 37 skipped / 0 failed |
| **Rank rationale** | Only leak here that is **destructive** *and* on a `tenant_id`-less table (`tenantDb` structurally cannot help — needs hand-written guard). Highest blast radius. |

### P1 — `bookings` POST → cross-tenant service-type **READ** + client_id FK injection  ⚠️ **DATA EXFIL** — ✅ **FIXED**

| | |
|---|---|
| **Route / op** | `POST /api/bookings` (unconverted, raw `supabaseAdmin`) |
| **Table(s)** | `service_types` (read), `bookings`/`clients` (FK) |
| **Attack vector** | **(1) READ:** `service_types.select('name').eq('id', service_type_id)` had **no tenant filter**; passing tenant B's `service_type_id` read B's service-type **name** and stamped it on A's booking. **(2) FK injection:** `client_id` was UUID-format-validated only, never ownership-checked, then inserted. |
| **Effect** | Cross-tenant **read** of B's service-type name (data exfiltration, not just a dangling reference), plus A's booking referencing B's client. |
| **Verdict** | **FIXED** (was proven-LIVE) |
| **Fix** | `service_types` read now carries `.eq('tenant_id', tenantId)` (foreign id matches nothing, name never copied). `client_id` is now verified owned by the acting tenant (`clients` lookup scoped to `tenantId`) before any other work runs — 404 on miss. |
| **Regression lock** | `src/app/api/bookings/route.witness.test.ts` — flipped from LEAK to LOCK (3 tests: foreign service_type_id name never copied, foreign client_id 404s before insert, own-tenant CONTROL still creates the booking) |
| **Verified** | `npx tsc --noEmit` clean; full `vitest run` 158 files / 559 passed / 37 skipped / 0 failed |
| **Rank rationale** | The only proven leak that performs an actual cross-tenant **READ** (exfil), not just a reference write. Above the pure FK-injection writes. |

### P2 — `invoices` POST → cross-tenant FK injection (client_id / booking_id / quote_id) — ✅ **FIXED**

| | |
|---|---|
| **Route / op** | `POST /api/invoices` (unconverted, raw `supabaseAdmin`) |
| **Table** | `invoices` (FK columns) |
| **Attack vector** | Invoice is correctly stamped `tenant_id = A`, but `body.client_id` / `body.booking_id` / `body.quote_id` were inserted **verbatim** with no ownership check. |
| **Effect** | A's finance record references B's client/booking/quote — pollutes B's entities into A's records and can surface B's data through any read-side that embeds `clients(...)` off the invoice. |
| **Verdict** | **FIXED** (was proven-LIVE) |
| **Fix** | Each of `client_id`/`booking_id`/`quote_id` is now verified tenant-owned (`.eq('id',...).eq('tenant_id', tenantId)`) before the invoice insert; 404 on any miss — including a foreign `from_booking_id`/`from_quote_id` prefill reference. |
| **Regression lock** | `src/app/api/invoices/route.witness.test.ts` — flipped from LEAK to LOCK (4 rejection tests, one per FK + from_booking_id path, + 1 same-tenant CONTROL) |
| **Verified** | `npx tsc --noEmit` clean; full `vitest run` 158 files / 559 passed / 37 skipped / 0 failed |

### P3 — `quotes` POST → cross-tenant FK injection (client_id / deal_id) — ✅ **FIXED**

| | |
|---|---|
| **Route / op** | `POST /api/quotes` (unconverted, raw `supabaseAdmin`) |
| **Table** | `quotes` (FK columns) |
| **Attack vector** | Quote stamped `tenant_id = A`; `body.client_id` and `body.deal_id` were inserted **verbatim**, no ownership check. |
| **Effect** | A's quote references B's client/deal. |
| **Verdict** | **FIXED** (was proven-LIVE) |
| **Fix** | `client_id` and `deal_id` are now verified tenant-owned before insert; 404 on miss. |
| **Asymmetry (was proven, now moot)** | The follow-up `deals` **UPDATE** on close/link **was already** scoped `.eq('id', dealId).eq('tenant_id', A)` — that guard is unchanged, it's just unreachable with a foreign `deal_id` now since the insert 404s first. |
| **Regression lock** | `src/app/api/quotes/route.witness.test.ts` — flipped from LEAK to LOCK (2 rejection tests + 1 same-tenant CONTROL proving the write-back still only touches the owned deal) |
| **Verified** | `npx tsc --noEmit` clean; full `vitest run` 158 files / 559 passed / 37 skipped / 0 failed |

### P4 — `finance/bank-accounts` POST → cross-tenant `entity_id` + `coa_id` FK injection  💰 **BANK** — ✅ **FIXED**

| | |
|---|---|
| **Route / op** | `POST /api/finance/bank-accounts` (unconverted, raw `supabaseAdmin`) |
| **Table** | `bank_accounts` (FK columns `entity_id`, `coa_id`) |
| **Attack vector** | Row stamped `tenant_id = A`, but `entity_id = body.entity_id \|\| getDefaultEntityId()` and `coa_id = body.coa_id \|\| null` were inserted **verbatim** — no ownership check on either. `entities` (mig 034) and `chart_of_accounts` (mig 032) both carry their own `tenant_id`, so both ids are cross-tenant FKs. |
| **Effect** | A's bank account links to B's accounting **entity** and B's **GL account**. `GET /api/finance/bank-accounts` embeds `entities(id, name)` + `chart_of_accounts(code, name, type)` off the row → foreign entity/account **name** surfaces back to A on read-back (exfil, not just a dangling ref). |
| **Verdict** | **FIXED** (was proven-LIVE) |
| **Fix** | Both `entity_id` (when caller-supplied) and `coa_id` are now verified tenant-owned (`.eq('id',...).eq('tenant_id', tenantId)`) before insert; 404 on either miss. |
| **Regression lock** | `src/app/api/finance/bank-accounts/route.witness.test.ts` — flipped from LEAK to LOCK (2 rejection tests, one per FK, + 2 CONTROL: default entity/null coa, and explicit own-tenant FKs) |
| **Verified** | `npx tsc --noEmit` clean; full `vitest run` 158 files / 563 passed / 37 skipped / 0 failed |
| **Rank rationale** | Two foreign FKs on a **bank** table with a read-side that embeds both parents → highest exfil surface of the new finance set. |

### P5 — `finance/expenses` POST → cross-tenant `entity_id` FK injection  💰 — ✅ **FIXED**

| | |
|---|---|
| **Route / op** | `POST /api/finance/expenses` (unconverted, raw `supabaseAdmin`) |
| **Table** | `expenses` (FK `entity_id`) |
| **Attack vector** | Row stamped `tenant_id = A`; `entity_id = body.entity_id \|\| getDefaultEntityId()` was inserted **verbatim**, no ownership check. |
| **Effect** | A's expense references B's accounting entity; finance read-sides that embed `entities(name)` surface B's entity name back to A. |
| **Verdict** | **FIXED** (was proven-LIVE) |
| **Fix** | `body.entity_id` (when caller-supplied) is now verified tenant-owned before insert; 404 on miss. |
| **Regression lock** | `src/app/api/finance/expenses/route.witness.test.ts` — flipped from LEAK to LOCK (1 rejection test + 2 CONTROL: default resolves to A's own entity, explicit own-tenant id passes) |
| **Verified** | `npx tsc --noEmit` clean; full `vitest run` 158 files / 563 passed / 37 skipped / 0 failed |

### P6 — `finance/periods` POST → cross-tenant `entity_id` FK injection (accounting close)  💰 — ✅ **FIXED**

| | |
|---|---|
| **Route / op** | `POST /api/finance/periods` (unconverted, raw `supabaseAdmin`, `upsert`) |
| **Table** | `accounting_periods` (FK `entity_id`, mig 035) |
| **Attack vector** | Row stamped `tenant_id = A`; `entity_id = body.entity_id \|\| null` was upserted **verbatim**. The on-conflict key is `(tenant_id, entity_id, year, month)`, so a foreign `entity_id` also keys a **distinct** period row. |
| **Effect** | A's month-close/period-lock record is scoped to B's entity; `GET /api/finance/periods` embeds `entities(name)` → B's entity name surfaces to A. |
| **Verdict** | **FIXED** (was proven-LIVE) |
| **Fix** | `body.entity_id` (when caller-supplied) is now verified tenant-owned before upsert; 404 on miss. |
| **Regression lock** | `src/app/api/finance/periods/route.witness.test.ts` — flipped from LEAK to LOCK (1 rejection test + 2 CONTROL: null entity when omitted, explicit own-tenant id passes) |
| **Verified** | `npx tsc --noEmit` clean; full `vitest run` 158 files / 563 passed / 37 skipped / 0 failed |

### P7 — `finance/expenses/[id]` PUT → full-body **mass-assignment** (entity_id FK + tenant_id row donation)  💰

| | |
|---|---|
| **Route / op** | `PUT /api/finance/expenses/[id]` (unconverted, raw `supabaseAdmin`) |
| **Table** | `expenses` — `update(body)` with **no column allow-list** |
| **Attack vector** | `.update(body).eq('id', id).eq('tenant_id', tenantId)`. The `tenant_id` filter scopes **which** row is hit (so foreign-row selection is **blocked** — see CONTROL), but the whole `body` is written, so the caller controls **every** column on their own row: `entity_id` (foreign FK) and `tenant_id` (overwrite → **donate** A's expense into B's books). |
| **Effect** | A's own expense repointed at B's entity, and/or A's `tenant_id` overwritten to B (row leaves A's books). Distinct shape from the INSERT leaks: mass-assignment on an already-owned row. |
| **Verdict** | **proven-LIVE** (own-row column injection); foreign-row **theft** is **already-blocked** by the `tenant_id` filter (CONTROL locks it) |
| **Witness** | `src/app/api/finance/expenses/[id]/route.witness.test.ts` (LEAK: entity_id + tenant_id set on own row; CONTROL: foreign row untouched) |
| **Required guard** | Allow-list assignable columns; never accept `tenant_id`/`entity_id` from the body without an ownership check. |
| **Rank rationale** | Lowest of the set: the `tenant_id` row-selection guard already stops cross-tenant *theft*; the residual leak is self-inflicted column injection on the caller's own row. Still real (foreign `entity_id` reference + row donation). |

---

## 2. Already-blocked — regression locks (no fix needed)

Proven with a witness that the guard fires. Keep the test; do not remove the guard.

| # | Route / op | Table | Guard that blocks it | Witness |
|---|---|---|---|---|
| B1 | `PATCH/DELETE /api/jobs/[id]/sessions/[sessionId]` | `booking_assignees` (no `tenant_id`) | `loadOwnedSession(tenantId, jobId, sessionId)` selects the booking `.eq('id',sessionId).eq('tenant_id',tenantId)` **and** re-checks `job_id` → 404 before any join write | `jobs/[id]/sessions/[sessionId]/route.witness.test.ts` (BLOCKED + CONTROL) |
| B2 | `POST /api/jobs/[id]/sessions` | `booking_assignees` | Parent `booking.id` is **freshly created in-request** with `tenant_id`; job parent verified `.eq('tenant_id',tenantId)`; assignee ids validated against tenant-scoped `team_members` | (audited §3.2, safe-by-construction — no witness needed) |
| B3 | `POST /api/crews` → `setMembers` | `crew_members` | Parent `crew.id` is **freshly created** via `tenantDb(tenantId).insert` a line earlier → tenant-owned by construction | (audited §3.1a) |
| B4 | `POST /api/quotes` deals write-back | `deals` | `UPDATE .eq('id',dealId).eq('tenant_id',A)` — foreign deal matches nothing | CONTROL in `quotes/route.witness.test.ts` |
| B5 | `POST /api/invoices` from_booking/from_quote prefill | `bookings`/`quotes` | prefill re-fetch `.eq('tenant_id',A)` → foreign parent invisible, no PII copied | MIXED control in `invoices/route.witness.test.ts` |

---

## 3. Verified-safe by `tenantDb` scoping — isolation probes (context, not leaks)

These routes are **converted to `tenantDb`**; each probe seeds a foreign-tenant row
and proves it is filtered out (read) or that a forged `tenant_id` in the body can't
win (write). They are **not leaks** — listed so the register is a complete coverage
map, and so a future de-conversion is caught by a failing probe.

| Route / op | What the probe locks | File |
|---|---|---|
| `GET /api/clients/[id]/contacts` | contact PII filtered by `tenantDb` (no explicit route filter — wrapper is the sole guard) | `clients/[id]/contacts/route.isolation.test.ts` |
| `GET /api/crews` | foreign crew row absent from list | `crews/route.isolation.test.ts` |
| `GET+POST /api/deals` | GET lists only caller tenant; POST body-forged `tenant_id` loses to the wrapper stamp | `deals/route.isolation.test.ts` |
| `GET /api/documents` (list) | foreign document absent (wrapper is sole guard) | `documents/route.isolation.test.ts` |
| `GET /api/documents/[id]` | foreign doc → PGRST116 before any storage/signed-URL work | `documents/[id]/route.isolation.test.ts` |
| `GET /api/invoices/[id]` | foreign invoice never in body | `invoices/[id]/route.isolation.test.ts` |
| `GET /api/jobs/[id]` | foreign job → 404, indistinguishable from missing | `jobs/[id]/route.isolation.test.ts` |
| `GET /api/notifications` | foreign notification absent from list AND uncounted | `notifications/route.isolation.test.ts` |
| `GET /api/quotes/[id]` | foreign quote never in body | `quotes/[id]/route.isolation.test.ts` |
| `GET /api/schedules` | foreign recurring schedule excluded | `schedules/route.isolation.test.ts` |

---

## 4. Scanned & cleared — unconverted POST routes with a body FK that are **already guarded**

I swept every unconverted (raw `supabaseAdmin`) `POST` route that inserts a
caller-supplied `*_id`, looking for the same FK-injection shape as P1–P3. The
routes below **carry an ownership guard already** (or are platform-admin by design),
so they are **not** leaks — recorded here so Q3 does not re-investigate them.

| Route | Body FK | Why not a leak |
|---|---|---|
| `POST /api/projects` | `client_id` | Verified `.eq('id',clientId).eq('tenant_id',tenantId).single()` → 404 before insert (L47–50) |
| `POST /api/referral-commissions` | `booking_id` | Booking + referrer fetched `.eq('tenant_id',tenantId)` → 404 before insert |
| `POST /api/portal/bookings` | `service_type_id` | `service_types` fetched `.eq('tenant_id',auth.tid)` → 400 on foreign id; `client_id` forced to `auth.id` |
| `POST /api/attribution/manual` | `booking_id` | `bookings` UPDATE + SELECT both `.eq('tenant_id',tenantId)` |
| `POST /api/admin/comhub/send` | `thread_id` | `comhub_threads` fetched `.eq('tenant_id',tenantId)` → 404; `contact_id` copied from the owned thread |
| `POST /api/catalog` | — | Inserts only scalars (no body FK) |
| `POST /api/settings/services` | — | Inserts only scalars; scoped reads |
| `POST /api/admin/requests` | `category_id`/`territory_id` | `requireAdmin()` super-admin route; `partner_requests` is a platform table (no `tenant_id`) — **cross-tenant by design** |

**Result of the sweep:** among the routes above (swept for `client_id` /
`booking_id` / `quote_id` / `deal_id` / `service_type_id`), all are guarded — no
live leaks. This section is a **negative result, not a to-do list**.

> **Scope correction (later pass):** this original sweep was scoped to the
> *customer/sales* FK ids listed above and **did not cover the finance FK class**
> `entity_id` / `coa_id`. A follow-up pass over the `finance/*` money+bank routes
> found that class **is** live-leaking — see **P4–P7** (bank-accounts, expenses,
> periods, expenses/[id]). So "no additional live leaks" held only for the ids
> swept here; it was **not** a whole-codebase all-clear. The `entity_id`/`coa_id`
> FK-injection class is now witnessed, not a hypothesis.

---

## 5. Source references

- `deploy-prep/join-table-ownership-audit.md` — full audit behind P0/B1–B3 (join tables with no `tenant_id`).
- `deploy-prep/tenantdb-rollout-plan.md` §5a/§5b/§5c — conversion map; §5b is the join-table + FK-injection landmine class this register makes concrete.
- `src/test/tenant-isolation-harness.ts` — the in-memory fake all witnesses/probes run against.

---

## 6. Q3 hand-off checklist

1. Fix in priority order: **P0 crews (✅ fixed) → P1 bookings (✅ fixed) →
   P2 invoices (✅ fixed) → P3 quotes (✅ fixed) → P4 bank-accounts (✅ fixed) →
   P5 expenses (✅ fixed) → P6 periods (✅ fixed) → P7 expenses/[id].** Remaining:
   P7 only — the full-body mass-assignment shape needs a column allow-list, not
   just an FK-ownership check.
2. For each fix, **flip its witness** from expect-leak to expect-rejection (404/400
   + untouched victim) — the witness then locks the fix permanently. (Done for
   P0–P6.)
3. P0 needed a **hand-written** parent-ownership guard (`crew_members` has no
   `tenant_id`; converting the route to `tenantDb` alone does **not** close it).
4. P1–P3 (done): ownership verification of each caller-supplied FK before insert;
   converting to `tenantDb` scopes the row's own `tenant_id` but does **not**
   validate foreign-key ownership — the guard is separate. Same principle applies
   to P4–P7.
