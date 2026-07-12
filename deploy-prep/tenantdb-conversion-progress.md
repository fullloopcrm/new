# tenantDb Conversion — Progress Snapshot

**Status:** file-only audit / no route converted by this doc
**Author:** W2 (resolver + tenant-isolation lane)
**Date:** 2026-07-12
**Worktree:** `p1-w2` @ `c407cbf6` (counts regenerated against this tree)
**Maps:** `tenantdb-rollout-plan.md` (order + §5 exceptions) · `tenantdb-conversion-batch-plan.md` (next 20) · `tenantdb-triage.md`

> **Also this session (non-conversion, leader QUEUE 3-DEEP item (a)):** fixed
> `cron/tenant-health` to read `tenant_domains` FIRST / `tenants.domain`
> fallback-only, matching the reconciled resolver order in `tenant.ts` /
> `tenant-lookup.ts` (it had the precedence backwards, with a stale comment
> claiming otherwise). Added `route.precedence.test.ts` incl. a wrong-tenant
> probe proving a stale `tenants.domain` value is never used once a
> `tenant_domains` row exists. Commit `e2cbce20`.

---

## 1. Regenerate these counts

```bash
cd platform
CONV=$(grep -rl "tenantDb(" src/app/api --include=route.ts | sort)
ALL=$(find src/app/api -name route.ts | sort)
UNCONV=$(comm -23 <(echo "$ALL") <(echo "$CONV"))
```

---

## 2. Current counts (tip `c407cbf6`)

| Bucket | Count |
|---|---:|
| **Total** API `route.ts` | **498** |
| **Converted** (use `tenantDb`) | **75** (see Batch-9 below, tip `de4a1bc6`) |
| ├─ with a `*.isolation.test.ts` probe | **75** |
| └─ **without** a probe (coverage gap → §4) | **0** |
| **Unconverted** | **423** |
| ├─ touch DB via `supabaseAdmin` | ~375 |
| │  ├─ EASY: tenant already in hand (`getTenantForRequest`) | ~131 |
| │  ├─ EASY: tenant in hand via `requirePermission` only | 35 |
| │  └─ HARD: derive tenant elsewhere (cron/webhook/portal/public/admin-token) | 213 |
| └─ no direct `supabaseAdmin` (no tenant-table DB → NO-OP tier) | 65 |

> **Probe coverage is now 100% of converted routes (61/61, 0 gap).** Every
> `tenantDb` route ships a co-located `*.isolation.test.ts` wrong-tenant probe.
> The EASY-unconverted sub-counts above are approximate — regenerate per §1 before
> relying on them (each conversion moves a route from EASY into Converted).

**Delta vs the rollout plan's snapshot (`7fd21a1b`):** converted count unchanged
at 37 (conversions are leader-gated; this lane has been authoring maps + probes, not
converting). The rollout plan counted **145 EASY** using `getTenantForRequest` only;
this snapshot adds the **38** routes whose tenant arrives via `requirePermission`
(which itself calls `getTenantForRequest` internally) → **183 total "tenant-in-hand"**
DB routes that are near-mechanical swaps. HARD is therefore `396 − 183 = 213`.

---

## 3. The 55 converted routes (paths relative to `src/app/api/`)

> Batch-1 finance conversions landed this lane: #1–5,#8,#9,#10,#12 =
> `finance/summary`, `finance/revenue`, `finance/pnl`, `finance/cash-flow`,
> `finance/ar-aging`, `finance/bank-transactions`, `finance/chart-of-accounts`,
> `finance/entities`, `finance/reconcile-candidates`. All are probed.
>
> **Batch-1 CLIENTS trio landed (prior session):** #17 `clients` (list+create),
> #18 `clients/[id]` (GET/PUT/DELETE), #19 `clients/stats` — routes 47–49 in the
> table below, one commit each, each with an isolation probe. All EASY/mechanical,
> no FK-injection. Commits `5ea2e4d9`, `d6060f8c`, `76d6f500`.
>
> **Batch-2 READ trio landed (this session):** `finance/cleaner-income` (GET),
> `finance/pending` (GET), `finance/audit-log` (GET) — routes 50–52 below, one
> commit each, each with an isolation probe. All EASY low-risk reads, already
> `.eq('tenant_id')`-scoped (conversion = hardening + `.eq` cleanup), no FK-injection,
> no cross-tenant/Storage tables. Commits `c29bb584`, `71f4e856`, `bd5e253d`.
> `audit-log`'s probe also asserts the injected `.eq('tenant_id')` excludes
> NULL-tenant rows (mig 038 made `audit_log.tenant_id` nullable) — behavior preserved.
>
> **Batch-3 READ trio landed (this session):** `clients/analytics` (GET),
> `bookings/stats` (GET), `pipeline` (GET) — routes 53–55 below, one commit each,
> each with an isolation probe. All EASY GET-only reads over a single top-level
> tenant-scoped table (`bookings`×2, `deals`), already `.eq('tenant_id')`-scoped
> (conversion = `.eq` cleanup + hardening), no FK-injection, no Storage/cross-tenant
> tables. Commits `8a574e14`, `be1a8e3c`, `cd976d7c`.
>
> **Batch-4 trio landed (this session):** `jobs` (GET), `settings/services`
> (GET+POST), `deals/at-risk` (GET+POST) — routes 56–58 below, one commit each,
> each with an isolation probe. All EASY/mechanical: `jobs` reads a single
> `jobs` table (embedded clients+job_payments); `settings/services` reads/inserts
> `service_types` (validated fields, tenant_id stamped — no caller FK);
> `deals/at-risk` reads clients/bookings/deals and its POST updates `clients`
> scoped by tenantDb (foreign client_id matches no row). No FK-injection, no
> Storage/cross-tenant tables. Commits `c0df3b45`, `f1d239ea`, `6b8a133d`.
>
> **Batch-5 trio landed (this session):** `catalog` (GET/POST/PATCH/DELETE),
> `team` (GET/POST), `settings/services/[id]` (PUT/DELETE) — routes 59–61 below,
> one commit each, each with an isolation probe. All EASY single-table, no embed,
> no caller FK: `catalog` + `settings/services/[id]` are CRUD over `service_types`
> (completing that table's family alongside the converted `settings/services`
> list); `team` reads/inserts `team_members` (whitelist fields + generated pin,
> tenant_id stamped). update/delete-by-id paths rely on tenantDb's injected
> `.eq('tenant_id')` so a foreign id is a no-op. No FK-injection, no
> Storage/cross-tenant tables. Commits `091b6216`, `3bc5d564`, `bdd9c1c7`.
>
> **Batch-6 READ trio landed (this session):** `bookings/closeout` (GET),
> `audit` (GET), `security/events` (GET) — routes 62–64 below, one commit each,
> each with an isolation probe. All EASY GET-only single-table reads, already
> `.eq('tenant_id')`-scoped (conversion = drop the explicit filter for tenantDb's
> injected one): `bookings/closeout` reads `bookings` (needs-closeout +
> recently-closed lists, embeds clients/team_members); `audit` reads `audit_logs`
> with `{ count: 'exact' }` (probe asserts the total counts only the acting
> tenant); `security/events` reads `security_events`. **No by-id caller input on
> any of the three → no IDOR surface** (IDOR lens applied per leader order (b);
> nothing to flag). No FK-injection, no Storage/cross-tenant tables. Commits
> `bookings/closeout`, `audit`, `afa62a98` (`security/events`).
>
> **Batch-7 READ trio landed (this session):** `admin/analytics/live-feed` (GET),
> `leads/attribution` (GET), `admin/find-cleaner/recent` (GET) — routes 65–67
> below, one commit each, each with an isolation probe. All EASY GET-only reads,
> already `.eq('tenant_id')`-scoped (conversion = drop the explicit filter for
> tenantDb's injected one): `live-feed` reads a single `lead_clicks` table
> (`.eq('action','visit')` preserved); `attribution` reads a single
> `website_visits` table (`.gte('created_at')` window preserved, `getSettings`
> mocked in the probe); `find-cleaner/recent` reads `cleaner_broadcasts` then
> fans out `cleaner_broadcast_recipients` via `.in('broadcast_id', ids)` where
> ids derive from the tenant's own broadcasts (not caller input). **No by-id
> caller input on any of the three -> no IDOR surface.** `find-cleaner/recent`'s
> probe also seeds a FORGED foreign-tenant recipient pointing at this tenant's
> broadcast_id and asserts it's excluded — proving the recipients read is
> tenant-scoped, not merely id-list-filtered. No FK-injection, no Storage/
> cross-tenant tables. Commits `21fd58c4`, `7a865611`, `96995a46`. Full suite
> **413 passed / 37 skipped** after (`tsc --noEmit` clean).
>
> **Batch-8 trio landed (this session):** `recurring-expenses` (GET+POST),
> `deals/[id]/activities` (GET+POST), `clients/enriched` (GET) — routes 68–70
> below, one commit each, each with an isolation probe. All EASY: `recurring-
> expenses` is a standalone single-table route (not under `finance/`), no
> caller FK; `deals/[id]/activities` verifies deal ownership via a scoped
> lookup before any read/write (no caller-supplied cross-tenant FK — the
> `deal_id` comes from the URL and is ownership-checked); `clients/enriched`
> is 4 parallel GET-only reads (clients, bookings, recurring_schedules,
> team_members), already `.eq('tenant_id')`-scoped, no by-id caller input.
> **IDOR lens applied:** `deals/[id]/activities`'s ownership guard now runs
> through tenantDb, so a foreign tenant's `deal_id` resolves to 404 (probed) —
> confirmed no leak. No FK-injection, no Storage/cross-tenant tables. Full
> suite **426 passed / 37 skipped** after (`tsc --noEmit` clean). Commits
> `a3f69140`, `2d1a8b03`, `c407cbf6`.
>
> **IDOR lens finding this session (leader order (b)) — 2 pre-existing FK-
> injection rows spotted while scanning candidates, NOT fixed (out of the
> "EASY" scope for this batch, mirrors the finance P4/P5/P6 skip pattern):**
> `reviews` POST accepts a caller-supplied `client_id` with no check that it
> belongs to the acting tenant — a forged `client_id` for a foreign tenant's
> client lets the acting tenant's review embed (`clients(name)`) surface that
> foreign client's name on GET. `deals/[id]` PATCH accepts caller-supplied
> `client_id`/`owner_id` in its `assignables` list with the same gap — the
> deal row itself stays correctly tenant-scoped, but the embedded
> `clients(id,name,email,phone,address)` join on GET would leak a foreign
> client's PII if `client_id` were forged to point cross-tenant. Both are
> pre-existing (not introduced or worsened by this session), unrelated to
> `tenant_domains`/`tenants.domain` precedence, and `tenantDb` alone would NOT
> fix either — they need a caller-supplied-FK ownership guard (verify the
> referenced `client_id` belongs to `tenantId` before accepting it), same as
> the finance FK-injection rows in §5. Flagging for a future gated pass; not
> converted here.
>
> **Also noted (settings/\* unconverted group is NO-OP tier, not EASY):**
> `settings/notifications`, `settings/page-config`, `settings/team`,
> `settings/permissions`, `settings/portal-permissions`,
> `settings/request-automation`, `settings/route` all read/write the `tenants`
> table itself keyed by `id` (the tenant's own row), never a `tenant_id`-
> scoped child table — `tenantDb` explicitly excludes `tenants` (see its own
> doc comment: "Platform tables that have no tenant_id ... must still use
> supabaseAdmin directly"). Not conversion candidates.
>
> **IDOR lens sweep this session (leader order (b)) — no new findings.** Scanned
> every unconverted dynamic-segment (`[id]`/`[token]`) route with a by-id read.
> Result: every owner-authed (`getTenantForRequest`/`requirePermission`) by-id
> read on a tenant-scoped table is either directly `.eq('tenant_id')`-scoped or
> guard-gated by a prior scoped ownership fetch (404-if-not-owned) before any
> unscoped update/re-fetch-by-id. Verified guard order on `documents/[id]/void`,
> `finance/bank-transactions/[id]/match`, `invoices/[id]/record-payment`,
> `jobs/[id]/sessions/[sessionId]`, `quotes/[id]/send`. The `tid=0` by-id routes
> are platform-admin (`requireAdmin`, cross-tenant by design:
> `admin/bookings/[id]/closeout-summary`, `admin/prospects/[id]`) or
> platform-global tables (`platform_announcements`, `prospects`, `tenants`);
> public `/[token]` routes are token-scoped. Nothing to flag. (Defense-in-depth
> note, not a bug: the guard-gated unscoped update/re-fetch-by-id writes stay
> correct only while their guard remains — converting those routes to tenantDb
> makes the write itself belt-and-suspenders; already the rollout's intent.)

```
 1 admin/comhub/contacts/[id]/context        24 finance/bank-transactions
 2 admin/comhub/contacts/[id]/notes          25 finance/bank-transactions/[id]
 3 admin/comhub/threads                      26 finance/bank-transactions/accept-suggestions
 4 admin/recurring-schedules                 27 finance/cash-flow
 5 admin/recurring-schedules/[id]/regenerate 28 finance/chart-of-accounts
 6 booking-notes/[id]                        29 finance/entities
 7 bookings/[id]/team                        30 finance/pnl
 8 bookings/batch                            31 finance/receipts/attach
 9 campaigns/[id]/send                       32 finance/reconcile-candidates
10 campaigns/send                            33 finance/revenue
11 chat                                      34 finance/summary
12 clients/[id]/contacts                     35 google/reviews
13 clients/import                            36 invoices/[id]
14 crews                                     37 jobs/[id]
15 dashboard/hr/[id]                         38 notifications
16 dashboard/import/batch/[id]               39 payments/link
17 deals                                     40 quotes/[id]
18 documents                                 41 quotes/[id]/convert
19 documents/[id]                            42 schedules
20 documents/[id]/duplicate                  43 selena
21 documents/[id]/send                       44 sms
22 documents/[id]/signers                    45 team-portal/checkin
23 finance/ar-aging                          46 team-portal/checkout
                                             47 clients
                                             48 clients/[id]
                                             49 clients/stats
                                             50 finance/cleaner-income
                                             51 finance/pending
                                             52 finance/audit-log
                                             53 clients/analytics
                                             54 bookings/stats
                                             55 pipeline
                                             56 jobs
                                             57 settings/services
                                             58 deals/at-risk
                                             59 catalog
                                             60 team
                                             61 settings/services/[id]
                                             62 bookings/closeout
                                             63 audit
                                             64 security/events
                                             65 admin/analytics/live-feed
                                             66 leads/attribution
                                             67 admin/find-cleaner/recent
                                             68 recurring-expenses
                                             69 deals/[id]/activities
                                             70 clients/enriched
```

> Rows 47–49 (CLIENTS trio), 50–52 (finance READ trio), 53–55 (READ trio:
> `clients/analytics`, `bookings/stats`, `pipeline`), 56–58 (Batch-4 trio:
> `jobs`, `settings/services`, `deals/at-risk`), 59–61 (Batch-5 trio:
> `catalog`, `team`, `settings/services/[id]`), 62–64 (Batch-6 READ trio:
> `bookings/closeout`, `audit`, `security/events`), 65–67 (Batch-7 READ trio:
> `admin/analytics/live-feed`, `leads/attribution`, `admin/find-cleaner/recent`)
> and 68–70 (Batch-8 trio: `recurring-expenses`, `deals/[id]/activities`,
> `clients/enriched`) are appended in insertion order, not merged into the
> alphabetized 1–46 grid above.

---

## 4. Isolation-probe coverage gap — CLOSED (0 converted routes without a probe)

> **Resolved.** Every one of the 70 converted routes now ships a co-located
> `*.isolation.test.ts`. The table + history below are kept as the record of how
> the 18-route gap was closed; the gap itself is **0** as of tip `c407cbf6`.

Historically these were **already converted** but shipped without a probe — the
highest-value place to add probes, because the conversion was done but its
wrong-tenant behavior was unverified. **Bold = touches sensitive data / money / PII.**

| # | Converted route | Note |
|---|---|---|
| 1 | **`selena`** | AI agent surface; owner+client callable — high value |
| 2 | **`sms`** | outbound messaging; tenant-scoped conversations |
| 3 | **`payments/link`** | 💰 payment link creation |
| 4 | **`finance/bank-transactions/accept-suggestions`** | 💰 bulk categorize/post |
| 5 | **`team-portal/checkout`** | booking price/status write (channel LOW: update lacked `.eq(tenant_id)`) |
| 6 | `team-portal/checkin` | cleaner check-in write |
| 7 | **`documents/[id]/send`** | sends a document (PII egress) |
| 8 | `documents/[id]/duplicate` | clones a document |
| 9 | `campaigns/send` · `campaigns/[id]/send` | bulk send fan-out |
| 10 | `chat` | conversation surface |
| 11 | `google/reviews` | review sync |
| 12 | `bookings/batch` | bulk booking create |
| 13 | `dashboard/import/batch/[id]` | import batch status |
| 14 | `admin/comhub/threads` · `.../contacts/[id]/context` · `.../contacts/[id]/notes` | comhub CRM (admin-token auth) |
| 15 | `admin/recurring-schedules/[id]/regenerate` | schedule regen |

**Probes added, prior session** (5): `finance/bank-transactions/[id]`,
`finance/receipts/attach`, `quotes/[id]/convert`, `documents/[id]/signers`,
`clients/import` — commit `7c902261`.

**Probes added THIS session** (6 of the 18 gap rows — the money/PII-priority ones):
`payments/link`, `finance/bank-transactions/accept-suggestions`, `selena`, `sms`,
`team-portal/checkout`, `documents/[id]/send` — commits `bb80f0fe`, `be7a7876`.
**Remaining 12 gap rows — now ALL probed** (later sessions): `campaigns/send`·
`campaigns/[id]/send`, `chat`, `google/reviews`, `bookings/batch`,
`dashboard/import/batch/[id]`, `documents/[id]/duplicate`, `team-portal/checkin`,
`admin/comhub/threads`·`.../contacts/[id]/context`·`.../contacts/[id]/notes`,
`admin/recurring-schedules/[id]/regenerate`. **Gap is now 0.**

**Also this session (payment-capture coverage, biggest live-money surface):**
`webhooks/stripe/route.tenant-scope.test.ts` (deposit + booking state transitions
+ wrong-tenant probes) and public checkout-session CREATE tests for
`invoices/public/[token]/checkout` + `quotes/public/[token]/deposit-checkout`
— commits `2b072033`, `687a0f4e`.

**Conversions (Batch-1, this lane):** #1–3 `finance/summary`, `finance/revenue`,
`finance/pnl` (commit `13701c85`); #4,#5,#12 `finance/cash-flow`, `finance/ar-aging`,
`finance/reconcile-candidates` (commit `dc236e1d`); **#8,#9,#10 this session**
`finance/bank-transactions` (GET), `finance/chart-of-accounts` (GET+POST),
`finance/entities` (POST — GET stays via already-scoped `listEntities`) — one
commit each, each with an isolation probe. **Skipped per leader:** FK-injection
rows #6/#7/#11 (`finance/expenses` P5, `finance/bank-accounts` P4,
`finance/periods` P6) — those need a caller-supplied-FK ownership guard, not just
`tenantDb`. Full suite 375 passed / 37 skipped after.

---

## 5. Next batch (conversion — leader-gated)

**Batch-1 progress: 12 of 20 converted** (`tenantdb-conversion-batch-plan.md`
#1–5,#8,#9,#10,#12 finance + **#17,#18,#19 clients (this session)** — all probed).
**Still to do in Batch 1:**
- **#6 `finance/expenses` (P5), #7 `finance/bank-accounts` (P4), #11
  `finance/periods` (P6)** — FK-injection rows; `tenantDb` alone is NOT the fix.
  Convert **and** add the caller-supplied-FK ownership guard, then flip the witness.
- **#13 `finance/statements`** — convert 4 `bank_statements` accesses; **LEAVE**
  `supabaseAdmin.storage.from('finance')` (Storage bucket, not a table).
- ~~#17–19 clients~~ **DONE this session** (mechanical, no FK) — commits
  `5ea2e4d9`, `d6060f8c`, `76d6f500`.
- **#14 `invoices` (P2), #15 `documents/[id]/fields`, #16 `documents/[id]/void`,
  #20 `bookings` (P1)** — the UNSCOPED-TODAY live-leak rows
  (`documents/[id]/fields`, `documents/[id]/void`, `bookings::service_types`) close
  real read leaks on conversion; do those with a witness/probe.

**Two work-streams, prioritized:**
1. **Probe coverage: DONE** — all 58 converted routes have a probe (gap 0).
2. **Convert the remaining 8 Batch-1 routes** (per batch-plan) — gated on leader GO,
   each with `tsc --noEmit` + its probe + FK-injection guard where flagged
   (P1/P2/P4/P5/P6).

**Batch-2 READ trio DONE (prior in this lane)** (leader QUEUE 3-DEEP, file-only,
non-gated): `finance/cleaner-income`, `finance/pending`, `finance/audit-log` —
EASY low-risk reads pulled forward from the batch-2 list.

**Batch-3 READ trio DONE this session** (leader QUEUE 3-DEEP, file-only, non-gated):
`clients/analytics`, `bookings/stats`, `pipeline` — EASY GET-only reads, single
top-level tenant-scoped table each, no FK-injection. Full suite **389 passed /
37 skipped** after (`tsc --noEmit` clean). Commits `8a574e14`, `be1a8e3c`,
`cd976d7c`.

**Batch-4 trio DONE this session** (leader QUEUE 3-DEEP, file-only, non-gated):
`jobs` (GET), `settings/services` (GET+POST), `deals/at-risk` (GET+POST) — EASY
low-risk routes over single tenant-scoped tables, no FK-injection (POSTs stamp
tenant_id / scope updates via tenantDb). Full suite **395 passed / 37 skipped**
after (`tsc --noEmit` clean). Commits `c0df3b45`, `f1d239ea`, `6b8a133d`.

**Batch-5 trio DONE this session** (leader QUEUE 3-DEEP, file-only, non-gated):
`catalog` (GET/POST/PATCH/DELETE), `team` (GET/POST), `settings/services/[id]`
(PUT/DELETE) — EASY single-table routes, no embed, no FK-injection (`catalog` +
`settings/services/[id]` are CRUD over `service_types`; `team` over
`team_members`, whitelist fields + generated pin). Full suite **405 passed / 37
skipped** after (`tsc --noEmit` clean). Commits `091b6216`, `3bc5d564`,
`bdd9c1c7`. Also verified: the `/api/client/smart-schedule` fallback-picker
`.eq('active',true)` bug was already fixed + regression-tested in commit
`20eb27ca` (`.neq('status','inactive')` to match the scored path) — no new work
needed; both tests pass.

> **~~Noticed~~ FIXED this session (commit `3ffbe355`):** `pipeline/route.ts`
> grouped deals into `byStage`, initialized only for the 6 real `PIPELINE_STAGES`
> values; an unknown/`null` stage fell to `byStage['lead'].push(...)`, but
> `'lead'` was never a key → runtime `TypeError` (→ 500) on any deal with a
> non-canonical stage. Fix normalizes orphan-stage deals into the first canonical
> bucket (`'new'`, label "Lead"). Added `route.regression.test.ts` (non-vacuous:
> RED/500 before, GREEN/200 after).

**Batch-6 READ trio, Batch-7 READ trio: see §3 notes above.**

**Batch-8 trio DONE this session** (leader QUEUE 3-DEEP, file-only, non-gated):
`recurring-expenses` (GET+POST), `deals/[id]/activities` (GET+POST),
`clients/enriched` (GET) — EASY, no FK-injection; details in §3 above. Full
suite **426 passed / 37 skipped** after (`tsc --noEmit` clean). Commits
`a3f69140`, `2d1a8b03`, `c407cbf6`. **Also flagged, not converted:** `reviews`
POST and `deals/[id]` PATCH both accept a caller-supplied `client_id` with no
tenant-ownership check (FK-injection — same class as the finance P4/P5/P6
rows); needs a guard before conversion, see §3 note.

**After Batch 1 (remaining batch-2 order):** `quotes` (list GET + a multi-table
create POST — NOT a low-risk read; convert as its own gated unit) → `finance/receipts`
(partial — leave `tenants`) → ~~`finance/cleaner-income`~~ ✅ → `finance/payroll`
(POST insert/update — not a pure read) → ~~`finance/pending`~~ ✅ →
~~`finance/audit-log`~~ ✅ → ~~`clients/analytics`~~ ✅ → the remaining
~112 EASY routes (`bookings/*`, `deals/*`, `jobs/*`, `schedules/*` — note
`settings/*`'s unconverted remainder is NO-OP tier per §3, not EASY).
HARD tiers (admin-token / portal / cron / webhook) convert only after their
tenant-resolution path is explicit + verified (rollout-plan §4 Tiers 2–4).

**Batch-9 (5) landed this session** (leader QUEUE 3-DEEP 18:58, file-only,
non-gated): `deals/[id]/stage` (POST), `schedules/[id]/pause` (POST+DELETE),
`bookings/[id]/status` (PATCH), `jobs/[id]/sessions` (POST), `jobs/[id]/payments`
(PATCH) — routes 71–75 below, one commit each, each with an isolation probe.
All EASY: id comes from the URL and is used as the tenantDb-scoped lookup key on
every read/write, so no separate ownership guard was needed before conversion.
No FK-injection on caller-supplied body fields either — `jobs/[id]/sessions`'s
`crew_id`/`assignee_ids`/`team_member_id` are validated against this tenant's own
`crews`/`team_members` via tenantDb before use (a foreign id is silently dropped,
never attached to the new booking — probed). **Left on `supabaseAdmin`, not
converted:** `booking_assignees` (pure join table, no `tenant_id` column — same
class as the `crew_members` landmine in §0 of the batch plan; both its FKs are
already tenant-owned by the time it's written) and `schedules/[id]/pause`'s
`tenants` lookup (keyed by the tenant's own id, no `tenant_id` column, NO-OP tier
per §3). No Storage/cross-tenant tables otherwise. Full suite **442 passed / 37
skipped** after (`tsc --noEmit` clean). Commits `03d4a188`, `27efa104`,
`0c4e1950`, `823192b9`, `de4a1bc6`.

```
                                             71 deals/[id]/stage
                                             72 schedules/[id]/pause
                                             73 bookings/[id]/status
                                             74 jobs/[id]/sessions
                                             75 jobs/[id]/payments
```

**Updated counts (tip `de4a1bc6`):** Converted **75**/498, all 75 probed (0 gap).

**This doc converts nothing** — it is the live count + the ordered next step.
