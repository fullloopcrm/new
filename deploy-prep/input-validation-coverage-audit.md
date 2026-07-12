# Input-Validation Coverage Audit — schema vs raw body at request boundaries

**Worker:** W6 · **Branch:** p1-w6 · **Date:** 2026-07-12
**Scope:** Docs-only. Measure how request bodies are validated at the API boundary — schema/library validation
vs. raw `request.json()` used directly — and isolate the true **mass-assignment** surface. No code or routes
changed. Gaps flagged in §4.

---

## TL;DR

- **GAP 1: there is no schema-validation library in the API at all.** Zero route files import `zod` (or
  `yup`/`joi`/`valibot`/`superstruct`/`ajv`), and **none of them is even a dependency in `package.json`.** The
  global TypeScript rules call for Zod at system boundaries; the codebase has none.
- **GAP 2: a homegrown validator exists but is applied to ~5% of the surface.** `src/lib/validate.ts` provides
  `validate(body, schema)` (whitelist + type + `min`/`max` + email/phone/uuid/date) and `pick(body, fields)` —
  a genuinely decent mass-assignment guard. Its own header says *"Prevents mass-assignment attacks on all API
  routes."* Reality: **15 of the 282** body-reading route files import it. **267 read the raw body without it.**
- **GAP 3 (concrete, confirmed): 5 routes pass the raw parsed body straight into a DB write** —
  `.update(body)` — which is unbounded column-level mass-assignment. Each is authenticated, permissioned, and
  **tenant-scoped in the `WHERE`**, so it is not a cross-tenant *read* hole — but the `SET` clause is unbounded,
  so a caller can set columns they shouldn't, **including `tenant_id`** (reassign the row to another tenant),
  `id`, timestamps, or any internal flag on that table. **Severity MEDIUM.** The 5:
  - `api/finance/expenses/[id]/route.ts:22` (money)
  - `api/referrals/[id]/route.ts:19`
  - `api/schedules/[id]/route.ts:53`
  - `api/reviews/[id]/route.ts:16`
  - `api/admin/announcements/[id]/route.ts:17` (admin-gated → lower)
- **GAP 4 (systemic): 267 hand-rolled routes have no consistent length caps or type coercion.** Missing/`max`
  checks mean oversized or wrong-typed input flows to Postgres and surfaces as a raw DB error — which is exactly
  the leak documented in `error-info-leak-audit.md`. Validation gaps and error-leak gaps compound.

**Method & honesty note:** the "267 without `validate`" and a coarser "225 raw-body **and** a DB write without
`validate`" are **upper bounds** — most of those 225 construct the insert/update object **explicitly**
field-by-field (e.g. `.update({ name: body.name, notes: body.notes })`), which is safe from mass-assignment even
without the helper. I did **not** hand-read all 267. The **confirmed** mass-assignment holes are the **5**
`.update(body)` sites, which I verified pass `request.json()` directly with no upstream `pick`/`delete`/field
construction. Counts are from grep (appendix); I read `validate.ts` and `finance/expenses/[id]` end-to-end.

---

## 1. The numbers (grep-verified)

| Metric | Count |
|---|---|
| API `route.ts` files total | 498 |
| Route files reading a raw body (`request.json()`/`req.json()`) | 282 |
| Route files importing a schema library (zod/yup/joi/valibot/superstruct/ajv) | **0** |
| Schema libraries present in `package.json` | **0** |
| Route files importing `@/lib/validate` | **15** |
| Body-reading files **not** using `@/lib/validate` | **267** |
| …of those, also doing a DB `insert/update/upsert` (upper-bound mass-assignment surface) | 225 |
| Raw body passed **directly** into `.update(body)` (confirmed mass-assignment) | **5** |

## 2. What `lib/validate.ts` gives you (verified — it's good, just unused)

`validate(body, schema)` returns `{ data, error }` and:
- **Whitelists** — only fields in the schema survive into `data` (drops unknown keys → mass-assignment guard).
- **Type-checks** — `string|number|boolean|array|email|phone|uuid|date|url`.
- **Bounds** — `min`/`max` (length for strings, value for numbers) → oversized-input guard.
- **Normalizes** — trims strings, lowercases emails.

`pick(body, fields)` is the lighter whitelist-only variant. Example of correct use (the ~5% that do it well):
`api/clients/route.ts:58` — `validate(body, { name: { type:'string', required:true, max:200 }, … })`.

The tool exists and is sound. The gap is **adoption**, not capability.

## 3. GAP 3 detail — the 5 `.update(body)` sites

Representative: `api/finance/expenses/[id]/route.ts` PUT (read end-to-end):
```
const { tenant } = await requirePermission('finance.expenses')   // ✅ authed + permissioned
const { id } = await params
const body = await request.json()                                // ⚠️ raw, unvalidated
if (body.amount) body.amount = Math.round(Number(body.amount)*100)
await supabaseAdmin.from('expenses')
  .update(body)                                                  // ❌ unbounded SET
  .eq('id', id).eq('tenant_id', tenant.tenantId)                 // ✅ WHERE tenant-scoped
```
- **Not** a cross-tenant read: the `WHERE` gates the row to the caller's tenant.
- **Is** column-level mass-assignment: the `SET` writes every key in `body`. A caller can send
  `{ tenant_id: '<other>' }` to **move the row to another tenant**, or set `id`/`created_at`/any column on
  `expenses`. On a money table that is a real integrity risk.
- **Fix (not applied):** whitelist before the write — `validate(body, {...})` or `pick(body, ['amount','notes',
  'category',…])` — so `tenant_id`/`id`/internal columns can never be set from the body.

The other four are the same shape; `admin/announcements/[id]` is admin-gated (lower audience), the rest are
operator/permission-gated. None sanitize the body upstream.

## 4. Flagged gaps (summary) — docs only, nothing applied

| # | Gap | Severity | Fix direction (leader/Jeff decides) |
|---|---|---|---|
| 1 | No schema-validation library in the API; none in `package.json` | MEDIUM (systemic) | Adopt `zod` (or standardize on `lib/validate`) at boundaries |
| 2 | `lib/validate` used in 15/282 body-reading routes (~5%) despite "all routes" intent | MEDIUM | Drive adoption on mutating routes first |
| 3 | 5 routes do raw `.update(body)` → column-level mass-assignment (incl. `tenant_id`) | **MEDIUM** | `pick`/`validate` before the write on all 5 |
| 4 | 267 hand-rolled routes lack consistent length caps / coercion | LOW–MEDIUM | Caps prevent oversized input + reduce DB-error leaks (see error-info-leak-audit) |

**Doing well (not gaps):** `lib/validate` is a real whitelist+type+bounds guard (not a stub); the money/PUT
routes are consistently **auth-gated, permission-gated, and tenant-scoped in the `WHERE`**, so the residual risk
is column-level mass-assignment on rows you already own — not tenant isolation failure. The fix is small and
local (whitelist the body), not architectural.

---

## Appendix — verification commands used

```
grep -rlE "from ['\"]zod['\"]" src/app/api | wc -l                     # 0 (and none in package.json)
grep -rlE "from ['\"]@/lib/validate['\"]" src/app/api | wc -l          # 15
grep -rlE '(request|req)\.json\(\)' src/app/api | wc -l                # 282
grep -rnE '\.(insert|update|upsert)\(\s*body\s*\)' src/app/api         # 5 update(body) sites
# per-file loop: body-reading files NOT importing lib/validate -> 267; of those with a DB write -> 225 (upper bound)
```

**Nothing in this audit was applied. No routes, validators, or dependencies were modified.**
