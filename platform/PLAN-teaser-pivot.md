# Marketing Site Pivot — "Teaser, not pitch"

**Goal:** Stop selling the platform to operators. Keep the SEO surface, share less,
make qualified buyers / acquirers raise their hand.

**Background:** Strategy shifted (2026-05-03) — Jeff is keeping all verticals himself,
no more territory licensing. The site was built around the dead model.
Treat any inbound interest as potential acquisition or strategic, not customer.

---

## 1. Page-by-page disposition

### Surface area today

| Bucket | Count |
|---|---|
| Static marketing pages | 25 |
| `/location/[slug]` programmatic | ~300 |
| `/industry/[slug]` programmatic | ~52 |
| `/[combo]` (industry × location) | 458 explicit |
| Blog articles | 5 |
| Case studies | 1 (the-nyc-maid) |

### Decisions

#### KEEP (reframe copy, no internals visible)
- `/` (home) — rewrite to 6–8 capability bullets, single inquire CTA
- `/about-full-loop-crm` — strip founder bio, frame as "platform behind a portfolio of vertical operators"
- `/full-loop-crm-service-features` — keep feature list, drop pricing-adjacent CTAs
- `/full-loop-crm-service-business-industries` — stays, drop "claim your territory" framing
- `/why-you-should-choose-full-loop-crm-for-your-business` — reframe from "buy" to "what it does"
- `/full-loop-crm-101-educational-tips` — keep (SEO juice)
- `/case-study/the-nyc-maid` — KEEP. Reframe headline from "Full Loop CRM case study" to "Platform results — The NYC Maid". Strip Stripe/Yinez/architecture specifics. Numbers stay. Move from sales pitch to portfolio proof.
- `/home-service-business-blog/*` — keep all 5 articles. Replace any "Full Loop sells…" references with neutral "the platform" language.
- `/location/[slug]` ALL ~300 — keep. Rewrite the lead-gen CTA blocks to a generic "Inquire about the platform" link instead of "Apply for our territory."
- `/industry/[slug]` ALL ~52 — same treatment as location pages.
- `/[combo]` ALL 458 — same treatment.
- `/contact` — keep, replace contact form (see §2).
- `/privacy-policy`, `/terms`, `/accessibility` — keep as-is (legal).

#### KILL (return 410 Gone — Google de-indexes faster than 404, and prevents accidental future crawl)
- `/apply` and `/apply/[slug]`
- `/full-loop-crm-pricing`
- `/full-loop-crm-frequently-asked-questions` — every Q assumes a buyer
- `/agreement` — buyer contract template
- `/waitlist`
- `/partner-with-full-loop-crm`
- `/focus-partner` — explicit territory-sale page
- `/onboarding/*` — buyer onboarding flow

How: a single Next.js middleware (or per-page `notFound()` with `Status: 410` header) returns 410 for these paths. Sitemap + robots updated to drop them.

#### REMOVE FROM NAV / FOOTER (but pages stay if internal)
- Any links to killed pages
- Pricing nav item
- Apply / Get Started CTAs

---

## 2. New `/contact` form (replaces existing form)

Single form, plain. Submission posts to admin email + writes a row to `contact_inquiries`.

| Field | Type | Required |
|---|---|---|
| Name | text | yes |
| Company | text | yes |
| Email | email | yes |
| Phone | tel | optional |
| Role | select: Operator / Investor / Acquirer / Press / Other | yes |
| Budget / deal size | select: < $100K / $100K–$1M / $1M–$10M / $10M+ / N/A | yes |
| Message | textarea (max 1000) | yes |

- "Acquirer" role + "$1M+" budget routes a separate "**fat-offer**" admin alert (immediate SMS to Jeff via `smsAdmins`).
- All others get the standard inquiry email.
- No Calendly. No phone shown. No live chat.

---

## 3. Nav + footer

**Nav:** Home · Capabilities · Case Study · Inquire
**Footer:** Privacy · Terms · Accessibility · Contact

That's it. No "Pricing", no "Apply", no "Become a Partner".

---

## 4. SEO preservation strategy

- **Keep all 800+ programmatic pages** indexable. They're the moat.
- **410 the killed pages** with a clean `text/plain` body so Googlebot drops them within 1–2 crawls (faster than 404; redirecting them to home would dilute home authority).
- **Update sitemap.xml** to remove killed paths so Search Console doesn't keep submitting them.
- **Update robots.txt** to `Disallow: /apply` etc. as belt-and-suspenders.
- **rel=canonical** stays pointed at the homeservicesbusinesscrm.com root for the home, no changes.
- **Schema.org/JSON-LD** stays. Update `Organization` type to drop "Service" / pricing markup, keep description neutral.
- **OpenGraph titles** rewritten — replace "Full Loop CRM | $1K/user/mo" with "Full Loop — Operating platform behind The NYC Maid (and what's next)".

Risk: Pricing-adjacent keywords lose ranking. Acceptable — those keywords don't bring acquirers anyway. Operations + industry keywords remain ranked.

---

## 5. Copy guardrails for the rewrite

DO say:
- "The platform behind The NYC Maid."
- "AI-driven service operations."
- "Inquire about the platform."
- "Currently operated as a portfolio."

DON'T say:
- "$X/user/month"
- "One trade per city" / "exclusive territory"
- "Apply" / "claim your spot" / "waitlist"
- "Built on Stripe / Telnyx / Supabase / Anthropic" (no internals)
- Specific person names (other than Jeff if needed)
- Specific Yinez / Maria / Selena agent names
- Architecture diagrams or stack disclosures

Rule of thumb: a serious buyer should leave wanting to talk; a competitor should leave with no actionable copy of your stack.

---

## 6. Order of work (smallest blast radius first)

1. **Branch:** `git checkout -b teaser-pivot` (so home-page traffic doesn't see partial state)
2. **Kill the lead-funnel pages** — middleware returns 410 for the kill list. Update sitemap + robots.
3. **Strip nav and footer** — remove dead links.
4. **Replace `/contact` form** — new fields + admin routing.
5. **Rewrite `/` (home)** — capability bullets only.
6. **Rewrite case study + about** — neutral language.
7. **Sweep programmatic pages' CTA blocks** — bulk replace "Apply for territory" → "Inquire about the platform" via single template change (most of these share a CTA component).
8. **QA** — visit 5 random `/location/[slug]`, 5 random `/[combo]`, 3 random blog posts. Verify no internals leaked.
9. **Deploy preview**, sanity check.
10. **Merge + push prod**, submit updated sitemap to Google Search Console.

Estimated effort: 1–2 working days. Most of the lift is copy, not code.

---

## 7. Rollback

If a fat-offer arrives mid-pivot and they want to see the old framing, the old version
is preserved on `main` pre-merge. Git revert the squash-merge commit; deploy is back
in ~4 min.

---

## 8. Open questions for Jeff

1. Brand: keep "Full Loop CRM" or rebrand the public face to a holding-co name?
2. Footer attribution: "An operator of The NYC Maid" — link to thenycmaid.com or stay quiet?
3. Show case-study revenue numbers ($18,574, 298 clients) — flex, or cut for stealth?
4. Inquire form budget tiers — accept the $100K–$1M / $1M–$10M / $10M+ buckets, or different?
5. Do we want a stealthy email-only contact ("hello@…") instead of a form?

Once answered, I execute the order in §6.
