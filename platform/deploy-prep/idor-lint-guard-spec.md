# IDOR Lint Guard — Spec (PROTOTYPE)

**Author:** W3 · **Status:** prototype, non-blocking · **Date:** 2026-07-12

Executable companion: `src/lib/idor-route-guard.ts` (analyzer),
`src/lib/idor-route-guard.test.ts` (fixtures + tree ratchet),
`src/lib/idor-route-guard.baseline.json` (frozen current-tree offender set).

---

## 1. The bug class this detects

The platform runs **every** query through the Supabase `service_role` key, which
**bypasses Row-Level Security** (documented in `src/lib/tenant-db.ts`). Cross-
tenant isolation therefore depends entirely on each route remembering to add
`.eq('tenant_id', …)`. A query that filters a tenant-owned row by **`id` alone**
will return — or mutate/delete — **another tenant's row** if the caller supplies
that row's id. That is a textbook **Insecure Direct Object Reference (IDOR)**.

The fleet keeps rediscovering instances of this by hand. The goal here is a
**CI guard so a new route cannot reintroduce it** — turn a recurring manual
finding into a mechanical one.

### Vulnerable shape (flagged)

```ts
await supabaseAdmin.from('bookings').select('*').eq('id', id).single()
// no .eq('tenant_id', …) → any tenant's booking id leaks that booking
```

### Safe shapes (must NOT be flagged)

```ts
// 1. explicit sibling tenant scope (order-independent)
await supabaseAdmin.from('bookings').select('*').eq('tenant_id', t).eq('id', id)

// 2. auto-scoping wrapper — injects tenant_id implicitly
await tenantDb(t).from('bookings').update(u).eq('id', id)

// 3. cross-tenant-by-design table keyed by its own id
await supabaseAdmin.from('tenants').select('*').eq('id', tenantId).single()
```

---

## 2. Heuristic

Pure text analysis (no TS AST, no DB connection). For each source file:

1. Find every `.from(` occurrence.
2. Identify the **chain root**:
   - `supabaseAdmin.` / `supabase.` → **unscoped** (service_role, RLS-bypassing) → in scope.
   - `tenantDb(...).from` or a `db`/`tdb` alias → **auto-scoped** → skip (safe).
   - `Buffer.from` / `Array.from` / `.storage.from(bucket)` → not a DB table → skip.
   - Anything else we cannot positively identify as unscoped → **skip** (conservative:
     only flag chains we are confident bypass RLS).
3. **Capture the full fluent chain** forward across whitespace/newlines by
   balancing parens (this codebase omits semicolons, so `;` is not a reliable
   terminator). The chain ends where the next non-whitespace char after a
   segment is not `.`.
4. Flag the chain iff **all** hold:
   - it has `.eq('id', …)` **or** `.in('id', …)`, AND
   - it has **no** sibling `.eq('tenant_id', …)`, AND
   - the `.from('<table>')` name is **not** in `CROSS_TENANT_TABLES`.

### `CROSS_TENANT_TABLES` allowlist

Tables that are cross-tenant by design (no `tenant_id`, or keyed by the tenant's
own id). An over-broad allowlist is how a real IDOR slips through, so every entry
needs justification and must track the DB schema:

| table | why exempt |
|---|---|
| `tenants` | keyed by the tenant's own id — self-scoping |
| `inquiries`, `leads`, `prospects`, `waitlist` | pre-tenant funnel, cross-tenant by design |
| `platform_settings` | global singleton config |
| `changelog` | global product changelog |
| `impersonation_events` | platform audit log (admin-only) |

Source of truth for the first four: the `tenant-db.ts` header comment
("Platform tables that have no tenant_id … must still use supabaseAdmin
directly"). The rest were confirmed empirically during the current-tree scan.

---

## 3. Current-tree findings (2026-07-12 scan)

- **178** raw flagged chains across **123** unique `file::table` signatures.
- **24** under `/api/admin/**` (super-admin, frequently cross-tenant by design).
- **99** non-admin signatures — the higher-suspicion set.

**These 178 are NOT confirmed vulnerabilities.** A large share are expected
false positives (see §4). The baseline freezes them as *candidates pending
triage*; the guard's job is only to stop the surface from **growing**.

> Signal for the leader/fleet: this is the **full candidate IDOR surface** the
> heuristic can see in one place. Triaging the 99 non-admin signatures against
> the FP modes below is the natural follow-up to the fleet's ad-hoc findings —
> but it is a security-audit task, out of scope for this detector prototype.

---

## 4. Precision / recall envelope (honest limits)

### False positives (safe code flagged)
- **Ownership proven by a prior fetch.** e.g.
  `.from('bookings').select('tenant_id').eq('id', bookingId)` fetches the row
  precisely to check its tenant downstream. Single-chain analysis can't see the
  later comparison, so it flags it.
- **Super-admin routes** operating cross-tenant by design under `/api/admin/**`.
- **Genuinely global tables** not yet in the allowlist.

### False negatives (unsafe code missed)
- **Split / reassigned builders:** `let q = supabaseAdmin.from('x'); q = q.eq('id', id)`
  — the `.eq('id')` is on a separate statement, so the chain capture misses it.
- **Dynamic table names:** `.from(tableVar)` — no literal to classify.
- **Ownership faked via `.or(...)`** or an RPC that the regex treats as opaque.
- **Non-`id` object keys** (e.g. `.eq('slug', …)`, `.eq('token', …)`) — this
  prototype only models the `id` primary-key vector.

Because both error classes are real, this ships as a **reporting prototype with
a ratchet**, never an authoritative "0 IDORs" claim.

---

## 5. The ratchet (what actually runs in CI)

`idor-route-guard.test.ts` has two layers:

1. **Fixture tests** — deterministic proof the analyzer flags the unsafe shape
   and passes all three safe shapes + the non-DB `.from(` cases. These verify
   the detector logic itself.
2. **Tree ratchet** — scans the live route tree and asserts
   `current_signatures \ baseline == ∅`. Adding a new route (new file → new
   `file::table` signature) that reads a tenant-owned table by id without a
   tenant scope **fails the test**. Removing/fixing an existing one shrinks the
   set and passes (fixes are never punished).

This test rides the existing **unfiltered vitest CI gate** (like
`jsonld-sink-guard.test.ts` and `ci-full-suite-guard.test.ts`). **No
`.github/workflows` file is edited** — a dedicated blocking job is Jeff-gated.

**Blind spot of the `file::table` signature:** a *second, different* IDOR chain
on the same table in an already-baselined file won't trip the ratchet. Accepted
for the prototype; a chain-hash signature would close it at the cost of
refactor-noise.

---

## 6. Graduation path to a real gate (Jeff-gated)

1. **Triage the 99 non-admin signatures** → move confirmed-safe tables into
   `CROSS_TENANT_TABLES`, fix real IDORs, shrinking the baseline toward ∅.
2. **Adopt `tenantDb(...)`** in routes (currently **0** routes use it) so the
   safe path is the default and the analyzer's safe-root branch does real work.
3. **Add the `.eq('slug'|'token'|'code', …)` vectors** once the `id` vector is clean.
4. Only after the baseline is small and understood: propose a dedicated
   `idor-guard` job (or `--reporter` annotation) in `ci.yml` — a **workflow
   edit**, so it goes to Jeff.

Until then: prototype, non-blocking beyond the ratchet, informative.
