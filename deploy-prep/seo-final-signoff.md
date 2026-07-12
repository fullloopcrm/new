# SEO Final Sign-Off — Pre-Deploy Go / No-Go (all tenant sites)

**Author:** W3 (SEO / reconcile-gate lane) · **Date:** 2026-07-12 · **Status:** FILE ONLY — a decision gate. **Nothing here was pushed, deployed, or applied to any route, metadata, asset, or DB.**

**What this is.** The single **go / no-go** page for the SEO surface. It sits *on top of* the findings index [`seo-readiness-summary.md`](./seo-readiness-summary.md) (which enumerates every finding and links each audit) and turns those findings into one ship decision: for each SEO category — **does it block the deploy, ship in the SEO wave, stay Jeff-gated, or is it already green?** Follow the links for the underlying detail; this page does not re-derive findings, it *rules* on them.

> **⚠️ Verification scope (honesty).** Every ruling below rests on **static source-reading** of `platform/src/app/site/*`, the SEO libs, and `src/middleware.ts`, plus the codified `vitest` guards. **Not done from this vantage:** live-HTML/`curl` of built pages, social-card rendering, and reading production `tenants.domain` values. Items needing those are marked **GATED** and cannot be signed off here — they sign off in [`sitemap-live-verification-plan.md`](./sitemap-live-verification-plan.md) / [`post-deploy-probes.md`](./post-deploy-probes.md) after a deploy exists.

**Verdict legend:** ✅ **GO** (green, no action) · 🧪 **GUARDED** (a regression test locks it) · 🚢 **SHIP-IN-WAVE** (fix ready, apply in the SEO wave — does not block deploy) · 🔒 **GATED** (blocked on a Jeff domain/policy decision or a post-deploy live check) · ⛔ **NO-GO** (would block the deploy).

---

## OVERALL VERDICT: 🚢 **GO — with the SEO wave, conditionally**

**No SEO finding is ⛔ NO-GO for the deploy itself.** Every broken item degrades share previews or canonical signals; none takes a page down or leaks a private surface. The platform can deploy.

**Two conditions attach to the sign-off:**

1. **Ship the SEO wave alongside (or immediately after) deploy** — the 11 broken OG images and the 2 tracked-RED canonical fixes are real quality defects that should not sit in production. They are file-ready, no domain gate. See §1 and §2.
2. **Run the post-deploy live pass** — the OG-inheritance confirms and the `/sitemap.xml` + `/robots.txt` 200-checks can only be done against a live deploy. See §4 and the two live runbooks. Sign-off on those categories is **deferred to that pass**, not granted here.

**Jeff must still decide the domain-gated set (Flags 1/3/4)** before those flags can be closed — but they do not block the deploy. See "Jeff-gated" below.

---

## The sign-off gate — category by category

| # | SEO category | Verdict | Blocks deploy? | Source of truth |
|---|---|---|---|---|
| 1 | **OG / Twitter social images** (11 sites broken) | 🚢 SHIP-IN-WAVE | No | [`og-image-fix-plan.md`](./og-image-fix-plan.md), [`../platform/deploy-prep/og-image-coverage-audit.md`](../platform/deploy-prep/og-image-coverage-audit.md) |
| 2 | **Canonical / metadataBase** — 2 exact fixes | 🚢 SHIP-IN-WAVE · 🧪 GUARDED (tracked-RED) | No | [`seo-canonical-audit.md`](./seo-canonical-audit.md), [`seo-remediation-spec.md`](./seo-remediation-spec.md) |
| 2b | **Canonical** — apex-vs-www + clone/host (Flags 1/3/4) | 🔒 GATED (domain decision) | No | [`seo-meta-consistency-final.md`](./seo-meta-consistency-final.md) |
| 3 | **Metadata completeness** (title + description) | ✅ GO · 🧪 GUARDED | No | `seo-metadata-completeness.test.ts` |
| 4 | **robots.txt / sitemap.xml coverage** | ✅ GO · 🧪 GUARDED + 🔒 live-200 GATED | No | [`robots-sitemap-coverage-audit.md`](./robots-sitemap-coverage-audit.md), [`sitemap-live-verification-plan.md`](./sitemap-live-verification-plan.md) |
| 5 | **Structured data (JSON-LD)** — XSS-safe sinks | ✅ GO · 🧪 GUARDED | No | [`structured-data-inventory.md`](./structured-data-inventory.md) |
| 6 | **Indexing safety** (no accidental noindex) | ✅ GO · 🧪 GUARDED | No | `seo-indexing-safety.test.ts` |
| 7 | **Internal linking / orphan conversion pages** | 🚢 SHIP-IN-WAVE | No | [`seo-readiness-summary.md`](./seo-readiness-summary.md) §6 |

---

## §1 — OG images · 🚢 SHIP-IN-WAVE (top fix)

**11 sites ship a broken or wrong-brand OpenGraph card.** 5 reference a missing `/og-image.jpg`; 6 inherit the NYC-Maid-branded ancestor `opengraph-image.tsx`. This is the single highest-value SEO fix but it is a **quality defect, not an availability defect** — pages render fine, only the share preview is wrong. **Not a deploy blocker.**

- **Ready now (no gate):** the 5 missing-asset sites need a real 1200×630 branded asset — pure asset add.
- **Confirm-then-fix:** the 6 inherited-OG sites — the wrong-brand inheritance is *inferred from source*; confirm against built HTML in the live pass before applying.
- **Sign-off condition:** produce per-site branded OG (owner fix, not self-applied) and validate each with a live card validator post-deploy.

## §2 — Canonical / metadataBase · 🚢 SHIP-IN-WAVE (2) + 🔒 GATED (3)

**Apply in the wave, no domain gate needed:**
- **Flag 2 — `nyc-mobile-salon`:** canonical/base/OG declare bare apex, which middleware 301s apex→www → canonical points at a redirect. Exact fix in the spec.
- **Flag 5 — `the-florida-maid`, `sunnyside-clean-nyc`:** no `metadataBase` → relative canonical/OG URLs resolve to `localhost:3000` at build. Exact fix in the spec.

Both are **tracked-RED** inside `seo-canonical-consistency.test.ts` — the guard is green today and *flips to fail the moment the fix lands*, which is the signal to delete the allowlist entry. Applying the fix and removing the entry is one atomic change.

**🔒 GATED — hold for Jeff:** Flag 1 (`wash-and-fold-hoboken` clone), Flag 3 (`nyc-classifieds` host disagreement), Flag 4 (apex-vs-www on `consortium-nyc` / `the-nyc-marketing-company` / `the-nyc-interior-designer`). None can be written correctly without the production `tenants.domain` value + the apex-vs-www policy call. Do **not** guess these.

## §4 — robots / sitemap · ✅ GO (source) + 🔒 live-200 GATED

- **Sitemap presence is now GUARDED by a test** (this session): `platform/src/lib/sitemap-presence.test.ts` parses `TENANTS_WITH_RICH_SITEMAP` out of `src/middleware.ts` and asserts **every rich-set slug has a served sitemap route on disk** (`sitemap.ts`, a `sitemap.xml/route.ts` handler, or a static `sitemap.xml`) — so a slug can never be added to the rich set without the file, which would make middleware rewrite `/sitemap.xml` to a **404**. It also asserts **no orphan**: every site that ships its own sitemap route is in the rich set (else middleware silently serves the 7-URL generic fallback while a rich sitemap sits unused). 🧪
- **Finding 1 framing corrected:** `nycmaid` serves `/sitemap.xml` via a **Route Handler** (`sitemap.xml/route.ts`), *not* a dead static file — the "flagship 404" concern in the coverage audit is **lower than stated**. Confirmed by directory read here and by [`sitemap-live-verification-plan.md`](./sitemap-live-verification-plan.md) (§ "Premise correction"). The runtime **200** is still to be confirmed in the live pass — that is the only open sitemap item.
- **Finding 2 (MED):** remove the redundant, unreachable `the-nyc-marketing-company/robots.ts` (global header-driven robots already covers it). Ship-in-wave cleanup.

## §3 · §5 · §6 — ✅ GO / GUARDED

Metadata completeness, JSON-LD XSS-safety, and indexing safety are all green and each locked by a `vitest` guard. Nothing to do. Any regression fails CI.

---

## Codified guards (the durable half — all run in `vitest run` on every PR) 🧪

| Guard | File | Locks |
|---|---|---|
| Canonical / `metadataBase` | `platform/src/lib/seo-canonical-consistency.test.ts` | every site sets `metadataBase`; no canonical targets a 301'd host; Flags 2 + 5 tracked-RED |
| Metadata completeness | `platform/src/lib/seo-metadata-completeness.test.ts` | every site has non-empty `title` + `description` |
| Indexing safety | `platform/src/lib/seo-indexing-safety.test.ts` | noindex set == 11-page allowlist; no homepage deindexed |
| **Sitemap presence (this session)** | `platform/src/lib/sitemap-presence.test.ts` | every `TENANTS_WITH_RICH_SITEMAP` slug has a served sitemap route; no orphan rich sitemap |

All four derive their tenant/host facts from `src/middleware.ts` at test time, so the guards cannot drift from the real routing rule.

---

## Jeff-gated (cannot be closed from source — does NOT block deploy) 🔒

1. **Production domain per tenant** (`tenants.domain`) — unblocks Flags 1, 3, 4 and confirms the true canonical host. Single biggest SEO unblock.
2. **Apex-vs-www canonical decision** for the 3 apex-canonical domains — a routing/SEO policy call.
3. **Live-HTML pass** — OG inheritance on the 6 C2 sites, and `/sitemap.xml` + `/robots.txt` **200** across tenants. Runs post-deploy via the live runbooks.

---

## Sign-off checklist

**Deploy may proceed when:**
- [x] No SEO finding is ⛔ NO-GO (verified: all degrade previews/signals, none take a page down or leak a private surface).
- [x] All four SEO regression guards are green in CI (`tsc --noEmit` clean; `vitest run` passes, tracked-RED entries latched inside green assertions).

**Must ship in the SEO wave (deploy-adjacent, not a blocker):**
- [ ] 11 branded OG images / per-site `opengraph-image.tsx` (§1) — owner fix.
- [ ] Flag 2 + Flag 5 canonical fixes, then remove their tracked-RED allowlist entries (§2).
- [ ] Remove redundant `the-nyc-marketing-company/robots.ts` (§4 Finding 2).
- [ ] Internal links to the 2 orphaned conversion pages (§7 in the readiness summary).

**Post-deploy live pass (defers §1-confirm and §4-live sign-off):**
- [ ] OG cards validate for all 11 fixed sites.
- [ ] `/sitemap.xml` returns 200 + `application/xml` for every tenant incl. `nycmaid`; `/robots.txt` host-correct. (Runbook: `sitemap-live-verification-plan.md`.)

**Jeff decision (does not block deploy):**
- [ ] Confirm `tenants.domain` per tenant → unblock Flags 1/3/4.
- [ ] Decide apex-vs-www for the 3 apex-canonical domains.

---

## Verified vs NOT verified (honesty)

- **Verified (static, this vantage):** all metadata/canonical/OG/robots/sitemap/JSON-LD source declarations; `TENANTS_WITH_RICH_SITEMAP` ↔ on-disk sitemap routes (incl. `nycmaid`'s route handler); the four regression guards run green.
- **NOT verified (out of vantage):** built-HTML of any page; live `/sitemap.xml` / `/robots.txt` responses; the wrong-brand OG inheritance on the 6 C2 sites; actual `tenants.domain` values; social-card rendering. Every fix referenced above is a **recommendation prepared as a file** — none was applied to a route, metadata, asset, or DB.
