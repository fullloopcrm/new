# Input-Validation Audit — route params & query strings (the `params` half)

**Worker:** W6 · **Branch:** p1-w6 · **Date:** 2026-07-12
**Scope:** Docs-only. Companion to the existing body audit. Where
[`input-validation-coverage-audit.md`](./input-validation-coverage-audit.md) measured **request bodies**
(schema vs raw `request.json()`), this file covers the surface that doc explicitly scoped out: **route params
(`[id]`) and query strings (`searchParams`)** — how they are (not) validated before they reach the database
layer. No code or routes changed.

> **Relationship — read both together.** The body audit owns POST/PUT payload mass-assignment (its GAP 3: the 5
> raw `.update(body)` sites). This audit does **not** re-litigate those. It covers a **different, mostly-new
> finding class**: user input that arrives via the **URL** — path segments and query params — and is
> interpolated into PostgREST filters or pagination math. The highest-severity item here (`.or()` filter-string
> interpolation) is **not mentioned in the body audit at all.**

---

## TL;DR

- **NEW / highest severity — PostgREST `.or()` filter-string injection.** `supabase.or(\`…\`)` takes a
  **filter DSL string, not bound parameters.** 16 sites build that string with `${…}` interpolation; **5 of
  them interpolate a user-supplied search term straight from a query param.** The cleanest example is
  tenant-user-facing:
  `api/clients/route.ts:27` — `query.or(\`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%\`)`
  where `search = url.searchParams.get('search')` (raw, line 13). Commas, parentheses and dots are **structural**
  in the DSL, so a crafted `search` can add/alter filter terms or reference other columns, and malformed syntax
  yields a raw PostgREST 400 (feeds the error leak in `error-info-leak-audit.md`). **Severity MEDIUM–HIGH,
  needs a live-DB exploit check to fix the ceiling** (see §4). Tenant isolation itself holds structurally — the
  `.eq('tenant_id', …)` is ANDed *outside* the injected OR group — so this is intra-tenant filter manipulation
  + error-leak, **not** a cross-tenant read (verified by reading the query builder end-to-end).
- **Route-param `[id]` is passed to `.eq('id', id)` unvalidated at 217 sites.** Because PostgREST **binds** the
  `.eq()` value, this is **not** SQL/PostgREST injection. The real effect: a non-UUID `id` on a `uuid` column
  makes Postgres throw a parse error that surfaces as a raw 500 (`error.message`) — a DoS-flavored annoyance and
  another error-leak feeder, **not** a data-integrity hole. **Severity LOW.**
- **Pagination params are `parseInt`'d with no NaN guard.** `parseInt(searchParams.get('page') || '1')` returns
  `NaN` for `page=abc`; `offset = (NaN-1)*limit = NaN` flows into `.range(NaN, NaN)` → PostgREST error. Present
  in `clients`, `bookings`, `security/events`, `portal/availability`, others. **Severity LOW** (error, not
  breach). `limit` is at least clamped with `Math.min(…, 200)` in the good examples.
- **Doing well:** `.ilike('col', \`%${value}%\`)` (the *value*-argument form, ~19 phone/name lookups) is
  **safe** — the second arg is a bound value, not filter DSL; only `%`/`_` wildcards are in play (low). Most
  query params are read into locals and used via bound `.eq()`, not string-built filters.

---

## 1. The numbers (grep-verified, `src/app/api`, 498 route files)

| Metric | Count |
|---|---|
| Route files reading `searchParams` | 117 |
| Route files reading a route param (`params: Promise<…>` / `await params`) | 105 |
| `.eq('id', id)` — route param bound into a query | 217 |
| `.or(\`…${…}…\`)` — interpolated PostgREST filter-string sites | **16** |
| …of those interpolating a **query-param-derived** search term (user-facing) | **5** |
| `.ilike('col', \`%${…}%\`)` — value-arg form (bound, low risk) | ~19 |

## 2. `.or()` injection — why it's the one that matters

PostgREST's `.or()` / `.filter()` accept a **DSL string** (`col.op.value,col.op.value`). Unlike `.eq(col, val)`
— where `val` is bound — everything inside the `.or()` string is parsed as **query structure**. Interpolating
untrusted input into it is the PostgREST analogue of string-concatenated SQL.

**Confirmed user-facing site — `api/clients/route.ts` GET (read end-to-end):**
```
const search = url.searchParams.get('search') || ''          // ⚠️ raw query param
let query = supabaseAdmin.from('clients')
  .select('*', { count: 'exact' })
  .eq('tenant_id', tenantId)                                  // ✅ tenant AND (outside the OR)
  .range(offset, offset + limit - 1)
if (search) {
  query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)  // ❌ DSL injection
}
```
- **Not cross-tenant:** the tenant `.eq()` is ANDed with the whole OR group, so injected OR terms cannot escape
  the tenant filter. Good.
- **Is intra-tenant filter manipulation + error-leak:** a `search` containing `,` `)` `.` can inject extra
  filter terms (e.g. reference columns the search was never meant to touch) or break the parse → raw 400/500.
- **The 5 user-facing sites** (highest → lower audience): `clients/route.ts:27` (tenant users), then admin-gated
  `admin/clients:25`, `admin/comhub/search-recipients:25/31`, `admin/activity:32`, `admin/ai-chat:169` /
  `ai/assistant:172`. Admin gating lowers audience but not the class.
- **Fix direction (not applied):** escape the PostgREST reserved chars in `search` before interpolation
  (strip/encode `, ( ) .` or reject them), or move the search to a bound RPC / full-text `textSearch`. Small,
  local, per-site.

## 3. Route-param & pagination handling (lower severity, documented for completeness)

- **`[id]` → `.eq('id', id)` (217 sites):** bound by PostgREST, so no injection. A malformed UUID throws a
  Postgres parse error → raw 500. Fix is a cheap `UUID_RE.test(id)` guard (the regex already exists in
  `lib/validate.ts`) returning 400 — also trims the error-leak surface. LOW.
- **`parseInt(searchParams…)` with no NaN check:** `page=abc` → `NaN` → `.range(NaN,…)` error. Guard with
  `Number.isFinite` / default. LOW.

## 4. Flagged gaps — docs only, nothing applied

| # | Gap | Severity | Fix direction (leader/Jeff decides) |
|---|---|---|---|
| P1 | `.or()` filter-string built from raw query param (`clients` + 4 admin) — PostgREST DSL injection | **MEDIUM–HIGH** ¹ | Escape/reject PostgREST reserved chars in the term, or use bound RPC / `textSearch` |
| P2 | 217 `.eq('id', id)` with unvalidated route param → raw DB parse error on bad UUID | LOW | `UUID_RE.test(id)` → 400 before the query |
| P3 | `parseInt(searchParams…)` → `NaN` into `.range()` (pagination) | LOW | `Number.isFinite` guard + clamp (limit already clamped in good cases) |

¹ **Honesty note on the ceiling:** I rate P1 MEDIUM–HIGH *pending a live-DB exploit check*. Structurally the
tenant AND holds (not cross-tenant); the realized impact of a crafted `search` (extra filter terms vs.
error-only) depends on PostgREST's parser behavior for the injected fragment, which I did **not** exercise
against a running DB. If a term can reference an arbitrary column within the tenant it's HIGH; if it only
errors, it's MEDIUM. Verify before deciding fix priority.

---

## Appendix — verification commands used

```
grep -rlE "searchParams" src/app/api --include=route.ts | wc -l                 # 117
grep -rlE "await params|params: Promise<" src/app/api --include=route.ts | wc -l # 105
grep -rn "\.eq('id', id)" src/app/api | wc -l                                   # 217
grep -rnE "\.or\(\`" src/app/api | grep '\${' | wc -l                            # 16 interpolated
grep -rlE "\.or\(\`" src/app/api | xargs grep -l searchParams | wc -l            # 5 query-param-fed files
sed -n '9,32p' src/app/api/clients/route.ts                                     # read the builder end-to-end
```

**Nothing in this audit was applied. No routes, validators, or dependencies were modified.** Body-side
mass-assignment (the `.update(body)` 5) lives in `input-validation-coverage-audit.md`; one of them (`reviews`)
is now codified by `src/app/api/reviews/input-validation.witness.test.ts`.
