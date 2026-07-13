# Orphan Domains Audit — 22 protected-tenant domains vs `tenant_domains` model

**Worker:** W6 · **Branch:** p1-w6 · **Date:** 2026-07-12 · **Status:** docs only, read-only,
nothing applied, no DB queried.
**Scope:** cross-check the 22 domains named in `platform/scripts/verify-protected-tenants.mjs`'s
`PROTECTED` roster against the in-repo domain-routing model (`tenants.domain`, `tenant_domains` table,
`BESPOKE_SITE_TENANTS`, site folders), flag any domain string that's malformed/incomplete, and flag any
domain-to-tenant mapping that can't be confirmed without live DB access.

**Verification anchors read this pass:** `platform/scripts/verify-protected-tenants.mjs` (full file),
`platform/scripts/reconcile-tenant-config.mjs` (full file), `platform/src/lib/domains.ts:1-30`,
`platform/src/lib/migrations/043_tenant_domains.sql` (full file), `platform/src/lib/migrations/044_legacy_seo_gate.sql`
(full file), `platform/src/middleware.ts:381-408` (`BESPOKE_SITE_TENANTS`), `ls platform/src/app/site/`.

---

## 1. The domain-routing model (so the cross-check below makes sense)

Per `reconcile-tenant-config.mjs`'s own doc comment, there are **four** places that jointly decide
"which domain → which tenant → which site," and they can drift:

1. `tenants.domain` — single canonical domain column; the resolver checks this **first**.
2. `tenant_domains` (table, migration `043`) — the full alias set per tenant (`primary`/`neighborhood`/`generic`
   per `domains.ts`'s `TenantDomain.type`), resolver **fallback**.
3. `BESPOKE_SITE_TENANTS` (`src/middleware.ts`) — hardcoded slug set that decides which tenants get their
   own `/site/<slug>` folder vs the shared `/site/template`.
4. `src/app/site/<slug>/` — the actual folder that renders.

That same script's own comment says these have drifted before ("see the 2026-07-10 outage"). This audit
only checks what's possible **without a live DB connection** — i.e. sources 3 and 4, plus the static
`PROTECTED` roster's `domain` field (source 1/2's *intended* values, not their live state). Source
1/2's actual live rows are Jeff-gated (§4).

## 2. Malformed / incomplete domain strings in `PROTECTED`

`verify-protected-tenants.mjs`'s `PROTECTED` array pairs each of the 22 slugs with a `domain` field —
but that field is a **human-readable annotation for the script's own error messages**, not a value the
script (or anything else) validates or writes anywhere. Reading all 22 entries, **9 of 22 are not
well-formed domain strings**:

| Slug | `domain` field as written | Problem |
|---|---|---|
| `nyc-tow` | `nyctow` | No TLD — not a resolvable domain as written. |
| `wash-and-fold-nyc` | `washnfoldnyc` | No TLD. |
| `wash-and-fold-hoboken` | `hoboken laundry` | Not a domain at all — a description, contains a space. |
| `landscaping-in-nyc` | `landscapinginnyc` | No TLD. |
| `debt-service-ratio-loan` | `debtserviceratioloan` | No TLD. |
| `fla-dumpster-rentals` | `fladumpsterrentals` | No TLD. Cross-ref: `gated-wave-plan.md` Wave 6 names the real live domain as `fladumpsterrentals.com` (DNS-dark, needs nameserver repoint) — so the `.com` almost certainly belongs here, just dropped in this annotation. |
| `stretch-service` | `stretch service` | Not a domain — a description, contains a space. |
| `the-home-services-company` | `thehomeservicescompany` | No TLD. |
| `the-nyc-marketing-company` | `thenycmarketingcompany / consortium` | Two candidate names separated by `/` — ambiguous which (if either) is the live domain; possibly indicates this tenant and `consortium-nyc` share or overlap in branding. |

**This is not itself a production bug** — the field is documentation inside a build-time guard script,
not a value anything resolves against. But it means **this script cannot be used as a source of truth
for the 22 tenants' actual live domains** the way its presence might suggest; 9 of its 22 annotations are
placeholders/shorthand, not real domain strings. Recommend whoever owns this script either fills these
in properly (likely a 15-minute pass reading each tenant's live `tenants.domain` row) or drops the
`domain` field entirely so it stops looking like a verified registry it isn't.

## 3. Slug/domain mapping found to be inconsistent with current code (nycmaid)

Migrations `043_tenant_domains.sql` and `044_legacy_seo_gate.sql` both seed rows with
`where slug = 'the-nyc-maid'`:

```sql
-- 043_tenant_domains.sql
insert into tenant_domains (tenant_id, domain, active, is_primary, notes)
  select id, 'thenycmaid.com', true, false, '...'
    from tenants where slug = 'the-nyc-maid'
...
insert into tenant_domains (tenant_id, domain, active, is_primary, notes)
  select id, 'thenewyorkcitymaid.com', true, true, '...'
    from tenants where slug = 'the-nyc-maid'
```

But **every current, live reference to this tenant in the codebase uses slug `nycmaid`**, not
`the-nyc-maid`: `BESPOKE_SITE_TENANTS` in `middleware.ts`, the `PROTECTED` roster in
`verify-protected-tenants.mjs`, and the site folder itself (`src/app/site/nycmaid/`, not
`src/app/site/the-nyc-maid/`).

**Two possible explanations, and I cannot tell which from this worktree:**
1. The tenant's slug was `the-nyc-maid` when migrations `043`/`044` ran and was **renamed to `nycmaid`
   afterward** (migrations are `id`-scoped inserts/updates that ran once against the row that existed
   then — a later slug rename wouldn't retroactively break the already-inserted `tenant_domains` rows,
   since they're keyed by `tenant_id`, not slug). In this case: harmless, no orphan.
2. `the-nyc-maid` **never existed** as a slug — the migration's `where slug = 'the-nyc-maid'` matched
   **zero rows**, both `INSERT ... SELECT` statements silently inserted nothing (no error — `select ...
   from tenants where slug = 'the-nyc-maid'` returning zero rows makes the whole insert a no-op), and
   `thenycmaid.com` / `thenewyorkcitymaid.com` were **never seeded into `tenant_domains`** at all. In
   this case: `thenycmaid.com` (the flagship's own live-primary domain, per `PROTECTED`'s own
   `'thenycmaid.com — live primary'` annotation) could be resolving today purely via `tenants.domain`
   with **no `tenant_domains` backup row** — which matters because `gated-wave-plan.md` Wave 5's last
   step is "drop `tenants.domain` fallback," and if this domain has no `tenant_domains` row, dropping
   that fallback would break nycmaid's own domain resolution.

**This is exactly the kind of drift `reconcile-tenant-config.mjs` is built to catch (its "Drift B" check:
`tenants.domain` set but no matching active `tenant_domains` row) — but running it needs
`SUPABASE_ACCESS_TOKEN_FULLLOOP`, which this pass doesn't have. Flagging as the single highest-priority
item for whoever runs that script next, specifically for the `nycmaid` row, before Wave 5's fallback
drop.**

## 4. Cross-check summary — 22 domains vs tenant mapping

| Check | Result | Confidence |
|---|---|---|
| All 22 `PROTECTED` slugs have a `BESPOKE_SITE_TENANTS` entry | ✅ 22/22 match | In-repo, verified |
| All 22 `PROTECTED` slugs have a `src/app/site/<slug>/` folder | ✅ 22/22 match | In-repo, verified |
| All 22 `domain` annotations are well-formed resolvable domains | ❌ 13/22 well-formed, 9/22 malformed/ambiguous (§2) | In-repo, verified |
| Every domain has exactly one tenant claiming it in `tenant_domains` (no domain claimed by 2+ tenants) | 🔒 unknown | **Live-DB only** — this is `reconcile-tenant-config.mjs`'s "Drift F" check |
| Every one of the 22 tenants has a `tenants.domain` value AND a matching active `tenant_domains` row | 🔒 unknown, with nycmaid specifically flagged as at-risk (§3) | **Live-DB only** — "Drift A"/"Drift B" |
| Any live tenant domain with NO tenant mapping at all (truly orphaned) | 🔒 unknown | **Live-DB only** |
| Any tenant with NO domain at all | 🔒 unknown | **Live-DB only** |

**No domain was found, in-repo, to have zero tenant mapping, and no tenant was found to have zero domain
reference** — but that's a statement about what this repo's static roster *claims*, not what prod
actually has. The only way to answer the last four rows of the table above is to run
`platform/scripts/reconcile-tenant-config.mjs` against prod (needs `SUPABASE_ACCESS_TOKEN_FULLLOOP` in
`~/.env.local` — Jeff-gated, not available in this worktree) or a direct read-only `SELECT` against
`tenants`/`tenant_domains`.

## 5. Recommended next step (file-only; not run this pass)

Once `SUPABASE_ACCESS_TOKEN_FULLLOOP` is available to whoever runs this:

```
node platform/scripts/reconcile-tenant-config.mjs
```

Read its CRIT-severity output first — it directly flags domains claimed by multiple tenants (Drift F)
and bespoke-routed tenants with a missing folder (Drift C), then the WARN-tier `tenants.domain` vs
`tenant_domains` split-brain (Drift A/B) that §3 above flags nycmaid as a likely candidate for. This
audit's in-repo findings (§2, §3) are exactly the hypotheses that script's live run would confirm or
rule out — pair them.
