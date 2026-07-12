# tenantDb Conversion — Progress Snapshot

**Status:** file-only audit / no route converted by this doc
**Author:** W2 (resolver + tenant-isolation lane)
**Date:** 2026-07-12
**Worktree:** `p1-w2` @ `817a4917` (counts regenerated against this tree)
**Maps:** `tenantdb-rollout-plan.md` (order + §5 exceptions) · `tenantdb-conversion-batch-plan.md` (next 20) · `tenantdb-triage.md`

---

## 1. Regenerate these counts

```bash
cd platform
CONV=$(grep -rl "tenantDb(" src/app/api --include=route.ts | sort)
ALL=$(find src/app/api -name route.ts | sort)
UNCONV=$(comm -23 <(echo "$ALL") <(echo "$CONV"))
```

---

## 2. Current counts (tip `817a4917`)

| Bucket | Count |
|---|---:|
| **Total** API `route.ts` | **498** |
| **Converted** (use `tenantDb`) | **46** |
| ├─ with a `*.isolation.test.ts` probe | **46** |
| └─ **without** a probe (coverage gap → §4) | **0** |
| **Unconverted** | **452** |
| ├─ touch DB via `supabaseAdmin` | 390 |
| │  ├─ EASY: tenant already in hand (`getTenantForRequest`) | ~140 |
| │  ├─ EASY: tenant in hand via `requirePermission` only | 38 |
| │  └─ HARD: derive tenant elsewhere (cron/webhook/portal/public/admin-token) | 213 |
| └─ no direct `supabaseAdmin` (no tenant-table DB → NO-OP tier) | 65 |

> **Probe coverage is now 100% of converted routes (46/46, 0 gap).** Every
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

## 3. The 46 converted routes (paths relative to `src/app/api/`)

> Batch-1 finance conversions landed this lane: #1–5,#8,#9,#10,#12 =
> `finance/summary`, `finance/revenue`, `finance/pnl`, `finance/cash-flow`,
> `finance/ar-aging`, `finance/bank-transactions`, `finance/chart-of-accounts`,
> `finance/entities`, `finance/reconcile-candidates`. All 46 are probed.

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
```

---

## 4. Isolation-probe coverage gap — CLOSED (0 converted routes without a probe)

> **Resolved.** Every one of the 46 converted routes now ships a co-located
> `*.isolation.test.ts`. The table + history below are kept as the record of how
> the 18-route gap was closed; the gap itself is **0** as of tip `817a4917`.

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

**Batch-1 progress: 9 of 20 converted** (`tenantdb-conversion-batch-plan.md`
#1–5,#8,#9,#10,#12 — all finance, all probed). **Still to do in Batch 1:**
- **#6 `finance/expenses` (P5), #7 `finance/bank-accounts` (P4), #11
  `finance/periods` (P6)** — FK-injection rows; `tenantDb` alone is NOT the fix.
  Convert **and** add the caller-supplied-FK ownership guard, then flip the witness.
- **#13 `finance/statements`** — convert 4 `bank_statements` accesses; **LEAVE**
  `supabaseAdmin.storage.from('finance')` (Storage bucket, not a table).
- **#14 `invoices` (P2), #15 `documents/[id]/fields`, #16 `documents/[id]/void`,
  #17–19 clients, #20 `bookings` (P1)** — the UNSCOPED-TODAY live-leak rows
  (`documents/[id]/fields`, `documents/[id]/void`, `bookings::service_types`) close
  real read leaks on conversion; do those with a witness/probe.

**Two work-streams, prioritized:**
1. **Probe coverage: DONE** — all 46 converted routes have a probe (gap 0).
2. **Convert the remaining 11 Batch-1 routes** (per batch-plan) — gated on leader GO,
   each with `tsc --noEmit` + its probe + FK-injection guard where flagged
   (P1/P2/P4/P5/P6).

**After Batch 1:** `quotes` → `finance/receipts` → `finance/cleaner-income` →
`finance/payroll` → `finance/pending` → `finance/audit-log` → `clients/analytics` →
the remaining ~118 EASY routes (`bookings/*`, `deals/*`, `jobs/*`, `schedules/*`,
`settings/*`). HARD tiers (admin-token / portal / cron / webhook) convert only after
their tenant-resolution path is explicit + verified (rollout-plan §4 Tiers 2–4).

**This doc converts nothing** — it is the live count + the ordered next step.
