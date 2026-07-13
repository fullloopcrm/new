# Merge Conflict Risk: p1-w3 → main

**Refreshed:** 2026-07-13 16:38 EDT by W4 (fleet-wide refresh, LEADER order
16:34). Original report (preserved below) was generated 2026-07-12 18:18 EDT
using the legacy 3-arg `git merge-tree` plumbing tool, which is more
conservative and sometimes flags "changed in both" for hunks that a real
3-way merge actually resolves cleanly (see note on schema.tsx below).
**Method (this pass):** `git merge-tree --write-tree origin/main origin/p1-w3`
(git 2.39 real merge-ort simulation — this is an actual merge attempt, not an
info-only diff scan). Read-only — no ref updated, no working tree touched,
nothing merged/pushed.
**Merge base (unchanged):** `2cca5daa0fe953b8be89b541ff7e7488c4bb4a14`
**origin/main HEAD:** `6a052a58` · **p1-w3 vs merge-base:** 445 files changed
· **origin/main vs merge-base:** 81 files changed · **files touched by both
sides:** 5 · **real conflicts: 4** (down from 5 in the 07-12 report — see
below)

## Result: 4 conflicting files (was 5 — one resolved itself, not a regression)

Same theme as before: **JSON-LD / HTML-escaping XSS hardening implemented
independently on both sides**, plus one unrelated import-path collision.

### 1. `platform/src/lib/escape-html.ts` — added in both (unchanged from 07-12)

Both branches created this file from scratch with different scope. `main`'s
version only exports `escapeHtml`. `p1-w3`'s exports `escapeHtml` **plus**
`safeUrl` (URL-scheme allowlist) **plus** `safeJsonLd` (the JSON-LD
script-breakout guard used by conflicts #2–3 below).

**Suggested resolution (unchanged):** take `p1-w3`'s version wholesale — it's
a strict superset of `main`'s.

### 2. `platform/src/app/site/template/_components/JsonLd.tsx` — changed in both (unchanged from 07-12)

`main`'s base version still does
`dangerouslySetInnerHTML={{ __html: json }}` raw. `p1-w3` rewrote the same
line to call `safeJsonLd(schemas).replace(/</g, '<')`.

**Suggested resolution (unchanged):** take `p1-w3`'s version (the actual
fix). Requires conflict #1 resolved first (import target must exist).

### 3. `platform/src/app/site/template/_components/JsonLd.test.tsx` — added in both (unchanged from 07-12)

Both branches added a new test file at the same path with different test
bodies. `p1-w3`'s is more thorough (3 cases vs. main's narrower variant).

**Suggested resolution (unchanged):** take `p1-w3`'s version.

### 4. `platform/src/app/dashboard/ai/page.tsx` — changed in both, unrelated to XSS work (unchanged from 07-12)

`main` still imports `renderAssistantMarkdown` from the local sibling file
`./render-markdown`. `p1-w3` moved that module to
`platform/src/lib/render-assistant-markdown.ts` and updated the import.

**Suggested resolution (unchanged):** take `p1-w3`'s import path — the file
it points to still exists in `p1-w3`'s tree; taking `main`'s import would
break the build post-merge (`./render-markdown` no longer exists on `p1-w3`).

## Resolved since 07-12: `platform/src/app/site/consortium-nyc/_lib/schema.tsx`

The 07-12 report listed this as a 5th conflict, sharing the same
`dangerouslySetInnerHTML` → `safeJsonLd` rewrite pattern as #2 above. It no
longer conflicts. Root cause of the change: `p1-w3` landed a later commit
(`a604b132`, "remove fabricated self-serving AggregateRating... CRITICAL-1")
that deleted the `aggregateRatingSchema()` function elsewhere in this same
file, shifting the diff context around p1-w3's `safeJsonLd` line far enough
from where `main` (which never touched this file) has no competing change
that git's merge-ort no longer treats it as an overlapping hunk. `p1-w3`'s
current version (line 252) still has the `safeJsonLd` fix intact — this is a
genuine clean auto-merge on the current run, verified by inspecting both
branches' current content, not a fluke of the tool change. Note the legacy
3-arg `merge-tree` used in the 07-12 pass is known to over-report "changed in
both" sections for files that a real merge-ort simulation resolves cleanly;
that may also explain part of the discrepancy, independent of the content
shift.

**Cross-lane note:** `p1-w1` (see `conflict-risk-p1-w1.md`) *does* still
conflict on this same file, but over the `aggregateRatingSchema()` deletion
itself (main deleted the function, p1-w1 never got that commit) — a
different hunk in the same file than what used to conflict here for w3.

## Non-conflicting overlap

`escape-html.ts` aside, `git merge-tree` shows one more file touched by both
sides that merges cleanly beyond the 4 listed above (net total 5 "touched by
both"). No other real conflicts. Everything else — the IDOR lint guard,
`reconcile-tenant-config.mjs`, CI workflow changes, SEO copy sweeps,
sitemap/OG work, etc. — merges cleanly against current `origin/main`.

## Net assessment (unchanged from 07-12)

All 4 remaining conflicts resolve by **consistently taking p1-w3's side** —
each is either a strict superset (`escape-html.ts`), the actual security fix
`main` hasn't caught up to yet (`JsonLd.tsx`), better test coverage
(`JsonLd.test.tsx`), or points at the file that actually still exists
post-merge (`dashboard/ai/page.tsx`). This is a "pick p1-w3, verify build"
resolution, not a design decision. #1 gates #2 (import target must exist);
resolve in that order.

---

## Original 2026-07-12 18:18 EDT report (superseded — preserved for history)

**Method:** `git merge-tree $(git merge-base origin/main p1-w3) origin/main p1-w3`
**merge-base:** `2cca5da` (origin/main at fetch time: `6a052a58`, p1-w3 HEAD: `f4e77fee`)

### Result: 5 conflicting hunks across 4 files (at that time)

Listed conflicts: `escape-html.ts` (added in both), `JsonLd.tsx` (changed in
both), `JsonLd.test.tsx` (added in both), `consortium-nyc/_lib/schema.tsx`
(changed in both — since resolved, see above), `dashboard/ai/page.tsx`
(changed in both, unrelated import-path collision).

`git merge-tree` reported 230 clean auto-merge sections and zero
delete/modify or rename conflicts at that time.
