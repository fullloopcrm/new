# Merge Conflict Risk: p1-w3 → main

**Generated:** 2026-07-12 18:18 EDT (LEADER QUEUE 1-DEEP, file-only, no push/deploy/DB)
**Method:** `git merge-tree $(git merge-base origin/main p1-w3) origin/main p1-w3`
**merge-base:** `2cca5da` (origin/main at fetch time: `6a052a58`, p1-w3 HEAD: `f4e77fee`)

## Result: 5 conflicting hunks across 4 files

All 5 conflicts cluster around one theme: **JSON-LD / HTML-escaping XSS hardening was implemented independently on both sides.** main already merged a narrower fix (`f66f6b08 fix(security): escape HTML in admin-notification emails`); p1-w3 built a broader, overlapping version (`escapeHtml` + `safeUrl` + `safeJsonLd`) plus a JsonLd-component refactor. One unrelated conflict (dashboard AI chat) is a pure import-path collision from a file move.

---

### 1. `platform/src/lib/escape-html.ts` — **added in both** (content conflict)

- **Why:** Both branches created this file from scratch with different scope. main's version (from `f66f6b08`) only exports `escapeHtml`. p1-w3's version exports `escapeHtml` **plus** `safeUrl` (URL-scheme allowlist, blocks `javascript:`/`data:`) **plus** `safeJsonLd` (the `<` → `<` JSON-LD script-breakout guard used by conflicts #2–4 below).
- **Suggested resolution:** Take p1-w3's version wholesale — it's a strict superset of main's (same `escapeHtml` behavior, plus two more functions main doesn't have yet). Confirm no caller on main's side depends on a since-changed `escapeHtml` signature (it doesn't — signature is identical, `String(value ?? '')` guard included).

### 2. `platform/src/app/site/template/_components/JsonLd.tsx` — **changed in both**

- **Why:** main's `JsonLd.tsx` (base version, untouched on main) still does `dangerouslySetInnerHTML={{ __html: json }}` where `json` is computed earlier in the function. p1-w3 rewrote the same line to call the new `safeJsonLd(schemas).replace(/</g, '<')` helper from conflict #1.
- **Suggested resolution:** Take p1-w3's version — it's the actual fix. Requires conflict #1 resolved first (import target must exist).

### 3. `platform/src/app/site/template/_components/JsonLd.test.tsx` — **added in both** (content conflict)

- **Why:** Both branches added a new test file at the same path testing the same script-tag-breakout behavior, but with different test bodies/assertions (p1-w3's uses `renderToStaticMarkup` + explicit breakout-string fixtures; main's is a lighter-weight variant).
- **Suggested resolution:** Take p1-w3's version — more thorough coverage (3 cases: breakout escape, object+array inputs, valid-JSON round-trip) vs. main's narrower test. Low risk either way since it's test-only.

### 4. `platform/src/app/site/consortium-nyc/_lib/schema.tsx` — **changed in both**

- **Why:** Same root cause as #2 — both sides changed the same `dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}` line, main leaving it unpatched at base and p1-w3 swapping in `safeJsonLd(data).replace(/</g, "<")`.
- **Suggested resolution:** Take p1-w3's version (the fix). Same dependency on conflict #1's import existing.

### 5. `platform/src/app/dashboard/ai/page.tsx` — **changed in both** (unrelated to XSS work)

- **Why:** main still imports `renderAssistantMarkdown` from the local sibling file `./render-markdown`. p1-w3 (or an earlier branch it built on) moved that module to a shared lib at `platform/src/lib/render-assistant-markdown.ts` and updated the import to `@/lib/render-assistant-markdown`. The old `platform/src/app/dashboard/ai/render-markdown.ts` file itself deleted cleanly (no conflict there — only the one import line collides).
- **Suggested resolution:** Take p1-w3's import path — the file it points to (`platform/src/lib/render-assistant-markdown.ts` + its `.test.ts`) exists in p1-w3's tree; main's target (`./render-markdown`) does not exist in p1-w3's tree anymore. Taking main's import would break the build post-merge.

---

## Non-conflicting scope

`git merge-tree` reported **230 clean auto-merge sections** and **zero** delete/modify or rename conflicts. Everything outside the 4 files above (IDOR lint guard, reconcile-tenant-config.mjs, CI workflow changes, SEO copy sweeps, sitemap/OG work, etc.) merges cleanly against current `origin/main`.

## Net assessment

All 5 conflicts are resolvable by **consistently taking p1-w3's side** — in every case p1-w3's version is either a strict superset (escape-html.ts), the actual security fix main hasn't caught up to yet (JsonLd.tsx, schema.tsx), better test coverage (JsonLd.test.tsx), or points at the file that actually still exists post-merge (dashboard/ai/page.tsx). No manual reconciliation of conflicting *logic* is needed — this is a "pick ours, verify build" resolution, not a design decision. Recommend building/type-checking immediately after resolution since #1 gates #2 and #4 (import target).
