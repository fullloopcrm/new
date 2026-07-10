# Template Migration Audit — Format + Seed (2026-07-10)

**Purpose.** Evidence-based, per-tenant audit that decides two things *before any migration*:
1. Which tenants are even **template-candidates** vs. **permanent-bespoke**.
2. For candidates, the **exact template gaps** that must close before they flip.

This is the artifact that prevents a repeat of the 2026-07-08 cutover, which assumed parity that didn't exist and darked 18 live sites.

**Rule: no eyeballing.** Every verdict is backed by a route/capability diff against the template, not "looks the same."

---

## Per-tenant audit record (fill one per bespoke tenant)

| Field | How to source it |
|---|---|
| Vertical | tenant config / obvious from content |
| Traffic + revenue tier (low/mid/high) | GSC organic + lead volume (last 30d) — drives canary pick |
| Route surface | `find src/app/site/<slug> -name page.tsx` |
| Form endpoints | grep `fetch('/api/...` + `<form action` in the folder |
| Bespoke-only capabilities | routes/features the tenant has that `/site/template` does NOT |
| SEO surface | rich sitemap URL count; location/service/vertical trees |
| Operator surface | does it have `(app)` operator clones? (migrate to global `/dashboard` first) |
| **Verdict** | TEMPLATE-CANDIDATE / NEEDS-EXTENSION / PERMANENT-BESPOKE |
| Template gaps (if NEEDS-EXTENSION) | enumerated, each as a buildable item |

## Verdict rubric
- **TEMPLATE-CANDIDATE** — route surface ⊆ template (cleaning-shaped, no vertical-specific trees). Flip after fortress + canary.
- **NEEDS-EXTENSION** — mostly coverable; template missing specific, buildable features. Extend template, re-audit, then candidate.
- **PERMANENT-BESPOKE** — vertical-specific structure the template should NOT absorb (absorbing it bloats the template toward an unmaintainable everything-template). Stays bespoke; the build-time guard keeps it protected forever.

## Template baseline (what `/site/template` already provides)
Cleaning + VA shaped: `/services`, `/service-areas`, `/book/new` + `/book/standard` + smart-schedule, `/apply` + `/careers`, `/reviews` (+submit), `/referral` + `/referral-program`, `/blog`, `/faq`, `/pricing`, `/virtual-assistant/*`, `/chat-with-yinez`. Endpoints: `/api/lead`, `/api/contact`, `/api/client/book`, `/api/client/smart-schedule`, `/api/cleaner-applications`, `/api/reviews`, `/api/referrers`, `/api/waitlist`.

---

## KEY FINDING (from the first automated route-diff)
A naive route-name diff flags **every** tenant as bespoke — including the cleaning ones — because tenants use **custom SEO URL slugs** while the template uses generic ones. Two distinct divergences, and conflating them is how you break things:
- **Capability divergence** (vertical-specific IA) → genuinely PERMANENT-BESPOKE.
- **SEO-slug divergence only** (same capability, different URLs) → candidate, BUT migrating with different URLs 404s every indexed page = **SEO cliff**.

**New hard constraint for "extend template to parity":** the template must support **per-tenant custom route slugs (or a 301 map)** before ANY tenant flips — otherwise even the cleaning candidates lose their rankings. Capability parity is necessary but NOT sufficient; URL parity is the second axis.

## Seed verdicts (from live folder scan — needs traffic/revenue tier added)

| Tenant | Vertical | Bespoke-only surface | Draft verdict |
|---|---|---|---|
| florida-maid | cleaning | (matches template) | **TEMPLATE-CANDIDATE** |
| sunnyside-clean-nyc | cleaning | (matches template) | **TEMPLATE-CANDIDATE** — likely canary |
| the-nyc-exterminator | pest control | `pest-control-tips`, `quote-request`, `schedule-service`, `[service]/[neighborhood]` | **NEEDS-EXTENSION** (structurally close: service+area model; needs pest content type + quote form) |
| nyc-mobile-salon | mobile salon | `classes`, `events`, `founding-ceo-*`, borough/neighborhood SEO trees for services+events+classes | **PERMANENT-BESPOKE** |
| the-nyc-seo | SEO agency | `businesses/[15 verticals]` taxonomy, agency IA | **PERMANENT-BESPOKE** |
| wash-and-fold-nyc/hoboken | laundry | `(app)` operator CLONE (known debt) + `buildings/boroughs` marketing | **SPECIAL**: operator clone must move to global `/dashboard` FIRST (separate debt); marketing coverable after |
| nyc-tow / roadside* / toll* | roadside/tow | area/service trees, quote flows | **NEEDS-EXTENSION or BESPOKE** — audit each |
| landscaping / debt / fla-dumpster / stretch* / consortium / marketing | mixed verticals | vertical-specific | audit each; most likely BESPOKE |

**First read:** the template is a *cleaning* template. Only the cleaning tenants are clean candidates today. Everything else is NEEDS-EXTENSION or PERMANENT-BESPOKE — which means "extend template to parity" is really "decide how many verticals the template should ever try to be," not "make one template do everything."

---

## Canary + gate criteria (attach before first flip)

**Canary pick:** TEMPLATE-CANDIDATE, mid-tier traffic (not nycmaid, not a dead site), exercises the template's real features. → **sunnyside or florida.**

**Rollback = 1 commit** (re-add slug to `BESPOKE_SITE_TENANTS`, folder is still in git). Trigger if ANY of:
- lead volume < (baseline − X%) over the canary window
- fortress detects template-fallback / form disconnect / redirect loop
- organic sessions or impressions down > X% at 14 days
- error-rate spike on the tenant's routes

**"No external tenants" gate lifts only when:** fortress detection live + ≥1 canary green for 7–14d + rollback tested + this audit complete for all tenants.

**Prerequisite ordering:** fortress *detection layer* ships BEFORE the first canary flip. Dashboard can follow; alerting cannot.
