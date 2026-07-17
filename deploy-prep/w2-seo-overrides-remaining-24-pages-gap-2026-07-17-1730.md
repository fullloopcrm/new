# W2 gap/fluidity refresh — 2026-07-17 17:30 EDT

Continuation of the seo_overrides apply-layer wiring follow-up
(`w2-seo-brand-and-overrides-followup-gap-2026-07-17-1704.md`), which left 3
of ~19 template pages wired and listed the rest as tracked follow-up. This
round closes the remaining surface.

## Closed this round

**seo_overrides apply-layer wiring — all 24 remaining `site/template`
`generateMetadata()` exports.** Ran a repo-wide check (`grep -L
getSeoOverride` across every `page.tsx` under `site/template` that exports
`generateMetadata`) to get an authoritative remaining list instead of relying
on the prior round's manual enumeration — it found 24, not ~19: the earlier
count missed `legal/page.tsx`, the two VA `[location]` combo pages, and
undercounted the VA-services family. All 24 now consult `getSeoOverride(url)`
the same way the homepage/`[slug]`/`[slug]/[service]`/`services/[slug]`
family already does, keyed by the tenant's absolute canonical url (matching
what `remediate.ts`/`enrich.ts` store as `target_url`, confirmed by reading
`getSeoOverride`'s exact-match lookup in `src/lib/seo/overrides.ts`) — not by
whatever the page's own `alternates.canonical` field happens to use (several
of these, e.g. the legal-doc family, use a *relative* canonical, which
resolves correctly via the template layout's per-tenant `metadataBase` but
would silently mismatch on override lookup if used as the override key
un-absolutized).

Pages closed, grouped by shape:
- **Longform content pages (8):** about, contact, faq, pricing, careers,
  services (index), reviews, referral-program — all built on the same
  `_lib/content/longform.ts` content-object pattern as the homepage.
- **Legal-doc pages (5):** legal, privacy-policy, terms-conditions,
  refund-policy, do-not-share-policy — relative canonical, absolute override
  key.
- **Inline-metadata pages (5):** careers/operations-coordinator,
  reviews/submit, service-areas, get-paid-for-cleaning-referrals-every-time-
  they-are-serviced, service/nyc-emergency-cleaning-service. Two of these
  (get-paid-for-referrals, nyc-emergency) construct visibly different copy
  for `openGraph` vs. the root title/description — preserved that
  distinction (override wins for both when present, but the *un-overridden*
  default keeps its original OG-specific wording rather than collapsing onto
  the root default, which would have been a silent copy regression for every
  tenant with no override set).
- **Dynamic/programmatic pages (6):** blog (index), blog/[slug],
  virtual-assistant-services (index), virtual-assistant-services/[service],
  virtual-assistant/[location], virtual-assistant/[location]/[service]. The
  last of these is `noindex` (geo×service combo, near-duplicate at national
  scale) but wired anyway so an approved fix reaches it if/when a combo gets
  promoted to indexed.

72 new `page.seo-override-guard.test.ts` tests (3 per page: template-default-
when-no-override, approved-override-wins, wrong-tenant-probe — the last one
is the mandatory cross-tenant leak check per this lane's standing rules).
tsc clean. Full suite: 638/638 files (614+24), 2749/2786 tests passed
(2677+72), 37 pre-existing skips (unchanged), 0 failures, 0 new eslint
warnings.

## NOT fixed this round — flagged, not touched (out of directed scope)

**`referral/page.tsx` (the client-rendered referrer portal, distinct from
`referral-program/page.tsx`) hardcodes "Your Business" and a placeholder
`hi@example.com` support email**, shown to real referrers of every tenant.
This is the same *class* of per-tenant resolution bug as everything else in
this lane, but a different *mechanism*: it's a `'use client'` component with
no `generateMetadata` at all — branding is set via `document.title` in a
`useEffect` and inline JSX, not through the metadata/seo_overrides pipeline
this round's work covers. Fixing it means threading `getSiteConfig()` (or a
client-safe tenant-identity fetch) into a client component, which is a
different code path than the 24 pages above. Noting for a future round
rather than folding it into this one.

File-only. No push/deploy/DB.
