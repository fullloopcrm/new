# Tenant Config Schema — Phase 0.1

**Status:** DRAFT — push back on anything.
**Authored:** 2026-04-21 by Claude, working with Jeff directly, no agents.
**Source:** Read nycmaid's `(marketing)/page.tsx`, `lib/seo/services.ts`, `lib/seo/locations.ts`, `lib/seo/content.ts` directly.
**Goal:** One schema that makes every tenant's site work identically to nycmaid's with only their content swapped.

---

## Design: where does it live

Two options:
- **(A) Everything in `site_config JSONB` on `tenants` table.**
- **(B) Hot fields stay flat columns (name, phone, domain, etc.), structured content goes in `site_config JSONB`.**

**I recommend (B).** Hot fields are already flat columns and every query uses them. Only the structured page content needs new storage. Matches how `selena_config JSONB` already works. Simpler migration, no breaking changes to existing queries.

---

## Fields, grouped

### 1 — Brand (hot, flat columns on `tenants`)
Already exist: `name`, `phone`, `email`, `address`, `domain`, `slug`, `logo_url`, `primary_color`, `secondary_color`, `industry`, `business_hours`.

**Add:**
| Field | Type | Source | Example from nycmaid |
|---|---|---|---|
| `tenants.tagline` | TEXT | onboarding | "NYC's #1 rated cleaning service" |
| `tenants.founded_year` | INT | onboarding | 2018 |
| `tenants.accent_color` | TEXT | onboarding | "#A8F0DC" (nycmaid uses mint) |
| `tenants.background_color` | TEXT | onboarding | "#F5FBF8" |
| `tenants.heading_font` | TEXT | onboarding | "Bebas Neue" |
| `tenants.body_font` | TEXT | onboarding | "Inter" |

### 2 — `site_config.brand` (structured)
```
{
  insured_amount_usd: 1000000,
  bbb_profile_url?: string,
  google_reviews_url?: string,
  yelp_url?: string,
  social: {
    facebook?: string, instagram?: string, twitter?: string,
    tiktok?: string, youtube?: string
  },
  trust_points: string[]     // ["No money upfront", "Payment upon completion", ...]
  what_to_expect: string[]   // 6 bullet points shown in homepage "What You Can Expect"
}
```

### 3 — `site_config.services` (the big one)
Matches nycmaid's `SERVICES` interface from `lib/seo/services.ts`:
```
Service[] where Service = {
  slug: string                      // "deep-cleaning"
  url_slug: string                  // "deep-cleaning-service-in-nyc"
  name: string                      // "Deep Cleaning"
  short_name: string                // "Deep Clean"
  description: string
  features: string[]                // 12 bullets
  ideal_for: string[]               // 4 bullets
  price_range: string               // "$196–$390" (display)
  starting_price_cents: number      // numeric — for Selena
  duration: string                  // "3–5 hours"
  supplies_policy: "we_bring" | "client_brings" | "either"
  hero_image_url?: string
  rich_content?: ServiceRichContent // optional — deep copy (see §4)
  display_order: number
  active: boolean
}
```

### 4 — `site_config.service_rich_content` (optional, per-service)
Powers deep service pages like nycmaid's `/services/deep-cleaning-service-in-nyc`. OPTIONAL — if absent, service detail page renders basic service fields only.
```
Record<service_slug, {
  overview: string            // 2-3 paragraph intro
  checklists: RoomChecklist[] // kitchen, bathroom, bedroom, etc.
  comparisons?: ComparisonRow[]
  tips?: Tip[]
  internal_links?: string[]
}>
```

### 5 — `site_config.areas` (geographic service coverage)
Matches nycmaid's `AREAS` + `NEIGHBORHOODS` from `lib/seo/locations.ts`:
```
Area[] where Area = {
  slug: string                     // "manhattan"
  url_slug: string                 // "manhattan-maid-service" (nycmaid's URL shape — tenants set their own)
  name: string
  description: string
  lat?: number
  lng?: number
  neighborhoods: Neighborhood[]
}

Neighborhood = {
  slug: string                     // "upper-east-side"
  url_slug: string                 // "upper-east-side-maid-service"
  name: string
  lat: number
  lng: number
  zip_codes: string[]
  landmarks: string[]
  housing_types: string[]
  specific_challenges: string[]
  nearby_slugs: string[]
  display_order: number
}
```

**Optional.** Tenants without granular neighborhood SEO just leave the `neighborhoods` array empty.

### 6 — `site_config.pricing`
Replaces the 3-tier pricing block on nycmaid's homepage:
```
{
  tiers: PricingTier[],
  emergency_rate_cents?: number,
  emergency_available: boolean,
  recurring_discount_pct?: number,      // 10 for nycmaid
  minimum_hours: number,
  recurring_frequencies_offered: ("weekly"|"biweekly"|"monthly")[]
}

PricingTier = {
  label: string                         // "Client Supplies & Equipment"
  rate_per_hour_cents: number           // 5900
  description: string
  most_popular: boolean
  display_order: number
}
```

### 7 — `site_config.faqs`
Nycmaid has 40+ FAQs in categories. Structured:
```
FAQ[] where FAQ = {
  id: string
  category: string            // "Pricing" | "Services" | "Scheduling" | "Trust & Safety" | ...
  question: string
  answer: string
  display_order: number
  active: boolean
}
```

### 8 — `site_config.testimonials`
```
Testimonial[] where Testimonial = {
  id: string
  name: string
  rating: number                 // 1-5
  text: string
  date: string
  neighborhood?: string
  service_slug?: string
  verified: boolean              // true if linked to real client_id in `reviews` table
  display_on_homepage: boolean
  display_order: number
}
```

Live reviews from `reviews/submit` flow into this list after admin publishes them.

### 9 — `site_config.legal_pages`
```
LegalPage[] where LegalPage = {
  slug: string                   // "privacy-policy" | "terms" | "refund-policy" | "do-not-share-policy" | custom
  title: string
  source: "ai_generated" | "custom"
  content: string                // markdown
  generated_at?: string
  last_edited_at?: string
}
```
Onboarding form lists which pages tenant wants + whether AI-generated or they'll paste their own.

### 10 — `site_config.seo`
```
{
  meta_defaults: {
    site_name: string,
    default_og_image: string,
    twitter_handle?: string,
    locale: string,                         // "en_US"
    geo_region?: string,                    // "US-NY"
    geo_placename?: string,                 // "New York City"
    geo_position?: string,                  // "40.7589;-73.9851"
    icbm?: string,
  },
  page_overrides: Record<page_slug, {
    title?: string,
    meta_description?: string,
    og_image?: string,
    canonical?: string,
  }>
}
```
LocalBusiness / Service / FAQPage / AggregateRating JSON-LD is auto-generated from brand + services + live review counts — no manual entry.

### 11 — `site_config.hero`
```
{
  homepage_hero_url: string,
  homepage_hero_alt: string,
  about_hero_url?: string,
  services_hero_url?: string,
  areas_hero_url?: string,
  careers_hero_url?: string
}
```
Per-trade defaults bundle ~5 royalty-free photos. Tenant replaces with their own later.

### 12 — `site_config.booking_policy`
```
{
  first_time_cancel_allowed: boolean,
  recurring_cancel_notice_days: number,
  recurring_reschedule_notice_days: number,
  requires_payment_upfront: boolean,
  tip_policy: "optional" | "included" | "not_accepted",
  tip_goes_to: "team_member" | "split" | "company",
  arrival_buffer_weekday_min: number,        // 30 for nycmaid
  arrival_buffer_weekend_min: number,        // 60 for nycmaid
  min_booking_hours: number,
  default_payment_methods: string[],         // ["stripe", "zelle", "venmo", "cash"]
  same_day_available: boolean
}
```

### 13 — `site_config.operational`
```
{
  sms_opt_in_language: string,             // TCPA-compliant copy
  unsubscribe_policy_url: string,
  business_hours_note: string,             // "SMS 24/7, office Mon-Sat 7-7"
  insured_statement: string,               // "Licensed, insured, and bonded up to $1M"
  cancellation_policy_statement: string    // shortened version for site footer
}
```

### 14 — `site_config.stats` (about-page glance cards)
Matches nycmaid's "At a Glance" block:
```
{
  founded_year_label: string,              // "Founded"
  rating: number,                          // 5.0
  neighborhood_count: number,              // 225
  starting_price_label: string,            // "$59"
  starting_price_unit: string,             // "/hr"
  additional_stats?: Array<{
    value: string, label: string
  }>
}
```

### 15 — `site_config.admin_links` (derived, not stored)
Rendered in admin settings. Computed from `tenants.domain` + `tenants.slug`:
- `admin_url`: `https://{domain}/admin` (or `{slug}.fullloopcrm.com/admin`)
- `client_portal_url`: `/portal`
- `team_portal_url`: `/team`
- `webhook_url_stripe`: `https://{domain}/api/webhooks/stripe`
- `webhook_url_telnyx`: `https://{domain}/api/webhooks/telnyx`
- `webhook_url_resend`: `https://{domain}/api/webhooks/resend`
- `webhook_url_clerk`: `https://{domain}/api/webhooks/clerk`

Copy buttons next to each. This is the "all links per page on top of relative page" UX you mentioned.

### 16 — Selena persona (already in `tenants.selena_config`)
Exists. No schema changes needed. Onboarding form populates these fields.

### 17 — Integrations (already flat columns on `tenants`, encrypted)
Exist. No schema changes. `stripe_api_key`, `telnyx_api_key`, `resend_api_key`, `imap_*`, `anthropic_api_key`, `zelle_email`, `google_place_id`.

### 18 — Onboarding state (already in place)
- `tenants.onboarding_checklist JSONB` — exists, migration 037
- `tenants.onboarding_completed_at` — exists
- `onboarding_tasks` — table exists, no UI yet

Extend `onboarding_checklist` shape:
```
{
  basics_done, branding_done, services_done, areas_done,
  faq_customized, testimonials_added, stripe_connected,
  telnyx_connected, resend_verified, domain_verified,
  first_booking_completed
}
```

---

## Summary

~60 distinct field names across 18 sections. Every content block on nycmaid's homepage + every SEO URL + every trust element maps to a field above. Fullloop's template reads from these. Tenant populates via onboarding + admin editor.

Nothing in the schema is nycmaid-specific. The cleaning-trade default PROVIDES values, but the shape is universal.

---

## What I'm explicitly NOT putting in the schema

- **Blog posts** — separate concern, own table eventually
- **Client/booking data** — lives in `clients` / `bookings` tables, not config
- **Team-member data** — lives in `team_members` table
- **Live reviews** — live in `reviews` table, flows INTO testimonials section after admin publishes
- **SMS/email templates** — per-tenant templates are a later phase; platform defaults in code for now

---

## Open questions for you

1. Do you want `services` and `faqs` as JSONB (simpler, what I'm proposing) or as proper DB tables (`tenant_services`, `tenant_faqs`) for better history/audit? I lean JSONB for v1, migrate to tables later if growth demands it.
2. Per-trade URL slugs for services/areas: hardcoded in the trade defaults (e.g. cleaning trade uses `"-maid-service"` suffix) or generated from tenant name + keyword? I lean hardcoded per trade — less room for typos.
3. The "trust_points" (no money upfront, no contracts, flat pricing) — are these things EVERY fullloop tenant will be able to honestly claim? If not, these become per-tenant editable. If yes, platform-level constants.
4. Nycmaid has 225 neighborhoods. Other tenants will have drastically different coverage (maybe 3 boroughs, or 2 states). Is that okay as "populate as many as you want, empty is fine"? I'd say yes.

---

## Next step

If you sign off (or mark up changes), Phase 0.2 is:
1. Write TypeScript types at `src/lib/tenant-config.ts`
2. Write Zod schema for runtime validation
3. Migration 041 that adds the new columns (`tagline`, `founded_year`, `accent_color`, `background_color`, `heading_font`, `body_font`, `site_config`) to `tenants`
4. Backfill nycmaid's row from its existing hardcoded content
