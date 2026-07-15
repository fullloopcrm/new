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
| **P36 follow-up (2026-07-15)** | `entity_id` had the identical gap — a caller-supplied override was never ownership-checked (only the tenant-scoped *default* was safe). Added to the same FK-check loop; 404 on a foreign `entity_id`. See P36 below and `route.witness.test.ts` (2 new LOCKED tests + 1 CONTROL). Re-verified: `npx tsc --noEmit` clean; full `vitest run` 315 files / 1381 passed / 37 skipped / 0 failed. |

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

### P23 — `clients` PUT `[id]` → cross-tenant `preferred_team_member_id` FK injection (admin-side twin of `client/preferred-cleaner`)

| | |
|---|---|
| **Route / op** | `PUT /api/clients/[id]` (operator dashboard, converted to `tenantDb`) |
| **Table** | `clients` — `preferred_team_member_id` in the PATCH-style allow-list (`pick()`), no ownership check |
| **Attack vector** | The client-portal twin `PUT /api/client/preferred-cleaner` already verifies `body.preferred_cleaner_id` is tenant-owned (`team_members` lookup scoped by `tenant_id`) before writing it — but this operator-side route accepted `preferred_team_member_id` from the body and wrote it verbatim with no ownership check at all, the same asymmetry class as P9/P10/P21 (client-facing route guarded, admin-side twin never got the same guard). |
| **Effect** | No live `GET`/embed currently joins `team_members` off `clients.preferred_team_member_id` (confirmed: `team-availability`, `client/smart-schedule`, and `lib/smart-schedule.ts` all only compare the raw id against an already tenant-scoped member list, and the dashboard client page resolves the name client-side against its own tenant-scoped `teamMembers` fetch) — so today this is a dangling-FK gap, not live read-exfil, same lower severity as P7/P15/P19/P21. Recorded as defense-in-depth per this register's standing policy (P19) that any FK column missing its sibling's ownership check gets closed regardless of a currently-live read path, since a future report/embed would silently inherit the gap. |
| **Verdict** | **FIXED** (found in a broad-hunt sweep of `clients/*` routes, 2026-07-15, W2) |
| **Fix** | `preferred_team_member_id`, when supplied, is now verified tenant-owned (`tenantDb(tenantId).from('team_members').select('id').eq('id', ...).maybeSingle()`) before the update runs; 404 on miss. Same pattern as the `client/preferred-cleaner` guard. |
| **Regression lock** | `src/app/api/clients/[id]/route.isolation.test.ts` (LOCK: foreign `tm-b` 404s, row's `preferred_team_member_id` stays unset; CONTROL: own-tenant `tm-a` succeeds and is stamped) |
| **Verified** | `npx tsc --noEmit` clean; full `vitest run` 297 files / 1283 passed / 37 skipped / 0 failed. Mutation-verified: reverted the fix, the new foreign-id test failed RED (200 instead of 404, id written); restored, GREEN. |

### P24 — `admin/comhub/threads/[id]` PATCH → cross-tenant `assignee_id` FK injection

| | |
|---|---|
| **Route / op** | `PATCH /api/admin/comhub/threads/[id]` (admin-authed, `requireAdmin()` + `getCurrentTenantId()`) |
| **Table** | `comhub_threads` — `assignee_id UUID REFERENCES tenant_members(id)` (migrations/2026_05_19_comhub.sql), no ownership check |
| **Attack vector** | The thread row update itself is tenant-scoped (`.eq('id', id).eq('tenant_id', tenantId)`), but `body.assignee_id` was written verbatim with no check that the `tenant_members` row it references belongs to the acting tenant — same dangling-FK class as P7/P15/P19/P21/P23. |
| **Effect** | No live read currently embeds `tenant_members` off `assignee_id` (both `GET /api/admin/comhub/threads` and `GET /api/admin/comhub/threads/[id]` return it as a bare UUID; grepped every other call site — none), so today this is a dangling cross-tenant reference, not active read-exfil. Recorded and closed per this register's standing policy (P19/P23) that any FK column missing its sibling's ownership check gets fixed regardless of a currently-live read path, since a future assignee-name embed would silently inherit the gap. |
| **Verdict** | **FIXED** (found in a broad-hunt sweep of `admin/comhub/*` routes adjacent to the already-fixed P22 voice-hijack finding, 2026-07-15, W2) |
| **Fix** | `assignee_id`, when truthy, is now verified tenant-owned (`supabaseAdmin.from('tenant_members').select('id').eq('id', ...).eq('tenant_id', tenantId).maybeSingle()`) before the update runs; 400 on miss. `null` (unassign) is always allowed without a lookup. |
| **Regression lock** | `src/app/api/admin/comhub/threads/[id]/route.witness.test.ts` (LOCK: foreign `mem-b` 400s, row's `assignee_id` stays null; CONTROL: own-tenant `mem-a` succeeds and is stamped, `null` still clears, field-only update with no `assignee_id` still passes) |
| **Verified** | `npx tsc --noEmit` clean; full `vitest run` 298 files / 1287 passed / 37 skipped / 0 failed. Mutation-verified: reverted the fix, the new foreign-id test failed RED (200 instead of 400, id written); restored, GREEN. |

### P25 — Yinez/Selena owner AI tools → cross-tenant `cleaner_id`/`client_id` FK injection via `assign_cleaner_to_booking` / `create_manual_booking` / `block_cleaner_dates`  ⚠️ **DATA EXFIL**

| | |
|---|---|
| **Route / op** | `src/lib/selena/tools.ts` — `runTool()` dispatch for the owner-facing Yinez/Selena AI assistant tools (invoked from `/api/admin/selena`, `/api/selena`, `/api/admin/comhub/yinez/send`, and the SMS/Telegram owner channel). Distinct attack surface from every prior finding: the caller-supplied id isn't a raw HTTP body field, it's a tool-call argument the model fills in from conversation — same "action-authorization" shape as P22 (Telnyx voice hijack), not the FK-injection-via-POST-body shape of P1-P21/P23/P24. |
| **Table(s)** | `bookings.cleaner_id`, `bookings.suggested_cleaner_id`, `bookings.client_id` (via `create_manual_booking`), `cleaner_blocks.cleaner_id` — none had an ownership check before this fix. |
| **Attack vector** | `handleAssignCleaner` updated `bookings.cleaner_id = input.cleaner_id` scoped only by the booking's own `tenant_id` — the `cleaner_id` FK itself was never verified tenant-owned. `handleCreateManualBooking` inserted `client_id: input.client_id` and `suggested_cleaner_id: input.cleaner_id` the same way. `handleBlockCleanerDates` inserted `cleaner_blocks.cleaner_id = input.cleaner_id` unverified. |
| **Effect** | **Read-exfil, not just dangling-FK:** `handleListBookings` (the `list_bookings` tool) selects `bookings.*, clients(name), cleaners(name, id)` — a Postgrest embed keyed off `client_id`/`cleaner_id`. So if tenant A's Yinez assigns booking to tenant B's `cleaner_id`, or creates a booking against tenant B's `client_id`, the very next `list_bookings` call for tenant A returns tenant B's cleaner/client **name** in the embed. `handleGetSmartSuggestion` also embeds `cleaners(name)` off the same FK. `cleaner_blocks.cleaner_id` has no live embed today (dangling-FK only, same lower-severity class as P7/P19/P21/P23/P24) but is closed under the same standing policy. |
| **Verdict** | **FIXED** (found in a broad-hunt sweep of the AI-agent tool-call surface — a fresh area distinct from every prior HTTP-route sweep in this register — 2026-07-15, W2) |
| **Fix** | `handleAssignCleaner` and `handleBlockCleanerDates` now verify `input.cleaner_id` is tenant-owned (`cleaners` lookup `.eq('id',...).eq('tenant_id', tid)`) before writing it; error returned on miss, no write. `handleCreateManualBooking` verifies both `input.client_id` (`clients` lookup) and, when supplied, `input.cleaner_id`, before the insert. |
| **Regression lock** | `src/lib/selena/tools.cleaner-fk.witness.test.ts` (7 tests: 4 LOCK — foreign cleaner_id/client_id rejected before any write/insert across all 3 tools; 3 CONTROL — own-tenant ids still succeed and are stamped correctly) |
| **Verified** | `npx tsc --noEmit` clean; full `vitest run` 299 files / 1294 passed / 37 skipped / 0 failed. Mutation-verified: reverted the fix, all 4 new foreign-id LOCK tests failed RED (`ok:true` / row written instead of the `error` response); restored, GREEN. |
| **Rank rationale** | First finding in this register on the AI-tool-call surface rather than an HTTP route body — same class of risk (unverified caller-supplied FK) reached through a different channel. Ranked with the data-exfil group since the `cleaner_id`/`client_id` paths have a live embed read, unlike the pure-dangling-FK findings. |

### P26 — `notifications` POST (`15min_warning`) → cross-tenant `booking_id` FK injection — ✅ **FIXED**

| | |
|---|---|
| **Route / op** | `POST /api/notifications` (`type: '15min_warning'`, converted to `tenantDb`) — team-dashboard-triggered 15-minute-remaining heads-up |
| **Table** | `notifications` (FK `booking_id`) |
| **Attack vector** | `booking_id` was caller-supplied and inserted into `notifications` **verbatim**, unconditionally, before any ownership check ran. A second `db.from('bookings').select(...).eq('id', booking_id).single()` existed further down but only gated the follow-up client SMS branch — a foreign id there just silently no-opped that branch (tenantDb's implicit `.eq('tenant_id', …)` filtered it out), it never blocked the notification row from being written first. |
| **Effect** | No live read currently embeds `bookings` off `notifications` (grepped every `select('*'…)`/embed site: `GET /api/notifications`, `GET /api/team-portal/notifications`, `GET /api/admin/notifications` all read bare columns, no join) — so today this is a dangling cross-tenant reference, not active read-exfil. Recorded and closed under this register's standing policy (P19/P23/P24) that any FK column missing its sibling's ownership check gets fixed regardless of a currently-live read path, since a future notifications↔bookings embed would silently inherit the gap. |
| **Verdict** | **FIXED** (found in a broad-hunt sweep of the `notifications` table's write sites — a fresh area, not previously in this register — 2026-07-15, W2) |
| **Fix** | `booking_id`, when supplied, is now verified tenant-owned (`tenantDb`-scoped `bookings` lookup) **before** the `notifications` insert runs; a miss 400s and no row is written. The booking row fetched for the ownership check is reused for the existing SMS branch instead of re-fetching. |
| **Regression lock** | `src/app/api/notifications/route.witness.test.ts` (LOCK: foreign-tenant and nonexistent booking_id both 400, no notification row, no SMS sent; CONTROL: own-tenant booking_id creates the notification and sends the SMS, omitted booking_id still creates the notification with no SMS) |
| **Verified** | `npx tsc --noEmit` clean; full `vitest run` 300 files / 1298 passed / 37 skipped / 0 failed. Mutation-verified: reverted the fix, both new foreign/nonexistent-id LOCK tests failed RED (200 instead of 400); restored, GREEN. |

### P27 — `POST /api/yinez` → cross-tenant conversation hijack via `sessionId`  ⚠️ **LIVE-ACTION HIJACK** — ✅ **FIXED**

| | |
|---|---|
| **Route / op** | `POST /api/yinez` — the **public, unauthenticated** web-chat widget endpoint (nycmaid's real Yinez agent) |
| **Table(s)** | `sms_conversations` / `sms_conversation_messages` (no write leak on its own — this is an **action-authorization** bypass, same new class as P22) |
| **Attack vector** | `askSelena()` and `insertConversationMessage()` both resolve the acting tenant from the conversation's OWN row (`sms_conversations.tenant_id`), not from the request's signed tenant header — intentional, so a conversation stays with its real owner across calls. But this route accepted a caller-supplied `sessionId` and used it as `conversationId` with **no check at all** that it belongs to the tenant the request is signed for. The sibling `POST /api/chat` already guards exactly this by passing `{ expectedTenantId: tenantId }` to every `insertConversationMessage()` call (see `src/lib/sms-messages.ts`'s cross-tenant-append block) — `/api/yinez` never passed it. |
| **Effect** | An anonymous visitor on ANY tenant's widget could supply another tenant's **live** `sessionId` (e.g., read off that tenant's own widget in another tab) and inject a message into, and drive Selena's reply/tool-calls against, that victim tenant's real customer conversation — reading back whatever Selena's reply reveals about the victim's in-flight conversation state (name, address, price already quoted) and potentially triggering Selena's booking/tool actions in the victim's tenant context. Fully unauthenticated — no session, no permission gate of any kind. |
| **Verdict** | **FIXED** (found in a broad-hunt sweep of the Yinez/Selena public chat surface — a fresh area, not previously in this register — 2026-07-15, W2) |
| **Fix** | A supplied `sessionId` is now verified tenant-owned (`sms_conversations` lookup `.eq('id',...).eq('tenant_id', reqTenantId)`) **before** any of `insertConversationMessage`/`askSelena` run; a miss 400s. Both `insertConversationMessage` calls also now pass `expectedTenantId: reqTenantId`, matching `/api/chat`, as defense-in-depth. |
| **Regression lock** | `src/app/api/yinez/route.witness.test.ts` (LOCK: foreign-tenant sessionId 400s, nonexistent sessionId 400s, neither ever calls insertConversationMessage/askSelena; CONTROL: own-tenant sessionId proceeds with expectedTenantId stamped, omitted sessionId still creates a new tenant-scoped conversation) |
| **Verified** | `npx tsc --noEmit` clean; full `vitest run` 302 files / 1306 passed / 37 skipped / 0 failed. Mutation-verified: reverted the fix, 3 of 4 new tests failed RED (200 instead of 400, or `expectedTenantId` missing); restored, GREEN. |
| **Rank rationale** | Same class and severity as P22 (action-authorization bypass on a live conversation, not FK-injection) but on a **fully public, unauthenticated** endpoint — the lowest bar to exploit of any live-action finding in this register, comparable to P12's public-endpoint severity. |

### P28 — `scoreConversation`/`selfReviewConversation` → cross-tenant `conversation_id` read/write via `POST /api/admin/selena/score`  ⚠️ **DATA EXFIL** — ✅ **FIXED**

| | |
|---|---|
| **Route / op** | `POST /api/admin/selena/score` (admin-authed, `settings.view` permission only — not bound to any specific conversation) → `src/lib/conversation-scorer.ts` |
| **Table(s)** | `sms_conversations` (read + write `quality_score`/`quality_issues`), `sms_conversation_messages` (read), `selena_memory` (insert) |
| **Attack vector** | `conversation_id` is caller-supplied and both scoring functions fetched it with `.eq('id', conversationId).single()` — **no `.eq('tenant_id', tenantId)` at all**, unlike every sibling FK-ownership check already fixed in this register. |
| **Effect** | An admin of tenant A supplying tenant B's `conversation_id` could: **(1) read** — pull B's client conversation transcript into an AI self-review whose review text is returned directly in the API response (exfil); **(2) write** — stamp `quality_score`/`quality_issues` onto B's own row (cross-tenant mutation of a row A doesn't own); **(3) pollute** — insert into A's own `selena_memory` with `client_id` = B's client (cross-tenant FK pollution, same shape as P25). |
| **Verdict** | **FIXED** (found in the same broad-hunt sweep as P27 — the Selena/Yinez conversation-scoring surface — 2026-07-15, W2) |
| **Fix** | Both `scoreConversation` and `selfReviewConversation` now verify the conversation belongs to `tenantId` before reading its transcript or writing anything; a miss short-circuits with the same "no data"/"not found" shape already used for a missing conversation, so no insert/update is reachable for a foreign id. |
| **Regression lock** | `src/lib/conversation-scorer.witness.test.ts` (LOCK ×2: foreign conversation_id returns no-data/not-found and leaves the victim row untouched, for both functions; CONTROL ×2: own-tenant conversation_id scores/reviews normally) |
| **Verified** | `npx tsc --noEmit` clean; full `vitest run` 302 files / 1306 passed / 37 skipped / 0 failed. Mutation-verified: reverted the fix, both new foreign-id LOCK tests failed RED (real score/review data returned instead of the not-found shape); restored, GREEN. |
| **Rank rationale** | Same exfil class as P1/P25 (unverified caller-supplied id surfacing another tenant's data) — narrower blast radius than P27 since it requires an authenticated admin session, but still cross-tenant by construction with zero ownership check, not just a partial gap. |

### P29 — `GET /api/selena` → cross-tenant `convoId` message-transcript READ  ⚠️ **DATA EXFIL** — ✅ **FIXED**

| | |
|---|---|
| **Route / op** | `GET /api/selena?convoId=...` (tenant-dashboard-authed, `getTenantForRequest()`) — the conversation-transcript viewer backing `src/app/dashboard/selena/page.tsx`'s `loadMessages()` |
| **Table(s)** | `sms_conversation_messages` — **no `tenant_id` column** (only `conversation_id UUID REFERENCES sms_conversations(id)`, migration 007) |
| **Attack vector** | The `convoId` branch queried `sms_conversation_messages` directly off `supabaseAdmin` filtered only by `.eq('conversation_id', convoId)` — no check anywhere that the conversation belongs to the requesting tenant. The route's own sibling, `GET /api/admin/selena` (same `?convoId=` query shape, same underlying table), already does the correct check — a comment there reads "Tenant-verify: only return messages for convos owned by this tenant" — but that guard was never applied to this route. |
| **Effect** | Any authenticated dashboard user of tenant A supplying tenant B's `sessionId`-equivalent `sms_conversations.id` gets back B's full message transcript (`direction, message, created_at` for every message) — the entire customer conversation history (names, addresses, quoted prices, anything discussed), not just a derived field. Since `sms_conversation_messages` has no `tenant_id` of its own, `tenantDb` conversion alone would not have closed this — same structural class as P0/P22/P27 (table/action with no tenant_id, ownership must be verified via the parent FK). |
| **Verdict** | **FIXED** (was proven-LIVE; found in a broad-hunt sweep of the AI-conversation surface adjacent to the already-fixed P27/P28 findings — a fresh route, `/api/selena` is a distinct file from `/api/admin/selena` and `/api/admin-chat`, 2026-07-15, W2) |
| **Fix** | The `convoId` branch now looks up the conversation through `tenantDb(tenantId)` (`.eq('id', convoId)`, auto-scoped to the caller's tenant) before reading its messages; a miss returns `{ messages: [] }` (matching the existing miss-shape convention on this route, same as its `/api/admin/selena` sibling). |
| **Regression lock** | `src/app/api/selena/route.isolation.test.ts` (added to the existing POST-reset isolation file: CONTROL — own-tenant convoId returns its messages; LOCK — foreign-tenant convoId returns `[]`, not the victim's transcript; LOCK — nonexistent convoId returns `[]`) |
| **Verified** | `npx tsc --noEmit` clean; full `vitest run` 302 files / 1308 passed / 37 skipped / 1 failed (same pre-existing flaky timeout in `finance-export.test.ts` noted under P20 — passes in isolation, unrelated to this change). Mutation-verified: reverted the fix, the new foreign-convoId test failed RED (B's real message returned instead of `[]`); restored, GREEN. |
| **Rank rationale** | Same exfil class and severity as P28 (raw transcript/data return, zero ownership check) but on the message-read path itself rather than an AI self-review — arguably worse blast radius since it returns the complete raw conversation, not a derived summary. Found by directly comparing the guarded admin twin (`/api/admin/selena`) against this unguarded twin — same "admin-side already fixed, sibling missed" asymmetry class as P9/P10/P21/P23. |

### P30 — `admin/ai-chat` `create_booking` tool → cross-tenant `client_id`/`team_member_id` FK injection  ⚠️ **DATA EXFIL**

| | |
|---|---|
| **Route / op** | `POST /api/admin/ai-chat` (tenant-dashboard CRM-copilot chat widget, `getTenantForRequest()`-authed) — `executeTool()`'s `create_booking` case, `src/app/api/admin/ai-chat/route.ts` |
| **Table** | `bookings` (FK `client_id`, `team_member_id`) |
| **Attack vector** | Same class of surface as P25 (an AI tool-call argument, not a raw HTTP body field — the model fills `client_id`/`team_member_id` in from the conversation, or a user can just ask the copilot to "book client `<uuid>` tomorrow at 9am" with a foreign id they happen to know). Every OTHER mutating tool in this same file (`update_bookings`, `cancel_bookings`, `update_client`) correctly scopes its target row with `.eq('tenant_id', tenantId)` — but `create_booking` inserts `client_id: input.client_id` and, when supplied, `team_member_id: input.team_member_id` **verbatim**, with zero ownership check against either FK, before stamping `tenant_id: tenantId` on the row itself. The file's own top-of-file comment already flags a *permission*-gating gap on the sibling `ai/assistant/route.ts` — this is a separate, unflagged FK-ownership gap, and `ai/assistant/route.ts` doesn't have a `create_booking` tool at all so it doesn't share this specific hole. |
| **Effect** | `query_bookings` (`clients(name), team_members!bookings_team_member_id_fkey(name)`) and `get_schedule_summary` (`clients(name, address), team_members!bookings_team_member_id_fkey(name)`) — both in the same tool-dispatch table — embed those exact FKs with no tenant filter on the embedded side. So a tenant-A operator asking the copilot to create a booking against a foreign `client_id`/`team_member_id`, then asking "what's on the schedule", gets tenant B's real client name/address or employee name back in the very next tool response — same read-exfil shape as P1/P11/P25. |
| **Verdict** | **FIXED** (was proven-LIVE; found in a broad-hunt sweep of the AI-copilot tool-call surface, fresh area vs. P25's `src/lib/selena/tools.ts` — 2026-07-15, W2) |
| **Fix** | `create_booking` now verifies `client_id` (always) and `team_member_id` (when supplied) are tenant-owned — `.eq('id', ...).eq('tenant_id', tenantId).maybeSingle()` against `clients`/`team_members` — before the `bookings` insert runs; a miss returns `{ error: 'client not found' }` / `{ error: 'team member not found' }` (matching this tool's existing `{ error: ... }` JSON-string return convention). Same pattern as the already-fixed `POST /api/bookings` (P1) and `src/lib/selena/tools.ts` `create_manual_booking` (P25). |
| **Regression lock** | `src/app/api/admin/ai-chat/route.witness.test.ts` (flipped from LEAK to BLOCKED: foreign `client_id` alone is rejected; own `client_id` + foreign `team_member_id` is rejected; CONTROL — own-tenant `client_id`+`team_member_id` still creates the booking). `src/app/api/admin/ai-chat/route.test.ts` seed extended with a `clients` table so the pre-existing `create_booking` permission test still resolves ownership correctly. |
| **Verified** | `npx tsc --noEmit` clean; full `vitest run` 303 files / 1312 passed / 37 skipped / 0 failed. |
| **Rank rationale** | Same exfil class and construction as P25 (unverified FK argument on an AI tool-call, not an HTTP body) but on the separate `admin/ai-chat` copilot rather than the Yinez/Selena owner-messaging tools — confirms the "AI tool-call surface" is a repeating gap class across every agent in this codebase, not a one-off in `selena/tools.ts`. `ai/assistant/route.ts` (the file flagged as sharing a *permission* gap) was checked in the same pass and does NOT share this specific FK-injection hole — it has no `create_booking` tool. |

### P31 — `admin/comhub/voice/dial` + `admin/comhub/send` → cross-tenant `contact_id` FK injection (conditional-validation gap)  ⚠️ **DATA EXFIL**

| | |
|---|---|
| **Route / op** | `POST /api/admin/comhub/voice/dial` and `POST /api/admin/comhub/send` (both `requireAdmin()`-gated, `getCurrentTenantId()`-scoped) — the external-channel (`sms`/`email`/`voice`) contact-resolution branch shared by both files |
| **Table(s)** | `comhub_threads`/`comhub_messages` (FK `contact_id` → `comhub_contacts.id`, no DB-level tenant check — `comhub_get_or_create_thread()` inserts `(tenant_id, contact_id, channel)` with zero ownership validation on `p_contact_id`, migration `2026_05_19_comhub.sql`) |
| **Attack vector** | Both routes accept a caller-supplied `contact_id` in the body. The ownership check that validates it against `tenant_id` was written as an `else`/conditional branch that only ran when OTHER identifying fields were absent: `voice/dial` used `else if (contactId && !customerPhone)`, `send` used `if (contactId && (!phone && !email))`. Supplying `contact_id` (a foreign tenant's real id) **together with** a caller-chosen `phone`/`email` skipped the lookup entirely — the foreign id flowed straight into `comhub_get_or_create_thread` (RPC, no ownership check) and the `comhub_messages` insert, both stamped with the CALLER's `tenant_id` but pointing at ANOTHER tenant's `comhub_contacts` row. `send`'s `thread_id` had the same shape: `if (threadId && !contactId)` meant a request supplying both a valid own-tenant `thread_id` *and* a foreign `contact_id` never validated the thread at all in that branch. |
| **Effect** | `GET /api/admin/comhub/threads` joins `comhub_contacts!left(id, name, phone, email, client_id, team_member_id)` on the FK with no additional tenant filter (`comhub_contacts` RLS is service-role-only, and these admin routes run on the service-role client). So a tenant-A admin POSTing `{ contact_id: '<tenant-B-contact-uuid>', phone: '+1...', channel: 'sms', body: 'hi' }` to either route creates a thread in tenant A that, the next time the admin loads their own Comhub inbox, renders tenant B's real contact name/phone/email/`client_id`/`team_member_id` — live cross-tenant PII read, same class and blast radius as P22/P25. |
| **Verdict** | **FIXED** (found in a broad-hunt sweep of the `admin/comhub/*` surface, checking every sibling of the already-fixed P22 `voice/control` and P24 `threads/[id]` findings for the same conditional-validation shape — a fresh bug pattern distinct from the unconditional-missing-check shape of P1–P30, 2026-07-15, W2) |
| **Fix** | In both routes, a caller-supplied `contact_id` is now validated against `tenant_id` **unconditionally** — independent of whether `phone`/`email` are also present in the body — a miss 404s (`'contact not found'`) before `comhub_get_or_create_thread`, any Telnyx call, or any DB write. `send`'s `thread_id` check was similarly changed from `threadId && !contactId` to always running when `threadId` is present. |
| **Regression lock** | `src/app/api/admin/comhub/voice/dial/route.witness.test.ts` and `src/app/api/admin/comhub/send/route.witness.test.ts` (new files): BLOCKED — foreign `contact_id` + a caller-supplied `phone`/`email` 404s with no thread/message/RPC/SMS/fetch side effect; BLOCKED — foreign `contact_id` alone also 404s; CONTROL — own-tenant `contact_id` still succeeds and the inserted message/thread carry only the caller's own `contact_id`/`tenant_id`; CONTROL — phone-only (no `contact_id`) still resolves via the tenant-scoped RPC. |
| **Verified** | `npx tsc --noEmit` clean (project-wide). `npx vitest run src/app/api/admin/comhub/` — 7 files / 24 passed / 0 failed (includes the 2 new witness files plus the 5 pre-existing comhub route test files, confirming no regression on P22/P24's fixes or normal send/dial behavior). |
| **Rank rationale** | Same dangling-FK-via-join exfil class as P20/P22/P25 (a caller-controlled FK reaches a DB write unvalidated, then a later unfiltered join renders the victim's row), but a distinct root cause: not a *missing* ownership check like every prior finding in this register, but a check that existed and was correct in isolation, just gated behind the wrong condition — present only in the "field X is missing" branch, absent in the "field X is present too" branch. Worth flagging as its own pattern: any `if (fk && !otherField)`-shaped validation in this codebase should be re-audited for the same gap. |

---

### P32 — `ai/assistant` (client-facing widget) `update_bookings` tool → cross-tenant `team_member_id` FK injection  ⚠️ **DATA EXFIL**

| | |
|---|---|
| **Route / op** | `POST /api/ai/assistant`'s `update_bookings` tool (the client-facing AI chat widget's tool-call dispatch — same attack-surface CLASS as `admin/ai-chat`'s `create_booking` (P30) and `src/lib/selena/tools.ts` (P25), a fresh file not previously audited for this shape) |
| **Table(s)** | `bookings.team_member_id` → `team_members.id`, no DB-level tenant check |
| **Attack vector** | `update_bookings` accepts `booking_ids` + an `updates` object (including `team_member_id`) straight from the model's tool-call input and writes it via `.update(updates).eq('id', id).eq('tenant_id', tenantId)`. The `.eq('tenant_id', tenantId)` clause scopes which ROW can be written (so a foreign `booking_id` is safely a no-op) but does nothing to validate a FK VALUE inside `updates` — a caller-supplied `team_member_id` belonging to another tenant was written into the tenant's own booking unchecked. |
| **Effect** | `query_bookings` and `get_schedule_summary` (same file, same tool dispatch) both embed `team_members!bookings_team_member_id_fkey(name)` off this exact column with no tenant filter on the embedded side, so a tenant-A user asking the widget to reassign a booking to a foreign `team_member_id`, then asking "who's on the schedule", gets tenant B's real employee name back in the very next tool response — same read-exfil shape as P1/P11/P25/P30. |
| **Verdict** | **FIXED** (found in a broad-hunt sweep of the AI tool-call surface, checking `ai/assistant/route.ts` for the same FK-injection shape as P25/P30 but on its `update_bookings` tool rather than a `create_booking` tool — this file was previously checked only for `create_booking` (it has none) and cleared without inspecting `update_bookings`'s `updates.team_member_id`, 2026-07-15, W2) |
| **Fix** | `update_bookings` now verifies a supplied `updates.team_member_id` is tenant-owned — `.eq('id', ...).eq('tenant_id', tenantId).maybeSingle()` against `team_members` — before the `bookings` update runs; a miss returns `{ error: 'team member not found' }` (matching this tool's existing JSON-string error convention) and the booking is left unchanged. Same pattern as P1/P25/P30. |
| **Regression lock** | `src/app/api/ai/assistant/route.witness.test.ts` (new file): BLOCKED — a foreign `team_member_id` in `updates` is rejected, the booking's `team_member_id` is left unchanged; CONTROL — own-tenant `team_member_id` reassignment still applies; CONTROL — updates with no `team_member_id` (e.g. a status change) still apply normally. Mutation-verified: reverting the fix reproduces RED (foreign id gets written), restoring gives GREEN. |
| **Verified** | `npx tsc --noEmit` clean. `npx vitest run src/app/api/ai/assistant/` — 1 file / 3 passed / 0 failed. |
| **Rank rationale** | Same exfil class and construction as P25/P30 (unverified FK argument on an AI tool-call's mutating field, not an HTTP body), on a third independent AI agent surface in this codebase (`ai/assistant` — the client-facing widget — vs. `admin/ai-chat`'s CRM copilot and Yinez/Selena's owner tools) — confirms every AI tool-call surface in this codebase needs this check audited per-tool, not just per-file. Checking the follow-up this raised (does `admin/ai-chat`'s own `update_bookings` share the exact same gap?) found YES — same file already touched for P30, same `updates.team_member_id` written unchecked. Fixed in the same pass rather than deferred; see the `admin/ai-chat` line item below. |
| **Sibling fix (same pass)** | `admin/ai-chat`'s `update_bookings` tool (`src/app/api/admin/ai-chat/route.ts`) had the identical gap — its `TOOL_PERMISSIONS`/RBAC gate (`bookings.edit`) constrains WHO can call it, not what FK VALUES the model can write. Fixed with the same tenant-ownership check on `updates.team_member_id`. Regression lock added to the existing `src/app/api/admin/ai-chat/route.witness.test.ts` (2 new tests: BLOCKED foreign `team_member_id`, CONTROL own-tenant reassignment), mutation-verified RED→GREEN. `npx vitest run src/app/api/admin/ai-chat/` — 3 files / 18 passed / 0 failed. |

### P33 — `webhooks/stripe` `checkout.session.completed` → cross-tenant payment-link hijack via `client_reference_id`  ⚠️ **REAL-MONEY HIJACK** — ✅ **FIXED**

| | |
|---|---|
| **Route / op** | `POST /api/webhooks/stripe` (Stripe-signature-verified) — the "static pay-link" (NYC Maid parity) branch of `checkout.session.completed`, `src/app/api/webhooks/stripe/route.ts` |
| **Table(s)** | `bookings` (payment_status/payout fields), `payments` (insert), `team_member_payouts` (insert + a real Stripe Connect transfer) |
| **Attack vector** | New class for this register — not FK-injection on a DB write, but an unverified caller-controlled value trusted to pick which TENANT a webhook event applies to. `tenants.payment_link` is a static, per-tenant Stripe Payment Link URL (configured once, sent to clients via the 15-min-alert and payment-followup-daily SMS as `${tenant.payment_link}?client_reference_id=${bookingId}`). Stripe's `client_reference_id` is a caller-editable URL query parameter — Stripe never validates or restricts it. The webhook resolved `tenantId` straight from `.eq('id', session.client_reference_id)`'s matched booking's `tenant_id`, with **zero check** that the Payment Link actually used for the checkout belongs to that tenant. |
| **Effect** | Anyone holding ANY tenant's static `payment_link` URL (a client who received the SMS, or anyone who obtains it) could pay through it with a **different tenant's** `bookingId` appended as `client_reference_id`. The webhook would mark that foreign booking `payment_status: 'paid'`, insert a `payments` row under the foreign tenant, and — if the foreign booking's cleaner has Stripe Connect configured — fire a **real Stripe transfer** paying that foreign tenant's cleaner out of the platform's shared Stripe balance, all triggered by a payment that had nothing to do with that tenant. Real-money cross-tenant impact, not just a data leak — same severity tier as P22 (Telnyx call hijack) but on the payments rail instead of voice. |
| **Verdict** | **FIXED** (was proven-LIVE with a harness witness; found in a broad-hunt sweep of `webhooks/*` — a fresh area, not previously in this register — 2026-07-15, W2) |
| **Fix** | Before trusting the `client_reference_id` → booking → tenant resolution, the route now retrieves the actual Payment Link Stripe says was used for the checkout (`stripe.paymentLinks.retrieve(session.payment_link)`) and requires its `.url` to match the referenced booking's own tenant's stored `payment_link`. A mismatch (or an unresolvable/missing `session.payment_link`) is treated the same as "no client_reference_id at all" — falls through to the existing NYC Maid email-match/admin-alert path instead of silently crediting a foreign tenant. The metadata-based path (dynamic per-booking Payment Links created via `createPaymentLink()`, which bake `metadata.booking_id`/`metadata.tenant_id` into the Payment Link object itself at creation — immutable, not caller-editable) is unaffected; this check only gates the caller-editable `client_reference_id` fallback. |
| **Regression lock** | `src/app/api/webhooks/stripe/route.payment-link-hijack.witness.test.ts` (LOCK ×2: a mismatched Payment Link and an unresolvable/missing one both leave the foreign booking untouched, no payment row, no payout; CONTROL: the tenant's own matching Payment Link still credits the booking normally) |
| **Verified** | `npx tsc --noEmit` clean. `npx vitest run src/app/api/webhooks/stripe/` — 5 files / 10 passed / 0 failed. Full `vitest run` — 307 files / 1328 passed / 37 skipped / 0 failed. Mutation-verified: reverted the fix, both new LOCK tests failed RED (payment inserted, booking marked paid); restored, GREEN. |
| **Rank rationale** | Real-money blast radius (a live Stripe Connect transfer can fire), reachable by anyone who has any tenant's semi-public static payment link — no admin session, no API key, nothing beyond a Stripe-hosted checkout page and basic URL editing. Ranked with P22/P27 (action-authorization-bypass class, not FK-injection) as the first finding in this register on the payments-webhook surface specifically. |

### P34 — `src/lib/selena/tools.ts` `update_booking`/`create_deal` tools → cross-tenant `cleaner_id`/`client_id` FK injection  ⚠️ **DATA EXFIL** — ✅ **FIXED**

| | |
|---|---|
| **Route / op** | Yinez/Selena owner AI tools `update_booking` and `create_deal` (`src/lib/selena/tools.ts`, `handleUpdateBooking`/`handleCreateDeal`) — the same file as P25, but two *different* tools than the three P25 fixed (`assign_cleaner_to_booking`, `create_manual_booking`, `block_cleaner_dates`) |
| **Table(s)** | `bookings.cleaner_id` (via `update_booking`'s `fields` allow-list), `deals.client_id` (via `create_deal` insert) — neither had an ownership check before this fix. |
| **Attack vector** | Same sibling-tool-missing-a-guard asymmetry as P9/P10/P21/P23/P30/P32: `handleAssignCleaner` (the dedicated `assign_cleaner_to_booking` tool, fixed under P25) verifies `cleaner_id` is tenant-owned before writing it, but `handleUpdateBooking` (the general-purpose `update_booking` tool) accepted `fields.cleaner_id` into its column allow-list and wrote it verbatim — the `.eq('tenant_id', tid)` on the update only scopes which booking ROW is touched, not the FK VALUE being written into it. Likewise `handleCreateManualBooking` (fixed under P25) verifies `client_id`, but the separate `create_deal` tool's `handleCreateDeal` inserted `client_id: input.client_id` unverified. |
| **Effect** | `handleListBookings` (`list_bookings` tool) embeds `cleaners(name, id)` off `bookings.cleaner_id` with no tenant filter on the embedded side, so a foreign `cleaner_id` set via `update_booking` surfaces another tenant's cleaner name on the very next `list_bookings` call. `handleListDeals` (`list_deals` tool) embeds `clients(name, phone)` off `deals.client_id` the same way, so a foreign `client_id` set via `create_deal` surfaces another tenant's client name/phone on the next `list_deals` call — same read-exfil shape as P25/P30/P32. |
| **Verdict** | **FIXED** (was proven-LIVE; found continuing the broad-hunt sweep of the AI tool-call surface — re-auditing `src/lib/selena/tools.ts` tool-by-tool past the three tools P25 already covered turned up two more with the identical gap, 2026-07-15, W2) |
| **Fix** | `handleUpdateBooking` now verifies a supplied `fields.cleaner_id` is tenant-owned (`cleaners` lookup `.eq('id',...).eq('tenant_id', tid)`) before the `bookings` update runs; a miss returns `{ error: 'cleaner not found' }` and the booking is left unchanged. `handleCreateDeal` now verifies `input.client_id` is tenant-owned (`clients` lookup) before the `deals` insert; a miss returns `{ error: 'client not found' }`, no row created. Same pattern as the already-fixed sibling tools in this file. |
| **Regression lock** | `src/lib/selena/tools.cleaner-fk.witness.test.ts` (extended: 4 new tests — LOCK foreign `cleaner_id` via `update_booking.fields` rejected/unchanged, CONTROL own-tenant `cleaner_id` applies, CONTROL a field-only update with no `cleaner_id` still applies; LOCK foreign `client_id` via `create_deal` rejected/no insert, CONTROL own-tenant `client_id` succeeds and is stamped) |
| **Verified** | `npx tsc --noEmit` clean. Full `vitest run` — 307 files / 1333 passed / 37 skipped / 0 failed. Mutation-verified: reverted both fixes, both new foreign-id LOCK tests failed RED (`cleaner not found`/`client not found` expected but got `undefined` — i.e. the write/insert succeeded); restored, GREEN. |
| **Rank rationale** | Same exfil class and construction as P25/P30/P32 (unverified FK argument on an AI tool-call's mutating field) — confirms that even within a single already-partially-audited file, each tool needs the ownership check verified individually; a fix to one tool (`assign_cleaner_to_booking`/`create_manual_booking`) does not imply a sibling tool touching the same column (`update_booking`) or same FK class (`create_deal`'s `client_id`) got the same guard. |

### P35 — `admin/payments/finalize-match` → cross-tenant `clientId` FK injection + naive internal-key compare — ✅ **FIXED**

| | |
|---|---|
| **Route / op** | `POST /api/admin/payments/finalize-match` (`src/app/api/admin/payments/finalize-match/route.ts`) — internal-key-gated endpoint called by an external Zelle/Venmo reconciliation tool |
| **Table** | `payments.client_id` — caller-supplied `clientId` was inserted verbatim by `processPayment()` (`src/lib/payment-processor.ts`); only `bookingId` was used to resolve/verify the tenant. |
| **Attack vector** | `POST { bookingId: <own booking>, clientId: <foreign tenant's client id>, ... }` with a valid (or, pre-fix, timing-guessed) `x-internal-key`. The route resolved `tenant_id` from `bookingId` alone and passed `clientId` straight through — same P1-pattern FK-injection shape as POST /api/invoices and POST /api/deals, just not yet audited on this route. |
| **Effect** | A foreign `client_id` gets attached to a `payments` row on this tenant's own booking — reference pollution on a financial record; also compounded by a second, independent bug: the `x-internal-key` gate used a naive `!==` compare (same timing-attack class as `CRON_SECRET`, fixed platform-wide in de510a4e) on `INTERNAL_API_KEY`/`ELCHAPO_MONITOR_KEY`. |
| **Verdict** | **FIXED** (found continuing the broad-hunt sweep into the `invoices`/`quotes`/`deals`/`jobs` financial surface, then following the `x-internal-key`/`ELCHAPO_MONITOR_KEY` naive-compare pattern to its remaining sites, 2026-07-15, W2) |
| **Fix** | `clientId` is now verified tenant-owned (`clients` lookup `.eq('id',...).eq('tenant_id', booking.tenant_id)`) before `processPayment()` runs; a miss 404s with no payment row created. The internal-key compare now uses the existing `safeEqual()` util (same fix applied to sibling `admin/selena/monitor` and `admin/selena/sms-status`, both gating `ELCHAPO_MONITOR_KEY` with a naive `===`). |
| **Regression lock** | `admin/payments/finalize-match/route.isolation.test.ts` — wrong-key 401 + no processPayment call, own-tenant clientId succeeds, WRONG-TENANT PROBE: foreign clientId 404s with no processPayment call. |
| **Verified** | `npx tsc --noEmit` clean. Full `vitest run` — 309 files / 1342 passed / 37 skipped / 0 failed. |
| **Rank rationale** | Lower blast radius than P33 (no direct money movement — `payments.client_id` is a display/attribution field, not itself authorization for a transfer) but same proven FK-injection construction as the rest of this register; bundled with the naive-compare fix since both were found auditing the same file in the same pass. |

### P38 — `bookings/batch` POST → cross-tenant `schedule_id` FK injection → `cron/generate-recurring` DoS  ⚠️ **CROSS-TENANT DoS** — ✅ **FIXED**

| | |
|---|---|
| **Route / op** | `POST /api/bookings/batch` (converted to `tenantDb`) |
| **Table** | `bookings.schedule_id` (FK → `recurring_schedules`, which carries its own `tenant_id`) |
| **Attack vector** | This route already verifies `client_id`/`team_member_id`/`service_type_id` ownership (P20's fix) — `schedule_id` (both the per-row override and the request-level default) was the one sibling FK left unchecked, inserted verbatim. A caller in tenant A can set `schedule_id` to tenant B's real `recurring_schedules.id`. |
| **Effect** | No read embed exposes this today (checked every route that reads `recurring_schedules`/`bookings.schedule_id` — all double-filter `tenant_id` AND `schedule_id`), so this isn't a read-exfil like P1/P11. But `GET`-less `cron/generate-recurring` (`src/app/api/cron/generate-recurring/route.ts`) determines whether a schedule has "already generated far enough" by reading the single latest `bookings.start_time` for that `schedule_id` **with no `tenant_id` filter** — a platform-wide cron intentionally scanning all tenants' schedules, but the per-schedule booking lookup wasn't scoped to the schedule's own tenant. A's poisoned booking with a far-future `start_time` sharing B's real `schedule_id` makes the cron believe B's schedule is generated 4+ weeks out forever, permanently starving B's recurring bookings — a cross-tenant denial-of-service via FK injection, not a data leak. (New bookings the cron creates are still correctly stamped `tenant_id: schedule.tenant_id`, so this isn't a cross-tenant write of the schedule's own bookings, only a poisoned read that gates whether generation runs at all.) |
| **Verdict** | **FIXED** (found in a broad-hunt sweep of `team-portal/*` looking for a fresh area per LEADER order, which surfaced no live issues; pivoted to the sibling `bookings/*` write surface and diffed `bookings/batch`'s FK-check list against `POST /api/bookings`'s, 2026-07-15, W2) |
| **Fix** | `schedule_id` (top-level default + per-row override, same shape as the existing three checks) is now verified tenant-owned (`recurring_schedules` `.eq('id',...).eq('tenant_id', tenantId)`) before insert; 400 on any miss. `cron/generate-recurring`'s "latest booking" lookup now also filters `.eq('tenant_id', schedule.tenant_id)` as the required close on the DoS vector itself — closing only the injection point without this would leave any already-planted poisoned row (or a not-yet-discovered second injection site) still able to starve generation. |
| **Regression lock** | `src/app/api/bookings/batch/route.isolation.test.ts` — 3 new tests: foreign per-row `schedule_id` and foreign top-level `schedule_id` both 400 with no insert; same-tenant `schedule_id` still succeeds. |
| **Verified** | `npx tsc --noEmit` clean; full `vitest run` 316 files / 1388 passed / 37 skipped / 0 failed |
| **Rank rationale** | First DoS-shaped finding in this register (P0 was destructive-but-direct, P33 was real-money, everything else was read-exfil or dangling-ref) — placed last since the blast radius (starved scheduling, recoverable by removing the poisoned row) is lower than any FIXED finding above it. |

### P39 — `cron/daily-summary` unscoped "latest booking for schedule_id" lookup — same class as P38  ⚠️ **CROSS-TENANT LOGIC LEAK** — ✅ **FIXED**

| | |
|---|---|
| **Route / op** | `GET /api/cron/daily-summary` (`src/app/api/cron/daily-summary/route.ts`, CRON_SECRET-gated) — the "recurring expiration, 30-day warning" section |
| **Table** | `bookings` read by `schedule_id` alone, same shape as the query P38 fixed in `cron/generate-recurring` |
| **Attack vector** | P38's writeup claimed "checked every route that reads `recurring_schedules`/`bookings.schedule_id` — all double-filter `tenant_id` AND `schedule_id`" — that check missed this sibling cron. `daily-summary` iterates every tenant, then for each of that tenant's `recurring_schedules` rows queries `bookings` filtered ONLY by `.eq('schedule_id', schedule.id)` (no `tenant_id`) to find "the latest booking," to decide whether to send a "your recurring service ends soon" warning. |
| **Effect** | With P38's `bookings/batch` fix now in place, this specific injection vector (a caller planting a foreign-tenant-referencing `schedule_id` on a new booking) is closed, so this isn't independently exploitable today — but it's the identical unscoped-lookup construction, is a live latent bug (any already-planted poisoned row, or a future second injection site, would still trigger it), and the fix is the same one-line pattern already established and accepted for the sibling cron. Impact if triggered: a foreign tenant's booking sharing this `schedule_id` gets read as "the latest booking" for a schedule it doesn't belong to, producing an expiration warning (or false-suppression of one) derived from another tenant's data instead of the schedule's own tenant. |
| **Verdict** | **FIXED** (found broad-hunting a fresh area per LEADER order — grepped every `.eq('schedule_id', …)` site across `src/app/api/cron/*` looking for the exact P38 construction repeated elsewhere; `daily-summary` was the one other unscoped hit, 2026-07-15, W2) |
| **Fix** | Added `.eq('tenant_id', tenantId)` to the `bookings` lookup, mirroring P38's `generate-recurring` fix exactly. |
| **Regression lock** | `src/app/api/cron/daily-summary/route.test.ts` — new wrong-tenant probe: a schedule with no booking under its own tenant but a same-`schedule_id` booking planted under a foreign tenant must NOT be treated as that schedule's latest booking (0 expiring warnings fired). Mutation-verified via `git stash` on just the route fix (RED — the probe fails, wrongly firing 1 warning — against the pre-fix query; GREEN after restore). |
| **Verified** | `npx tsc --noEmit` clean; full `vitest run` 316 files / 1389 passed / 37 skipped / 0 failed |
| **Rank rationale** | Same DoS/logic-leak family as P38, lower severity — the primary injection vector is already closed, so this is defense-in-depth against latent/future exposure rather than a currently-exploitable path. |

### P40 — `POST /api/sms` (new-conversation branch) → cross-tenant `client_id` FK injection  ⚠️ **DATA EXFIL** — ✅ **FIXED**

| | |
|---|---|
| **Route / op** | `POST /api/sms` (converted to `tenantDb`), new-conversation branch (no `conversation_id` supplied and no existing open conversation for the caller's tenant + `client_id`) |
| **Table** | `sms_conversations.client_id` (FK → `clients`, which carries its own `tenant_id`) |
| **Attack vector** | `client_id` is a caller-supplied body field. The route looked it up with `.eq('id', client_id).eq('tenant_id', tenantId)` to fetch a phone number for the new row, but never checked whether that lookup actually found a row — a foreign `client_id` just produced `client == null` (so `cleanPhone` fell back to `''`), and execution fell straight through to `db.from('sms_conversations').insert({ tenant_id: tenantId, client_id, phone: cleanPhone })`. `tenantDb.insert()` only stamps the row's own `tenant_id`; it does not validate FK columns, so the foreign `client_id` was written verbatim. |
| **Effect** | `GET /api/sms` (conversation list) does `db.from('sms_conversations').select('*, clients(name, phone)').eq('tenant_id', tenantId)` — a PostgREST embed that follows the FK regardless of the embedded row's own tenant. A conversation planted with a foreign `client_id` would resolve that embed to the OTHER tenant's client name + phone number, surfaced directly in the caller's own SMS conversation list on the very next fetch. Same exfil shape as P1/P11/P17/P20 (unvalidated FK + an unscoped read-side embed). |
| **Verdict** | **FIXED** (found in a controlled broad-hunt sweep of a fresh batch — `attribution`, `bookings`(+subroutes), `booking-notes`, `campaigns`, `catalog`, `crews`, `feedback`, `ingest`, `lead`, `lead-media`, `notifications`, `portal`(deferred, not yet swept), `projects`, `prospects`, `reviews`, `schedule`, `sidebar-counts`, `sms`, `team-members`, `tenant(s)`, `google`, `connect`, `cpa`, `selena`, `send-booking-emails`, `seo`, `push`, `yinez`, `docs`, `import-clients`, `migrate-cleaner-notifications`, `migrate-sms`, `test-emails` — 64 route files, per LEADER order "continue controlled broad-hunt, lower-risk surface," 2026-07-15, W2) |
| **Fix** | Added an explicit `if (!client) return 404` gate right after the ownership-scoped `clients` lookup, before the `sms_conversations` insert — same "miss must 404, not fall through" shape as every other FK guard in this file. |
| **Regression lock** | `src/app/api/sms/route.isolation.test.ts` — 2 new tests: positive control (tenant A starts a conversation with its own client, asserts the inserted row's `client_id`/`phone`), wrong-tenant probe (tenant A posts tenant B's `client_id`, asserts 404 `'Client not found'` and no `sms_conversations` row is created with that `client_id`). |
| **Verified** | `npx tsc --noEmit` clean; full `vitest run` 319 files / 1413 passed / 37 skipped / 0 failed |
| **Rank rationale** | Same read-exfil family as P1/P11/P17/P20 — placed last chronologically; severity is comparable to those (PII leak, not a live-action hijack or real-money path), gated behind an authenticated dashboard session (not a public/unauthenticated route) and requiring the attacker to already know or guess a foreign tenant's `client_id` UUID. |

Rest of this batch (63 files) came back clean — every other caller-supplied FK (`booking_id`, `channel_id`, `campaign_id`, `crew_id`/`team_member_id`, `service_type_id`, `reviewId`, `sessionId`/`conversationId`) was already ownership-verified before use, matching patterns already documented above. `portal/*` (13 files) was not reached this round — deferred to a future sweep.

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

**2026-07-15 (W2, post-P39 refill) — negative-result sweep, no fix needed:**
broad-hunted a batch of surfaces not previously touched by this register and
found every one already correctly tenant-scoped (no P-number assigned — recorded
here so a future pass doesn't re-spend time on the same files):
- `admin/impersonate` + `src/lib/impersonation.ts`/`tenant.ts` (super-admin
  impersonation cookie: HMAC-signed, `timingSafeEqual`-compared, correctly
  gated by `requireAdmin()`/Clerk super-admin id — impersonating ANY tenant is
  the intended platform-admin capability, not a leak).
- Resolver core (`src/lib/tenant.ts` `getTenantByDomain`, `src/lib/tenant-lookup.ts`,
  `src/middleware.ts`, `src/lib/tenant-header-sig.ts`) — re-verified the
  tenant_domains-first/tenants.domain-fallback contract and the
  TRANSITION ASSERT-AND-REFUSE divergence guard are intact and consistent
  between the middleware (edge) and server resolvers; HMAC header signing is
  constant-time; no forgery path found.
- Webhooks not yet in this register: `webhooks/clerk`, `webhooks/resend`,
  `webhooks/telegram` (Jeff's private owner bot, single hardcoded tenant +
  chat-id allowlist), `webhooks/telegram/jefe` (platform-level, no tenant
  concept) — all correctly Svix/secret-token verified, no caller-controlled
  tenant-selection surface.
- `invoices/public/[token]/checkout` → `webhooks/stripe`'s `invoiceId &&
  tenantId && !bookingId` branch — `invoice_id`/`tenant_id` Stripe metadata are
  both set server-side from the SAME tenant-scoped invoice row at session
  creation (self-consistent by construction), distinct from P33's caller-editable
  `client_reference_id` path.
- Signed-upload-URL routes (`lead-media/signed-url`, `apply/signed-url`,
  `management-applications/signed-url`) — tenant from host, path prefixed by
  `tenant.id`, write-only.
- Import staging (`src/lib/import-staging.ts`, `dashboard/import/*`) — batch
  ownership re-checked before every commit/undo call; `commitBatch`'s
  `{...mapped, tenant_id}` payload only ever contains ids resolved from
  tenant-scoped lookups at stage time, never a raw caller FK.
- Finance surfaces: `mark-paid`, `bank-import`, `receipts/attach`,
  `reconcile-candidates`, `year-end-zip` (incl. its caller-supplied
  `entityId` query param — always AND'd with `tenant_id`, so a foreign
  `entityId` just matches zero rows, not a leak), `entities/[id]`.
- `team-members/[id]/stripe-status`, `cleaners/[id]`, `cleaners/[id]/role` —
  correctly tenant-scoped; the unauthenticated `resolveTenantForTeamMember`
  fallback on `stripe-status` derives its tenant from the SAME team-member row
  it then scopes by, so it's self-consistent (matches the "freshly-created
  parent" safe-by-construction shape already noted in §2).
- `admin/comhub/templates/[id]`, `admin/comhub/messages/[id]/flag`,
  `campaigns/[id]` — DELETE/PATCH/PUT all tenant-scoped, no unchecked FK in
  any allow-list.
- Grepped the whole `src/app/api` tree for the P31 conditional-validation-gap
  shape (`if (someId && !otherField)`) — the only other hits
  (`bookings/[id]`, `quotes`, `deals`, `client/book`, `webhooks/telnyx-voice`)
  are unrelated `force`/`silent`/required-field branches, not an
  ownership-check skipped behind a condition.

No proven-LIVE finding this round. Recorded so the next broad-hunt pass
starts from a fresh area instead of re-covering this list.

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
   shape of P1-P21) → P23 clients PUT [id] preferred_team_member_id
   (✅ fixed, 2026-07-15, W2, found sweeping `clients/*` routes — same
   admin-twin-missing-a-client-portal-guard asymmetry as P9/P10/P21) → P24
   admin/comhub/threads/[id] PATCH assignee_id (✅ fixed, 2026-07-15, W2,
   found in a broad-hunt sweep of `admin/comhub/*` routes adjacent to the
   already-fixed P22 voice-hijack finding — same dangling-FK class as
   P7/P15/P19/P21/P23, closed as defense-in-depth with no live read-exfil
   found today) → P25 Yinez/Selena owner AI tools (assign_cleaner_to_booking /
   create_manual_booking / block_cleaner_dates) cross-tenant cleaner_id/
   client_id FK injection (✅ fixed, 2026-07-15, W2, found in a broad-hunt
   sweep of the AI-agent tool-call surface in `src/lib/selena/tools.ts` — a
   fresh area distinct from every prior HTTP-route sweep; live read-exfil via
   list_bookings' clients(name)/cleaners(name,id) embeds, same severity class
   as P1/P11) → P26 notifications POST (15min_warning) booking_id
   (✅ fixed, 2026-07-15, W2, found in a broad-hunt sweep of the
   `notifications` table's write sites — a fresh area — closed as
   defense-in-depth, same dangling-FK class as P7/P15/P19/P21/P23/P24, no
   live read-exfil found today) → P27 `/api/yinez` cross-tenant
   conversation hijack via `sessionId` (✅ fixed, 2026-07-15, W2, found in a
   broad-hunt sweep of the Yinez/Selena public chat surface — a fresh area —
   same action-authorization-bypass class as P22, on a fully public
   unauthenticated endpoint) → P28 `scoreConversation`/`selfReviewConversation`
   cross-tenant `conversation_id` read/write (✅ fixed, 2026-07-15, W2, same
   sweep — closes a zero-check FK gap on the AI conversation-scoring surface) →
   P29 `GET /api/selena` cross-tenant `convoId` message-transcript READ
   (✅ fixed, 2026-07-15, W2, found by comparing the already-guarded admin twin
   `/api/admin/selena` against this unguarded sibling — same admin-twin-missing-
   a-guard asymmetry as P9/P10/P21/P23, but on a table with no `tenant_id`
   column at all, same structural class as P0/P22/P27) → P30
   `admin/ai-chat` `create_booking` tool cross-tenant `client_id`/
   `team_member_id` FK injection (✅ fixed, 2026-07-15, W2, found in a
   broad-hunt sweep of the AI-copilot tool-call surface, a fresh area vs.
   P25's `src/lib/selena/tools.ts`; same P1/P25-pattern ownership guard) →
   P31 `admin/comhub/voice/dial` + `admin/comhub/send` cross-tenant
   `contact_id` FK injection (✅ fixed, 2026-07-15, W2, found sweeping every
   `admin/comhub/*` sibling of the already-fixed P22/P24 findings for the
   same shape — a *conditional*-validation gap, not a missing one: the
   ownership check existed but only ran when `phone`/`email`/`thread_id`
   were absent from the body, so supplying both skipped it entirely) →
   P32 `ai/assistant` (client-facing widget) + `admin/ai-chat` (CRM
   copilot) `update_bookings` tools, both cross-tenant `team_member_id`
   FK injection (✅ fixed, 2026-07-15, W2, found auditing `ai/assistant`'s
   `update_bookings` tool for the P25/P30 FK-injection shape on a mutating
   field rather than an insert; the sibling gap in `admin/ai-chat`'s own
   `update_bookings` was checked and fixed in the same pass rather than
   deferred — same file already touched for P30) → P33 `webhooks/stripe`
   `checkout.session.completed` cross-tenant payment-link hijack via
   `client_reference_id` (✅ fixed, 2026-07-15, W2, found in a broad-hunt
   sweep of `webhooks/*` — a fresh area — first finding in this register
   with a REAL-MONEY blast radius: a live Stripe Connect payout could be
   triggered against a foreign tenant's booking by anyone holding any
   tenant's semi-public static payment_link URL, no session or API key
   needed) → P34 `src/lib/selena/tools.ts` `update_booking`/`create_deal`
   tools cross-tenant `cleaner_id`/`client_id` FK injection (✅ fixed,
   2026-07-15, W2, found continuing the broad-hunt sweep of the AI
   tool-call surface — re-auditing the same file P25 already touched,
   tool-by-tool, past the three tools P25 covered, turned up two more
   with the identical unverified-FK gap on `list_bookings`/`list_deals`
   embeds) → P35 `admin/payments/finalize-match` cross-tenant `clientId`
   FK injection + naive `x-internal-key` compare (✅ fixed, 2026-07-15,
   W2, found sweeping the `invoices`/`quotes`/`deals`/`jobs` financial
   surface — a fresh area — then following the naive-secret-compare
   pattern to its two remaining sites, `admin/selena/monitor` and
   `admin/selena/sms-status`, both gating `ELCHAPO_MONITOR_KEY`) → P36
   `invoices` POST → cross-tenant `entity_id` FK injection, a gap in P2
   itself (✅ fixed, 2026-07-15, W2, found by diffing `invoices` POST's
   FK-check list against its finance-write siblings — `periods`,
   `expenses`, `bank-accounts`, `cpa-tokens` — all of which verify a
   caller-supplied `entity_id` belongs to the tenant before insert;
   `invoices` computed a tenant-scoped *default* entity but never checked
   an explicit `body.entity_id` override, so a foreign id could still be
   stamped onto the row). Added `entity_id` to the same tenant-ownership
   check loop already guarding `client_id`/`booking_id`/`quote_id` on this
   route.

   **P37 (2026-07-15, W2):** `PATCH /api/routes/[id]` cross-tenant
   `team_member_id` FK injection — same class as P1/P25/P30/P32/P34, and a
   direct sibling gap in POST /api/routes' own already-fixed FK check
   (`route.witness.test.ts` in the parent dir documents that fix). PATCH's
   `assignables` allow-list included `team_member_id` with zero
   tenant-ownership check, so an authenticated caller could re-point their
   own (correctly tenant-scoped) route at a foreign tenant's team member.
   Both `GET /api/routes` and `GET /api/routes/[id]` embed
   `team_members(id, name, phone, home_latitude, home_longitude)` unscoped
   by tenant off this column, so the foreign id would surface that
   employee's name/phone/home address on the next read — and
   `POST /api/routes/[id]/publish` would text that foreign employee a
   route summary via this tenant's own Telnyx account/number, a real
   cross-tenant contact/messaging abuse on top of the read leak. Found
   broad-hunting a fresh area (`routes/*`, `clients/*` sub-resources,
   `team-members/*`) — the exact same FK/embed shape POST already
   documented a fix for, just missed on the sibling PATCH handler. Fixed:
   `team_member_id`, when supplied and non-null, is now verified
   tenant-owned before the update; a miss 404s before any row is written.
   Witness added at `src/app/api/routes/[id]/route.witness.test.ts`
   (2 LOCKED + 2 CONTROL), mutation-verified via git stash (RED 200 against
   pre-fix code, GREEN 404 after restore).

   **P38 (2026-07-15, W2):** `POST /api/bookings/batch` cross-tenant
   `schedule_id` FK injection, the one FK sibling `client_id`/`team_member_id`/
   `service_type_id` (P20) left unchecked on this route — inserted verbatim,
   both the per-row override and the request-level default. No read embed
   exposes it today, but `cron/generate-recurring`'s unscoped "latest booking
   for this schedule_id" lookup meant a poisoned row with a far-future
   `start_time` sharing a victim tenant's real `schedule_id` would permanently
   starve that tenant's recurring-booking auto-generation — a cross-tenant DoS
   via FK injection, not a read leak, the first DoS-shaped finding in this
   register. Found broad-hunting `team-portal/*` per LEADER order (turned up
   clean — every write there is properly `auth.id`/`auth.tid`-scoped or
   ownership-checked), then pivoting to `bookings/*` siblings and diffing
   `bookings/batch`'s FK-check list against `POST /api/bookings`'s. Fixed:
   `schedule_id` added to the same tenant-ownership check loop as the other
   three FKs (400 on a foreign id, no insert); `cron/generate-recurring`'s
   lookup now also filters `.eq('tenant_id', schedule.tenant_id)`, closing the
   DoS vector itself in case of an already-planted poisoned row or any
   not-yet-found second injection site. Witness added at
   `src/app/api/bookings/batch/route.isolation.test.ts` (2 new rejection
   tests — per-row and top-level `schedule_id` — + 1 CONTROL).
   `npx tsc --noEmit` clean; full `vitest run` 316 files / 1388 passed /
   37 skipped / 0 failed.

   **P39 (2026-07-15, W2):** Same unscoped "latest booking for schedule_id"
   construction as P38, found in the sibling cron `daily-summary` — P38's own
   writeup claimed every such read was checked, but this one was missed.
   Found by grepping `.eq('schedule_id', …)` across `src/app/api/cron/*` for
   the exact P38 shape rather than trusting that prior claim. The primary
   injection vector (bookings/batch) is already closed by P38, so this isn't
   independently exploitable today, but it's the same latent construction and
   worth closing as defense-in-depth. Fixed with the identical one-line
   `.eq('tenant_id', tenantId)` addition. Witness: new wrong-tenant probe in
   `src/app/api/cron/daily-summary/route.test.ts`, mutation-verified via git
   stash (RED — false expiring warning fires off foreign-tenant data — against
   pre-fix code, GREEN after restore). `npx tsc --noEmit` clean; full
   `vitest run` 316 files / 1389 passed / 37 skipped / 0 failed.

   **P40 (2026-07-15, W2):** `undoBatch()` in `src/lib/import-staging.ts`
   (the CSV client/schedule-import commit/undo engine behind
   `POST /api/dashboard/import/batch/[id]`) deleted each committed row by
   `.eq('id', r.target_id)` alone — zero `tenant_id` filter on the delete
   itself. Found broad-hunting a fresh area (`dashboard/import/*`,
   `dashboard/hr/*`, `documents/*`, `jobs/*` — all otherwise clean and
   already hardened from prior sessions) and reading past the API-layer
   `ownsBatch()` gate into the library engine it delegates to. Not
   independently exploitable today: the API route pre-verifies the batch
   belongs to the caller's tenant before calling `undoBatch`, and
   `target_id`/`target_table` on `import_rows` are set exclusively by
   `commitBatch`'s own tenant-stamped insert — no request path lets a caller
   influence either value directly. Same "worth closing as defense-in-depth"
   class as P38/P39: every other delete/update in this codebase scopes by
   `tenant_id` even when a call-site guard already exists (that's
   `tenantDb`'s whole premise, per its own header comment), and this was the
   one exception. Fixed: delete now also filters
   `.eq('tenant_id', batch.tenant_id)`. Witness added at
   `src/lib/import-staging.test.ts` (new file — no prior test coverage
   existed for this engine) with a wrong-tenant probe: an `import_rows`
   pointer targeting a row owned by a different tenant than the batch now
   survives undo untouched. Mutation-verified via cp-based backup/restore
   (RED — victim row deleted — against pre-fix code, GREEN after restore).
   `npx tsc --noEmit` clean; full `vitest run` 317 files / 1391 passed / 37
   skipped / 0 failed.

   **P41 (2026-07-15, W2, cross-branch port, SSRF not FK-injection):**
   `lib/tenant-health.ts`, `lib/site-readiness.ts`, `lib/site-export.ts`,
   `lib/seo/{enrich,remediate,technical}.ts`, and `lib/onboarding-verify.ts`
   all fetch a URL built from a tenant-controlled or admin-editable field
   (`tenant_domains.domain`, a GSC/SEO property URL, a tenant's `domain`
   settings field) with **zero SSRF guard** — a malicious/compromised tenant
   or admin session could point the platform's own cron/admin server at
   `127.0.0.1`, `169.254.169.254` (cloud metadata), or an RFC1918 host.
   Sibling branches p1-w1/p1-w4 already found, fixed, and regression-locked
   this exact class (`lib/ssrf.ts` + `lib/ssrf.test.ts`, commits `871b38c1`
   on p1-w1, ported to p1-w4 as `cc99d354` + `1041187f`) but the fix was
   **never ported to p1-w2** — confirmed via `git show <hash>` against this
   worktree's shared object store (all worktrees share one `.git`, so the
   commits were inspectable without leaving this worktree) and by grepping
   this branch's `src/lib` for `safeFetch`/`ssrf`, both absent. Ported
   verbatim: `lib/ssrf.ts` (`assertPublicUrl`/`safeFetch`, blocks loopback/
   RFC1918/CGNAT/link-local/ULA/metadata/mapped IPs, v4+v6, re-validates every
   redirect hop) + `lib/ssrf.test.ts` (10 cases). Applied `safeFetch`/
   `assertPublicUrl` to all 7 call sites per the original commits' exact
   scope. Also found one call site the original port didn't cover because it
   didn't exist yet on p1-w1/p1-w4: the new (untracked, in-flight SEOMGR
   rebuild) `lib/seo/health.ts` fleet-health fetcher has the identical
   `https://www.${tenant_domains.domain}/` pattern — applied the same
   `safeFetch` guard there too, so the newly-landing subsystem doesn't
   reintroduce the class this same session already closed elsewhere.
   `npx tsc --noEmit` clean. `ssrf.test.ts` 10/10 pass. Full `vitest run`
   317/318 files, 1400/1400 passed + 37 skipped, 1 pre-existing unrelated
   flaky timeout (`finance-export.test.ts`, confirmed passes in isolation,
   flagged repeatedly by other workers all session, unchanged baseline). No
   dedicated per-call-site test added, matching this exact class's estab-
   lished project precedent (`1041187f`: relies on the shared `ssrf.test.ts`
   suite + `tsc`, not a per-file regression test). File-only, no push/
   deploy/DB. Did not touch referrers/referral-commissions/team-PIN routes.

   All items in this register are closed.

   **Post-P41 broad-hunt sweep (2026-07-15, W2, no new proven-LIVE leak found):**
   Continuing the broad-hunt per LEADER order (fresh area, file-only, excluding
   referrers/referral-commissions/team-PIN routes and `GET /api/team`,
   `GET /api/team/[id]`, `GET /api/dashboard`). Manually audited every
   caller-supplied `*_id` write site (insert/update/PATCH allow-lists) in a set
   of areas not previously touched by this register, applying the same
   FK-ownership-check test used for P1-P39: **all found already safe** —
   either the FK is verified tenant-owned before use, the value is
   internally-derived (never caller-supplied), or `tenantDb`'s auto-scoping
   makes a foreign id resolve to nothing. No fix needed in any of them.
   Recorded here (per this register's own §4 "scanned & cleared" precedent)
   so a future sweep doesn't re-spend time on the same files:
   - `POST/GET /api/documents`, `[id]/signers`, `[id]/signers/[signerId]`,
     `public/[token]/sign` — signer/field writes scoped by `document_id` +
     `signer_id`/token match; no foreign-tenant FK path.
   - `POST/PUT /api/campaigns/send` — `client_ids` filtered through a
     tenant-scoped `clients` query before use, foreign ids silently excluded.
   - `POST/PATCH /api/deals`, `/api/deals/[id]`, `/api/deals/manual`,
     `/api/deals/[id]/stage`, `/api/deals/[id]/activities` — `client_id`
     already ownership-checked (pre-existing fix); `deals.owner_id` is a bare
     UUID column with no `REFERENCES` clause and no read/embed anywhere in
     the app (grepped) — dead column, not a leak surface.
   - `POST /api/jobs/[id]/sessions` — `crew_id`/`team_member_id` resolved via
     `tenantDb`, so a foreign id matches zero rows (safe-by-construction,
     same shape as register item B2).
   - `POST /api/recurring-expenses`, `PATCH /api/recurring-expenses/[id]` —
     `entity_id` (a real FK, migration 034) is not in either route's
     allow-list at all — never caller-settable, so not exploitable.
   - `POST /api/quote-templates`, `POST /api/settings/services` — no FK
     columns, scalars only.
   - `POST /api/leads/override`, `/api/leads/block`, `/api/leads/verify`,
     `GET /api/leads/feed`, `/api/leads/attribution`, `/api/leads/domains` —
     all tenant-scoped reads/updates, no caller-supplied cross-tenant FK.
   - `POST /api/finance/bank-transactions/[id]/match` — every lookup
     (invoice/booking/expense/chart_of_accounts) is `.eq('tenant_id', tenantId)`
     scoped before its id is used downstream.
   - `POST /api/finance/bank-connect/session` — no caller-supplied FK; tenant's
     own Stripe key/customer only.
   - `POST /api/admin/payments/confirm-match` — sibling of the already-fixed
     P35 `finalize-match`, but this one already scopes both `unmatchedPaymentId`
     and `bookingId` by `tenant_id` before use.
   - `GET /api/team-portal/crew/members`, `/schedule`, `/earnings` — read-only,
     scoped via `scopedMemberIds(auth)` + `tenant_id`.
   - `src/lib/jefe/agent.ts` (the platform-GM AI tool-call surface, a fresh
     file vs. the tenant-facing `selena/tools.ts`/`ai-chat`/`ai/assistant`
     already covered under P25/P30/P32/P34) — by design operates across ALL
     tenants (it's Jeff's platform-wide GM, not a tenant agent); gated by
     Telegram secret-token + a hardcoded owner chat-id allowlist in
     `webhooks/telegram/jefe/route.ts`, so "cross-tenant" isn't a violation
     here, it's the intended scope. Confirmed the gate is real, not a leak.
   - `GET/POST /api/google/callback` — tenant resolved from a signed/verified
     OAuth `state` param (CSRF-protected), not caller-supplied.
   No code changed this pass (nothing to fix); `npx tsc --noEmit` not run
   since no `.ts` edits were made. File-only.

   **P42 (2026-07-15, W2):** `POST /api/bookings` — the very route P1/P20
   already hardened for `client_id`/`team_member_id`/`service_type_id` — had
   one sibling FK column left unchecked: `property_id`. It was accepted from
   the body (UUID-format-validated only), passed straight through as
   `p_property_id` to the `create_admin_booking_atomic` RPC, and neither the
   app layer nor the RPC itself (`migrations/2026_07_13_admin_booking_atomic.sql`)
   ever verified it belonged to the acting tenant or the target client.
   `GET /api/bookings` embeds `client_properties(*)` unscoped by tenant off
   this exact column (`route.ts:40`), so a foreign `property_id` leaks
   another tenant's client address/lat-long on the very next booking list
   read — same exfil shape as P1/P11/P17. Found continuing the broad-hunt
   into a fresh area (`client/*` portal routes — `recurring`, `properties`,
   `book`, `reschedule/[id]` — all already correctly guard their own
   `property_id`/`client_properties` access); tracing `client-properties.ts`'s
   `getBookingAddress()` helper (which itself has the identical unscoped
   `.eq('id', propertyId)` lookup, but its one live caller,
   `cron/generate-recurring`, only ever passes an already-tenant-verified
   `schedule.property_id`) led to diffing every `recurring_schedules`/
   `bookings` writer's FK-check list against the sibling
   `admin/recurring-schedules` route, which already carries this exact
   `property_id` ownership check (`client_properties` scoped by `client_id`)
   with a comment noting the identical embed-leak rationale — `POST /api/bookings`
   was the one write site missing it. Fixed: `property_id`, when supplied, is
   now verified tenant-owned AND owned by the request's own `client_id`
   (`client_properties` `.eq('id',...).eq('client_id',...).eq('tenant_id', tenantId)`)
   before the RPC runs; a miss 404s, no booking inserted. Regression lock:
   `src/app/api/bookings/route.witness.test.ts` — 4 new tests (LOCKED:
   foreign-tenant property_id, nonexistent property_id, same-tenant-but-
   different-client property_id, each 404 with no insert; CONTROL: the
   client's own property_id still creates the booking with that id stamped).
   Mutation-verified via cp-based backup/restore: reverted the fix, all 3
   applicable LOCK tests failed RED (200/201 instead of 404, property
   attached); restored, GREEN. `npx tsc --noEmit` clean; full `vitest run`
   318 files / 1405 passed / 37 skipped / 0 failed. File-only, no push/
   deploy/DB. Did not touch referrers/referral-commissions/team-PIN routes
   or `GET /api/team`, `GET /api/team/[id]`, `GET /api/dashboard`.

   **P43 (2026-07-15, W2):** `update_bookings`/`update_client` in
   `src/app/api/ai/assistant/route.ts` (the client-widget AI tool-call
   dispatch, distinct from `src/lib/selena/tools.ts` and `admin/ai-chat`)
   spread a model-supplied `updates` object verbatim into `.update()` with
   no column allow-list — the exact P7/P8 mass-assignment shape, just never
   applied to this AI tool-call surface. `update_bookings` already had a
   `team_member_id` ownership check (an earlier P1/P11/P25/P30-class fix,
   already regression-locked), but nothing stopped `updates.tenant_id` from
   donating the booking to another tenant, since the `.eq('tenant_id', …)`
   WHERE clause only scopes which ROW is written, not which COLUMNS the
   model-supplied object can set. `update_client` had zero guard of any kind
   on its `updates` object. Found continuing the broad-hunt into a fresh
   area (the `ai/assistant` route had never been swept for the mass-
   assignment class, only the FK-ownership class) and cross-checking against
   `src/lib/selena/tools.ts`'s `handleUpdateBooking`, which already
   allow-lists mutable fields with a comment explaining exactly this risk.
   Fixed: both tools now allow-list mutable columns matching their own
   documented tool schema (`update_bookings`: `team_member_id`, `status`,
   `price`, `notes`, `start_time`, `end_time`, `payment_status`;
   `update_client`: `name`, `email`, `phone`, `address`, `notes`, `active`)
   before the update runs; the existing `team_member_id` ownership check now
   runs against the allow-listed value. Regression lock: added 3 tests to
   the existing `src/app/api/ai/assistant/route.witness.test.ts` (2 LOCKED —
   a `tenant_id` key in `updates` never overwrites the row's own tenant_id
   on either tool, allowed fields still apply; 1 CONTROL — an undocumented
   column in `update_client`'s `updates` is silently dropped, documented
   fields still apply). Mutation-verified via cp-based backup/restore:
   reverted the fix, all 3 new tests failed RED (`tenant_id` donated to
   tenant B, undocumented column written); restored, GREEN. `npx tsc
   --noEmit` clean; full `vitest run` 319 files / 1411 passed / 37 skipped /
   0 failed. Commit `7efca465`. File-only, no push/deploy/DB. Did not touch
   referrers/referral-commissions routes.

   **2026-07-15 (W2, post-P43 refill) — negative-result sweep, no fix needed:**
   broad-hunted a fresh batch of lower-risk surfaces per leader's "resume
   controlled broad-hunt, lower-risk surface" order and found every one already
   correctly tenant-scoped (no P-number assigned — recorded here so a future
   pass doesn't re-spend time on the same files):
   - `client/[id]/contacts` (GET/POST) + `client/[id]/contacts/[contactId]`
     (PUT/DELETE) — client ownership verified before insert; PUT uses an
     explicit `ALLOWED` field allow-list (not a P7-shape raw-body spread);
     every write scoped `.eq('tenant_id',...).eq('client_id',...)`.
   - `client/[id]/gdpr-delete`, `client/[id]/activity`, `client/[id]/transcript`
     — all reads/writes scoped by `tenant_id` (activity's `bookings`/
     `notifications` embeds, transcript's `client_sms_messages`/
     `sms_conversations` fallback, all `.eq('tenant_id', tenantId)`).
   - `dashboard/hr/[id]` (GET/PATCH), `.../notes`, `.../documents` (POST/PATCH)
     — every route re-verifies the `team_member_id` belongs to the tenant
     before any child read/write; `hr_documents` PATCH scopes its update by
     `id` + `tenant_id` + `team_member_id` together (a forged `document_id`
     alone can't touch another tenant's row).
   - `finance/entities` (GET/POST), `.../[id]` (PATCH/DELETE), `finance/expenses`
     (GET/POST), `.../[id]` (PUT/DELETE), `finance/periods` (GET/POST),
     `.../[id]` (PATCH), `finance/receipts/attach` — every caller-supplied
     `entity_id`/`coa_id` already carries an explicit "verify it belongs to
     this tenant" ownership check with the same P4–P7-derived comment pattern;
     this class was already closed by the earlier finance sweep (see the
     P4–P7 section below) and remains closed here.
   - `documents/[id]/fields` (POST/PUT), `.../duplicate`, `.../send`, `.../void`
     — `signer_id` (a caller-supplied FK into `document_signers`, which has no
     cross-document constraint of its own) is explicitly re-verified against
     `document_id` + `tenant_id` before any field is persisted, with a comment
     calling out the exact exfil risk; `duplicate`'s child reads/writes are
     scoped by an already-tenant-verified parent `document_id`, so no
     additional tenant filter is needed on those specific queries.
   - `team-applications/bulk-approve`, `cleaners/[id]/role` — bulk update and
     role-set are both `.eq('tenant_id',...)` scoped; `bulk-approve` only
     touches its own tenant's pending rows.
   - `dashboard/import/batch/[id]` — `ownsBatch()` helper re-verifies the batch
     belongs to the tenant (via `tenantDb`) before GET/POST act on it.
   - `invoices/[id]/record-payment` — invoice fetched `.eq('tenant_id',...)`
     first; `client_id`/`booking_id` on the inserted payment are copied from
     that already-verified invoice, not caller-supplied.
   - `quotes/[id]/convert`, `quotes/[id]/convert-to-job` — both resolve the
     quote via `tenantDb`/`getTenantForRequest`, so the id is tenant-bound
     before any booking/job/client is created from it.
   - `team-portal/jobs/reassign` — `to_member_id` checked against
     `scopedMemberIds(auth)` (the actor's own crew) AND `.eq('tenant_id',...)`
     before the booking's `team_member_id` is updated.
   - `settings/permissions`, `settings/portal-permissions`, `settings/team` —
     all owner/admin-gated, validate every role/permission key against a
     hard-coded catalog, and write to the requesting tenant's own `tenants`
     row only.
   - `social/connect/facebook/callback`, `social/connect/instagram/callback` —
     `tenantId` comes from `verifyOAuthState(state)` (a signed, CSRF-protected
     value minted only by this tenant's own `/connect/*` init), not a raw
     query param.
   - `webhooks/clerk` — Svix-signature verified; `tenant_members` writes are
     keyed by `clerk_user_id` (1:1 with the webhook's own verified subject),
     with no tenant to scope by until that lookup resolves it, matching the
     documented `tenant-scope-ok: N/A` exception class already used elsewhere
     in this file.
   No code changed this pass (nothing to fix); `npx tsc --noEmit` not run
   since no `.ts` edits were made. File-only, no push/deploy/DB.

   **2026-07-15 (W2, 14:57 refill) — negative-result sweep, no fix needed:**
   continued the leader's "controlled broad-hunt, lower-risk surface" order into
   a fresh batch of ~40 route files across ~30 directories not previously
   touched by this register — every one already correctly tenant-scoped (no
   P-number assigned — recorded here so a future pass doesn't re-spend time on
   the same files):
   - `quote-templates`, `recurring-expenses` (+`[id]`), `service-area`,
     `service-types`, `pipeline` — all reads/writes `.eq('tenant_id',...)` or
     `tenantDb`-scoped; `service-area`'s PUT is `settings.edit`-gated and only
     ever touches the acting tenant's own `tenants` row.
   - `territories/options`, `service-types` GET — intentionally public,
     status-only, no tenant PII (by design, matches the `availability`/
     `client/smart-schedule` public-read pattern already in this register).
   - `permissions/me`, `pin-reset`, `team-availability`, `user/preferences`,
     `setup-checklist` — every DB call keyed off a server-resolved
     `tenantId`/`memberId` (never a caller-supplied id); `pin-reset`'s
     `member_id`/`tenant_id` combo comes from `findMember()` which is itself
     `tenantId`-scoped, and PIN-clash/verify checks are all
     `.eq('tenant_id',...)`.
   - `sales-applications`, `cleaner-applications` (nycmaid alias →
     `team-applications`), `management-applications` (+`draft`,
     `signed-url`, `upload`), `apply`, `apply-ceo` — public POSTs resolve
     tenant from the host header (`getTenantFromHeaders`), admin GET/PUT are
     `requirePermission`-gated and `.eq('tenant_id',...)`; the only
     caller-supplied fields (`resume_url`/`photo_url`/`video_url`) are opaque
     strings, not FK ids into another tenant-scoped table, so there's no
     FK-injection surface here (different shape from the P1/P11/P13 class).
   - `client-analytics`, `changelog` (+`[id]`), `domain-notes`, `errors`,
     `security/events`, `audit`, `availability` — all reads scoped by
     `tenant_id`/`tenantDb`; `changelog` and `errors` are intentionally
     platform-wide (`platform_announcements`, unauthenticated error intake)
     and only trust a caller-attributed `tenantId` when the signed
     `x-tenant-id`/`x-tenant-sig` header pair verifies.
   - `track`, `waitlist`, `contact`, `inquiry`, `requests` — public lead-
     capture forms; `track`/`inquiry`/`requests` intentionally accept a
     caller-declared `tenant_id` on insert-only tracking/marketing rows
     (nullable, `tenant-scope-ok` exception class already used elsewhere in
     this file — there is no read-back that could exfil another tenant's
     data through them), `contact`/`waitlist` resolve tenant from the host
     header and every downstream `clients`/`deals`/`portal_leads` write is
     `.eq('tenant_id', tenant.id)`.
   - `unsubscribe` — requires a signed token (`verifyUnsubscribeToken`); the
     `clientId`/`tenantId` used in the update come from the token payload,
     never the request body/query directly.
   - `uploads`, `public-upload`, `management-applications/signed-url`,
     `management-applications/upload` — storage keys are prefixed with a
     server-resolved `tenant.id`/`tenant.tenantId` (not caller-controlled;
     folder/extension inputs are charset-stripped so a `../<other-tenant>`
     segment can't escape the prefix, matching the fix already documented in
     `uploads`' own inline comment).
   - `leads` (root POST), `leads/attribution`, `leads/block`, `leads/domains`,
     `leads/override`, `leads/verify`, `leads/feed`, `leads/visits` — every
     admin route is `tenantId`/`tenantDb`-scoped or `requirePermission`-gated
     with a `.eq('tenant_id',...)` update; `leads/override` and
     `leads/verify` both re-verify row ownership via the `tenant_id` filter
     before mutating (already-blocked shape, not exploitable); the public
     POST `leads/visits` tracking-pixel insert is the same
     caller-declared-`tenant_id`, insert-only, no-read-back exception as
     `track`/`inquiry` above.
   - `indexnow`, `tenant-sitemap`, `internal/deploy-hook` — `indexnow`'s
     cron-style auth path intentionally accepts an arbitrary `tenantId` in
     the body (CRON_SECRET bearer = trusted internal caller acting on behalf
     of any tenant, not a leak); `tenant-sitemap` is an intentionally public,
     unauthenticated sitemap endpoint (services/areas only, no PII);
     `internal/deploy-hook` is Vercel-HMAC-signed with no tenant concept at
     all.
   No code changed this pass (nothing to fix); `npx tsc --noEmit` not run
   since no `.ts` edits were made. File-only, no push/deploy/DB.

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

**2026-07-15 (W2, 15:45 refill) — negative-result sweep, no fix needed:**
continued the leader's "controlled broad-hunt, lower-risk surface" order. Two
angles this round: (1) closed out every remaining route with no detectable
auth/tenant guard keyword (a full-repo scan of all 502 `route.ts` files for
`tenant_id`/`tenantDb`/`getTenantForRequest`/`requireAdmin`/etc., 16 files
matched none of them); (2) swept the brand-new, never-touched SEOMGR subsystem
(`api/cron/seo-*` × 11 routes, `api/admin/seo` + `api/admin/seo/apply`,
`lib/seo/*` × 30 files) added this session and not yet covered anywhere in
this register.
- The 16 no-keyword-match routes were all false positives from the keyword
  scan or genuinely no-tenant-concept by design: `admin-auth/logout`,
  `auth/logout` (cookie-clear only), `auth/me` (delegates to `getAdminUser()`
  session check), `cleaner-applications` (thin alias forwarding to the
  already tenant-aware `team-applications` handlers), `cron/refresh-job-postings`
  (`protectCronAPI`-gated, no data returned), `inquiry`/`leads`/`prospects`
  (public, platform-level pre-tenant lead capture — insert-only into tables
  with no `tenant_id` column, no read-back, same exception class as
  `track`/`waitlist`/`contact` already in this register), `seo/verify-file/[file]`
  (already reviewed — echoes back only a token it can already prove was
  minted for that exact property), `team-applications/upload` (anonymous
  applicant photo upload, random-id storage key, no enumeration path),
  `team-portal/config` + `team-portal/guidelines` (both correctly gated via
  `verifyToken(token)` → `auth.tid`; missed by the keyword scan because it
  didn't include `verifyToken`), `tenants/public` (intentional public
  branding-only lookup: name/slug/logo_url), `territories/options` (already
  documented public/no-PII), `webhooks/stripe-platform` (Stripe-signature
  verified, platform-level tenant *creation* webhook, no tenant to scope by
  yet).
- `team-portal/update-phone` (GET/POST) verifies a signed
  `verifyPhoneFixupToken` (HMAC over `team_member_id`+expiry, `ADMIN_PASSWORD`-
  keyed, `timingSafeEqual`-compared) and looks up `team_members.id` — no
  additional `tenant_id` check, but the id alone already uniquely identifies
  the row and the token can't be forged for another id without the signing
  secret, same accepted shape as the `unsubscribe` signed-token route already
  in this register. **Not a leak, but flagging a separate functional bug for
  whoever owns this flow (not fixed — out of the leak-hunt's scope, no
  cross-tenant exposure results from it):** the minting cron
  (`api/cron/phone-fixup`) signs tokens from the legacy `cleaners` table's
  `id` (`signToken(c.id)`, `cleaners` being the nycmaid-era per-tenant-clone
  schema — `wash-and-fold-nyc`/`wash-and-fold-hoboken`/`nyc-mobile-salon`),
  while the verify side looks the id up in `team_members` (the modern,
  global-schema table) — two disjoint id spaces. Any cleaner on the legacy
  `cleaners` schema who receives this self-service email link will get a
  `team_members` `not_found` 404 and can never actually fix their phone
  number through it. Fails closed (404, no data exposure), so out of scope
  for this leak register, but likely a silently-broken feature since
  whichever cron ships it.
- SEOMGR (`api/cron/seo-health`, `seo-improve`, `seo-enrich`, `seo-competitors`,
  `seo-technical`, `seo-propose`, `seo-autopilot`, `seo-ingest`, `seo-detect`,
  `seo-verify-revert`, `seo-autoverify` — 11 cron routes total) are all
  consistently gated by `CRON_SECRET` + `safeEqual` (constant-time compare).
  `api/admin/seo` (GET) and `api/admin/seo/apply` (POST) are gated by
  `requireAdmin()` (verified against `verifyAdminToken`/`admin_token` cookie —
  the platform-superadmin auth used by `src/app/admin/*`, distinct from any
  tenant-level session; confirmed via `src/lib/require-admin.ts`), with
  `apply` additionally accepting the same `CRON_SECRET` bearer for its
  system-triggered remediation path. Every `seo_*` table read/write in these
  routes and in `lib/seo/*` is keyed by `property`/`target_url` (a domain),
  not `tenant_id` — by design, per the same "seomgr FL-admin engine, keyed by
  property/domain not tenant" exception already documented at
  `api/seo/verify-file/[file]/route.ts`. This is Jeff's own platform-wide SEO
  ops tool (not a tenant-facing feature — no tenant/tenant-admin can reach
  it), so the cross-tenant-leak bug class doesn't apply here the way it does
  to `dashboard`/`api/portal`/`api/team-portal` routes; did not do a
  line-by-line audit of all 30 `lib/seo/*` files' internal logic (out of
  scope for a tenant-isolation sweep — no tenant-scoped data flows through
  this subsystem to leak).
No code changed this pass (nothing to fix); `npx tsc --noEmit` not run since
no `.ts` edits were made. File-only, no push/deploy/DB.

**2026-07-15 (W2, 16:13 refill) — negative-result sweep, no fix needed:**
continued the leader's "controlled broad-hunt, lower-risk surface" order into
a fresh batch of admin-facing routes not previously touched by this register
— every one already correctly tenant-scoped (no P-number assigned — recorded
here so a future pass doesn't re-spend time on the same files):
- `admin/cleanup-test-bookings`, `admin/cleanup-phones` — both
  `requirePermission('settings.edit')`-gated, every read/delete/update
  `.eq('tenant_id', tenantId)`; the purge route's cascading deletes all key
  off ids collected from that same tenant-scoped `clients`/`bookings`/
  `sms_conversations` query, never a caller-supplied id.
- `admin/campaigns/generate`, `admin/campaigns/preview` — tenant resolved via
  `getTenantForRequest()`; no caller-supplied FK, all client/booking reads
  `.eq('tenant_id', tenantId)`.
- `admin/find-cleaner/preview`, `admin/find-cleaner/recent` — `preview`'s
  `team_members`/`bookings` reads are tenant-scoped, no caller-supplied id;
  `recent`'s `cleaner_broadcast_recipients` lookup is keyed by `broadcast_id`s
  collected from that same tenant's own `tenantDb`-scoped `cleaner_broadcasts`
  query, so a foreign broadcast id is never in the `.in()` list to begin with
  (freshly-derived-from-tenant-scoped-parent, same safe-by-construction shape
  as B2/B4).
- `admin/comhub/contacts/[id]/notes` (PATCH), `admin/comhub/contacts/[id]/context`
  (GET) — both `requireAdmin()` (Jeff-only super_admin token, confirmed via
  `verifyAdminToken`'s `role === 'super_admin'` check in `admin-auth/route.ts`
  — cross-tenant by design, same exception class as `admin/impersonate`) +
  `tenantDb(tenantId)`; `notes`'s `clients` update targets `contact.client_id`,
  itself only ever resolved from the tenant-scoped `comhub_contacts` row;
  `context`'s phone/email-match fallback lookups are all `.eq('tenant_id',...)`
  before a `clientId`/`teamMemberId` is accepted.
- `admin/broadcast-guidelines`, `admin/analytics/live-feed`,
  `admin/cleaner-availability` — the three `admin/*` routes reachable via
  `getTenantForRequest()` (not the Jeff-only `admin_token`) found in this
  batch; all tenant-scoped (`team_members`/`lead_clicks` reads
  `.eq('tenant_id',...)`/`tenantDb`); `cleaner-availability`'s caller-supplied
  `exclude_booking` query param only ever feeds a `.neq('id', ...)` inside an
  already `tenant_id`-scoped query (traced into
  `src/lib/nycmaid/availability.ts`'s `getBookingsForDay`) — a foreign id
  simply matches nothing, cannot suppress or leak another tenant's row.
- Confirmed `admin/businesses`, `admin/businesses/[id]`, `admin/calendar`,
  `admin/errors`, `admin/finance`, `admin/email`, `admin/activity`,
  `admin/billing`, `admin/feedback` are all bare `requireAdmin()`
  (super_admin-only, verified in `admin-auth/route.ts`: `verifyAdminToken`
  hard-checks `role === 'super_admin'`, `verifyTenantAdminToken` is a
  structurally separate function so a tenant-admin token can never satisfy
  it) — Jeff's own platform-ops console, intentionally cross-tenant, same
  exception class as `admin/impersonate`/`jefe/agent.ts` already documented
  in this register; out of the cross-tenant-leak threat model this register
  tracks (no tenant-boundary is being crossed by an unprivileged caller).
No code changed this pass (nothing to fix); `npx tsc --noEmit` not run since
no `.ts` edits were made. File-only, no push/deploy/DB.

**P44 (2026-07-15, W2, 16:24 order):** `cron/rating-prompt`'s CAP-exceeded
bulk-block alert imported `emailAdmins`/`smsAdmins` from
`@/lib/nycmaid/admin-contacts` — the legacy, un-tenant-scoped helper that
queries the global `admin_users` table (NYC Maid's own legacy admin accounts,
confirmed via `src/app/api/auth/login/route.ts`'s single-tenant login query —
the same table, distinct from the modern per-tenant `tenant_members`) — with
no `isNycMaid()` gate. Every OTHER cron that imports this exact legacy helper
(`sales-follow-ups.ts`) correctly gates it behind `isNycMaid(deal.tenant_id)`;
`rating-prompt` was the one caller that missed the gate, calling it
unconditionally inside a `for (const tenant of tenants)` loop over every
active tenant on the platform. Live impact: any non-nycmaid tenant whose
completed-and-unrated bookings exceed the CAP (10) in one 5-min cron tick has
its business name + booking-volume signal disclosed via email/SMS to NYC
Maid's `admin_users` — a real tenant, unrelated to the triggering tenant.
Same bug class as P1/P11/P17/P20/P40 (missing ownership/tenant check before a
cross-tenant-visible action), just on the notification-recipient axis instead
of a DB row. Found while sweeping the 30 previously-unswept `cron/*` routes
(this session's full batch: `gdpr-purge`, `jefe-heartbeat`,
`auto-reply-reviews`, `finance-post`, `release-due-payments`, `email-monitor`,
`follow-up`, `confirmation-reminder`, `cleanup-videos`, `comms-monitor`,
`no-show-check`, `anthropic-health`, `sales-follow-ups`, `rating-prompt`,
`lifecycle`, `payment-reminder`, `payment-followup-daily`,
`post-job-followup`, `late-check-in`, `outreach`, `confirmations`,
`retention`, `system-check`, `health-check`, `schedule-monitor`,
`comhub-email`, `backup`, `sync-google-reviews`, `health-monitor`,
`recurring-expenses` — 29/30 clean, this one bug).
**Fixed:** switched the import to the tenant-aware `@/lib/admin-contacts`
(`emailAdmins(tenantId, subject, html)` / `smsAdmins(tenantId, message)`,
which already exists precisely for this — its own docstring says "tenant-aware
replacement for nycmaid's admin-contacts.ts" — and is already the correct
pattern used by e.g. `team-portal/15min-alert`), passing the actual
looping-tenant's id so the alert reaches that tenant's own `tenant_members`
admins instead. New test `route.isolation.test.ts`: 2 tests — a wrong-
recipient probe (legacy nycmaid-global helper is never invoked) and a
positive control (tenant-scoped helper invoked with the correct tenant id,
subject/body contain that tenant's name). Verified the probe actually catches
the bug: reverted the fix, both tests failed RED against the old code (0 legacy
calls expected but 1 seen; 0 tenant-scoped calls seen instead of 1);
restored, GREEN. `npx tsc --noEmit` clean. File-only, no push/deploy/DB.

**Noticed, not fixed (same root cause, currently NOT live-exploitable —
recording so a future pass doesn't have to re-derive this):**
- `webhooks/stripe`'s `checkout.session.completed` handler has an identical
  shape at its "no `bookingId`" fallback: when a Stripe Payment Link checkout
  can't be matched to a booking, it hardcodes a search against
  `NYCMAID_TENANT_ID`'s `clients` table and, on no match, alerts via the same
  legacy `nmSmsAdmins` (from `@/lib/nycmaid/admin-contacts`) with no tenant
  gate — same latent cross-tenant-alert shape as P44. This webhook is a
  single shared endpoint for ALL tenants' Stripe events (one
  `STRIPE_WEBHOOK_SECRET`/`STRIPE_SECRET_KEY`), so it's reachable by any
  tenant's checkout session. **Not currently exploitable**: this fallback only
  triggers for a static Payment-Link checkout with no resolvable
  `client_reference_id`/metadata, and a live read-only check
  (`tenants?select=id,name&payment_link=not.is.null`) confirms **only NYC
  Maid has `payment_link` set today** — no other tenant's checkout can reach
  this branch yet. Becomes live the moment a second tenant configures a
  static Payment Link and a payer's email doesn't match one of NYC Maid's own
  unpaid bookings. Whoever next touches Stripe payment-link support for a
  second tenant should harden this first (gate the fallback alert on
  `tenantId === NYCMAID_TENANT_ID`, or drop to a generic unresolved-payment
  alert with no tenant assumption when `tenantId` is unknown).
- `cron/backup`'s end-of-run summary notification (`type: 'platform'`,
  `channel: 'in_app'`) inserts under `tenants[0].id` (whichever tenant happens
  to sort first that run) and includes every OTHER tenant's slug + upload-
  error text in the `message` field when any tenant's backup fails. **Not
  currently exploitable**: the insert omits `recipient_type`, and a live
  read-only check (`notifications?type=eq.platform&limit=5`) confirms these
  rows land with `recipient_type: null`; the only tenant-facing reader,
  `GET /api/notifications` (`src/app/api/notifications/route.ts`), filters
  `.eq('recipient_type', 'admin')`, which excludes null — so today this is an
  orphaned, invisible row, not a live leak. Fragile: if `recipient_type`
  ever gets a DB default, or a future tenant-facing endpoint reads
  `notifications` by `tenant_id` without that filter, it becomes live. Cheap
  fix whenever someone's in this file: stop writing a cross-tenant summary
  under any single tenant's id at all — this belongs in a platform-only sink
  (Telegram/`alertOwner`, matching `cron/comms-monitor`/`cron/backup`'s
  siblings), not a `notifications` row keyed to an arbitrary tenant.
- Verified the same legacy-helper import in `client/book`, `team-portal/
  checkout`, `webhooks/stripe` (the two Connect-payout call sites at lines
  480/496, not the one flagged above) are each correctly wrapped in an
  `isNycMaid(...)` check — P44's missing-gate pattern is not repeated there.

**2026-07-15 (W2, 16:38 order) — negative-result sweep, no fix needed:**
continued the leader's "continue controlled broad-hunt, lower-risk surface"
order into a fresh batch not previously touched by this register — every one
already correctly tenant-scoped (no P-number assigned — recorded here so a
future pass doesn't re-spend time on the same files):
- `cron/reminders` — the one cron missing from P44's 30-file sweep list; every
  booking/notification query is `.eq('tenant_id', tenantId)` inside the same
  per-tenant loop shape as every other cron, and its `isNycMaid(tenantId)`
  gates are correctly present (2 call sites), same as every sibling cron
  P44 already audited.
- `jobs`, `jobs/[id]` (GET/PATCH), `jobs/[id]/payments` (PATCH) — all
  `tenantDb`-scoped; `job_payments.tenant_id` (migration
  `2026_07_02_jobs_projects.sql`) means the PATCH's `.eq('job_id',
  id).eq('id', payment_id)` is auto-scoped by `tenantDb.update()`'s own
  `.eq('tenant_id', tenantId)`, so a foreign `job_id`/`payment_id` combo
  matches nothing — safe by construction, same shape as register item B2.
- `payments/checkout`, `payments/link` — both verify `booking_id` via
  `.eq('id', booking_id).eq('tenant_id', tenant.tenantId)` (the latter via
  `tenantDb`) before any Stripe call.
- `invoices/public/[token]`, `invoices/public/[token]/checkout`,
  `quotes/public/[token]`, `quotes/public/[token]/accept`,
  `quotes/public/[token]/deposit-checkout` — all token-scoped; every
  downstream `deal_id`/`tenant_id` reference is read off the already-resolved
  row, never caller-supplied. Stripe metadata (`invoice_id`/`quote_id`/
  `tenant_id`) is server-set and immutable at the API layer, same "metadata
  path unaffected" class as P33's fix note.
- `invoices/[id]/send` — `body.to_email`/`body.to_phone` let a caller
  redirect their OWN invoice to an arbitrary address; not a cross-tenant leak
  (the invoice data belongs to the caller's own tenant), out of this
  register's threat model.
- `routes/auto-build`, `routes/[id]/publish` — `team_member_id` is always
  derived from a tenant-scoped `bookings`/`routes` embed, never caller-supplied.
- `schedules/[id]/pause` (POST/DELETE) — `tenantDb`-scoped throughout.
- `sms/send` — sends to an arbitrary caller-supplied phone number via the
  tenant's own Telnyx credentials; no FK/cross-tenant data involved.
- `social/post`, `social/posts`, `social/accounts` — no caller-supplied FK,
  all keyed off `tenant.tenantId`.
- `team-portal/jobs/claim` → `claim_job_atomic()` RPC (migration
  `2026_07_13_job_claim_atomic.sql`) — booking UPDATE guarded by `AND
  b.tenant_id = p_tenant_id` inside the function itself.
- `team-portal/jobs/release`, `team-portal/rating`, `team-portal/running-late`,
  `team-portal/checkin` — every booking/member lookup is
  `.eq('tenant_id', auth.tid)` **and** `.eq('team_member_id', auth.id)` (a
  member can only ever act on their OWN assigned booking).
- `team-members/[id]/stripe-onboard` (POST/GET) — `team_members` row fetched
  `.eq('tenant_id', tenantId).eq('id', id)` before any Stripe Connect call;
  `metadata.tenant_id`/`team_member_id` on the created account are
  server-set.
- `finance/payroll` (POST) — `team_member_id` verified tenant-owned
  (`.eq('id', team_member_id).eq('tenant_id', tenantId)`) before the
  `payroll_payments` insert; the follow-up `bookings` status update is also
  `tenant_id`-scoped.
- `finance/mark-paid` — `booking_id` update is tenant-scoped
  (`.eq('id', booking_id)` inside a tenant-filtered query per its own inline
  comment); the `client_id` written to `payments` is read off that
  already-tenant-verified booking, not caller-supplied.
No code changed this pass (nothing to fix); `npx tsc --noEmit` not run since
no `.ts` edits were made. File-only, no push/deploy/DB.

**2026-07-15 (W2, 16:45 order) — finance/* reporting endpoints sweep
(`ar-aging`, `pnl`, `trial-balance`, `bank-import`): negative result, 2 test
gaps closed.**
- `ar-aging` — fully `tenantDb`-scoped (invoices + bookings both auto-filtered
  `.eq('tenant_id', tenantId)`); already has `route.isolation.test.ts`. Clean.
- `pnl` — default path calls `ledgerProfitAndLoss(tenantId, ...)`, which
  scopes `journal_lines` by `.eq('tenant_id', tenantId)`; the `?source=raw`
  escape hatch is `tenantDb`-scoped. Already has `route.isolation.test.ts`
  covering the raw path + a wrong-tenant probe in `ledger-reports.test.ts`
  covering the ledger path. Clean.
- `trial-balance` — thin wrapper around `ledgerTrialBalance(tenant.tenantId,
  ...)`, same `streamLedgerLines` tenant-scoping as `pnl`/`balance-sheet`. No
  route-level isolation test (consistent with `balance-sheet`, which is the
  same shape — routes with no raw-table reads of their own get their coverage
  from `ledger-reports.test.ts` instead). **Gap found:** unlike its siblings
  `ledgerProfitAndLoss` and `ledgerBalanceSheet`, `ledgerTrialBalance` had no
  wrong-tenant probe test in `ledger-reports.test.ts` — an asymmetry, not a
  live bug (same shared `streamLedgerLines().eq('tenant_id', tenantId)` all
  three functions call, already proven safe by the other two probes).
  **Closed:** added the missing probe (tenant B's 9,000,000-cent line must not
  appear in tenant A's account rows/totals). Verified it catches the exact bug
  class: temporarily stripped `streamLedgerLines`'s `.eq('tenant_id',
  tenantId)`, both this new probe AND the pre-existing `ledgerBalanceSheet`
  probe went RED (9,010,000 leaked in); restored, GREEN.
- `bank-import` — verifies caller-supplied `bank_account_id` via a raw
  `supabaseAdmin` query (`.eq('tenant_id', tenantId).eq('id',
  bankAccountId)`, not `tenantDb`) before any parse/insert; the subsequent
  duplicate-fingerprint checks are scoped by that already-tenant-verified
  `bank_account_id` (safe by construction — the id uniquely belongs to one
  tenant); `bank_import_batches`/`bank_transactions` inserts stamp
  `tenant_id: tenantId` explicitly. **Gap found:** no isolation test existed
  for this route (unlike `bank-accounts`, `bank-transactions`, etc.).
  **Closed:** new `route.isolation.test.ts` — wrong-tenant probe (tenant A
  posting a real CSV against tenant B's `bank_account_id` → 404, zero rows
  inserted into `bank_import_batches`/`bank_transactions`) + positive control
  (own account → 200, every inserted row stamped `tenant_id: A`). Verified the
  probe catches the bug: temporarily stripped the route's own `.eq('tenant_id',
  tenantId)` on the `bank_accounts` lookup, the wrong-tenant probe went RED
  (200 instead of 404); restored, GREEN.
No production code changed — both fixes were test-coverage additions closing
gaps against already-correct code, not bug fixes. `npx tsc --noEmit` clean.
Full `api/finance/*` suite (32 files, 70 tests) green. File-only, no
push/deploy/DB.
