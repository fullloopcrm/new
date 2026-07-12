# Cookie Consent — GDPR Verification & Gap Audit

**Date:** July 12, 2026
**Scope:** Consent banner and analytics gating on tenant sites.
**Verdict:** ❌ **Does not meet GDPR/ePrivacy as-is.** The current mechanism is a
US **opt-out (CCPA/CPRA)** model. GDPR + the ePrivacy Directive require **prior
opt-in** for non-essential cookies/analytics. See gaps and recommendations below.

> This is an audit document only — no code was changed (this queue is
> new-files-only). The "Recommended changes" section is a spec for a follow-up,
> gated implementation task.

---

## What exists today (verified in code)

| Piece | File | Behavior |
|-------|------|----------|
| Consent cookies | `src/app/site/template/_lib/consent.ts` | `fl_dns` (Do-Not-Sell/Share opt-out) and `fl_cookie_notice` (banner dismissed). `samesite=lax`, 1-year max-age. |
| Banner | `src/app/site/template/_components/ConsentBanner.tsx` | Notice + one-click "Do Not Sell or Share" opt-out + "Got it". Auto-records opt-out when browser sends **Global Privacy Control**. |
| Analytics gate | `src/app/site/template/_components/AnalyticsGate.tsx` | Loads first-party measurement script `/t.js` **by default**; suppressed only if `fl_dns=1` or GPC is present. Client-side check (keeps SEO pages static). |
| Mount point | `src/app/site/template/layout.tsx` | `<AnalyticsGate />` + `<ConsentBanner privacyHref="/privacy-policy" />`. |

**Model:** analytics is **on by default**; the visitor may opt out. This is a
correct and defensible **CCPA/CPRA** posture for US visitors, and GPC is honored
(a genuine strength). It is **not** a GDPR consent model.

---

## Gaps against GDPR / ePrivacy Directive (Art. 5(3))

1. **Opt-out instead of opt-in (primary gap).** `/t.js` loads before the visitor
   makes any choice. ePrivacy Art. 5(3) requires **prior consent** before storing
   or reading non-essential cookies/identifiers; GDPR Art. 6 requires a lawful
   basis (consent) for analytics. Loading measurement by default is the core
   violation for any EU/EEA/UK visitor.

2. **No "Reject All" of equal prominence.** The banner offers "Got it" (dismiss,
   which does **not** stop analytics) and "Do Not Sell or Share" (CCPA framing).
   GDPR guidance (EDPB) requires rejecting to be as easy as accepting.

3. **No granular / per-purpose consent.** No separation of necessary vs.
   analytics vs. marketing categories, and no per-category toggle. GDPR expects
   granularity and freely-given, specific consent.

4. **No consent record for accountability (Art. 7(1)).** State is a boolean
   cookie only. There is no stored proof of consent (timestamp, policy version,
   choices) to demonstrate valid consent on request.

5. **No jurisdiction detection.** The opt-out model is applied uniformly. There
   is no geo/GPC-independent path that switches EU/EEA/UK visitors to opt-in.

6. **Consent lifetime undocumented.** The cookie lives 1 year (reasonable), but
   there is no documented re-prompt / expiry policy (guidance: 6–12 months).

7. **Ungated analytics on at least one tenant site.** `the-nyc-exterminator`
   loads `@vercel/analytics` `<Analytics />` directly with **no consent gate**
   (`src/app/site/the-nyc-exterminator/layout.tsx`). That bypasses even the
   opt-out model. Flag for the site owner.

---

## Is GDPR even in scope?

This is a **business decision to make explicitly**, not to assume:

- If these are **US-only home-services** businesses with no intent to serve EU
  visitors, the CCPA/CPRA opt-out model is a reasonable posture and the GDPR
  gaps are lower-risk (though EU visitors can still reach public marketing
  pages, which is where cookie liability actually attaches).
- If any tenant markets to or knowingly serves EU/EEA/UK visitors, gaps 1–4 are
  **live compliance exposure** and should be remediated before launch there.

Recommendation: **decide per-tenant** and, at minimum, close gap #7 (ungated
analytics) regardless of jurisdiction.

---

## Recommended changes (spec for a follow-up gated task)

If GDPR coverage is required:

1. **Geo-aware mode.** Detect EU/EEA/UK (edge geo header or IP) and switch those
   visitors to **opt-in**: `/t.js` stays unloaded until affirmative consent.
   Keep the existing opt-out model for US visitors.
2. **Banner buttons:** "Accept", "Reject" (equal prominence), and "Manage
   preferences" (per-category toggles: Necessary [always on], Analytics,
   Marketing).
3. **Consent record:** persist `{ choices, policyVersion, timestamp }` in a
   cookie and/or server row for accountability.
4. **Re-prompt policy:** expire consent at 6–12 months and re-ask.
5. **Close gap #7:** gate `the-nyc-exterminator` analytics behind the same
   consent check (or remove the direct `<Analytics />`).

## What is already compliant / good

- ✅ GPC honored automatically (valid CPRA opt-out signal), gate + banner read
  the same signal.
- ✅ Cookies are `samesite=lax`, first-party, non-tracking-by-default when
  opted out.
- ✅ Analytics gating keeps SEO pages statically renderable — no server
  `cookies()` in the tree.
