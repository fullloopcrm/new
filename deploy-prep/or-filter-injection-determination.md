# PostgREST `.or()` Filter-String Injection — Exploitability Determination

**Worker:** W6 · **Branch:** p1-w6 · **Date:** 2026-07-12
**Scope:** Docs-only determination + a codified guard test (`src/lib/postgrest-or-filter.test.ts`)
and a fix primitive (`src/lib/postgrest-or-filter.ts`). **No route files were modified.**
Closes W6's open MEDIUM-HIGH item: *is the `.or()` filter-string injection exploitable, and does it
cross tenants?*

---

## TL;DR — the call

- **Injectable? YES.** Every flagged site interpolates a raw, user-controlled search string into a
  PostgREST `.or()` filter. A `search` value containing `,` `(` `)` `.` is parsed as filter *syntax*,
  not a literal term. This is real and demonstrable.
- **Cross-tenant? NO — structurally impossible on the current code shape.** In all tenant-scoped sites the
  tenant filter is a **separate `.eq('tenant_id', …)` call**, which PostgREST/`postgrest-js` emits as its
  own top-level query param that is **AND-ed** with the injectable OR group. The injection is confined
  *inside* the single `or=(…)` param and cannot reach, drop, or override the tenant predicate. Verified in
  library source (below).
- **Severity as actually-exploitable: LOW.** The realistic impact is (1) query-breaking → HTTP 500 with a
  PostgREST `error.message` echoed to the caller (schema/info leak), and (2) widening one's *own* tenant
  result set (no privilege gain — the caller already reads their whole tenant's clients). No cross-tenant
  read, no write, no auth bypass.
- **Severity as latent risk: MEDIUM.** It is **one refactor away from a BLOCKER.** If anyone moves tenant
  scoping *inside* an `.or()`, or introduces a top-level `.or()` without a sibling tenant `.eq()`, the
  isolation guarantee evaporates silently. The fix is cheap; ship it as defense-in-depth.
- **Fix:** double-quote + backslash-escape the interpolated value (parameterize). Primitive provided:
  `buildIlikeOrFilter()` in `src/lib/postgrest-or-filter.ts`. Wiring it into the 6 routes is a separate,
  gated code change (touches live route files) — **not applied here**.

---

## 1. The vulnerable pattern and the exact sites

The canonical form (client search):

```ts
query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
```

`search` is raw user input from a query string. Confirmed sites:

| # | File:line | Input source | Tenant scope | Auth |
|---|---|---|---|---|
| 1 | `src/app/api/clients/route.ts:27` | `?search` | `.eq('tenant_id')` **line 22** (adjacent) | `getTenantForRequest` (Lax cookie/Clerk) |
| 2 | `src/app/api/admin/clients/route.ts:25` | `?search` | **optional** `tenant_id` — cross-tenant by design | `requireAdmin` (super-admin) |
| 3 | `src/app/api/admin/comhub/search-recipients/route.ts:25,31` | `?q` | `.eq('tenant_id')` **line 24/30** (adjacent) | `requireAdmin` + `getCurrentTenantId` |
| 4 | `src/app/api/admin/activity/route.ts:32` | `?q` (audit_logs) | **optional** `tenant_id` — cross-tenant by design | `requireAdmin` (super-admin) |
| 5 | `src/app/api/admin/ai-chat/route.ts:169` | tool `query` arg | `.eq('tenant_id')` **line 168** (adjacent) | `requireAdmin` + tenant |
| 6 | `src/app/api/ai/assistant/route.ts:172` | tool `query` arg | `.eq('tenant_id')` **line 171** (adjacent) | tenant-scoped |

Sites 2 and 4 are **intentionally cross-tenant super-admin views** — there is no per-tenant boundary to
cross there; the only concern is injection→error/DoS, same as everyone else. Sites 1/3/5/6 are
tenant-scoped and are the ones where "cross-tenant" would matter — and where the separate `.eq('tenant_id')`
makes it impossible (§3).

---

## 2. Why it is injectable — the parse surface, with payloads

`.or(filters)` in `@supabase/postgrest-js` does exactly:

```js
// node_modules/@supabase/postgrest-js/dist/index.mjs
or(filters, { referencedTable } = {}) {
  const key = referencedTable ? `${referencedTable}.or` : "or";
  this.url.searchParams.append(key, `(${filters})`);   // one param, URL-encoded
  return this;
}
```

So the whole user-influenced string becomes the value of a **single** `or=(…)` query param.
PostgREST then parses the content of `(…)` as a comma-separated condition list where `and()`/`or()` group.

**The attack is entirely about the characters PostgREST treats as structural** — `,` `.` `:` `(` `)`.

### Payload A — inject an extra predicate (condition-count changes)

`search = x,status.eq.vip` produces:

```
name.ilike.%x,status.eq.vip%,email.ilike.%x,status.eq.vip%,phone.ilike.%x,status.eq.vip%
```

PostgREST top-level-splits this on commas into **6** conditions, several of them `status.eq.vip%` —
predicates the endpoint never intended. (Codified as a WITNESS in the test: a benign 3-condition filter
becomes >3, and a `status.eq.*` predicate appears.)

### Payload B — open a grouping

`search = x,or(email.ilike.%a%` injects an attacker `or(` group into the filter tree.

### Payload C — attempt cross-tenant (fails, see §3)

`search = a%,tenant_id.neq.<other-uuid>,name.ilike.%b` — tries to add a `tenant_id.neq` predicate. Even
though the raw string *does* place `tenant_id.neq.<other>` **inside the OR group**, it is still AND-ed with
the outer `tenant_id=eq.<caller>` param, so it changes nothing about which tenant's rows are visible (§3).

### What it can actually do

- **Break the query** → PostgREST returns a parse error; the route does `NextResponse.json({ error:
  error.message }, { status: 500 })` → **PostgREST error text (schema/column hints) is echoed to the
  caller.** This is the only genuine *disclosure* here, and it is low-grade (tracked more broadly in
  `deploy-prep/error-info-leak-audit.md`).
- **Widen the caller's own result set** within their tenant (e.g. match rows they'd already be allowed to
  read). No escalation: `select('*')`/fixed columns on the *same tenant's* `clients` table return nothing
  the caller couldn't already fetch by searching normally.
- **Mild DoS** via a pathological pattern (expensive `ilike`), bounded by `.range()`/`.limit()`.

### What it CANNOT do

- **No SQL injection.** PostgREST parameterizes at the SQL layer; `.or()` injection is *PostgREST-filter*
  injection, not SQL. You cannot reach arbitrary SQL, `;`, comments, or other tables' raw rows.
- **No cross-table read.** `select` embeds are not configured on these queries, so `foreigntable.col.op.val`
  references have nothing to bind to.
- **No writes.** These are all `GET`/read builders.

---

## 3. Tenant-isolation boundary analysis (the load-bearing part)

**Claim:** on the current code shape, no `search`/`q` value can return another tenant's rows.

**Why.** PostgREST composes chained filters with **AND** at the top level. The tenant-scoped routes do:

```ts
supabaseAdmin.from('clients')
  .eq('tenant_id', tenantId)     // → param:  tenant_id=eq.<caller>
  .or(`…${search}…`)             // → param:  or=(…<search>…)
```

which becomes the SQL predicate:

```
tenant_id = '<caller>'  AND  ( …injectable OR group… )
```

The attacker only controls the **contents of the OR group**. Two independent facts make the tenant
predicate unreachable:

1. **Different query param.** `.eq('tenant_id')` emits `tenant_id=eq.<caller>` as its *own* param;
   `.or()` emits `or=(…)` as another. The user string lives only inside `or=(…)`.
2. **URL-encoding of the OR value.** `searchParams.append('or', '(' + filters + ')')` percent-encodes the
   value, so an injected `&`, `=`, or extra param name cannot break out to create a *sibling* top-level
   param (e.g. it cannot emit a second `tenant_id=` or delete the existing one). Injected `)`/`,` are
   decoded server-side but remain **inside** the `or` group's scope.

Therefore even the "best" cross-tenant payload — putting `tenant_id.neq.<other>` inside the OR group —
yields `tenant_id = <caller> AND ( … OR tenant_id <> <other> )`. For any returned row the outer
`tenant_id = <caller>` still must hold. **No leak.**

**The caveat that makes this MEDIUM, not LOW, as a latent risk:** this guarantee is a property of the
*call shape*, not of any escaping. It holds only while (a) tenant scoping stays a **separate** `.eq()` and
(b) nobody puts the tenant predicate *inside* a user-influenced `.or()`. Both are easy to violate in a
refactor with zero visible failure. That is why the isolation invariant is now pinned by a static scan in
the guard test (`ISOLATION INVARIANT` block): if any of the four tenant-scoped search routes loses its
adjacent `.eq('tenant_id')`, the test goes RED.

---

## 4. Severity call

| Lens | Rating | Rationale |
|---|---|---|
| Cross-tenant read/write | **None** | Structurally AND-ed tenant filter (§3) |
| Info disclosure | **LOW** | PostgREST `error.message` echo on a broken filter (schema hints) |
| Integrity / privilege | **None** | Read-only; own-tenant scope; no auth surface touched |
| Availability (DoS) | **LOW** | Pathological `ilike`, bounded by range/limit |
| **Latent / regression risk** | **MEDIUM** | One refactor from a real cross-tenant hole; no defense-in-depth today |

**Deploy verdict:** NOT a deploy blocker on its own. Fix is cheap and should ship as hardening +
defense-in-depth; pair with the error-message-leak remediation so a broken filter stops echoing PostgREST
internals.

---

## 5. The fix — parameterize / escape

PostgREST allows a filter value to be **double-quoted**, which forces reserved characters inside it to be
literal; inside the quotes only `\` and `"` need backslash-escaping, and `%`/`_` stay LIKE wildcards. That
is exactly what an `ilike` search wants.

Provided primitive (`src/lib/postgrest-or-filter.ts`):

```ts
export function escapePostgrestFilterValue(value: string): string {
  const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  return `"${escaped}"`
}

export function buildIlikeOrFilter(columns: readonly string[], search: string): string {
  const safeValue = escapePostgrestFilterValue(`%${search}%`)
  return columns.map((col) => `${col}.ilike.${safeValue}`).join(',')
}
```

Recommended wiring (separate gated change — **touches live route files, not applied here**):

```ts
// before
query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
// after
query = query.or(buildIlikeOrFilter(['name', 'email', 'phone'], search))
```

Apply to all six sites (`name/email/phone[/address]` column sets vary per site). The escaped output for
`search = x,status.eq.vip` is `name.ilike."%x,status.eq.vip%",…` — the payload is trapped as one literal
term; PostgREST top-level-splits it into exactly the intended N conditions (proven in the GUARD block of
the test).

**Behaviour note:** after the fix, a user's own `%`/`_` remain wildcards (unchanged from today). If literal
`%`/`_` matching is ever desired, escape those too — out of scope here.

### Defense-in-depth (from the CSRF audit, restated)

Independent of this fix, an `Origin` allowlist for mutating methods and finishing the error-message-leak
remediation both reduce blast radius if the isolation invariant is ever violated. See
`deploy-prep/csrf-coverage-audit.md` and `deploy-prep/error-info-leak-audit.md`.

---

## 6. What was codified vs. left open

- **Codified (this change):**
  - Fix primitive `buildIlikeOrFilter` / `escapePostgrestFilterValue` + full unit guard.
  - WITNESS that raw interpolation is injectable (condition-count model).
  - GUARD that the escaped builder neutralizes comma/paren/quote/tenant_id payloads.
  - ISOLATION INVARIANT static scan over the 4 tenant-scoped search routes.
- **Left open (gated, needs leader/Jeff approval — live route edits):**
  - Wiring `buildIlikeOrFilter` into the 6 routes.
  - Suppressing raw PostgREST `error.message` in these routes' 500 responses.

**Nothing in this determination was applied to any route, cookie, or middleware.**
