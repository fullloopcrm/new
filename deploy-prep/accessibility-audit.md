# Accessibility (WCAG) Audit — Tenant Marketing Sites

**Author:** W3 (SEO / reconcile-gate lane) · **Date:** 2026-07-12 · **Status:** FILE ONLY — a quick static WCAG pass. **Nothing here was applied to any component or style.** Findings are recommendations for LEADER/Jeff.

> **⚠️ Method & honest scope.** This is a **static source read** of
> `platform/src/app/site/*` — grep-level evidence for landmarks, alt text,
> heading tags, `<nav>` labeling, and Tailwind color utilities. It is **not** a
> real accessibility test: **no `axe-core`, Lighthouse, or screen-reader run**
> was performed (no live build available from this vantage). Two whole SC
> families — **color contrast (1.4.3)** and **heading-order skips (1.3.1)** —
> can only be *estimated* from source; the flags below say "verify with axe"
> where that's true. Treat this as a triage of the top gaps to check, not a
> conformance statement. Paths are relative to `platform/`.

**Scope:** the ~22 independent tenant sites under `src/app/site/*` plus their shared `template`. WCAG 2.2 Level AA as the target.

---

## TL;DR — the top gaps, ranked

| # | Gap | WCAG SC | Severity | Evidence |
|---|---|---|---|---|
| 1 | **Skip link missing on ~17 of 22 sites** | 2.4.1 Bypass Blocks (A) | HIGH (keyboard) | Only 5 layouts ship "Skip to main content" |
| 2 | **`<nav>` landmarks mostly unlabeled** | 1.3.1 / 2.4.1 (A) | MED | 108 `<nav>`, only 32 labeled (29 are breadcrumbs) |
| 3 | **Likely contrast failures** (`text-white/40`, `text-gray-400`) | 1.4.3 Contrast (AA) | MED — **verify with axe** | `text-white/40` in 63 files, `text-gray-400` in 259 |
| 4 | **User-uploaded thumbnails use `alt=""`** | 1.1.1 Non-text (A) | LOW | review/booking photo `<img alt="">` |
| 5 | **Heading-order skips** | 1.3.1 (A) | UNKNOWN — **verify with axe** | not reliably checkable from source |

**Good news:** **alt-text hygiene on content images is strong** — of 68 raw `<img>`, **zero are missing an `alt` attribute**, and Next `<Image>` usages carry `alt` (spot-checked). The problems are landmark/keyboard navigation and probable contrast, not missing image text.

---

## Finding 1 — Skip link is missing on most sites (HIGH, WCAG 2.4.1 Level A)

A "Skip to main content" link lets keyboard and screen-reader users bypass the header/nav on every page. Only **5** site layouts ship one:

- ✅ `nycmaid/layout.tsx:25`, `wash-and-fold-hoboken/(marketing)/layout.tsx:13`, `template/layout.tsx:62`, `the-florida-maid/layout.tsx:13`, `sunnyside-clean-nyc/layout.tsx:12` — all use the same correct pattern: `<a href="#main-content" className="sr-only focus:not-sr-only …">`.

Spot-checked sites with **no** skip link and **no** `#main-content` anchor:

> `toll-trucks-near-me`, `theroadsidehelper`, `nyc-tow`, `the-nyc-seo`, `the-nyc-exterminator`, `fla-dumpster-rentals`, `stretch-ny`, `the-home-services-company`, `nycroadsideemergencyassistance`

Corroborating: only **6** `<main id="main-content">` anchors exist across all of `src/app/site` (the target the skip link needs).

**Fix:** the `template/layout.tsx` pattern is the model — port the `sr-only focus:not-sr-only` skip link + a matching `<main id="main-content">` into every site's root layout. Low effort, high impact for keyboard users. Owner fix.

---

## Finding 2 — `<nav>` landmarks are mostly unlabeled (MED, WCAG 1.3.1 / 2.4.1)

There are **108** `<nav>` elements across the sites; only **32** carry an `aria-label`, and **29** of those are breadcrumb navs (`aria-label="Breadcrumb"` — good, keep those). That leaves the majority of header/footer/menu navs unlabeled.

When a page renders more than one `<nav>` (e.g. header nav + breadcrumb + footer nav), a screen reader announces several indistinguishable "navigation" landmarks. Concrete unlabeled header navs:

- `toll-trucks-near-me/_components/Header.tsx:36` — `<nav>` with no `aria-label`
- `theroadsidehelper/_components/Header.tsx:36` — same
- `nyc-mobile-salon/_components/Header.tsx:58`, several `nyc-mobile-salon` sub-navs

**Fix:** give each `<nav>` a distinguishing `aria-label` (`"Main"`, `"Footer"`, `"Breadcrumb"`). Breadcrumbs are already handled on ~29 pages — extend the same discipline to primary/footer nav. Owner fix; mechanical.

---

## Finding 3 — Probable color-contrast failures (MED, WCAG 1.4.3 AA — verify with axe)

Heavy use of low-opacity/light text utilities that are **very likely** below the 4.5:1 AA threshold for normal-size text:

- `text-white/40` — **63 files** (40% white; used for breadcrumbs and secondary labels on colored/brand backgrounds — almost certainly < 4.5:1).
- `text-white/50` — **56 files**.
- `text-gray-400` — **259 files** (on a white surface `#9ca3af` ≈ 2.8:1 for normal text → fails AA; acceptable only for ≥18.66px bold / ≥24px large text).

Example: the breadcrumb navs in `the-nyc-marketing-company/.../IndustryPageClient.tsx:47` use `text-white/40`.

**Why "probable," not confirmed:** actual ratio depends on the rendered background, which needs a live page + a contrast tool. **This must be measured with axe/Lighthouse** — but the volume (63 + 56 + 259 files) makes at least some AA failures near-certain.

**Fix:** raise secondary text to `text-white/70`+ on dark and replace `text-gray-400` body text with `text-gray-500`/`600`; keep the light utilities only for genuinely large/bold or non-essential text.

---

## Finding 4 — `alt=""` on user-uploaded thumbnails (LOW, WCAG 1.1.1)

`alt=""` (empty) correctly marks **decorative** images — and it's used correctly on hero-overlay images (e.g. `toll-trucks-near-me/page.tsx:233` `alt=""` on a background photo). But it's also applied to **meaningful user-uploaded content**:

- `nyc-mobile-salon/_components/BookingNotes.tsx:315,388` — booking photo thumbnails + lightbox
- `nycmaid/reviews/submit/ReviewForm.tsx:286`, `nycmaid/reviews/ReviewsList.tsx:126` — review media thumbnails

A photo a customer attached to a review/booking conveys content; `alt=""` hides it from assistive tech.

**Fix:** give these a generic-but-real alt (`alt="Customer review photo"`, `alt="Uploaded booking photo"`). Low severity; small surface. Owner fix.

---

## Finding 5 — Heading order (UNKNOWN — verify with axe)

`<h1>` presence looks consistent (most pages carry a single `<h1>`), but **heading-level skips (h2 → h4) cannot be reliably detected from source** — many headings are composed dynamically or split across components. This SC (1.3.1) needs a live **axe/Lighthouse** DOM pass to confirm. Flagged as an explicit **must-check**, not a confirmed defect — I am not asserting a skip I didn't verify.

---

## What passed (static)

- ✅ **Image alt attributes** — 0 of 68 raw `<img>` missing `alt`; Next `<Image>` carries `alt` (spot-checked, e.g. `toll-trucks-near-me/page.tsx:32` `alt="Tow truck on highway"`).
- ✅ **`<main>` landmark** present in 64 site source files.
- ✅ **Breadcrumb navs labeled** on ~29 pages (`aria-label="Breadcrumb"`).
- ✅ **The skip-link pattern that does exist is correct** (`sr-only focus:not-sr-only`, real `#main-content` target) — it just needs to be everywhere.

## Recommended order of work

1. **Finding 1 (skip links)** — port the `template/layout.tsx` skip-link + `<main id="main-content">` to the ~17 sites missing it. Highest impact / lowest effort.
2. **Finding 3 (contrast)** — run **axe/Lighthouse on a preview build first** to get real ratios, then fix the confirmed failures (start with body-text `text-gray-400` and `text-white/40` breadcrumbs).
3. **Finding 2 (nav labels)** — mechanical `aria-label` sweep on unlabeled header/footer navs.
4. **Finding 5 (heading order)** — confirm with the same axe run as #3.
5. **Finding 4 (thumbnail alt)** — small targeted fix on review/booking media.

## NOT verified (out of vantage)

No live `axe-core`, Lighthouse, contrast-ratio measurement, keyboard-tab-order walk, focus-visible check, or screen-reader pass was performed — those require a running build. **Color contrast (Finding 3) and heading order (Finding 5) are the two findings most likely to change** once measured. Everything above is a **recommendation prepared as a file**; nothing was applied.
