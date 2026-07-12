# Sitemap www-vs-apex defect — post-deploy detection step

**SEO sign-off item.** A single discrete go/no-go check for the www-vs-apex sitemap
defect. Part of the post-deploy suite; complements §3 of
`sitemap-live-verification-plan.md` (this file is the dedicated, runnable detector).

**Status: file-only. Detection is post-deploy (needs the live domains). Fix is authored below but NOT applied — reviewed change required.**

---

## The defect (confirmed in code)

Three tenant domains are **apex-canonical** — served at the bare apex, `www` is *not*
the canonical (and per the middleware comment, not cleanly served at all). They are
enumerated in `APEX_CANONICAL_DOMAINS`, `platform/src/middleware.ts:175-179`:

```
consortiumnyc.com   ·   thenycmarketingcompany.com   ·   thenycinteriordesigner.com
```

For a host in that set, the apex→www 301 in middleware is **skipped** (guard
`!APEX_CANONICAL_DOMAINS.has(canonicalHost)`, `middleware.ts:187`). The site is
therefore canonical at the apex. But each site's sitemap generator **hardcodes a
`https://www.…` base**, so every `<loc>` advertises the non-canonical www host:

| Tenant slug | Sitemap base (www — WRONG) | File:line |
|---|---|---|
| `consortium-nyc` | `https://www.consortiumnyc.com` | `src/app/site/consortium-nyc/sitemap.ts:4` |
| `the-nyc-marketing-company` | `https://www.thenycmarketingcompany.com` | `src/app/site/the-nyc-marketing-company/sitemap.ts:4` |
| `the-nyc-interior-designer` | `https://www.thenycinteriordesigner.com` | `src/app/site/the-nyc-interior-designer/_lib/siteData.ts:4` (`SITE_DOMAIN`, consumed by its `sitemap.ts`) |

### Why it matters

The `www` host for these three is not served by the app. Vercel `307`s `www`→apex
(if www DNS/cert exist) **or it fails outright** (migrated builds where www was never
provisioned). Either way the sitemap lists URLs that are not the canonical host:

- Best case: every submitted URL is a redirect → Google Search Console flags "Page
  with redirect" for the whole sitemap; indexing of the canonical apex URLs is
  diluted / delayed.
- Worst case: `www` doesn't resolve → the entire sitemap is dead URLs (soft-404 /
  unreachable), effectively no sitemap coverage for that tenant.

Same class as `seo-canonical-audit.md` Flag 4.

---

## Detection (run post-deploy, per domain)

For each of the three apex domains, assert that **every `<loc>` host equals the apex**
(no `www.`), and probe what `www` actually does.

```bash
# Run WITHOUT -L so redirects/failures are visible, not masked.
for D in consortiumnyc.com thenycmarketingcompany.com thenycinteriordesigner.com; do
  echo "=== $D ==="

  # 1. Sitemap must serve 200 xml at the APEX.
  curl -sS -o /tmp/sm.xml -w 'apex /sitemap.xml -> HTTP %{http_code} %{content_type}\n' \
    "https://$D/sitemap.xml"

  # 2. CORE ASSERT: no <loc> may contain www.  (defect present == non-zero count)
  BAD=$(grep -oE '<loc>https?://[^<]+' /tmp/sm.xml | grep -c '://www\.' || true)
  TOTAL=$(grep -c '<loc>' /tmp/sm.xml || echo 0)
  echo "  <loc> total=$TOTAL  www-host=$BAD   -> $([ "$BAD" -eq 0 ] && echo PASS || echo FAIL)"

  # 3. What does www actually do? (307->apex is tolerable-but-dirty; failure is a hard finding)
  curl -sS -I -o /dev/null -w '  www/sitemap.xml -> HTTP %{http_code} (redirect: %{redirect_url})\n' \
    "https://www.$D/sitemap.xml" || echo "  www/sitemap.xml -> UNREACHABLE (DNS/cert failure) — HARD FINDING"
done
```

### Pass / fail

| Result | Meaning |
|---|---|
| **PASS** | `<loc> www-host = 0` for all three, apex serves 200 xml. Defect is fixed. |
| **FAIL (soft)** | `www-host > 0` **and** `www` `307`s to apex. Sitemap works via redirect but advertises the wrong host — fix before relying on GSC coverage. |
| **FAIL (hard)** | `www-host > 0` **and** `www/sitemap.xml` is unreachable / 4xx / cert error. Sitemap points at dead URLs — that tenant effectively has no sitemap. |

As of this writing the code guarantees **FAIL** (all three bases are `www.`); the only
open question post-deploy is soft-vs-hard, decided by whether `www` resolves.

---

## Fix (authored — do NOT apply here; reviewed change)

One-line edit per file: drop `www.` from the hardcoded base so `<loc>` matches the
apex canonical host. No logic change.

```diff
# src/app/site/consortium-nyc/sitemap.ts:4
-const BASE = "https://www.consortiumnyc.com";
+const BASE = "https://consortiumnyc.com";

# src/app/site/the-nyc-marketing-company/sitemap.ts:4
-const BASE = "https://www.thenycmarketingcompany.com";
+const BASE = "https://thenycmarketingcompany.com";

# src/app/site/the-nyc-interior-designer/_lib/siteData.ts:4
-export const SITE_DOMAIN = "https://www.thenycinteriordesigner.com";
+export const SITE_DOMAIN = "https://thenycinteriordesigner.com";
```

**Before applying, check `SITE_DOMAIN`'s other consumers** in
`the-nyc-interior-designer/_lib/siteData.ts` — it feeds the sitemap here, but if the
same constant is also used for canonical/OG tags or JSON-LD, the apex switch must be
correct for all of them (it should be — apex is the canonical host — but verify the
constant isn't relied on to be `www` anywhere, e.g. an absolute asset URL). `consortium-nyc`
and `the-nyc-marketing-company` use a sitemap-local `BASE`, so those two are self-contained.

After the fix, the detection block above should report **PASS** for all three.

---

## What this step does NOT cover

- Other tenants (all www-canonical) — their sitemaps *should* emit `www.` and are checked
  in `sitemap-live-verification-plan.md` §3–§4, not here.
- Whether `www` DNS *should* be provisioned for these apex domains — that's a
  DNS/infra decision (see `dns-fix-checklist.md`), separate from making the sitemap
  advertise the canonical host. Fixing the sitemap base is correct regardless.
