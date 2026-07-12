# Sitemap Live-Verification Plan — Post-Deploy Curl Runbook

**Author:** W3 · **Date:** 2026-07-12 · **Scope:** verification method + commands only (no route/config edits, no curls run here)
**Status:** runbook for LEADER/Jeff to execute AFTER a production deploy. Nothing here mutates code or config.
**Companions:** [`robots-sitemap-coverage-audit.md`](./robots-sitemap-coverage-audit.md) (static coverage read), [`post-deploy-probes.md`](./post-deploy-probes.md), [`seo-canonical-audit.md`](./seo-canonical-audit.md)

All paths relative to `platform/`. Line numbers as of this commit — re-anchor with `grep -n` before relying on them.

---

## ⚠ Premise correction (read first)

The queue item that spawned this plan referenced a **"nycmaid static .xml 404 risk."** That framing is **wrong**, and this plan corrects it so the verifier does not chase a non-issue.

`src/app/site/nycmaid/sitemap.xml` is **not a static file** — it is a **directory containing a Route Handler**:

```
src/app/site/nycmaid/sitemap.xml/route.ts   →  export async function GET() { … returns application/xml }
```

So `/site/nycmaid/sitemap.xml` is served by a live handler (same pattern as `src/app/site/template/sitemap.xml/route.ts`). The earlier coverage audit's **Finding 1 assumed a static file that might 404** — that assumption does not hold. The **real** residual risks for nycmaid are different and are covered in [§5](#5-nycmaid-deep-dive-the-highest-stakes-check):

- **500, not 404** — the handler imports several tenant data modules (`_lib/seo/locations`, `areas`, `services`, `blog-data`, `photos`). If any is emptied/renamed (the exact class of the 2026-07-08 SEO-registry wipe noted in `src/lib/seo/tenant-sitemap.ts:52-55`), the route throws at request time.
- **Near-empty `<urlset>`** — a handler that builds but enumerates almost nothing (data arrays emptied) returns HTTP 200 with a valid-but-hollow sitemap. A status-code-only check passes while indexing silently collapses.

Everything below verifies the **live HTTP behavior** that a file-only audit cannot.

---

## 1. How `/sitemap.xml` resolves (three classes)

Routing is decided in `src/middleware.ts` (`:308-327`). Every tenant falls into exactly one class:

| Class | Who | `/sitemap.xml` resolves to | Served by |
|---|---|---|---|
| **A. Rich** | 21 slugs in `TENANTS_WITH_RICH_SITEMAP` (`middleware.ts:312`) | rewrite → `/site/<slug>/sitemap.xml` | that tenant's `sitemap.ts` (20) or `sitemap.xml/route.ts` (nycmaid, 1) |
| **B. Generic** | every other active tenant (e.g. `wash-and-fold-hoboken`, `nyc-classifieds`) | rewrite → `/api/tenant-sitemap` | `src/app/api/tenant-sitemap/route.ts` (DB-driven, ~7 URLs) |
| **C. Main host** | `homeservicesbusinesscrm.com` (+ `www`) | no rewrite | global `src/app/sitemap.ts` |

`/robots.txt` is separate: middleware (`:329-337`) injects tenant headers and lets the **global** `src/app/robots.ts` emit a host-scoped robots whose `Sitemap:` line points back at that host's `/sitemap.xml`. **The robots `Sitemap:` URL and the actual sitemap URL must agree** — §6 cross-checks this.

---

## 2. The core check (per host)

For any tenant host `H`, three assertions:

```bash
# 1. Status + content-type: expect HTTP 200 and application/xml
curl -sS -o /dev/null -w '%{http_code} %{content_type}\n' "https://H/sitemap.xml"

# 2. Well-formed root element: expect a <urlset (or <sitemapindex) opener, NOT an HTML error page
curl -sS "https://H/sitemap.xml" | head -c 400

# 3. Non-trivial URL count: expect >= the floor for that class (see §5 for nycmaid)
curl -sS "https://H/sitemap.xml" | grep -c '<loc>'
```

**PASS** = `200` + `application/xml` (or `text/xml`) + body starts with `<?xml`/`<urlset`/`<sitemapindex` + `<loc>` count at/above the class floor.
**FAIL** = any non-200, an HTML `<!DOCTYPE html>` body (Next error page rendered at 200/404/500), `application/json` (an `/api/tenant-sitemap` error envelope — see §4), or a `<loc>` count of 0.

> Follow redirects deliberately, don't mask them. Run **without** `-L` first to see the raw code; a `301/308` to the canonical host is expected for apex↔www (§3) and is itself a thing to verify, not to hide.

---

## 3. Canonical host per tenant (apex vs www matters)

Middleware canonicalizes most hosts to **`www.`**, but three domains are **apex-canonical** (`APEX_CANONICAL_DOMAINS`, `middleware.ts:175-179`) — served at the bare apex, `www` redirects to apex:

```
consortiumnyc.com   ·   thenycmarketingcompany.com   ·   thenycinteriordesigner.com
```

Two things to verify for these three:

1. **Redirect direction** — `curl -sI https://www.<domain>/sitemap.xml` should `301/308` → apex, and the apex serves 200. (For www-canonical tenants it's the reverse.)
2. **`<loc>` host matches canonical** — ⚠ known defect: their sitemap generators hardcode `https://www.…` `<loc>` URLs even though the site canonicalizes to the **apex**. Confirmed in code for `the-nyc-marketing-company` (`sitemap.ts` base `https://www.thenycmarketingcompany.com`) and `consortium-nyc` (`https://www.consortiumnyc.com`); `the-nyc-interior-designer` uses a `TENANT_SEO` descriptor (confirm at deploy). This is the same www-vs-apex class as `seo-canonical-audit.md` Flag 4 — a sitemap advertising the non-canonical host dilutes indexing. **Check:** the first `<loc>` host must equal the canonical host.

```bash
# apex-canonical loc check — expect the apex host, NOT www.
curl -sS "https://consortiumnyc.com/sitemap.xml" | grep -m1 '<loc>'   # want <loc>https://consortiumnyc.com…
```

---

## 4. Class-A rich tenants — host matrix

Hosts below are extracted from each tenant's `sitemap.ts` / `route.ts` `BASE_URL` (or grepped from the site tree). **Grounded** = read directly from a hardcoded base in the sitemap generator. **Confirm** = the generator pulls from a `TENANT_SEO` descriptor or the code showed multiple candidate hosts — derive the live host at deploy time (see the derivation command below), do not assume.

| slug | canonical host (for `/sitemap.xml`) | source |
|---|---|---|
| nycmaid | www.thenycmaid.com | grounded (route.ts `BASE_URL`) |
| the-florida-maid | www.thefloridamaid.com | grounded |
| the-nyc-exterminator | thenycexterminator.com | grounded (apex in code) |
| nyc-mobile-salon | thenycmobilesalon.com | grounded (apex in code) |
| the-nyc-seo | www.thenycseo.com | grounded |
| consortium-nyc | **consortiumnyc.com** (apex) — loc emits www ⚠ | grounded + apex-canonical |
| the-nyc-marketing-company | **thenycmarketingcompany.com** (apex) — loc emits www ⚠ | grounded + apex-canonical |
| nyc-tow | www.thenyctowingservice.com | grounded |
| theroadsidehelper | www.theroadsidehelper.com | grounded |
| toll-trucks-near-me | www.tolltrucksnearme.com | grounded (⚠ also a KNOWN_PENDING orphan — confirm tenant is live) |
| we-pay-you-junk | www.wepayyoujunkremoval.com | grounded |
| the-home-services-company | www.thehomeservicescompany.com | grounded (⚠ ships a `sitemap-index.xml` too — verify the index + child) |
| nycroadsideemergencyassistance | www.nycroadsideemergencyassistance.com | grounded |
| fla-dumpster-rentals | www.fladumpsterrentals.com | grounded |
| debt-service-ratio-loan | www.debtserviceratioloan.com | grounded |
| sunnyside-clean-nyc | www.cleaningservicesunnysideny.com | grounded |
| wash-and-fold-nyc | www.washandfoldnyc.com | grounded |
| landscaping-in-nyc | www.landscapinginnyc.com | **confirm** (descriptor) |
| stretch-ny | (confirm — code shows `stretchjobs.com`, may not be the site host) | **confirm** (descriptor) |
| stretch-service | (confirm — shares stretch data; host ambiguous in code) | **confirm** (descriptor) |
| the-nyc-interior-designer | thenycinteriordesigner.com (apex) | **confirm** (descriptor + apex-canonical) |

**Derive the live host list instead of trusting the table** (canonical source of truth is the running site):

```bash
# For each rich slug, ask the platform subdomain what host its sitemap advertises,
# then verify the real custom domain. The platform subdomain always resolves:
for slug in the-nyc-exterminator the-florida-maid nycmaid nyc-mobile-salon the-nyc-seo \
  consortium-nyc the-nyc-marketing-company nyc-tow theroadsidehelper toll-trucks-near-me \
  we-pay-you-junk the-home-services-company nycroadsideemergencyassistance fla-dumpster-rentals \
  landscaping-in-nyc the-nyc-interior-designer debt-service-ratio-loan stretch-ny stretch-service \
  sunnyside-clean-nyc wash-and-fold-nyc; do
  host=$(curl -sS "https://${slug}.homeservicesbusinesscrm.com/sitemap.xml" | grep -m1 -oE 'https://[a-z0-9.-]+' | sed 's#https://##')
  printf '%-32s advertises %s\n' "$slug" "${host:-<none/err>}"
done
```

Cross-check each advertised host against `tenants.domain` / `tenant_domains` (the reconcile gate, `platform/scripts/reconcile-tenant-config.mjs`, already flags domain drift — run it to confirm the DB agrees before trusting these hosts).

---

## 5. nycmaid deep-dive (the highest-stakes check)

nycmaid is the flagship maid site and the only rich tenant served by a **Route Handler** rather than a `sitemap.ts`. Its handler (`sitemap.xml/route.ts`) enumerates a large cross-product: static pages + `AREAS` + `SERVICES` + `ALL_NEIGHBORHOODS` + blog + neighborhood job pages + **neighborhood × service** cross pages. That last loop makes the URL count **hundreds to low-thousands** — a healthy nycmaid sitemap is large.

```bash
H=www.thenycmaid.com
curl -sS -o /dev/null -w 'code=%{http_code} type=%{content_type}\n' "https://$H/sitemap.xml"
n=$(curl -sS "https://$H/sitemap.xml" | grep -c '<loc>'); echo "loc count = $n"
curl -sS "https://$H/sitemap.xml" | grep -c '<image:image>'   # image entries should be present too
```

- **PASS:** 200 + xml + `n` in the **hundreds+**, and the middleware rewrite is confirmed (the custom host serves the same body as `https://nycmaid.homeservicesbusinesscrm.com/sitemap.xml`).
- **FAIL — hollow:** 200 but `n` in the single digits → a data module (AREAS/SERVICES/NEIGHBORHOODS) emptied; the site indexes almost nothing. Set a **floor of 50** `<loc>` for nycmaid and alert below it.
- **FAIL — 500:** an import threw (emptied/renamed module) → the handler errors. This is the true nycmaid risk, not a 404.

---

## 6. robots.txt ↔ sitemap agreement (per host)

```bash
# The robots Sitemap: line must point at a URL that actually returns 200 xml.
smap=$(curl -sS "https://H/robots.txt" | grep -i '^Sitemap:' | awk '{print $2}' | tr -d '\r')
echo "robots advertises: $smap"
curl -sS -o /dev/null -w '%{http_code} %{content_type}\n' "$smap"   # expect 200 application/xml
```

FAIL if robots advertises a host/path that 404s, or advertises `www` while the sitemap canonicalizes to apex (the §3 defect surfaces here too).

---

## 7. Class-B generic-fallback tenants

For tenants NOT in `TENANTS_WITH_RICH_SITEMAP`, `/sitemap.xml` rewrites to `/api/tenant-sitemap`, which looks the tenant up by slug with `status = 'active'` and returns **404 JSON** if not found (`api/tenant-sitemap/route.ts:33-36`). So:

```bash
# Expect 200 application/xml with ~7 URLs. A 404 application/json means the tenant
# row isn't active (or slug mismatch) — routing is fine but the tenant is dark.
curl -sS -o /dev/null -w '%{http_code} %{content_type}\n' "https://<host>/sitemap.xml"
curl -sS "https://<generic-host>/api/tenant-sitemap?slug=<slug>" | head -c 300
```

`wash-and-fold-hoboken` (KNOWN_PENDING orphan) and `nyc-classifieds` (scaffold) live here by design — verify they resolve or are intentionally dark, not silently broken.

---

## 8. Pass/fail summary

| Check | Expect | Fail signal |
|---|---|---|
| Status + type (all hosts) | `200` + `application/xml` | non-200; `text/html`; `application/json` (class B = inactive tenant) |
| Root element | `<?xml … <urlset`/`<sitemapindex` | `<!DOCTYPE html>` (Next error page at 200) |
| `<loc>` count | ≥ class floor (nycmaid ≥ 50; generic ~7) | `0`, or single digits for a rich tenant |
| Canonical host in `<loc>` | matches middleware canonical (apex for the 3) | www advertised where apex is canonical (§3) |
| Redirect direction | www↔apex 301/308 to canonical, canonical serves 200 | redirect loop, or non-canonical serves 200 (dup content) |
| robots `Sitemap:` | resolves to a 200 xml on the same host | points at a 404 / wrong host |
| Rewrite parity | custom host body == `<slug>.homeservicesbusinesscrm.com` body | differ → middleware rewrite miss |

---

## 9. Sequencing

1. Deploy to production.
2. Run the §4 derivation loop against `*.homeservicesbusinesscrm.com` subdomains first — those always resolve and confirm the handlers build/serve regardless of DNS cutover state.
3. Run the reconcile gate (`node platform/scripts/reconcile-tenant-config.mjs` with the read-only token) to confirm the DB↔middleware host mapping agrees before trusting custom-domain results.
4. Run §2/§5/§6 against each custom domain that is DNS-live (cross-ref `dns-fix-checklist.md` for which are cut over).
5. Log any FAIL against the §8 table; the two pre-identified defects (nycmaid = 500/hollow risk, not 404; the 3 apex tenants advertising www `<loc>`) are the most likely hits.

---

## What this plan does NOT do

- **Runs nothing** — no curl was executed here; this is a pre-deploy runbook. Every command is for the operator to run post-deploy.
- **Does not fix** the www-vs-apex `<loc>` defect or any 500 — it detects them; remediation is a separate, approved change.
- **Does not validate per-URL correctness** (that every listed page 200s) — that is a deeper crawl, out of scope here; this verifies the sitemap *documents* serve and are non-hollow.
- **Assumes DNS/cutover state is read from** `dns-fix-checklist.md`; hosts not yet cut over will fail the custom-domain checks for DNS reasons, not sitemap reasons — verify via the platform subdomain instead.
