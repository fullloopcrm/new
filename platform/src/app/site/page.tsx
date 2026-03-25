import Link from "next/link";
import {
  getTenantFromHeaders,
  getTenantServices,
  getTenantReviews,
  getTenantAreas,
  getTenantTeamCount,
  toSlug,
} from "@/lib/tenant-site";
import {
  tenantLocalBusinessSchema,
  tenantWebPageSchema,
  tenantFAQSchema,
  tenantBreadcrumbSchema,
  generateTenantFAQs,
} from "@/lib/tenant-schema";
import type { Metadata } from "next";
import HeroChat from "./HeroChat";

/* ---------- Metadata ---------- */

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenantFromHeaders();
  if (!tenant) return { title: "Home" };

  const name = tenant.name || "Home";
  const tagline = tenant.tagline || "Professional service you can trust.";
  const url =
    tenant.website_url || `https://${tenant.slug}.fullloopcrm.com`;

  return {
    title: `${name} | ${tagline}`,
    description: `${name} — ${tagline} Book online today.`,
    robots: { index: true, follow: true },
    openGraph: {
      title: `${name} | ${tagline}`,
      description: `${name} — ${tagline} Book online today.`,
      url,
      siteName: name,
      type: "website",
      ...(tenant.logo_url && {
        images: [{ url: tenant.logo_url, alt: name }],
      }),
    },
    alternates: { canonical: url },
  };
}

/* ---------- Helpers ---------- */

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          className={`w-4 h-4 ${i < Math.round(rating) ? "text-amber-400 fill-current" : "text-white/20 fill-current"}`}
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  );
}

function ReviewStars({ rating }: { rating: number }) {
  return (
    <span className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          className={`w-5 h-5 ${i < Math.round(rating) ? "text-amber-400 fill-current" : "text-slate-300 fill-current"}`}
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  );
}

/** Auto-assign an SVG icon based on service name keywords */
function ServiceIcon({ name }: { name: string }) {
  const n = name.toLowerCase();
  if (/clean|maid|house|janitorial|sanitiz/i.test(n)) {
    return (
      <svg className="w-8 h-8 text-[var(--brand)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
      </svg>
    );
  }
  if (/repair|fix|maintain|handyman|plumb|electr/i.test(n)) {
    return (
      <svg className="w-8 h-8 text-[var(--brand)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.58-5.58a4.243 4.243 0 010-6h.003a4.243 4.243 0 016 0l.003.003 5.58 5.58a4.243 4.243 0 010 6h-.003a4.243 4.243 0 01-6 0l-.003-.003z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 2.25l3 3m-3-3l-3 3m3-3V6m-9 9l-3 3m3-3l-3-3m3 3V15" />
      </svg>
    );
  }
  if (/lawn|garden|landscape|yard|mow|tree|trim/i.test(n)) {
    return (
      <svg className="w-8 h-8 text-[var(--brand)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
      </svg>
    );
  }
  if (/mov|delivery|haul|transport|pack/i.test(n)) {
    return (
      <svg className="w-8 h-8 text-[var(--brand)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
      </svg>
    );
  }
  if (/paint|wall|interior|exterior/i.test(n)) {
    return (
      <svg className="w-8 h-8 text-[var(--brand)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
      </svg>
    );
  }
  if (/pest|exterminat|bug|rodent|termite/i.test(n)) {
    return (
      <svg className="w-8 h-8 text-[var(--brand)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    );
  }
  return (
    <svg className="w-8 h-8 text-[var(--brand)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    </svg>
  );
}

/* ---------- Page ---------- */

export default async function HomePage() {
  const tenant = await getTenantFromHeaders();
  if (!tenant) return null;

  const [services, reviews, areas, teamCount] = await Promise.all([
    getTenantServices(tenant.id),
    getTenantReviews(tenant.id),
    getTenantAreas(tenant.id),
    getTenantTeamCount(tenant.id),
  ]);

  const selenaConfig = (tenant.selena_config || {}) as Record<string, unknown>;
  const businessName = tenant.name || "Our Business";
  const tagline = tenant.tagline || "Professional Service You Can Trust";
  const phone = tenant.phone || "";
  const industry = tenant.industry || "professional services";
  const selenaEnabled = !!selenaConfig?.enabled;
  const aiName = (selenaConfig?.ai_name as string) || "Selena";
  const baseUrl =
    tenant.website_url || `https://${tenant.slug}.fullloopcrm.com`;

  // Pricing tiers from selena_config
  const pricingTiers = (selenaConfig?.pricing_tiers as Array<{ label: string; price: number }>) || [];

  // Reviews stats
  const avgRating =
    reviews.length > 0
      ? reviews.reduce(
          (sum: number, r: { rating: number }) => sum + (r.rating || 0),
          0
        ) / reviews.length
      : 0;
  const topReviews = reviews.slice(0, 6);

  // Min rate for pricing
  const rates = (services as Array<{ default_hourly_rate?: number }>)
    .map((s) => s.default_hourly_rate)
    .filter((r): r is number => r != null && r > 0)
    .sort((a, b) => a - b);
  const minRate = rates[0] || null;

  // Primary area
  const primaryArea = areas[0] || "Your Area";

  // Year founded (from created_at)
  const createdAt = tenant.created_at ? new Date(tenant.created_at) : new Date();
  const foundedYear = createdAt.getFullYear();

  // Generate FAQs
  const faqs = generateTenantFAQs(tenant, services, areas);

  // Schema markup
  const localBusinessSchema = tenantLocalBusinessSchema(tenant, services, areas);
  const webPageSchema = tenantWebPageSchema(
    `${businessName} | ${tagline}`,
    `${businessName} — ${tagline}. Book online today.`,
    baseUrl
  );
  const faqSchema = tenantFAQSchema(faqs);
  const breadcrumbSchema = tenantBreadcrumbSchema([
    { name: "Home", url: baseUrl },
  ]);

  return (
    <div>
      {/* Schema Markup */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(localBusinessSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbSchema),
        }}
      />

      {/* ===== HERO — dark navy gradient ===== */}
      <section className="bg-gradient-to-b from-[var(--brand)] to-[color-mix(in_srgb,var(--brand),white_12%)] pt-12 md:pt-16 pb-14 md:pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Social proof bar */}
          <div className="flex flex-wrap items-center gap-4 mb-8">
            {reviews.length > 0 && (
              <>
                <span className="flex items-center gap-2">
                  <Stars rating={avgRating} />
                  <span className="text-blue-200/70 text-sm">
                    {avgRating.toFixed(1)} on Google
                  </span>
                </span>
                <span className="text-white/20">|</span>
              </>
            )}
            <span className="text-blue-200/70 text-sm">
              Trusted since {foundedYear}
            </span>
            <span className="text-white/20">|</span>
            <span className="text-blue-200/70 text-sm">Insured</span>
          </div>

          {/* H1 */}
          <h1 className="font-[family-name:var(--font-bebas)] text-5xl md:text-7xl lg:text-8xl text-white tracking-wide leading-[0.95]">
            {primaryArea.toUpperCase()}&apos;S #1 RATED {industry.toUpperCase()}
            {minRate && <> &mdash; FROM ${minRate}/HR</>}
          </h1>

          {/* Trust points */}
          <div className="mt-6 flex flex-wrap gap-x-6 text-[var(--brand-accent)] text-sm font-medium">
            <span>&#10003; No money upfront</span>
            <span>&#10003; Payment upon completion</span>
            <span>&#10003; No contracts</span>
            <span>&#10003; Flat hourly pricing</span>
          </div>

          {/* Divider */}
          <div className="mt-8 w-3/4 h-[1px] bg-white/20" />

          {/* Selena section */}
          {selenaEnabled && (
            <div className="mt-10">
              <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-white tracking-wide leading-[0.95]">
                BOOK INSTANTLY WITH {aiName.toUpperCase()} (AVG 30 SECONDS)
              </h2>
              <p className="mt-2 text-white/80 italic text-sm">
                {aiName} is our AI booking assistant &mdash; available 24/7.
              </p>
              <p className="mt-2 text-blue-200/70 text-sm max-w-2xl">
                Tell {aiName} what you need, when you need it, and where.
                {aiName} will check availability and book you in seconds &mdash;
                no phone calls, no waiting.
              </p>

              <div className="mt-6 max-w-xl">
                <HeroChat tenantId={tenant.id} accentColor="var(--brand-accent)" />
              </div>
            </div>
          )}

          {/* Pricing cards */}
          {pricingTiers.length > 0 && (
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl">
              {pricingTiers.map((tier, idx) => {
                const isPopular = pricingTiers.length === 3 && idx === 1;
                return (
                  <div
                    key={tier.label}
                    className={`relative rounded-2xl p-8 backdrop-blur-sm ${
                      isPopular
                        ? "bg-[var(--brand-accent)]/10 border border-[var(--brand-accent)]/30"
                        : "bg-white/[0.08] border border-white/15"
                    }`}
                  >
                    {isPopular && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[var(--brand-accent)] text-white text-xs font-bold tracking-[0.15em] uppercase px-4 py-1 rounded-full">
                        MOST POPULAR
                      </span>
                    )}
                    <p className="text-xs tracking-[0.2em] uppercase text-[var(--brand-accent)] font-medium">
                      {tier.label}
                    </p>
                    <p className="mt-3 font-[family-name:var(--font-bebas)] text-5xl text-white">
                      ${tier.price}
                      <span className="text-lg text-blue-200/60 ml-1">/hr</span>
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {/* CTA buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-start gap-4">
            <Link
              href="/site/book"
              className="inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold text-white bg-[var(--brand-accent)] hover:brightness-110 rounded-lg transition shadow-lg"
            >
              Book Now
            </Link>
            {phone && (
              <a
                href={`tel:${phone.replace(/[^+\d]/g, "")}`}
                className="inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition"
              >
                Call {phone}
              </a>
            )}
          </div>
        </div>
      </section>

      {/* ===== WELCOME — white bg ===== */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            {/* Left */}
            <div>
              <p className="text-xs tracking-[0.2em] uppercase text-[var(--brand-accent)] font-medium mb-3">
                About Us
              </p>
              <h2 className="font-[family-name:var(--font-bebas)] text-4xl md:text-5xl text-slate-900 tracking-wide leading-[0.95]">
                WELCOME TO {businessName.toUpperCase()}
              </h2>
              <div className="mt-4 w-12 h-[2px] bg-[var(--brand-accent)]" />
              <p className="mt-6 text-slate-600 leading-relaxed">
                {businessName} provides professional {industry.toLowerCase()} services
                throughout {primaryArea} and surrounding areas. Our dedicated team
                delivers consistent, high-quality results with transparent pricing,
                no contracts, and complete satisfaction guaranteed.
              </p>
              <p className="mt-4 text-slate-600 leading-relaxed">
                {tagline}
              </p>
            </div>

            {/* Right — stats box */}
            <div className="bg-[#F5FBF8] border border-[var(--brand-accent)]/30 rounded-2xl p-8">
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="font-[family-name:var(--font-bebas)] text-3xl text-slate-900">
                    {reviews.length > 0 ? `${reviews.length}+` : "100+"}
                  </p>
                  <p className="text-sm text-slate-500 mt-1">Happy Clients</p>
                </div>
                <div>
                  <p className="font-[family-name:var(--font-bebas)] text-3xl text-slate-900">
                    {teamCount || "5+"}
                  </p>
                  <p className="text-sm text-slate-500 mt-1">Team Members</p>
                </div>
                <div>
                  <p className="font-[family-name:var(--font-bebas)] text-3xl text-slate-900">
                    {new Date().getFullYear() - foundedYear || 1}+
                  </p>
                  <p className="text-sm text-slate-500 mt-1">Years in Business</p>
                </div>
                <div>
                  <p className="font-[family-name:var(--font-bebas)] text-3xl text-slate-900">
                    {areas.length || "1"}
                  </p>
                  <p className="text-sm text-slate-500 mt-1">Areas Served</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== SERVICES ===== */}
      {services.length > 0 && (
        <section id="services" className="py-16 lg:py-20 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <p className="text-xs tracking-[0.2em] uppercase text-[var(--brand-accent)] font-medium mb-3">
                What We Offer
              </p>
              <h2 className="font-[family-name:var(--font-bebas)] text-4xl md:text-5xl text-slate-900 tracking-wide leading-[0.95]">
                OUR SERVICES
              </h2>
              <div className="mt-4 w-12 h-[2px] bg-[var(--brand-accent)] mx-auto" />
              <p className="mt-4 text-slate-600 max-w-xl mx-auto">
                Professional {industry.toLowerCase()} tailored to your needs.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {(services as Array<{ id: string; name: string; description?: string; default_hourly_rate?: number }>).map(
                (service) => (
                  <Link
                    key={service.id}
                    href={`/site/services/${toSlug(service.name)}`}
                    className="group bg-white rounded-2xl border border-slate-200 p-8 hover:shadow-lg hover:border-[var(--brand-accent)]/40 transition-all"
                  >
                    <div className="mb-4">
                      <ServiceIcon name={service.name} />
                    </div>
                    <h3 className="font-[family-name:var(--font-bebas)] text-2xl text-slate-900 tracking-wide group-hover:text-[var(--brand)]">
                      {service.name.toUpperCase()}
                    </h3>
                    {service.description && (
                      <p className="mt-2 text-slate-600 text-sm line-clamp-3">
                        {service.description}
                      </p>
                    )}
                    {service.default_hourly_rate != null &&
                      service.default_hourly_rate > 0 && (
                        <p className="mt-4 text-[var(--brand-accent)] font-semibold text-sm">
                          From ${service.default_hourly_rate}/hr
                        </p>
                      )}
                    <span className="mt-4 inline-flex items-center text-sm font-medium text-[var(--brand)] group-hover:underline">
                      Learn more &rarr;
                    </span>
                  </Link>
                )
              )}
            </div>
          </div>
        </section>
      )}

      {/* ===== SERVICE AREAS ===== */}
      {areas.length > 0 && (
        <section className="py-16 lg:py-20 bg-[var(--brand-accent)]/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <p className="text-xs tracking-[0.2em] uppercase text-[var(--brand-accent)] font-medium mb-3">
                Where We Work
              </p>
              <h2 className="font-[family-name:var(--font-bebas)] text-4xl md:text-5xl text-slate-900 tracking-wide leading-[0.95]">
                SERVICE AREAS
              </h2>
              <div className="mt-4 w-12 h-[2px] bg-[var(--brand-accent)] mx-auto" />
            </div>

            <div className="flex flex-wrap justify-center gap-3">
              {areas.map((area) => (
                <Link
                  key={area}
                  href={`/site/areas/${toSlug(area)}`}
                  className="px-5 py-2.5 rounded-full bg-white border border-[var(--brand-accent)]/30 text-slate-700 text-sm font-medium hover:bg-[var(--brand-accent)] hover:text-white hover:border-[var(--brand-accent)] transition-colors"
                >
                  {area}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== HOW IT WORKS ===== */}
      <section className="py-16 lg:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-xs tracking-[0.2em] uppercase text-[var(--brand-accent)] font-medium mb-3">
              Simple Process
            </p>
            <h2 className="font-[family-name:var(--font-bebas)] text-4xl md:text-5xl text-slate-900 tracking-wide leading-[0.95]">
              HOW IT WORKS
            </h2>
            <div className="mt-4 w-12 h-[2px] bg-[var(--brand-accent)] mx-auto" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-4xl mx-auto">
            {[
              {
                step: "1",
                title: "Book Online or Text Us",
                desc: `Use ${selenaEnabled ? aiName : "our website"} to book in seconds, or text us directly. No phone tag needed.`,
              },
              {
                step: "2",
                title: "We Send Our Team",
                desc: "Our vetted, insured professionals arrive on time with everything needed to get the job done right.",
              },
              {
                step: "3",
                title: "Enjoy the Results",
                desc: "Sit back while we handle the work. Pay only when you are 100% satisfied.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-14 h-14 rounded-full bg-[var(--brand)] text-white flex items-center justify-center mx-auto mb-4">
                  <span className="font-[family-name:var(--font-bebas)] text-2xl">
                    {item.step}
                  </span>
                </div>
                <h3 className="font-[family-name:var(--font-bebas)] text-xl text-slate-900 tracking-wide mb-2">
                  {item.title.toUpperCase()}
                </h3>
                <p className="text-slate-600 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== REVIEWS ===== */}
      {topReviews.length > 0 && (
        <section className="py-16 lg:py-20 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <p className="text-xs tracking-[0.2em] uppercase text-[var(--brand-accent)] font-medium mb-3">
                Testimonials
              </p>
              <h2 className="font-[family-name:var(--font-bebas)] text-4xl md:text-5xl text-slate-900 tracking-wide leading-[0.95]">
                WHAT OUR CLIENTS SAY
              </h2>
              <div className="mt-4 w-12 h-[2px] bg-[var(--brand-accent)] mx-auto" />
              {reviews.length > 0 && (
                <p className="mt-4 text-slate-600">
                  {avgRating.toFixed(1)} average rating from {reviews.length} review
                  {reviews.length !== 1 ? "s" : ""}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {(topReviews as Array<{ id?: string; reviewer_name?: string; rating: number; text?: string; review_text?: string }>).map(
                (review, idx) => (
                  <div
                    key={review.id || idx}
                    className="bg-white rounded-2xl border border-slate-200 p-8"
                  >
                    <ReviewStars rating={review.rating} />
                    <p className="mt-4 text-slate-700 text-sm leading-relaxed line-clamp-5">
                      &ldquo;{review.text || review.review_text}&rdquo;
                    </p>
                    {review.reviewer_name && (
                      <p className="mt-4 text-sm font-semibold text-slate-900">
                        &mdash; {review.reviewer_name}
                      </p>
                    )}
                  </div>
                )
              )}
            </div>

            {reviews.length > 6 && (
              <div className="mt-10 text-center">
                <Link
                  href="/site/reviews"
                  className="text-[var(--brand)] font-semibold hover:underline"
                >
                  See all {reviews.length} reviews &rarr;
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ===== FAQ ===== */}
      {faqs.length > 0 && (
        <section className="py-16 lg:py-20 bg-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <p className="text-xs tracking-[0.2em] uppercase text-[var(--brand-accent)] font-medium mb-3">
                Common Questions
              </p>
              <h2 className="font-[family-name:var(--font-bebas)] text-4xl md:text-5xl text-slate-900 tracking-wide leading-[0.95]">
                FREQUENTLY ASKED QUESTIONS
              </h2>
              <div className="mt-4 w-12 h-[2px] bg-[var(--brand-accent)] mx-auto" />
            </div>

            <div className="space-y-3">
              {faqs.map((faq, idx) => (
                <details
                  key={idx}
                  className="group bg-slate-50 rounded-xl border border-slate-200 overflow-hidden"
                >
                  <summary className="cursor-pointer px-6 py-5 text-slate-900 font-medium flex items-center justify-between hover:bg-slate-100 transition-colors">
                    <span>{faq.q}</span>
                    <svg
                      className="w-5 h-5 text-slate-400 shrink-0 ml-4 group-open:rotate-180 transition-transform"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </summary>
                  <div className="px-6 pb-5 text-slate-600 text-sm leading-relaxed">
                    {faq.a}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== FINAL CTA ===== */}
      <section className="py-16 lg:py-20 bg-[var(--brand)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-[family-name:var(--font-bebas)] text-4xl md:text-5xl text-white tracking-wide leading-[0.95]">
            READY TO BOOK?
          </h2>
          <p className="mt-4 text-blue-200/70 max-w-xl mx-auto">
            Get started in seconds. No contracts, no hassle &mdash; just
            professional {industry.toLowerCase()} you can count on.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/site/book"
              className="inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold text-[var(--brand)] bg-white hover:bg-slate-100 rounded-lg transition shadow-lg"
            >
              Book Now
            </Link>
            {phone && (
              <a
                href={`tel:${phone.replace(/[^+\d]/g, "")}`}
                className="inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition"
              >
                Call {phone}
              </a>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
