# Structured Data (JSON-LD) Inventory — per site + safeJsonLd coverage

**Author:** W3 · **Date:** 2026-07-12 · **Scope:** docs + static code read only.
**Companion:** XSS JSON-LD hardening commits `6f88a702`, `a85a6205` (routing inline sinks through
`safeJsonLd`); `cc153b2a`/`b4e4214c` (documenting static raw-HTML content sinks as safe).

---

## TL;DR

- **Every** tenant site emits JSON-LD via a `<script type="application/ld+json">` sink.
- **Every JSON-LD sink is XSS-safe.** The `<`→`<` `</script>`-breakout escape is applied on
  **100%** of sinks — either through the shared `safeJsonLd()` helper (the large majority) or via a
  byte-identical **inline** `.replace(/</g, '\\u003c')` on exactly **two** sites.
- The two inline sites are a **DRY/consistency gap, NOT a vulnerability** — they do the same
  transform `safeJsonLd` does; they just don't import it. Optional cleanup, not a security fix.
- `safeJsonLd` (`src/lib/escape-html.ts:52`) is literally `JSON.stringify(data).replace(/</g, '\\u003c')`.

---

## safeJsonLd routing status (the security-relevant column)

| Emission path | Sites | Escape applied? |
|---|---|---|
| Shared helpers — `src/lib/schema.tsx`, `src/components/site/JsonLd.tsx`, `src/components/marketing/JsonLd.tsx` | maid family (`nycmaid`, `the-florida-maid`, `wash-and-fold-nyc`, `wash-and-fold-hoboken`, `sunnyside-clean-nyc`, `template`) + others | ✅ `safeJsonLd` |
| Per-site `_lib/schema.tsx` / `_components/*JsonLd*` using `safeJsonLd` | consortium-nyc, the-nyc-marketing-company, the-nyc-interior-designer, stretch-ny, stretch-service, debt-service-ratio-loan, landscaping-in-nyc, nyc-tow, nycroadsideemergencyassistance, the-home-services-company, the-nyc-exterminator, the-nyc-seo, fla-dumpster-rentals, nyc-mobile-salon, nyc-classifieds | ✅ `safeJsonLd` |
| **Inline `<` escape (equivalent, not the shared helper)** | **`theroadsidehelper`** (`_lib/schema.ts:308,318`), **`we-pay-you-junk`** (`_components/JsonLd.tsx`) | ✅ equivalent (inline `.replace(/</g,'\\u003c')`) |

**Confirmed:** a precise scan of every file containing `application/ld+json` for `JSON.stringify`
without `safeJsonLd` returned **only** those two files, and reading both shows each escapes `<`
inline. There are **zero** un-escaped JSON-LD sinks.

> Note: `safeJsonLd` escapes only `<`. It does **not** escape `>` or U+2028/U+2029. That is
> sufficient for the `</script>` breakout vector (you cannot close a script tag without `<`), and
> the two inline sinks match that exact behavior — so they are equal in protection, not weaker.

---

## `@type` inventory per site

Distinct schema.org `@type` values emitted anywhere under each site (union across all routes).
`[safe]` = escape applied on all sinks (true for every site — see table above).

### Cleaning / maid family
- **nycmaid** `[safe]` — AdministrativeArea, Answer, Audience, BlogPosting, Brand, BreadcrumbList, City, ContactPoint, Country, EducationalOccupationalCredential, EntryPoint, FAQPage, GeoCircle, GeoCoordinates, HowTo, HowToSection, HowToStep, HowToTool, ImageObject, ItemList, JobPosting, ListItem, LocalBusiness, MonetaryAmount, OccupationalExperienceRequirements, Offer, OfferCatalog, OpeningHoursSpecification, OrderAction, Organization, Person, Place, PostalAddress, PriceSpecification, ProfessionalService, PropertyValue, QuantitativeValue, Question, Rating, ReadAction, Reservation, ReserveAction, Review, SearchAction, Service, ServiceChannel, SiteNavigationElement, SpeakableSpecification, UnitPriceSpecification, VideoObject, WebPage, WebSite
- **the-florida-maid** `[safe]` — Answer, Article, Audience, Brand, BreadcrumbList, City, ContactPoint, EducationalOccupationalCredential, EntryPoint, FAQPage, GeoCircle, GeoCoordinates, HowTo, HowToSection, HowToStep, HowToTool, ImageObject, ItemList, JobPosting, ListItem, LocalBusiness, MonetaryAmount, OccupationalExperienceRequirements, Offer, OfferCatalog, OpeningHoursSpecification, OrderAction, Organization, Person, Place, PostalAddress, PriceSpecification, ProfessionalService, PropertyValue, QuantitativeValue, Question, Rating, ReadAction, Reservation, ReserveAction, Review, SearchAction, Service, ServiceChannel, SiteNavigationElement, SpeakableSpecification, State, UnitPriceSpecification, WebPage, WebSite
- **wash-and-fold-nyc** `[safe]` — AdministrativeArea, Answer, Audience, Brand, BreadcrumbList, City, ContactPoint, EducationalOccupationalCredential, EntryPoint, FAQPage, GeoCircle, GeoCoordinates, HowTo, HowToStep, HowToTool, ImageObject, ItemList, ListItem, LocalBusiness, MonetaryAmount, Offer, OfferCatalog, OpeningHoursSpecification, OrderAction, Organization, Person, Place, PostalAddress, PriceSpecification, ProfessionalService, QuantitativeValue, Question, Rating, ReadAction, Reservation, ReserveAction, Review, SearchAction, Service, SiteNavigationElement, SpeakableSpecification, UnitPriceSpecification, WebPage, WebSite
- **wash-and-fold-hoboken** `[safe]` — (same shape as nycmaid; note: metadata brand mismatch tracked in `seo-meta-consistency-final.md`) AdministrativeArea, Answer, Article, Audience, Brand, BreadcrumbList, City, ContactPoint, Country, EducationalOccupationalCredential, EntryPoint, FAQPage, GeoCircle, GeoCoordinates, HowTo, HowToSection, HowToStep, HowToTool, ImageObject, ItemList, JobPosting, ListItem, LocalBusiness, MonetaryAmount, OccupationalExperienceRequirements, Offer, OfferCatalog, OpeningHoursSpecification, OrderAction, Organization, Person, Place, PostalAddress, PriceSpecification, ProfessionalService, PropertyValue, QuantitativeValue, Question, Rating, ReadAction, Reservation, ReserveAction, Review, SearchAction, Service, ServiceChannel, SiteNavigationElement, SpeakableSpecification, UnitPriceSpecification, WebPage, WebSite
- **sunnyside-clean-nyc** `[safe via @/components/marketing/JsonLd]` — Answer, Article, Audience, Borough, Brand, BreadcrumbList, City, ContactPoint, EducationalOccupationalCredential, EntryPoint, FAQPage, GeoCircle, GeoCoordinates, HowTo, HowToSection, HowToStep, HowToTool, ImageObject, ItemList, ListItem, LocalBusiness, MonetaryAmount, Offer, OfferCatalog, OpeningHoursSpecification, OrderAction, Organization, Person, Place, PostalAddress, PriceSpecification, ProfessionalService, QuantitativeValue, Question, Rating, ReadAction, Reservation, ReserveAction, Review, SearchAction, Service, SiteNavigationElement, SpeakableSpecification, UnitPriceSpecification, WebPage, WebSite
- **template** (config-driven skeleton) `[safe]` — Answer, Audience, Brand, BreadcrumbList, City, ContactPoint, Country, EducationalOccupationalCredential, EntryPoint, FAQPage, GeoCircle, GeoCoordinates, HowTo, HowToSection, HowToStep, ImageObject, ItemList, JobPosting, ListItem, LocalBusiness, MonetaryAmount, Offer, OfferCatalog, OpeningHoursSpecification, Organization, Place, PostalAddress, PriceSpecification, ProfessionalService, PropertyValue, QuantitativeValue, Question, ReadAction, Reservation, ReserveAction, Service, ServiceChannel, SiteNavigationElement, SpeakableSpecification, WebPage, WebSite

### Marketing / professional services
- **consortium-nyc** `[safe]` — Answer, Article, BreadcrumbList, City, ContactPoint, EntryPoint, FAQPage, GeoCoordinates, ImageObject, ListItem, Offer, OfferCatalog, Organization, Place, PostalAddress, ProfessionalService, QuantitativeValue, Question, SearchAction, Service, State, WebPage, WebSite
- **the-nyc-marketing-company** `[safe]` — Answer, Article, BreadcrumbList, City, ContactPoint, EntryPoint, FAQPage, GeoCoordinates, ImageObject, ListItem, Offer, OfferCatalog, Organization, Place, PostalAddress, ProfessionalService, QuantitativeValue, Question, SearchAction, Service, State, WebPage, WebSite
- **the-nyc-seo** `[safe]` — AdministrativeArea, AggregateOffer, Answer, BreadcrumbList, City, EntryPoint, FAQPage, GeoCoordinates, HowTo, HowToStep, ItemList, ListItem, LocalBusiness, Offer, OfferCatalog, Organization, Place, PostalAddress, ProfessionalService, Question, SearchAction, Service, SoftwareApplication, State, UnitPriceSpecification, WebSite
- **the-nyc-interior-designer** `[safe]` — AboutPage, AdministrativeArea, Answer, Article, Borough, BreadcrumbList, City, ContactPage, ContactPoint, Course, FAQPage, GeoCoordinates, HowTo, HowToStep, ImageObject, JobPosting, ListItem, LocalBusiness, MonetaryAmount, Offer, OfferCatalog, OpeningHoursSpecification, Organization, Place, PostalAddress, PropertyValue, QuantitativeValue, Question, Service, SoftwareApplication, WebPage, WebSite

### Home / field services
- **the-home-services-company** `[safe]` — Answer, Article, BreadcrumbList, City, Country, CreativeWorkSeries, EntryPoint, FAQPage, HomeAndConstructionBusiness, JobPosting, ListItem, Offer, OfferCatalog, Organization, Place, PostalAddress, Question, SearchAction, Service, UnitPriceSpecification, WebPage, WebSite
- **the-nyc-exterminator** `[safe]` — Answer, Article, BreadcrumbList, City, CollectionPage, FAQPage, GeoCoordinates, ImageObject, JobPosting, ListItem, MonetaryAmount, Offer, OfferCatalog, OpeningHoursSpecification, Organization, PestControlService, Place, PostalAddress, QuantitativeValue, Question, Service, State, WebPage, WebSite
- **landscaping-in-nyc** `[safe]` — AboutPage, AdministrativeArea, Answer, Article, Borough, BreadcrumbList, City, ContactPage, ContactPoint, Course, FAQPage, GeoCoordinates, HowTo, HowToStep, ImageObject, JobPosting, ListItem, LocalBusiness, MonetaryAmount, Offer, OfferCatalog, OpeningHoursSpecification, Organization, Place, PostalAddress, PropertyValue, QuantitativeValue, Question, Service, SoftwareApplication, WebPage, WebSite
- **fla-dumpster-rentals** `[safe]` — Answer, Article, BlogPosting, BreadcrumbList, EntryPoint, FAQPage, ListItem, LocalBusiness, Offer, OfferCatalog, OpeningHoursSpecification, Organization, Place, PostalAddress, Question, SearchAction, Service, State, WebPage, WebSite
- **nyc-mobile-salon** `[safe]` — Answer, BreadcrumbList, City, Course, CourseInstance, Event, FAQPage, GeoCoordinates, HowTo, HowToStep, JobPosting, ListItem, LocalBusiness, MonetaryAmount, OccupationalExperienceRequirements, Offer, OpeningHoursSpecification, Organization, Place, PostalAddress, PropertyValue, QuantitativeValue, Question, Service, ServiceChannel, Thing, UnitPriceSpecification, WebPage, WebSite

### Roadside / towing
- **nyc-tow** `[safe]` — AboutPage, AdministrativeArea, Answer, Article, Audience, BreadcrumbList, City, ContactPage, ContactPoint, FAQPage, GeoCoordinates, HowTo, HowToStep, ImageObject, ItemList, JobPosting, ListItem, MonetaryAmount, Offer, OfferCatalog, OpeningHoursSpecification, Organization, Place, PostalAddress, QuantitativeValue, Question, Service, State, TowingService, UnitPriceSpecification, WebPage
- **nycroadsideemergencyassistance** `[safe]` — AboutPage, AdministrativeArea, Answer, Article, Audience, BreadcrumbList, City, ContactPage, ContactPoint, EmergencyService, FAQPage, GeoCoordinates, HowTo, HowToStep, ImageObject, ItemList, JobPosting, ListItem, MonetaryAmount, Offer, OfferCatalog, OpeningHoursSpecification, Organization, Place, PostalAddress, QuantitativeValue, Question, Service, SpeakableSpecification, State, TowingService, UnitPriceSpecification, WebPage
- **theroadsidehelper** `[safe — inline <, not shared helper]` — AdministrativeArea, Answer, Audience, BlogPosting, BreadcrumbList, ContactPoint, Country, EntryPoint, FAQPage, GeoCoordinates, HowTo, HowToStep, ImageObject, ItemList, ListItem, MonetaryAmount, Offer, OfferCatalog, OpeningHoursSpecification, Organization, Person, Place, PostalAddress, QuantitativeValue, Question, Rating, Review, SearchAction, Service, UnitPriceSpecification, WebPage, WebSite
- **we-pay-you-junk** `[safe — inline <, not shared helper]` — Answer, BlogPosting, BreadcrumbList, Country, FAQPage, ImageObject, JobPosting, ListItem, LocalBusiness, MonetaryAmount, Offer, OpeningHoursSpecification, Organization, Place, PostalAddress, QuantitativeValue, Question, Service, UnitPriceSpecification, WebSite

### Wellness / stretch
- **stretch-ny** `[safe]` — AboutPage, AdministrativeArea, AggregateOffer, Answer, Article, Audience, BreadcrumbList, City, CollectionPage, ContactPage, ContactPoint, Course, CourseInstance, Event, ExerciseAction, FAQPage, GeoCircle, GeoCoordinates, HowTo, HowToStep, ImageObject, ItemList, JobPosting, ListItem, MedicalAudience, MedicalCondition, MedicalRiskFactor, MedicalSignOrSymptom, MedicalSpecialty, MedicalTherapy, MedicalWebPage, MonetaryAmount, MuscleAction, Offer, OfferCatalog, OpeningHoursSpecification, Place, PostalAddress, Product, ProfilePage, QuantitativeValue, Question, Service, SiteNavigationElement, SpeakableSpecification, SpecialAnnouncement, State, Thing, TouristAttraction, VideoObject, WebPage, WebSite
- **stretch-service** `[safe]` — (identical set to stretch-ny) AboutPage, AdministrativeArea, AggregateOffer, Answer, Article, Audience, BreadcrumbList, City, CollectionPage, ContactPage, ContactPoint, Course, CourseInstance, Event, ExerciseAction, FAQPage, GeoCircle, GeoCoordinates, HowTo, HowToStep, ImageObject, ItemList, JobPosting, ListItem, MedicalAudience, MedicalCondition, MedicalRiskFactor, MedicalSignOrSymptom, MedicalSpecialty, MedicalTherapy, MedicalWebPage, MonetaryAmount, MuscleAction, Offer, OfferCatalog, OpeningHoursSpecification, Place, PostalAddress, Product, ProfilePage, QuantitativeValue, Question, Service, SiteNavigationElement, SpeakableSpecification, SpecialAnnouncement, State, Thing, TouristAttraction, VideoObject, WebPage, WebSite

### Finance
- **debt-service-ratio-loan** `[safe]` — Answer, Article, BreadcrumbList, City, ContactPage, ContactPoint, Country, Course, FAQPage, FinancialService, HowTo, HowToStep, ImageObject, ListItem, MonetaryAmount, Offer, OfferCatalog, OpeningHoursSpecification, Organization, PostalAddress, Question, Service, SoftwareApplication, State, VideoObject, WebPage, WebSite

### Classifieds
- **nyc-classifieds** `[safe]` — AboutPage, AdministrativeArea, AggregateRating, Answer, Article, Blog, BlogPosting, BreadcrumbList, City, CollectionPage, Comment, DiscussionForum, DiscussionForumPosting, EntryPoint, FAQPage, HowTo, InteractionCounter, ItemList, JobPosting, ListItem, MonetaryAmount, Offer, OfferCatalog, OpeningHoursSpecification, Organization, Person, Place, PostalAddress, Product, QuantitativeValue, Question, Rating, Review, SearchAction, Service, SiteNavigationElement, WebPage, WebSite

> `toll-trucks-near-me` emits its JSON-LD through the shared `src/lib/schema.tsx` / site JsonLd
> component (Organization / WebSite / LocalBusiness family) — `[safe]`, no local `@type` literals.

---

## Method & honest scope

- `@type` values extracted by grepping `"@type": "X"` (and single-quote/variants) across each
  `src/app/site/<tenant>/` tree, then union-deduped per site. Types built purely from a runtime
  **variable** (rare) would not appear as a literal and could be under-counted — treat each list as
  "**at least** these types," complete for all literal `@type` usages.
- safeJsonLd coverage determined by: (1) locating `safeJsonLd` def, (2) scanning every
  `application/ld+json` file for `JSON.stringify` without `safeJsonLd`, (3) reading the only two
  hits to confirm they apply the inline `<` escape.
- **NOT done:** rendering pages to validate JSON-LD against Google's Rich Results test; checking
  that emitted `url`/`image` hosts are correct (host correctness is covered in
  `seo-meta-consistency-final.md`, not here).

## Recommendations (optional, non-blocking)

1. **Consistency:** migrate `theroadsidehelper/_lib/schema.ts` and
   `we-pay-you-junk/_components/JsonLd.tsx` to import `safeJsonLd` instead of hand-rolling the
   `<` replace. Zero behavior change; removes two escape implementations to maintain. **Not a
   security fix** — both are already safe.
2. If a lint rule is wanted: ban bare `JSON.stringify` inside a `type="application/ld+json"` sink
   and require `safeJsonLd`. Would have caught the two inline sites automatically.
