# Expected-DNS-Target Column Design (tenant_domains)

**Author:** W1 (schema + backfill lane) · **Date:** 2026-07-12 · **Status:** FILE ONLY — design/spec. **No migration authored or run, no DB touched.** This resolves the open item flagged in [`uptime-dns-monitor-spec.md`](./uptime-dns-monitor-spec.md) §8 ("Decide the expected-DNS-target source of truth per tenant … likely wants a column … touches `tenant_domains` schema — W1 lane. **Flagging, not doing.**"). This file does the design; authoring the actual `063_*` migration + backfill is a follow-up the leader can green-light.

---

## 1. The gap this closes

The A3 monitor's **DNS probe (§3b)** must assert that each tenant domain resolves
to the **expected Vercel target** — not merely that it resolves. A `fetch`-based
check collapses "DNS wrong" into "unreachable"; a DNS probe that only checks
*resolvability* still can't tell a **correct** record from one pointing at a
stale/foreign target (the exact `SERVFAIL`/wrong-zone failure mode that darkened
`toll-trucks-near-me`, per BATCH-REVIEW-MANIFEST §"SITE STABILITY").

To assert "points at the right place," the monitor needs a **per-domain expected
target** to compare the live answer against. That value is not stored anywhere
today — it lives implicitly in Vercel's config. This spec persists it on
`tenant_domains` so the external watchdog can assert against a value **it owns**,
without calling the Vercel API on every probe (which would recouple the
independent watchdog to Vercel's availability + a token — the thing A3 exists to
avoid).

---

## 2. Why per-domain, and why on `tenant_domains`

The expected target differs **per domain**, not per tenant:

| Domain shape | Typical Vercel target | Record type |
|---|---|---|
| Apex / registrable root (`thenycmaid.com`) | Vercel's apex anycast IP | `A` |
| `www.` and other subdomains | `cname.vercel-dns.com` family | `CNAME` |
| Carrying domain (`<slug>.fullloopcrm.com`) | `cname.vercel-dns.com` family | `CNAME` |

A single tenant can own an apex **and** a `www` **and** a carrying domain, each
with a *different* expected record. The granularity is the domain — so the value
belongs on `tenant_domains` (the per-domain table), the same place `routing_mode`
/ `vercel_project` / `status` already live (migration 055). It is monitor metadata
the **resolver never reads**, exactly like `vercel_project` — so it inherits that
column's treatment (nullable, backfilled later, never gates enforcement).

---

## 3. Column design (matches the 055 precedent exactly)

Two columns, `text` + `CHECK` (NOT a native enum — same rule as
P1-SCHEMA-SPEC.md), added **nullable-first**:

```sql
-- Proposed for a follow-up 063_tenant_domains_dns_target.sql (NOT authored yet).
alter table tenant_domains
  add column if not exists dns_target_type text;      -- 'apex_a' | 'cname' | 'alias'
alter table tenant_domains
  add column if not exists dns_target text;            -- the expected value

alter table tenant_domains
  drop constraint if exists tenant_domains_dns_target_type_check;
alter table tenant_domains
  add constraint tenant_domains_dns_target_type_check
  check (dns_target_type in ('apex_a', 'cname', 'alias'));

comment on column tenant_domains.dns_target_type is
  'Expected DNS record type for this domain: apex_a (root -> Vercel anycast A), cname (subdomain/carrying -> cname.vercel-dns.com), alias (apex ALIAS/ANAME where the registrar supports it). Monitor metadata; the resolver never reads it.';
comment on column tenant_domains.dns_target is
  'Expected record value the A3 DNS probe asserts the live answer against (e.g. the Vercel apex IP for apex_a, or cname.vercel-dns.com for cname). Source of truth = Vercel domain-config API; do NOT hardcode.';
```

- **`dns_target_type`** — which record class the domain is provisioned for. Drives
  *what the monitor queries* (an `A`/`AAAA` lookup vs a `CNAME` lookup) and *how it
  compares* (IP equality vs hostname suffix match on the `vercel-dns.com` family).
- **`dns_target`** — the expected value itself. Kept as free `text` (not a second
  CHECK) because Vercel's recommended target can change and is region/plan
  dependent — pinning it in a CHECK would rot.

Both **nullable**, both **excluded from any NOT-NULL enforcement** (mirror the
`vercel_project` carve-out in 056): a NULL means "not yet backfilled," which must
never block schema enforcement or the resolver.

`updated_at` is already maintained by the `trg_tenant_domains_updated_at` trigger
from 055 — these columns get change-tracking for free.

---

## 4. Backfill: do NOT hand-derive — read Vercel's authoritative config

Apex-vs-subdomain detection by string parsing is a trap (multi-label public
suffixes like `co.uk`, tenants on subdomains of their own apex). **The
authoritative expected target is what Vercel itself publishes** for each domain:

- Vercel's domain-config endpoint (`GET /v6/domains/{domain}/config`, team-scoped)
  returns the **recommended** IPv4 / CNAME and whether the domain is currently
  `misconfigured`. That response — not a hand-rolled rule — is the source of truth.
- The backfill is the **same follow-up that finishes `vercel_project`** (both need
  the Vercel API token that's currently deferred — BATCH-REVIEW-MANIFEST §"OPEN
  DECISIONS: Vercel API token"). Bundle them: one pass over `tenant_domains`, per
  domain call the config API, write `vercel_project` + `dns_target_type` +
  `dns_target` together.

Interim (no token yet): a **conservative rule** is acceptable as a *starting*
value the monitor treats as "unverified," but it must be flagged as derived, not
authoritative:
- exactly-registrable apex → `apex_a` + Vercel's current published apex IP
- `www.*`, `*.fullloopcrm.com` carrying domains, any other subdomain → `cname` +
  `cname.vercel-dns.com`

> **Do not hardcode the apex IP from memory in the migration.** Confirm Vercel's
> current published apex A value from the dashboard or the config API at authoring
> time and put the confirmed value in the backfill. (`76.76.21.x` has been
> Vercel's apex family, but treat that as *verify-before-use*, not gospel — it is
> exactly the kind of version-specific external fact that goes stale.)

---

## 5. What the monitor does with these columns

Only rows with `status = 'active'` are asserted (skip `pending` / `archived`, so
the watchdog never pages on a domain not meant to be live):

1. Read the union of `tenants.domain` + `tenant_domains.domain` (per
   `uptime-dns-monitor-spec.md` §2), carrying each row's `dns_target_type` /
   `dns_target`.
2. For `dns_target_type = 'apex_a'`: resolve `A`/`AAAA` against ≥2 public
   resolvers; assert the answer set **contains** `dns_target`.
3. For `dns_target_type = 'cname'`: resolve `CNAME`; assert it ends in the
   expected `vercel-dns.com` target.
4. For `dns_target_type = 'alias'`: an apex `ALIAS`/`ANAME` record **flattens to
   `A`/`AAAA` at resolve time** (that is the whole point of ALIAS/ANAME — the
   registrar answers the apex with the target's `A` records). So the monitor
   resolves `A`/`AAAA` and asserts the answer set **contains** `dns_target`,
   exactly like `apex_a`. A backfilled-but-**wrong** alias is therefore a hard
   `mismatch`, distinguishable from a `NULL` (`unverified-target`) row — this
   closes the gap where `alias` was a CHECK-valid `dns_target_type` (§3) with no
   §5 compare rule, so a misconfigured alias could never page.
5. `NULL` target → emit an **`unverified-target`** info signal (not a page): the
   row hasn't been backfilled, so the monitor can only check resolvability, not
   correctness. This makes the coverage gap visible instead of silently passing.
6. On mismatch → the DNS alert names **observed vs expected** (both concrete
   values), so triage starts from a root cause, not "down."

---

## 6. Alternatives considered

- **Query Vercel live per probe (no column).** Rejected: recouples the
  independent watchdog to Vercel's API availability, rate limits, and a token —
  defeating A3's whole premise (survive the platform/its-vendors being degraded).
- **Store on `tenants` (per-tenant).** Rejected: wrong granularity — a tenant's
  apex and `www`/carrying domains need *different* expected records.
- **Native enum for `dns_target_type`.** Rejected: P1-SCHEMA-SPEC.md mandates
  `text` + `CHECK` so values stay plain and migrations stay reversible.
- **Second CHECK on `dns_target` value.** Rejected: Vercel's recommended target is
  external and can change; a value-CHECK would rot and cause false migration
  failures.

---

## 7. Open items for the leader / Jeff

- [ ] Approve authoring `063_tenant_domains_dns_target.sql` (add nullable) +
  its backfill, on the 055/056 nullable-first→backfill→(no-enforce) pattern.
- [ ] Provide the **Vercel API token** so the backfill can read authoritative
  recommended targets (shared blocker with the `vercel_project` full backfill).
- [ ] Confirm Vercel's **current** published apex A value at authoring time (do
  not trust a remembered IP).
- [ ] Confirm whether `www.` variants get their own `tenant_domains` rows or the
  monitor derives their expected target by convention (`cname` always).
