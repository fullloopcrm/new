# SECURITY DEFINER RPC + raw-HTML/email audit

**Author:** W3 (reconcile-gate lane) · file-only, no push/deploy/DB · 2026-07-12
**Scope:** repo-defined SQL functions under `platform/src/lib/migrations/*.sql` and
raw-HTML injection sinks under `platform/src/`. Read-only static audit.

> **Completeness caveat (read this first).** This audit enumerates functions that
> exist **as migration files in the repo**. Functions/RPCs created **directly in the
> Supabase dashboard** are NOT in the repo and are therefore invisible to a file
> scan. To enumerate the *live* set authoritatively, run the `pg_proc` query in
> §4 against the project — it needs the Management-API token
> (`SUPABASE_ACCESS_TOKEN_FULLLOOP`), which is **absent in this worktree**, so that
> live step is deferred to whoever holds the token (leader/Jeff). Everything below
> is the file-visible truth.

---

## 1. SECURITY DEFINER functions (repo-defined)

A repo-wide grep for `SECURITY DEFINER` across all 74 migrations returns exactly
**two** function definitions, both in
`platform/src/lib/migrations/039_atomic_ledger_and_hardening.sql`.

`SECURITY DEFINER` means the function runs with the **owner's** privileges and
**bypasses RLS**. Two things must therefore be verified for each: (a) does it
re-check tenant scope internally rather than trusting a caller-supplied tenant,
and (b) is `search_path` pinned (an unpinned `search_path` on a DEFINER function
is a known Postgres privilege-escalation vector — a caller can create a shadowing
object in a schema earlier on the path).

### 1.1 `post_journal_entry(...)` — `039:14` — **HIGH (flag)**

```
CREATE OR REPLACE FUNCTION post_journal_entry(
  p_tenant_id UUID, p_entity_id UUID, p_entry_date DATE, p_memo TEXT,
  p_source TEXT, p_source_id UUID, p_created_by UUID, p_lines JSONB
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$ ... $$;
GRANT EXECUTE ON FUNCTION post_journal_entry(...) TO authenticated, service_role;
```

| Check | Result |
|---|---|
| Tenant source | **Caller-supplied `p_tenant_id`** — written verbatim into `journal_entries.tenant_id` / `journal_lines.tenant_id`. |
| Internal tenant re-check | **NONE.** No comparison of `p_tenant_id` against the JWT `tenant_id` claim; no membership check. |
| `search_path` pinned | **NO.** References unqualified `entities`, `journal_entries`, `journal_lines`. |
| Grant | `authenticated` **and** `service_role`. |

**Why this is a flag.** The function is `SECURITY DEFINER` (bypasses RLS) **and**
granted to `authenticated`. An authenticated client can call
`post_journal_entry(<any other tenant's id>, …)` with a self-balancing set of
lines and write journal entries **into another tenant's ledger** — the deferred
balance trigger only checks debits == credits, not tenant ownership. It trusts a
caller-supplied tenant with no internal scope check: exactly the pattern the audit
was asked to flag.

**Mitigating fact (not a fix).** The application invokes this only via
`service_role` (`supabaseAdmin`) with a server-resolved `p_tenant_id`, so the live
call path is currently safe. The `authenticated` grant is a **latent** cross-tenant
write vector that does not depend on an app bug — only on an authenticated client
reaching the RPC directly (PostgREST `/rest/v1/rpc/post_journal_entry`).

**Recommended remediation (prepare as a migration file; leader runs DDL):**
- Drop the `authenticated` grant so only `service_role` can execute:
  `REVOKE EXECUTE ON FUNCTION post_journal_entry(UUID,UUID,DATE,TEXT,TEXT,UUID,UUID,JSONB) FROM authenticated;`
  **and/or**
- Add an internal assertion when a JWT is present, e.g. reject if
  `current_setting('request.jwt.claims',true)::jsonb->>'tenant_id'` is set and
  `<> p_tenant_id::text`.
- Pin `search_path`: add `SET search_path = public, pg_temp` to the function.

### 1.2 `cpa_token_bump_usage(p_token TEXT)` — `039:86` — **LOW (note)**

```
CREATE OR REPLACE FUNCTION cpa_token_bump_usage(p_token TEXT) RETURNS VOID
LANGUAGE SQL SECURITY DEFINER AS $$
  UPDATE cpa_access_tokens SET last_used_at = NOW(),
    use_count = COALESCE(use_count,0)+1 WHERE token = p_token; $$;
GRANT EXECUTE ON FUNCTION cpa_token_bump_usage(TEXT) TO authenticated, service_role;
```

| Check | Result |
|---|---|
| Tenant source | No tenant column; keyed by the **bearer `token`** itself (the token *is* the credential). |
| Internal tenant re-check | N/A — token possession is the authz. |
| `search_path` pinned | **NO.** References unqualified `cpa_access_tokens`. |
| Grant | `authenticated` and `service_role`. |

**Assessment.** Not a cross-tenant scope hole — you must already know the token to
affect its row, and the only effect is bumping `use_count` / `last_used_at`. Minor
residual: an authenticated caller who knows/guesses a token could inflate its
`use_count` (mild abuse if a use-cap is ever enforced on that column). **Fix:** pin
`search_path = public, pg_temp` for hardening consistency with 1.1.

### 1.3 All other functions — SECURITY INVOKER (default), **not flagged**

The remaining `CREATE FUNCTION`s in migrations are **`SECURITY INVOKER` by default**
(no `SECURITY DEFINER` clause), so they run as the calling role and RLS applies —
no privilege escalation. For the record they are:

- **Trigger fns:** `fn_block_booking_overlap` (015), `invoices_set_updated_at` /
  `invoices_recompute_paid` (027), `routes_set_updated_at` (028),
  `deals_stage_change_tracker` (029), `recurring_expenses_updated_at` (030),
  `documents_updated_at` (031), `check_journal_balance` (032), `entities_updated_at`
  (034), `periods_updated_at` / `check_period_lock` / `audit_row_changes` (035 &
  038), `prospects_updated_at` (037), `refresh_team_member_rating` (050),
  `quotes_set_updated_at` (026).
- **Report/helper fns:** `count_errors_by_severity` (006), `seo_run_detection`
  (2026_07_04 & 2026_07_05), `seo_money_keywords` (2026_07_05).

None of these are `SECURITY DEFINER`; none re-derive or escalate tenant scope.

---

## 2. Raw-HTML / `dangerouslySetInnerHTML` inventory

Repo-wide: **501 occurrences across 214 files.** The overwhelming majority are SEO
JSON-LD (`__html: JSON.stringify(schema)`) rendered from **static, operator-authored
`_data/*` modules** — not user input. Below they are separated into *safe*,
*weak-but-static*, and *genuine content sinks*.

### 2.1 SAFE — hardened JSON-LD serializer (canonical)
- `src/app/site/template/_components/JsonLd.tsx` —
  `JSON.stringify(schemas).replace(/</g, '\\u003c')`. The `<`→`<` escape blocks
  the `</script>` breakout that bare `JSON.stringify` allows. Has a regression test
  (`JsonLd.test.tsx`). **This is the pattern every JSON-LD injection should use.**
  (Hardened in commit `cf17dc25`.)

### 2.2 WEAK-but-static — per-site JSON-LD helpers — **LOW / monitor** — ✅ HELPERS HARDENED (p1-w3)
- `src/app/site/theroadsidehelper/_lib/schema.ts` `jsonLd()` / `graph()` = **bare
  `JSON.stringify`, no `<`-escape.** Plus many per-site pages with inline
  `__html: JSON.stringify(...)` (nyc-mobile-salon, the-nyc-seo, the-nyc-exterminator,
  landscaping-in-nyc, we-pay-you-junk, JsonLd components under nycmaid /
  wash-and-fold-hoboken, etc.).
- **Risk:** none today — every input is static site content. **Latent XSS** the moment
  any of these schemas is fed tenant- or user-sourced strings containing `</script>`.
- **Recommendation:** route all JSON-LD through the hardened `template/_components/JsonLd.tsx`
  helper (or copy its `.replace(/</g,'\\u003c')`); don't hand-roll `JSON.stringify`.
- **REMEDIATION (p1-w3):** added canonical serializer `safeJsonLd()` to
  `src/lib/escape-html.ts` (`JSON.stringify(x).replace(/</g,'\\u003c')`, unit-tested).
  Hardened **every reusable per-site JSON-LD helper** — the 6 bare `JsonLd` components
  (`components/site`, `components/marketing`, `wash-and-fold-nyc`, `nycmaid`,
  `wash-and-fold-hoboken`, `the-florida-maid`) now call `safeJsonLd()`; the 11 `_lib/schema`
  serializers (theroadsidehelper `jsonLd`+`graph`, nycroadsideemergencyassistance, nyc-tow,
  debt-service-ratio-loan, landscaping-in-nyc, consortium-nyc, the-nyc-marketing-company,
  stretch-service, stretch-ny, the-nyc-interior-designer, `src/lib/schema.tsx`) now inline the
  canonical `.replace(/</g,'\\u003c')` escape. Every page routing through these helpers is now
  latent-XSS-proof. (`template/_components/JsonLd.tsx` and `we-pay-you-junk` were already hardened.)
- **RESIDUE — NOT swept (documented safe, per "leave purely-static blocks documented as safe"):**
  ~166 site pages still hand-roll `__html: JSON.stringify(...)` **inline** (not via a helper) —
  overwhelmingly static operator SEO content (nyc-mobile-salon, the-nyc-seo, the-nyc-exterminator,
  fla-dumpster-rentals, nyc-classifieds, etc.). These carry **no user/tenant data today**, so they
  are LOW and left as-is rather than mechanically edited across 166 files. **Constraint:** any new
  JSON-LD (esp. anything DB/user-sourced — e.g. nyc-classifieds porch posts / business profiles)
  MUST use `safeJsonLd()`, never a bare `JSON.stringify`.

### 2.3 SAFE — per-tenant theme CSS
- `src/app/site/template/layout.tsx:61` `__html: buildThemeCss(config.theme)`.
  `buildThemeCss` (`template/_config/theme.ts:63`) passes every value through
  `safeColor()` before interpolating into `:root{…}`. Config-sourced but validated →
  no CSS-injection breakout. **Guarded; no action.**

### 2.4 GENUINE raw-HTML content sinks — **MEDIUM / monitor**
- **AI dashboard message render** — `src/app/dashboard/ai/page.tsx:112`:
  `__html: m.content.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br />')`.
  Only bold + newline are transformed; **the rest of `m.content` is NOT
  HTML-escaped.** Assistant output (which can echo user-supplied text) is rendered as
  raw HTML in the **operator dashboard** → a real DOM-XSS sink. Operator-only surface
  limits blast radius, but any `<img onerror>` / `<script>` in `m.content` executes.
  **Fix:** HTML-escape `m.content` first, then apply the bold/newline transforms (or
  use a vetted markdown renderer with sanitization).
- **Blog paragraph injection** — `__html: p` where `p` is a
  `post.sections[].paragraphs[]` string, in four blog `[slug]` pages:
  `site/nycmaid/nyc-maid-service-blog/[slug]`,
  `site/wash-and-fold-hoboken/(marketing)/nyc-maid-service-blog/[slug]`,
  `site/the-nyc-interior-designer/blog/[slug]`,
  `site/the-florida-maid/florida-maid-service-blog/[slug]`.
  Source is **static content modules** (operator-authored; contains intentional inline
  `<a>` links — the reason it's raw HTML). Low risk today; **becomes XSS if blog
  content is ever moved to the DB / made user-editable.** Track as a constraint on
  future CMS work.
- **REMEDIATION (p1-w3):** verified all 4 source `post` from local `_lib` modules with
  **zero DB/supabase access** → confirmed purely static. Left the raw HTML **as-is on
  purpose** — `escapeHtml()` would destroy the intended inline `<a>` links. Instead each
  block now carries an inline `SAFE:` comment stating it is static/operator-authored and
  spelling out the "sanitize the moment this goes DB-sourced or user-editable" constraint.

### 2.4b Full raw-HTML content-sink inventory — **verified static (p1-w3, second pass)**

Follow-up sweep of **every** `dangerouslySetInnerHTML` that injects a bare field/string
(not JSON-LD, not a serializer). All confirmed **static, operator-authored**, with raw HTML
used deliberately for inline `<a>` links / HTML entities (`&amp;`, `&apos;`, `&#9733;`).
Hardening with `escapeHtml()` would **corrupt** the intended markup, so these are
**verify-safe + documented**, not escaped:

- **Additional blog `__html: p` / `paragraph` pages** (4, beyond the §2.4 four): top-level
  `nyc-maid-service-blog/[slug]`, `debt-service-ratio-loan/blog/[slug]`,
  `landscaping-in-nyc/blog/[slug]`, `the-home-services-company/blog/[slug]`. Sources are
  local static modules (`@/lib/seo/blog-data`, `_lib/blogPosts`, `_data/blog-posts`) with
  **zero DB/supabase**. Each now carries the same inline `SAFE:` + CONSTRAINT comment.
- **Inline-literal-array sinks** — data literal and sink **colocated in the same file**, so
  the value is provably static (would require rewriting the page to become dynamic):
  `nyc-tow` + `nycroadsideemergencyassistance` careers/pricing/services (`item.desc`,
  `item.detail`, `item.body`, `req`); `the-home-services-company` `page.tsx` (`card.title`,
  `card.desc`) and `pricing` (`item.a`); `sunnyside-clean-nyc` FAQ (`faq.answer`, via the
  `L()` link helper); `wash-and-fold-nyc` `[slug]/[service]` (`b.icon`, HTML-entity glyphs).
  Lowest risk of the set (data literal and sink colocated). Each sink now also carries an
  inline `SAFE:` note pointing back to this section.
- **ALREADY HARDENED (no action):** `nyc-classifieds/blog/[slug]/BlogPostClient.tsx` `md()`
  **escapes first** (`escHtml(s)` then bold/link transforms, `safeHref()` on the URL) —
  correct even if `post.content` were dynamic. `dashboard/ai` render + `render-assistant-markdown`
  escape (§2.4 / prior commits).
- **CONSTRAINT (unchanged):** any of these that migrates to DB-sourced / user-editable content
  MUST switch to `escapeHtml()` (text) or a sanitizing markdown renderer before shipping.

### 2.5 SAFE-ish — static third-party script tags
- GA/`gtag`, MS Clarity, Tawk.to, `dataLayer` injections in various `site/*/layout.tsx`
  (`__html: \`…\``) are **hardcoded strings**; the only interpolations are build-time
  env IDs (`GA_ID`, `CLARITY_ID`). Not user data. **Accepted.**

---

## 3. Email templates — unescaped data interpolation — **MEDIUM (flag)**

The email layer builds HTML bodies by string-interpolating customer/tenant data
with **no HTML-escaping helper anywhere** (grep for `escapeHtml` / `sanitize` /
`DOMPurify` across `src/lib/*email*`, `proposal-email.ts`, `agreement.ts`,
`notify.ts`, `nycmaid/email-templates.ts` → **zero hits**).

Representative sinks in `src/lib/email-templates.ts` (`baseTemplate` + the 14
templates that call it):
- Text into element bodies: `${data.clientName}`, `${data.serviceName}`,
  `${data.address}`, `${data.tenantName}`, `${data.discountCode}`,
  `${data.teamMemberName}` — interpolated **raw** into HTML.
- **Into HTML attributes** (worse — allows attribute breakout on a `"`):
  `<img src="${data.logoUrl}" alt="${data.tenantName}">` (`:28`),
  `<a href="${data.feedbackUrl}">` (`:134`),
  `<a href="${data.unsubscribeUrl}">` (`:35`).

**Impact.** This is HTML/content injection into email, not classic XSS — modern
email clients don't execute `<script>`. But a malicious `clientName` / `address`
(customer-controlled fields) can inject phishing `<a>` links or break layout, and an
unvalidated `logoUrl` / `feedbackUrl` containing a `"` can break out of the
attribute. Same pattern repeats in `nycmaid/email-templates.ts`, `proposal-email.ts`,
`agreement.ts`, `notify.ts`.

**Recommendation:** add a small `escapeHtml()` and wrap all text interpolations;
validate/allowlist the URL fields (`logoUrl`, `feedbackUrl`, `unsubscribeUrl`) as
`https:` URLs before placing them in `src`/`href`.

---

## 4. Live enumeration query (deferred — needs the Mgmt token)

Run this when `SUPABASE_ACCESS_TOKEN_FULLLOOP` is available to catch any
**dashboard-defined** SECURITY DEFINER functions the repo scan can't see, and to
confirm which pin `search_path`:

```sql
select n.nspname as schema,
       p.proname  as function,
       pg_get_function_identity_arguments(p.oid) as args,
       p.prosecdef as security_definer,
       (p.proconfig::text like '%search_path%') as search_path_pinned
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where p.prosecdef                       -- SECURITY DEFINER only
  and n.nspname not in ('pg_catalog','information_schema')
order by 1,2;
```

Expected from the repo today: `post_journal_entry` and `cpa_token_bump_usage`, both
with `search_path_pinned = false`. **Any additional rows** are dashboard-authored and
must be audited the same way (tenant-scope re-check + `search_path`).

---

## 5. Cross-tenant self-attack suite — regression status

Re-ran the cross-tenant self-attack suite (read-only, TEST secrets via `vi.hoisted`)
on branch `p1-w3`:

```
src/lib/tenant-header-sig.test.ts       13 passed
src/lib/cross-tenant-db.test.ts         58 passed
src/lib/cross-tenant-attack.test.ts     27 passed
src/lib/cross-tenant-resolver.test.ts   16 passed
────────────────────────────────────────────────
Test Files  4 passed (4)
Tests       114 passed (114)
```

**GREEN — 114/114.** Covers forged/cross-tenant signed headers, super vs per-tenant
capability tokens, impersonation cookie, client-portal session, team-portal &
referrer-portal bearer tokens, foreign-id DB isolation, and the request resolver. No
guard weakened.

---

## 6. Summary of findings

| # | Item | Severity | State |
|---|---|---|---|
| 1.1 | `post_journal_entry` trusts caller-supplied `p_tenant_id` + granted to `authenticated` + unpinned `search_path` | **HIGH** | flag — prepare REVOKE/assert + `SET search_path` migration (leader runs DDL) |
| 1.2 | `cpa_token_bump_usage` unpinned `search_path` | LOW | note — add `SET search_path` |
| 2.4a | `dashboard/ai/page.tsx` renders `m.content` unescaped | MEDIUM | flag — escape before transform |
| 2.4b | Blog `__html: p` (4 sites), static content | LOW | ✅ verified static (no DB) + documented-safe inline (p1-w3); sanitize if→DB |
| 2.2 | Per-site JSON-LD helpers use bare `JSON.stringify` | LOW | ✅ helpers hardened via `safeJsonLd()` (p1-w3); ~166 inline static pages left documented-safe |
| 3 | Email templates interpolate data with no HTML-escape / URL validation | MEDIUM | flag — add `escapeHtml()` + URL allowlist |
| 5 | Cross-tenant self-attack suite | — | **GREEN 114/114** |

All remediations are DDL/code changes to be **prepared as files**; no prod write,
push, or deploy performed by this lane.
