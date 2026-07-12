# tenantDb Conversion — Progress Snapshot

**Status:** file-only audit / no route converted by this doc
**Author:** W2 (resolver + tenant-isolation lane)
**Date:** 2026-07-12
**Worktree:** `p1-w2` @ `4308602a` (counts regenerated against this tree)
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

## 2. Current counts (tip `4308602a`)

| Bucket | Count |
|---|---:|
| **Total** API `route.ts` | **498** |
| **Converted** (use `tenantDb`) | **37** |
| ├─ with a `*.isolation.test.ts` probe | **19** |
| └─ **without** a probe (coverage gap → §4) | **18** |
| **Unconverted** | **461** |
| ├─ touch DB via `supabaseAdmin` | 396 |
| │  ├─ EASY: tenant already in hand (`getTenantForRequest`) | 145 |
| │  ├─ EASY: tenant in hand via `requirePermission` only | 38 |
| │  └─ HARD: derive tenant elsewhere (cron/webhook/portal/public/admin-token) | 213 |
| └─ no direct `supabaseAdmin` (no tenant-table DB → NO-OP tier) | 65 |

**Delta vs the rollout plan's snapshot (`7fd21a1b`):** converted count unchanged
at 37 (conversions are leader-gated; this lane has been authoring maps + probes, not
converting). The rollout plan counted **145 EASY** using `getTenantForRequest` only;
this snapshot adds the **38** routes whose tenant arrives via `requirePermission`
(which itself calls `getTenantForRequest` internally) → **183 total "tenant-in-hand"**
DB routes that are near-mechanical swaps. HARD is therefore `396 − 183 = 213`.

---

## 3. The 37 converted routes (paths relative to `src/app/api/`)

```
 1 admin/comhub/contacts/[id]/context     20 documents/[id]/duplicate
 2 admin/comhub/contacts/[id]/notes       21 documents/[id]/send
 3 admin/comhub/threads                   22 documents/[id]/signers
 4 admin/recurring-schedules              23 finance/bank-transactions/[id]
 5 admin/recurring-schedules/[id]/regenerate 24 finance/bank-transactions/accept-suggestions
 6 booking-notes/[id]                     25 finance/receipts/attach
 7 bookings/[id]/team                     26 google/reviews
 8 bookings/batch                         27 invoices/[id]
 9 campaigns/[id]/send                    28 jobs/[id]
10 campaigns/send                         29 notifications
11 chat                                   30 payments/link
12 clients/[id]/contacts                  31 quotes/[id]
13 clients/import                         32 quotes/[id]/convert
14 crews                                  33 schedules
15 dashboard/hr/[id]                      34 selena
16 dashboard/import/batch/[id]            35 sms
17 deals                                  36 team-portal/checkin
18 documents                             37 team-portal/checkout
19 documents/[id]
```

---

## 4. Isolation-probe coverage gap (18 converted routes with NO probe)

These are **already converted** but ship without a `*.isolation.test.ts` — the
highest-value place to add probes next, because the conversion is done but its
wrong-tenant behavior is unverified. **Bold = touches sensitive data / money / PII.**

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

**5 probes added this session** (previously in this gap, now covered):
`finance/bank-transactions/[id]`, `finance/receipts/attach`, `quotes/[id]/convert`,
`documents/[id]/signers`, `clients/import` — commit `7c902261`.

---

## 5. Next batch (conversion — leader-gated)

**None of the 20 EASY routes in `tenantdb-conversion-batch-plan.md` are converted
yet** — that batch is the executable work-list, in order
(`finance → invoices → documents → clients → bookings`), each with the per-route
`.eq(tenant_id)` change noted and the UNSCOPED-TODAY live-leak rows called out
(`documents/[id]/fields`, `documents/[id]/void`, `bookings::service_types`). Do those
first when conversion is unblocked.

**Two work-streams, prioritized:**
1. **Probe the 18 already-converted routes above** (file-only, non-gated, this lane
   can do now) — start with the bold sensitive/money/PII rows.
2. **Convert Batch 1's 20 EASY routes** (per batch-plan) — gated on leader GO, each
   with `tsc --noEmit` + its probe + FK-injection guard where flagged (P1/P2/P4/P5/P6).

**After Batch 1:** `quotes` → `finance/receipts` → `finance/cleaner-income` →
`finance/payroll` → `finance/pending` → `finance/audit-log` → `clients/analytics` →
the remaining ~118 EASY routes (`bookings/*`, `deals/*`, `jobs/*`, `schedules/*`,
`settings/*`). HARD tiers (admin-token / portal / cron / webhook) convert only after
their tenant-resolution path is explicit + verified (rollout-plan §4 Tiers 2–4).

**This doc converts nothing** — it is the live count + the ordered next step.
