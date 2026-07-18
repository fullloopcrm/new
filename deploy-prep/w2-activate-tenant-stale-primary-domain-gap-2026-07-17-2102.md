# W2 gap/fluidity refresh — 2026-07-17 21:02

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). Continues from `w2-nycmaid-stop-block-plus-remaining-telnyx-phone-reads-2026-07-17-2050.md`.

Leader's fresh 3-deep queue this round (20:54 LEADER->W2): (1) new fresh-ground surface. (2) continue whichever surface (1) opens up. (3) keep gap/fluidity current.

## (1) — new fresh-ground surface: `activate-tenant.ts`'s own `tenant_domains` write never reconciles a stale primary

The sms_number/telnyx_phone carry-forward class was declared exhaustively closed last round, whose own closing note recommended re-pointing this lane at domain resolution itself (last fresh-audited at 15:24, several rounds ago — re-verified clean at the *read* side back then). Rather than re-run that same read-side audit, went back to the WRITE side of `tenant_domains` — the single-primary invariant fixed earlier today (`a46e8698`, `w2-tenant-domains-single-primary-invariant...`) only touched ONE of the table's two write sites.

**Bug:** `activate-tenant.ts`'s own domain-routing step (§8, `POST /api/admin/businesses/:id/activate` and the two other callers) upserts `tenant_domains` rows with `onConflict: 'domain', ignoreDuplicates: true` — and the file's own docstring explicitly guarantees activation is "safe to hit repeatedly." That guarantee is real for every OTHER step, but not for `is_primary`: `ignoreDuplicates` means the upsert can never flip `is_primary` on a row that already exists from a prior run.

Concretely: a tenant first activates on the free `<slug>.fullloopcrm.com` subdomain (no `tenant.domain` set yet) — the carrying-domain row lands `is_primary: true`, since there's no custom domain yet. Later the admin sets `tenant.domain` (a legitimately editable field, per `admin/businesses/[id]/route.ts`'s allowlist) to the tenant's real purchased domain and clicks Activate again — exactly the documented "safe to hit repeatedly" path. The new custom-domain row inserts with `is_primary: true`, but the OLD carrying-domain row from the first run is untouched by `ignoreDuplicates` and stays `is_primary: true` too. Two active primaries, reproducing the exact non-determinism class `a46e8698` fixed for `admin/websites` POST — except `getPrimaryTenantDomain()`'s oldest-wins defense-in-depth (also from that round) means the OLD subdomain wins deterministically forever, silently defeating the entire point of the new custom domain across `tenantSiteUrl()`, invoice/quote/document send links, SMS branding, and the SELENA agent's brand override. Same failure shape if a tenant activates WITHOUT a custom domain, later buys one, and re-runs activation — the more common real-world order.

Grepped every `is_primary`-writing call site in the repo to confirm these are the only two: `admin/websites` POST (already fixed) and `activate-tenant.ts` (fixed this round). `client_contacts.is_primary` / `client_properties.is_primary` are a different table, already correctly demote-then-set, not part of this class.

**Fixed:**
1. **`lib/domains.ts`** — extracted the demote-then-set logic already inlined in `admin/websites` POST into a new exported `reconcilePrimaryDomain(tenantId, intendedPrimaryDomain)`: demotes every OTHER active `is_primary` row for the tenant, then ensures the intended domain is flagged primary. Centralizing it means a second write site can share the invariant instead of re-deriving its own copy (and any future third site can too).
2. **`lib/activate-tenant.ts`** — after the upsert's existing landed/contested read-back, computes `intendedPrimary = customHost || carryHost` and calls `reconcilePrimaryDomain()` when that domain actually landed on this tenant (guards against calling it when the domain is contested by another tenant). Wrapped in try/catch, logged not thrown — matches this step's existing "best-effort, never blocks activation" contract; a reconcile failure degrades to the pre-fix behavior (stale primary persists) rather than failing the whole activation run.

**Verification:**
- `npx tsc --noEmit` clean.
- `npx eslint` on all 3 touched/new files: 0 warnings.
- New `lib/domains.reconcile-primary.test.ts`, 4 cases against the real mutating `tenant-isolation-harness` (not `domains.test.ts`'s stateless resolve() mock — this function's job is a two-step mutation a stateless callback can't model): the exact activate-tenant.ts re-run scenario (stale primary demoted, new one promoted), a **WRONG-TENANT PROBE** (reconciling tenant A never touches tenant B's primary row), a no-op-when-already-correct case, and a multi-stale-primary case (two prior runs each leaving a primary behind, all demoted down to one).
- Mutation-verified: `git diff` isolated to the two changed lib files → `git apply -R` → re-ran the new test file, confirmed RED for the right reason (`reconcilePrimaryDomain is not a function`, all 4 cases) → `git apply` → re-ran, confirmed GREEN. `npx tsc --noEmit` re-confirmed clean post-reapply.
- Full repo suite run in background at time of writing this doc — result to be confirmed in the leader-channel follow-up if it surfaces a regression; `domains.test.ts` (existing 15 cases), `route.normalization.test.ts`, and `route.duplicate-domain.test.ts` (the other two `tenant_domains` write-path suites) all re-ran green in the targeted run before the full-suite kickoff.
- 1 commit this round (pending): `domains.ts` + `activate-tenant.ts` + new test file.
- File-only, no push/deploy/DB write. No DB migration needed — this is app-level reconciliation, not a schema change (the DB-level unique-partial-index migration from the earlier single-primary round, `2026_07_17_tenant_domains_single_primary.sql`, is still prepared-but-not-run, unchanged by this fix).

## (2) — what (1) opens up: nothing further, the `is_primary` write-side class is now genuinely exhausted

Confirmed by the same grep above: `admin/websites` POST and `activate-tenant.ts` were the ONLY two `tenant_domains.is_primary` writers in the repo. Both now share the same reconcile logic. No third site to continue onto.

## (3) — gap/fluidity kept current

Nothing else new to report. The sms_number/telnyx_phone carry-forward class remains exhaustively closed per the 20:50 doc.

## NOTICED — not fixed, flagging for the leader/Jeff

Unchanged from the 20:50 doc, still open:
1. The DELETE/reactivate gap on `tenant_domains` — still open, product-call framing unchanged (soft-deactivate + reactivate + minimal UI action, per the 19:56 doc's scoping recommendation, still awaiting Jeff's go-ahead since it requires a product judgment call this lane shouldn't make unilaterally).
2. `lib/tenant-schema.ts` — still confirmed dead code.
3. The compliance-gated `platformFallback` question (JEFF-MORNING-QUEUE.md, 15:17 2026-07-17) — still open, untouched.
4. `bookings/batch/route.ts`'s platform-fallback anomaly — still untouched, gated on #3.

## MISSING-FEATURE GAPS / UX-FRICTION

- Nothing new this round beyond the bug fix above.

## Remaining candidates, not yet fixed (fresh ground for a future round)

- With `is_primary` write-side now closed and the read-side resolvers re-confirmed clean at 15:24, the tenant-resolution surface (my original lane) is looking thoroughly hardened end-to-end — both directions, both write sites. A future round should likely either unblock one of the two gated product/compliance questions above (#1, #3), or pivot fresh-ground hunting outside tenant-resolution entirely, mirroring the 10:04 round's approach (checking whole bug classes — RBAC, IDOR, injection, webhook signatures, SSRF — rather than another pass over this specific table).
