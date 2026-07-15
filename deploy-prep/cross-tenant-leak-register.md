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

### P9 — `invoices`/`quotes` PATCH `[id]` → cross-tenant `client_id` FK injection  ⚠️ **DATA EXFIL** — ✅ **FIXED**

| | |
|---|---|
| **Route / op** | `PATCH /api/invoices/[id]`, `PATCH /api/quotes/[id]` (both converted to `tenantDb`) |
| **Table** | `invoices`, `quotes` — `client_id` in the PATCH assignables allow-list, no ownership check |
| **Attack vector** | Both routes already allow-list PATCH columns (not a raw `.update(body)` spread, so not caught by the P8 grep), and `tenantDb.update()` already strips `tenant_id` from the payload — but `client_id` was accepted from the body and written verbatim with no ownership check, unlike the sibling POST routes (P2/P3) which do verify it. |
| **Effect** | Caller repoints their OWN invoice/quote at ANOTHER tenant's `client_id`. `GET /api/invoices/[id]` and `GET /api/quotes/[id]` both embed `clients(id, name, email, phone, address)` off the row, so the foreign client's PII surfaces back to the attacker's tenant on the very next read — same exfil shape as P1. |
| **Verdict** | **FIXED** (was proven-LIVE; found while sweeping `PATCH`/`PUT [id]` allow-list routes for the same FK-ownership gap as the deals/[id] fix, 2026-07-13, W2) |
| **Fix** | `client_id` is now verified tenant-owned (`db.from('clients').select('id').eq('id', client_id).maybeSingle()`, `tenantDb` auto-scopes by `tenant_id`) before either update runs; 404 on miss. Same pattern as `deals/[id]` PATCH. |
| **Regression lock** | `src/app/api/invoices/[id]/route.witness.test.ts`, `src/app/api/quotes/[id]/route.witness.test.ts` (LOCK: foreign client_id 404s, row untouched; CONTROL: own-tenant client_id and field-only updates still pass) |
| **Verified** | `npx tsc --noEmit` clean; full `vitest run` 224 files / 997 passed / 37 skipped / 0 failed |
| **Rank rationale** | Same exfil class as P1, narrower blast radius (one FK, already-allow-listed route) — placed after the P0–P8 finance/join-table sweep since it was found in a later pass over `[id]` PATCH routes specifically. |

### P10 — `finance/bank-accounts` PATCH `[id]` → cross-tenant `coa_id` FK injection  💰 **BANK** — ✅ **FIXED**

| | |
|---|---|
| **Route / op** | `PATCH /api/finance/bank-accounts/[id]` |
| **Table** | `bank_accounts` — `coa_id` in the PATCH allow-list, no ownership check |
| **Attack vector** | Route already allow-lists PATCH columns (not a raw `.update(body)` spread), but `coa_id` was accepted from the body and written verbatim with no ownership check, unlike the sibling POST route (P4) which verifies it. |
| **Effect** | Caller repoints their OWN bank account at ANOTHER tenant's GL account (`chart_of_accounts` carries its own `tenant_id`). `GET /api/finance/bank-accounts` embeds `chart_of_accounts(code, name, type)` off the row, so the foreign account's name surfaces back on the next read — same exfil shape as P4. |
| **Verdict** | **FIXED** (was proven-LIVE; found in the same `[id]` PATCH allow-list sweep as P9, 2026-07-13, W2) |
| **Fix** | `coa_id` is now verified tenant-owned (`.eq('id',...).eq('tenant_id', tenantId)`) before the update runs; 404 on miss. Same pattern as the POST route's P4 fix. |
| **Regression lock** | `src/app/api/finance/bank-accounts/[id]/route.witness.test.ts` (LOCK: foreign coa_id 404s, row untouched; CONTROL: own-tenant coa_id and field-only updates still pass) |
| **Verified** | `npx tsc --noEmit` clean; full `vitest run` 225 files / 1000 passed / 37 skipped / 0 failed |

### P11 — `bookings` PUT `[id]` → cross-tenant `client_id`/`team_member_id`/`service_type_id` FK injection  ⚠️ **DATA EXFIL** — ✅ **FIXED**

| | |
|---|---|
| **Route / op** | `PUT /api/bookings/[id]` (unconverted, raw `supabaseAdmin`) |
| **Table** | `bookings` — `client_id`/`team_member_id`/`service_type_id` picked via `pick(body, [...])`, no ownership check |
| **Attack vector** | `POST /api/bookings` (register P1) already verifies `client_id`/`team_member_id` ownership and scopes the `service_type_id` name lookup — but the sibling `PUT /api/bookings/[id]` picked all three straight from the body with **no ownership check at all** before `.update(fields)`. |
| **Effect** | Worse than a dangling reference: this route's own response — `.select('*, clients(name, phone, address, email), team_members!bookings_team_member_id_fkey(name, phone)')` — embeds the joined row directly, so a foreign `client_id` or `team_member_id` leaks another tenant's client/team-member PII (name/phone/address/email) in the **very same PUT response**, plus every subsequent GET. |
| **Verdict** | **FIXED** (was proven-LIVE; found sweeping `[id]` PATCH/PUT routes for the same FK-ownership gap as P9/P10, 2026-07-13, W2) |
| **Fix** | `client_id`, `team_member_id`, and `service_type_id` are each now verified tenant-owned before the update runs; 404 on any miss. Same guard as `POST /api/bookings`. |
| **Regression lock** | `src/app/api/bookings/[id]/route.witness.test.ts` (LOCK: each foreign FK 404s, booking untouched; CONTROL: own-tenant FKs and field-only updates still pass) |
| **Verified** | `npx tsc --noEmit` clean; full `vitest run` 226 files / 1005 passed / 37 skipped / 0 failed |
| **Rank rationale** | Same exfil severity as P1 (client/team-member PII, not just a dangling ref) — ranked with the P9/P10 `[id]`-route sweep since it was found in that later pass, not the original P0–P8 sweep. |

### P12 — `client/book` POST → cross-tenant `client_id` FK injection + victim notification hijack  ⚠️ **DATA EXFIL** — ✅ **FIXED**

| | |
|---|---|
| **Route / op** | `POST /api/client/book` (unconverted, raw `supabaseAdmin` + `create_booking_atomic` RPC) — the **public, unauthenticated** self-service booking form |
| **Table** | `bookings` (FK `client_id`) |
| **Attack vector** | `body.client_id` was only used for a tenant-scoped `.single()` do-not-service check whose miss (foreign or nonexistent id) was silently ignored (no error handling on the destructured result) — the route then called `create_booking_atomic(p_client_id=body.client_id, ...)` regardless. The RPC's own "ownership" check is a bare `PERFORM ... FOR UPDATE` (migrations/2026_07_13_client_book_dedupe_atomic.sql) which does **not** raise on zero matching rows, so a foreign `client_id` sails straight into the INSERT. |
| **Effect** | Worse than P1/P11: the booking read-back (`.select('*, clients(*), client_properties(*)')`) embeds the FK'd client **unscoped by tenant**, so the JSON response returns another tenant's real customer's full PII (name/phone/email/address/notes) to the anonymous caller — and the confirmation email/SMS sent moments later go to **that victim's own email/phone**, spamming a real customer with a booking confirmation from a business they never contacted. |
| **Verdict** | **FIXED** (was proven-LIVE; found in a broad-hunt sweep of public/unauthenticated routes for the same FK-injection shape, 2026-07-14, W2) |
| **Fix** | `body.client_id`, when supplied, is now verified tenant-owned via `.maybeSingle()` before any booking work runs; a miss 404s. The RPC itself is unchanged (still does not enforce ownership) — the app-layer check is the only guard and is sufficient since it is the RPC's sole caller. |
| **Regression lock** | `src/app/api/client/book/route.witness.test.ts` (wrong-tenant + nonexistent-id 404 probes; CONTROL: own-tenant client_id still creates the booking) |
| **Verified** | `npx tsc --noEmit` clean; full `vitest run` 263 files / 1129 passed / 37 skipped / 0 failed |
| **Rank rationale** | Same exfil class as P1/P11 but on a fully public/unauthenticated endpoint (no session, no permission gate of any kind stands between an anonymous visitor and the leak) — arguably the lowest bar to exploit of anything in this register. |

### P13 — `routes` POST → cross-tenant `team_member_id` FK injection  ⚠️ **DATA EXFIL** — ✅ **FIXED**

| | |
|---|---|
| **Route / op** | `POST /api/routes` (unconverted, raw `supabaseAdmin`) |
| **Table** | `routes` (FK `team_member_id`) |
| **Attack vector** | `body.team_member_id` was only looked up — and therefore only ever ownership-checked — when `start_latitude`/`start_longitude` were BOTH missing from the body; the insert always wrote `body.team_member_id` verbatim regardless of whether the lookup ran or what it found. Supplying `start_latitude`/`start_longitude` alongside a foreign `team_member_id` skipped the ownership check entirely. |
| **Effect** | `GET /api/routes` embeds `team_members(id, name, phone, home_latitude, home_longitude)` unscoped by tenant off this row's FK, so a foreign `team_member_id` surfaces another tenant's employee name/phone/home address on the very next read. |
| **Verdict** | **FIXED** (was proven-LIVE; found in the same broad-hunt sweep as P12, 2026-07-14, W2) |
| **Fix** | `body.team_member_id`, when supplied, is now always verified tenant-owned before insert (independent of whether start lat/lng were also supplied); a miss 404s. |
| **Regression lock** | `src/app/api/routes/route.witness.test.ts` (LOCK: foreign id 404s even with lat/lng also supplied; CONTROL: own-tenant id and HQ-fallback-on-omit both still create the route) |
| **Verified** | `npx tsc --noEmit` clean; full `vitest run` 264 files / 1133 passed / 37 skipped / 0 failed |

### P14 — `finance/cpa-tokens` POST → cross-tenant `entity_id` FK injection  💰 — ✅ **FIXED**

| | |
|---|---|
| **Route / op** | `POST /api/finance/cpa-tokens` (unconverted, raw `supabaseAdmin`) |
| **Table** | `cpa_access_tokens` (FK `entity_id`, migration 036) |
| **Attack vector** | Row stamped `tenant_id = A`; `entity_id = body.entity_id \|\| null` was inserted **verbatim**, no ownership check — same class as P4-P6 (`entities`/`chart_of_accounts` FK injection on `bank_accounts`/`expenses`/`accounting_periods`), just not yet swept on this sibling money-adjacent route. |
| **Effect** | A CPA-access token minted by tenant A can carry another tenant's `entity_id`; `GET /api/finance/cpa-tokens` embeds `entities(name)` unscoped by tenant off that FK, surfacing B's entity name back to A on the very next list. (The token-consuming `GET /api/cpa/[token]/year-end-zip` itself is safe — it double-filters `journal_lines` by both `tenant_id` AND `entity_id`, so a foreign entity_id there just returns an empty report, not a data leak — the leak is on the admin-side list endpoint's embed, not the token redemption.) |
| **Verdict** | **FIXED** (was proven-LIVE; found in a broad-hunt sweep of the finance module for the same entity_id FK-injection shape as P4-P6, 2026-07-14, W2) |
| **Fix** | `body.entity_id`, when supplied, is now verified tenant-owned (`.eq('id',...).eq('tenant_id', tenantId)`) before insert; 404 on miss. Same pattern as `bank-accounts` POST (P4). |
| **Regression lock** | `src/app/api/finance/cpa-tokens/route.witness.test.ts` (LOCK: foreign entity_id 404s, no row created; CONTROL: omitted entity_id and own-tenant entity_id both still create the token) |
| **Verified** | `npx tsc --noEmit` clean; full `vitest run` 269 files / 1151 passed / 37 skipped / 0 failed |

### P15 — `portal/feedback` POST → cross-tenant `booking_id` FK injection — ✅ **FIXED**

| | |
|---|---|
| **Route / op** | `POST /api/portal/feedback` (client-portal, token-authenticated) |
| **Table** | `reviews` (FK `booking_id`) |
| **Attack vector** | `tenant_id`/`client_id` came from the verified portal token (safe), but `booking_id` was caller-supplied and inserted **verbatim**, no ownership check. |
| **Effect** | A client's review could reference another tenant's (or another client's) booking. No current read joins `bookings(...)` off `reviews`, so this was a dangling-reference bug rather than live exfil today — same lower-severity shape as P7, not P1. |
| **Verdict** | **FIXED** (was proven-LIVE; found in the client-portal broad-hunt sweep, 2026-07-14, W2) |
| **Fix** | `booking_id`, when supplied, is now verified owned (`tenant_id=auth.tid AND client_id=auth.id`) before insert; an unowned id is silently dropped (null) rather than rejecting the feedback submission. |
| **Regression lock** | `src/app/api/portal/feedback/route.witness.test.ts` (drops a foreign-tenant id, drops a same-tenant-other-client id, CONTROL keeps the caller's own booking id, CONTROL omitted id stays null) |
| **Verified** | `npx tsc --noEmit` clean; full `vitest run` 287 files / 1221 passed / 37 skipped / 0 failed |

### P17 — `bookings/batch-update` PUT → cross-tenant `client_id`/`service_type_id` FK injection  ⚠️ **DATA EXFIL** — ✅ **FIXED**

| | |
|---|---|
| **Route / op** | `PUT /api/bookings/batch-update` (unconverted, raw `supabaseAdmin`) |
| **Table** | `bookings` — `client_id`/`service_type_id` in the `UPDATABLE_FIELDS` allow-list, no ownership check |
| **Attack vector** | This route already allow-lists PATCH-style columns via `pick()` (same list as `PUT /api/bookings/[id]`, register P11) and already verified `team_member_id` ownership — but `client_id` and `service_type_id`, both in the same allow-list, were written verbatim with no ownership check. |
| **Effect** | The route's own response embeds `clients(name, phone, email)` off each updated row, so a foreign `client_id` leaks another tenant's client PII in the response to the very PUT that set it — same exfil shape as P11, just on the sibling batch route. |
| **Verdict** | **FIXED** (was proven-LIVE; found sweeping remaining booking/scheduling routes for the P11 FK-ownership gap, 2026-07-14, W2) |
| **Fix** | `client_id` and `service_type_id` are now each verified tenant-owned (same pattern as the existing `team_member_id` check) before any update in the batch runs; 400 on any miss. |
| **Regression lock** | `src/app/api/bookings/batch-update/route.test.ts` (LOCK: foreign client_id/service_type_id 400s, no update issued; CONTROL: own-tenant ids still apply) |
| **Verified** | `npx tsc --noEmit` clean; full `vitest run` 291 files / 1247 passed / 37 skipped / 0 failed |

### P18 — `admin/recurring-schedules/[id]/regenerate` POST → cross-tenant `team_member_id`/`cleaner_id` FK injection  ⚠️ **DATA EXFIL** — ✅ **FIXED**

| | |
|---|---|
| **Route / op** | `POST /api/admin/recurring-schedules/[id]/regenerate` (converted, `tenantDb`) |
| **Table** | `recurring_schedules` (rule patch) + `bookings` (every regenerated row) — FK `team_member_id`/`cleaner_id` alias |
| **Attack vector** | A caller-supplied `team_member_id` (or its `cleaner_id` alias) was written verbatim into both the schedule rule update and every regenerated booking row, with no ownership check at all — unlike the sibling `exception/route.ts` (reassign) and `POST /api/schedules`, which both verify the same FK. |
| **Effect** | `GET /api/bookings` and `GET /api/schedules` embed `team_members(name, phone)` unscoped by tenant off these FKs, so a foreign id would leak another tenant's employee PII on the next read — same exfil class as P13. |
| **Verdict** | **FIXED** (was proven-LIVE; found in the same booking/scheduling sweep as P17, 2026-07-14, W2) |
| **Fix** | `teamMemberId` (covering both the `team_member_id` and `cleaner_id` body aliases), when supplied, is now verified tenant-owned via `tenantDb` before it's used in either the rule patch or the generated rows; 400 on miss. |
| **Regression lock** | `src/app/api/admin/recurring-schedules/[id]/regenerate/route.isolation.test.ts` (LOCK: foreign id via either alias 400s, no rule update or booking insert; CONTROL: own-tenant id is stamped on both) |
| **Verified** | `npx tsc --noEmit` clean; full `vitest run` 291 files / 1247 passed / 37 skipped / 0 failed |

### P19 — `finance/chart-of-accounts` POST → cross-tenant `parent_id` FK injection  💰 — ✅ **FIXED**

| | |
|---|---|
| **Route / op** | `POST /api/finance/chart-of-accounts` (converted, `tenantDb`) |
| **Table** | `chart_of_accounts` — self-referencing FK `parent_id` (migration 032) |
| **Attack vector** | `body.parent_id` was inserted verbatim with no ownership check — the one FK left in the finance module without the guard every sibling already has (`coa_id` on bank-accounts/bank-transactions, `entity_id` on expenses/periods/cpa-tokens). |
| **Effect** | No live `GET` currently joins/embeds `parent_id`, so today's blast radius is a dangling cross-tenant link rather than an active read-exfil — lower severity than P4-P18, but the same class the rest of this module treats as must-fix defense-in-depth (a future hierarchical-CoA report reading `parent_id` would inherit the gap silently). |
| **Verdict** | **FIXED** (found in a finance/payroll edge-case sweep, 2026-07-14, W2) |
| **Fix** | `parent_id`, when supplied, is now verified tenant-owned via `tenantDb` before insert; 400 on miss. |
| **Regression lock** | `src/app/api/finance/chart-of-accounts/route.witness.test.ts` (LOCK: foreign parent_id 400s, no insert; CONTROL x2: omitted + own-tenant parent_id both succeed) |
| **Verified** | `npx tsc --noEmit` clean; full `vitest run` 292 files / 1250 passed / 37 skipped / 0 failed |

### P16 — `client/smart-schedule` GET → cross-tenant `client_id` READ  ⚠️ **DATA EXFIL** — ✅ **FIXED**

| | |
|---|---|
| **Route / op** | `GET /api/client/smart-schedule` (public, unauthenticated — no portal token, no session) |
| **Table(s)** | `clients` (read), `team_members` (read via `scoreTeamForBooking`/fallback list) |
| **Attack vector** | `tenantId` was resolved straight off a caller-supplied `client_id` with **no ownership check at all** — unlike every sibling `/api/client/*` route, this one never called `getTenantFromHeaders()`. |
| **Effect** | Passing a `client_id` belonging to a DIFFERENT tenant returned that tenant's team-member names, the foreign client's `preferred_team_member_id`, and (via `?suggest=1`) schedule-derived availability reasons — a cross-tenant **read** (exfil), same class as P1. |
| **Verdict** | **FIXED** (was proven-LIVE; found in the client-portal broad-hunt sweep, 2026-07-14, W2) |
| **Fix** | Tenant is now always resolved from the host first (middleware signs `x-tenant-id` on every `/api/client/*` request, same as every sibling route); a supplied `client_id` is only trusted if `.eq('tenant_id', hostTenantId)` matches — a foreign id is silently ignored (falls back to host-tenant-only behavior) rather than ever selecting which tenant's data comes back. |
| **Regression lock** | `src/app/api/client/smart-schedule/route.witness.test.ts` (a foreign tenant's client_id never resolves that tenant's crew or leaks its preferred-cleaner id; CONTROL: own-tenant client_id still resolves normally) |
| **Verified** | `npx tsc --noEmit` clean; full `vitest run` 289 files / 1227 passed / 37 skipped / 0 failed |

### P20 — `bookings`/`recurring_schedules` `service_type_id` dangling-FK → cross-tenant READ via `invoices` embed  ⚠️ **DATA EXFIL** — ✅ **FIXED**

| | |
|---|---|
| **Route / op** | `POST /api/bookings` (register P1's "fix"), `POST /api/schedules`, `POST /api/bookings/batch` — all write `bookings.service_type_id` (the latter two also `recurring_schedules.service_type_id`) |
| **Table(s)** | `bookings`, `recurring_schedules` (FK `service_type_id`); read exfil surfaces via `POST /api/invoices?from_booking_id` |
| **Attack vector** | P1's fix on `POST /api/bookings` scoped the `service_types` lookup by `tenant_id` — but only to gate whether the **name** got copied onto the booking; the raw (possibly foreign) `service_type_id` was still passed to the insert unconditionally, so P1 was only ever a partial fix. `POST /api/schedules` had the identical partial pattern (name-copy gated, raw id always written to both `recurring_schedules` and every generated booking). `POST /api/bookings/batch` had **no check at all** on `service_type_id`, unlike its own `client_id`/`team_member_id` guards in the same function. None of the three routes' own responses embed `service_types`, so this sat as a silent dangling-FK gap until this sweep found the actual read vector: `POST /api/invoices` with `from_booking_id` fetches the booking `.eq('tenant_id', tenantId).eq('id', from_booking_id)` (correctly scoped on the booking itself) but embeds `service_types(name, default_hourly_rate, pricing_model)` via the FK join with **no tenant filter on the embedded side** — PostgREST resolves the join regardless of which tenant owns the joined row. |
| **Effect** | Tenant A plants a foreign `service_type_id` (tenant B's) on a booking via any of the three creation routes, then calls `POST /api/invoices?from_booking_id=<that booking>` — the response's `prefillLineItems[0].name` (and the unit price, derived from B's `default_hourly_rate`/`pricing_model`) is B's service-type data, returned directly to A. A two-hop exfil, but fully live end-to-end with only routes an authenticated tenant admin can already reach. |
| **Verdict** | **FIXED** (was proven-LIVE at all three write sites; found in a broad-hunt sweep of the invoices prefill embed, 2026-07-14, W2) |
| **Fix** | All three routes now reject (`404`/`400`) a caller-supplied `service_type_id` that doesn't resolve for the acting tenant, **before** any insert — same pattern as the already-fully-closed `client_id`/`team_member_id` guards on these same routes (and matching how `PUT /api/bookings/[id]` / `PUT /api/bookings/batch-update` / `POST /api/portal/bookings` already handled this FK correctly). The FK can no longer be foreign by construction, so the unscoped `invoices` embed is safe without also needing an embed-side fix (same "fix at the injection point" philosophy as every other entry in this register). `bookings/route.ts`'s partial P1 fix is superseded by this stricter check. |
| **Regression lock** | `src/app/api/bookings/route.witness.test.ts` (flipped the old "silently strips the name" case to expect 404; added a nonexistent-id case), `src/app/api/schedules/route.witness.test.ts` (added service_type_id LOCKED ×2 + CONTROL), `src/app/api/bookings/batch/route.isolation.test.ts` (added service_type_id LOCKED + CONTROL) |
| **Verified** | `npx tsc --noEmit` clean; full `vitest run` 295 files / 1272 passed / 37 skipped / 1 failed (unrelated pre-existing flaky timeout in `finance-export.test.ts`, passes in isolation) |
| **Rank rationale** | Same exfil class as P1/P4 (unscoped embedded join surfacing a foreign row's fields) but discovered as a **regression in an already-"fixed" entry** — P1's guard only ever closed the direct name-copy read, not the underlying FK-injection, so the same booking-creation surface stayed exploitable via a different read path the whole time. Worth flagging for Q3: any prior "FIXED" entry whose fix only gated a *derived* field (a copied name/amount) rather than the *FK column itself* should be re-audited for the same partial-fix shape. |

### P21 — `reviews/request` POST → cross-tenant `booking_id` FK injection (admin-side twin of P15) — ✅ **FIXED**

| | |
|---|---|
| **Route / op** | `POST /api/reviews/request` (unconverted, raw `supabaseAdmin`) — internal/operator-triggered review-request send, distinct from the client-portal `POST /api/portal/feedback` (register P15) |
| **Table** | `reviews` (FK `booking_id`) |
| **Attack vector** | `client_id` was already verified tenant-owned before insert, but `booking_id` was caller-supplied and inserted **verbatim** with no ownership check at all — the identical gap P15 closed on the client-portal twin of this route, just never applied here. |
| **Effect** | An operator of tenant A could attach a `booking_id` belonging to tenant B (or another client of A) to an internal review-request record. No current read joins `bookings(...)` off `reviews` (confirmed: `GET /api/reviews` embeds only `clients(name)`, `GET /api/admin/reviews` is `select('*')`), so this is a dangling-reference bug rather than live exfil today — same lower-severity shape as P15/P7, not P1. |
| **Verdict** | **FIXED** (was proven-LIVE; found in a broad-hunt sweep of routes adjacent to the already-fixed P15, 2026-07-14, W2) |
| **Fix** | `booking_id`, when supplied, is now verified owned (`tenant_id` = caller AND `client_id` = the review's `client_id`) before insert; a miss 404s (stricter than P15's silent-drop, matching the majority POST-route convention in this register since this is an admin-side route, not an anonymous client submission). |
| **Regression lock** | `src/app/api/reviews/request/route.witness.test.ts` (foreign-tenant booking_id 404s no insert; same-tenant-other-client booking_id 404s no insert; CONTROL: caller's own client's booking_id kept, CONTROL: omitted booking_id still succeeds as null) |
| **Verified** | `npx tsc --noEmit` clean; full `vitest run` 296 files / 1277 passed / 37 skipped / 0 failed |
| **Rank rationale** | Same class and severity as P15 — placed after P20 since found in a later sweep specifically checking whether P15's guard was applied consistently across every route that writes `reviews.booking_id`. |

### P22 — `admin/comhub/voice/control` POST → cross-tenant Telnyx call hijack via `customer_call_id`  ⚠️ **LIVE-ACTION HIJACK** — ✅ **FIXED**

| | |
|---|---|
| **Route / op** | `POST /api/admin/comhub/voice/control` — admin-authed mid-call controls (hold/unhold/mute/unmute/hangup/transfer_blind/transfer_warm/speak/dtmf) on an in-progress Telnyx call |
| **Table** | `comhub_active_calls` (no write leak — this is an **action-authorization** bypass, not a data insert/read) |
| **Attack vector** | Not the usual FK-injection shape — this is a new class for the register. Tenants without their own Telnyx account share the platform's `TELNYX_API_KEY` (`src/lib/comhub-voice-config.ts`: "tenants without their own config keep using the shared platform account"), so Telnyx `call_control_id`s for **different tenants can exist in the same Telnyx account**. The route accepts a caller-supplied `customer_call_id` directly and used it unconditionally to call `telnyxAction(cfg.apiKey, customerCallId, …)`; the tenant-scoped `comhub_active_calls` lookup only *optionally* populated `activeCallRowId` for a later DB bookkeeping update — a lookup miss (foreign tenant's call) did **not** block the Telnyx action from firing. |
| **Effect** | An authenticated admin of tenant A supplying tenant B's live `customer_call_id` (e.g. `{customer_call_id: 'ccid-b-live', action: 'hangup'}`) could hold, mute, hang up, blind/warm-transfer to an attacker-controlled number, speak arbitrary TTS into, or send DTMF into tenant B's live customer phone call — using the shared platform Telnyx key, with **zero server-side ownership check** on the call id itself. Real-time hijack of another business's live customer call, not a data leak. |
| **Verdict** | **FIXED** (was proven-LIVE — mutation-verified: reverting the fix makes the cross-tenant probe return 200 and fire the Telnyx `fetch`; found in a broad-hunt sweep of ComHub voice routes, 2026-07-14, W2) |
| **Fix** | `customerCallId` is now *only* ever taken from a `comhub_active_calls` row that already matched `.eq('tenant_id', tenantId)` (both the `active_call_id` and `customer_call_id` input paths) — a miss 404s before `telnyxAction()`/`fetch` runs, instead of falling through to the shared-account Telnyx call. Legitimate calls are unaffected: the webhook (`webhooks/telnyx-voice`) inserts the `comhub_active_calls` row, tenant-stamped from the verified Telnyx event payload, before the admin UI can act on a live call. |
| **Regression lock** | `src/app/api/admin/comhub/voice/control/route.witness.test.ts` (foreign-tenant `customer_call_id` 404s + fetch never called; foreign-tenant `active_call_id` 404s + fetch never called; CONTROL: caller-tenant `customer_call_id` succeeds + correct Telnyx URL; CONTROL: caller-tenant `active_call_id` succeeds) |
| **Verified** | `npx tsc --noEmit` clean; full `vitest run` 297 files / 1281 passed / 37 skipped / 0 failed |
| **Rank rationale** | New class for this register (action-authorization bypass via a shared-credential fallback, not FK-injection) — ranked with the exfil-tier entries because the blast radius (real-time control of a live customer call: hangup, TTS injection, transfer) is at least as severe as a data leak, even though exploitation requires knowing/guessing another tenant's in-flight `call_control_id`. Worth flagging for Q3: any other route that resolves a caller-supplied *external* id (Telnyx, Stripe, etc.) against a **shared** platform credential should get the same "ownership lookup gates execution, not just bookkeeping" audit — `comhub/voice/dial` was checked in the same pass and is NOT vulnerable (it only ever *creates* new calls scoped to the resolved tenant/contact, never accepts an external call id to act on). |

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
   P5 expenses (✅ fixed) → P6 periods (✅ fixed) → P7 expenses/[id] (✅ fixed,
   2026-07-13, W2) → P9 invoices/quotes PATCH [id] client_id (✅ fixed,
   2026-07-13, W2) → P10 bank-accounts PATCH [id] coa_id (✅ fixed, 2026-07-13,
   W2) → P11 bookings PUT [id] client_id/team_member_id/service_type_id
   (✅ fixed, 2026-07-13, W2) → P12 client/book POST client_id (✅ fixed,
   2026-07-14, W2, found in a broad-hunt sweep of public/unauthenticated
   routes) → P13 routes POST team_member_id (✅ fixed, 2026-07-14, W2,
   same sweep) → P15 portal/feedback POST booking_id (✅ fixed, 2026-07-14,
   W2, client-portal sweep) → P16 client/smart-schedule GET client_id
   (✅ fixed, 2026-07-14, W2, same sweep) → P17 bookings/batch-update PUT
   client_id/service_type_id (✅ fixed, 2026-07-14, W2, booking/scheduling
   sweep) → P18 admin/recurring-schedules/[id]/regenerate POST
   team_member_id/cleaner_id (✅ fixed, 2026-07-14, W2, same sweep) → P19
   finance/chart-of-accounts POST parent_id (✅ fixed, 2026-07-14, W2,
   finance/payroll edge-case sweep) → P20 bookings/schedules/
   bookings-batch service_type_id dangling-FK → invoices-embed READ
   (✅ fixed, 2026-07-14, W2, found sweeping the invoices from_booking_id
   prefill — a regression/incompleteness in P1's original fix) → P21
   reviews/request POST booking_id (✅ fixed, 2026-07-14, W2, found checking
   whether P15's guard was applied consistently across every route that
   writes reviews.booking_id — it wasn't, on the admin-side twin) → P22
   admin/comhub/voice/control cross-tenant Telnyx call hijack via
   customer_call_id (✅ fixed, 2026-07-14, W2, found in a broad-hunt sweep of
   ComHub voice routes — the first action-authorization-bypass-via-shared-
   credential finding in this register, distinct from the FK-injection
   shape of P1-P21).** All items in this register are now closed.

   **P8 sibling sweep (2026-07-13, W2, not in the original register):** grepping
   for the same `.from(<table>).update(body)` full-body-spread shape outside the
   finance FK class turned up three more live instances of the exact P7 pattern
   (tenant_id row-donation + caller-controlled FK columns), now fixed:
   - `PUT /api/schedules/[id]` (`recurring_schedules` — client_id/team_member_id/
     service_type_id FKs + tenant_id)
   - `PUT /api/reviews/[id]` (`reviews` — client_id/booking_id/team_member_id FKs
     + tenant_id)
   - `PUT /api/referrals/[id]` (`referrals` — referrer_client_id/referred_client_id
     FKs + tenant_id)

   All three now allow-list assignable columns only (see each route's
   `route.isolation.test.ts`). `PUT /api/admin/announcements/[id]` also does a raw
   `.update(body)` but `platform_announcements` has no `tenant_id` column and the
   route is `requireAdmin()`-gated (super_admin only) — cross-tenant by design,
   not a leak, left as-is (same exception class as `POST /api/admin/requests`
   in §4).

   Separately, `PUT /api/admin/recurring-schedules/[id]` (allow-listed, NOT the
   P7 shape) was missing an ownership check on its `team_member_id`/`cleaner_id`
   input — same IDOR class as the client/reschedule and bookings-team fixes
   below the P0–P7 line. Fixed: foreign team_member_id now 400s before the
   update (and before it can propagate into `bookings.team_member_id` on future
   sessions).

   No further `.update(body)`/`.from(...).update(<raw body>)` full-body-spread
   sites remain in `src/app/api/**` as of this sweep (grep: `\.update(body)`).
2. For each fix, **flip its witness** from expect-leak to expect-rejection (404/400
   + untouched victim) — the witness then locks the fix permanently. (Done for
   P0–P6.)
3. P0 needed a **hand-written** parent-ownership guard (`crew_members` has no
   `tenant_id`; converting the route to `tenantDb` alone does **not** close it).
4. P1–P3 (done): ownership verification of each caller-supplied FK before insert;
   converting to `tenantDb` scopes the row's own `tenant_id` but does **not**
   validate foreign-key ownership — the guard is separate. Same principle applies
   to P4–P7.
