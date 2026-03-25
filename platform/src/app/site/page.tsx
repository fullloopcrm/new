import Link from "next/link";
import {
  getTenantFromHeaders,
  getTenantServices,
  getTenantReviews,
  getTenantAreas,
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

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5 text-amber-400" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          className={`w-5 h-5 ${i < rating ? "fill-current" : "text-slate-300"}`}
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

/** Auto-assign an SVG icon based on service name keywords */
function ServiceIcon({ name }: { name: string }) {
  const n = name.toLowerCase();
  // Cleaning
  if (/clean|maid|house|janitorial|sanitiz/i.test(n)) {
    return (
      <svg className="w-8 h-8 text-[var(--brand)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
      </svg>
    );
  }
  // Repair / maintenance / handyman
  if (/repair|fix|maintain|handyman|plumb|electr/i.test(n)) {
    return (
      <svg className="w-8 h-8 text-[var(--brand)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.58-5.58a4.243 4.243 0 010-6h.003a4.243 4.243 0 016 0l.003.003 5.58 5.58a4.243 4.243 0 010 6h-.003a4.243 4.243 0 01-6 0l-.003-.003z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 2.25l3 3m-3-3l-3 3m3-3V6m-9 9l-3 3m3-3l-3-3m3 3V15" />
      </svg>
    );
  }
  // Lawn / garden / landscaping
  if (/lawn|garden|landscape|yard|mow|tree|trim/i.test(n)) {
    return (
      <svg className="w-8 h-8 text-[var(--brand)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
      </svg>
    );
  }
  // Moving / delivery
  if (/mov|delivery|haul|transport|pack/i.test(n)) {
    return (
      <svg className="w-8 h-8 text-[var(--brand)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
      </svg>
    );
  }
  // Painting
  if (/paint|wall|interior|exterior/i.test(n)) {
    return (
      <svg className="w-8 h-8 text-[var(--brand)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
      </svg>
    );
  }
  // Pest / exterminator
  if (/pest|exterminat|bug|rodent|termite/i.test(n)) {
    return (
      <svg className="w-8 h-8 text-[var(--brand)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    );
  }
  // Default service icon
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

  const [services, reviews, areas] = await Promise.all([
    getTenantServices(tenant.id),
    getTenantReviews(tenant.id),
    getTenantAreas(tenant.id),
  ]);

  const businessName = tenant.name || "Our Business";
  const tagline = tenant.tagline || "Professional Service You Can Trust";
  const phone = tenant.phone || "";
  const industry = tenant.industry || "professional services";
  const selenaEnabled = !!(tenant.selena_config as Record<string, unknown> | null)?.enabled;
  const baseUrl =
    tenant.website_url || `https://${tenant.slug}.fullloopcrm.com`;

  // Reviews stats
  const avgRating =
    reviews.length > 0
      ? reviews.reduce(
          (sum: number, r: { rating: number }) => sum + (r.rating || 0),
          0
        ) / reviews.length
      : 0;
  const topReviews = reviews.slice(0, 3);

  // Min rate for pricing
  const rates = (services as Array<{ default_hourly_rate?: number }>)
    .map((s) => s.default_hourly_rate)
    .filter((r): r is number => r != null && r > 0)
    .sort((a, b) => a - b);
  const minRate = rates[0] || null;

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

      {/* ===== HERO ===== */}
      <section className="bg-gradient-to-br from-slate-50 to-slate-100 py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 leading-tight">
            {businessName}
          </h1>
          <p className="mt-4 text-xl sm:text-2xl text-[var(--brand)] font-semibold">
            {tagline}
          </p>
          <p className="mt-6 text-lg text-slate-600 max-w-2xl mx-auto">
            Book online in minutes and experience the difference that true
            professionals make.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/site/book"
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold text-white bg-[var(--brand)] hover:bg-[var(--brand-dark)] rounded-lg transition-colors shadow-lg"
            >
              Book Now
            </Link>
            {phone && (
              <a
                href={`tel:${phone.replace(/[^+\d]/g, "")}`}
                className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors"
              >
                Call {phone}
              </a>
            )}
          </div>

          {/* Trust badges */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500">
            <span className="flex items-center gap-1.5">
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>
              Licensed &amp; Insured
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
              Background-Checked
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg>
              Satisfaction Guaranteed
            </span>
            {selenaEnabled && (
              <span className="flex items-center gap-1.5">
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>
                24/7 AI Booking
              </span>
            )}
          </div>

          {/* Review summary in hero */}
          {reviews.length > 0 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <StarRating rating={Math.round(avgRating)} />
              <span className="text-sm text-slate-600">
                {avgRating.toFixed(1)} average from {reviews.length} review{reviews.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* ===== SERVICES GRID ===== */}
      {services.length > 0 && (
        <section id="services" className="py-16 lg:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-slate-900">
                Our Services
              </h2>
              <p className="mt-3 text-slate-600 max-w-xl mx-auto">
                Professional {industry} tailored to your needs.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {(
                services as Array<{
                  id: string;
                  name: string;
                  description?: string;
                  default_hourly_rate?: number;
                  slug?: string;
                }>
              ).map((service) => (
                <Link
                  key={service.id}
                  href={`/site/services/${toSlug(service.name)}`}
                  className="group bg-white border border-slate-200 rounded-xl p-6 hover:shadow-lg hover:border-[var(--brand)]/30 transition-all flex flex-col"
                >
                  <div className="mb-4">
                    <ServiceIcon name={service.name} />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 group-hover:text-[var(--brand)] transition-colors">
                    {service.name}
                  </h3>
                  {service.description && (
                    <p className="mt-2 text-sm text-slate-600 leading-relaxed flex-1">
                      {service.description}
                    </p>
                  )}
                  {service.default_hourly_rate != null && (
                    <p className="mt-4 text-sm font-semibold text-[var(--brand)]">
                      Starting at ${service.default_hourly_rate}/hr
                    </p>
                  )}
                </Link>
              ))}
            </div>
            <div className="text-center mt-10">
              <Link
                href="/site/services"
                className="inline-flex items-center text-sm font-semibold text-[var(--brand)] hover:text-[var(--brand-dark)] transition-colors"
              >
                View All Services &rarr;
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ===== WHY CHOOSE US ===== */}
      <section className="py-16 lg:py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900">
              Why Choose {businessName}
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1 */}
            <div className="bg-white rounded-xl p-6 text-center border border-slate-200">
              <div className="w-12 h-12 mx-auto rounded-full bg-[var(--brand)]/10 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-[var(--brand)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
              <h3 className="font-semibold text-slate-900">
                Licensed &amp; Insured
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Fully licensed and carrying comprehensive liability insurance
                for your complete peace of mind.
              </p>
            </div>
            {/* Card 2 */}
            <div className="bg-white rounded-xl p-6 text-center border border-slate-200">
              <div className="w-12 h-12 mx-auto rounded-full bg-[var(--brand)]/10 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-[var(--brand)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
              <h3 className="font-semibold text-slate-900">
                Background-Checked Team
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Every team member undergoes thorough background screening before
                they step foot in your space.
              </p>
            </div>
            {/* Card 3 */}
            <div className="bg-white rounded-xl p-6 text-center border border-slate-200">
              <div className="w-12 h-12 mx-auto rounded-full bg-[var(--brand)]/10 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-[var(--brand)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                </svg>
              </div>
              <h3 className="font-semibold text-slate-900">
                Satisfaction Guaranteed
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Not happy with the results? We will make it right — no
                questions asked. Your satisfaction is our priority.
              </p>
            </div>
            {/* Card 4 */}
            <div className="bg-white rounded-xl p-6 text-center border border-slate-200">
              <div className="w-12 h-12 mx-auto rounded-full bg-[var(--brand)]/10 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-[var(--brand)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  {selenaEnabled ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  )}
                </svg>
              </div>
              <h3 className="font-semibold text-slate-900">
                {selenaEnabled ? "24/7 AI Booking" : "Easy Online Booking"}
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                {selenaEnabled
                  ? "Book anytime day or night with our AI assistant Selena — via text, chat, or online."
                  : "Schedule appointments online in minutes. No phone tag, no waiting."}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== SERVICE AREAS ===== */}
      {areas.length > 0 && (
        <section id="areas" className="py-16 lg:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-slate-900">
                Areas We Serve
              </h2>
              <p className="mt-3 text-slate-600 max-w-xl mx-auto">
                Proudly serving these communities and surrounding neighborhoods.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {areas.map((area) => (
                <Link
                  key={area}
                  href={`/site/areas/${toSlug(area)}`}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-full hover:border-[var(--brand)] hover:text-[var(--brand)] transition-colors"
                >
                  {area}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== HOW IT WORKS ===== */}
      <section className="py-16 lg:py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900">How It Works</h2>
            <p className="mt-3 text-slate-600">
              Getting started is simple. Three easy steps.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-14 h-14 mx-auto rounded-full bg-[var(--brand)] text-white flex items-center justify-center text-xl font-bold mb-4">
                1
              </div>
              <h3 className="font-semibold text-slate-900">
                Book Online or Text Us
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Pick your service, choose a time, and book in minutes
                {phone ? ` — or text us at ${phone}` : ""}.
              </p>
            </div>
            {/* Step 2 */}
            <div className="text-center">
              <div className="w-14 h-14 mx-auto rounded-full bg-[var(--brand)] text-white flex items-center justify-center text-xl font-bold mb-4">
                2
              </div>
              <h3 className="font-semibold text-slate-900">
                We Send Our Team
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                A vetted, background-checked professional arrives on time with
                everything needed.
              </p>
            </div>
            {/* Step 3 */}
            <div className="text-center">
              <div className="w-14 h-14 mx-auto rounded-full bg-[var(--brand)] text-white flex items-center justify-center text-xl font-bold mb-4">
                3
              </div>
              <h3 className="font-semibold text-slate-900">
                Enjoy the Results
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Sit back and enjoy. Not satisfied? We will make it right — guaranteed.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== REVIEWS ===== */}
      {topReviews.length > 0 && (
        <section id="reviews" className="py-16 lg:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-slate-900">
                What Our Clients Say
              </h2>
              {reviews.length > 0 && (
                <div className="mt-4 flex items-center justify-center gap-2">
                  <StarRating rating={Math.round(avgRating)} />
                  <span className="text-lg font-semibold text-slate-900">
                    {avgRating.toFixed(1)}
                  </span>
                  <span className="text-slate-500">
                    ({reviews.length} review{reviews.length !== 1 ? "s" : ""})
                  </span>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {topReviews.map(
                (
                  review: {
                    id?: string;
                    author_name?: string;
                    rating?: number;
                    text?: string;
                  },
                  i: number
                ) => (
                  <div
                    key={review.id || i}
                    className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm"
                  >
                    <StarRating rating={review.rating || 5} />
                    {review.text && (
                      <p className="mt-4 text-slate-700 leading-relaxed line-clamp-4">
                        &ldquo;{review.text}&rdquo;
                      </p>
                    )}
                    {review.author_name && (
                      <p className="mt-4 text-sm font-semibold text-slate-900">
                        &mdash; {review.author_name}
                      </p>
                    )}
                  </div>
                )
              )}
            </div>
            <div className="text-center mt-10">
              <Link
                href="/site/reviews"
                className="inline-flex items-center text-sm font-semibold text-[var(--brand)] hover:text-[var(--brand-dark)] transition-colors"
              >
                Read All Reviews &rarr;
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ===== PRICING ===== */}
      {services.length > 0 && (
        <section id="pricing" className="py-16 lg:py-20 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-slate-900">
                Transparent Pricing
              </h2>
              <p className="mt-3 text-slate-600 max-w-xl mx-auto">
                Simple, honest rates. No hidden fees.
                {minRate && ` Starting from $${minRate}/hr.`}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {(
                services as Array<{
                  id: string;
                  name: string;
                  default_hourly_rate?: number;
                  default_duration_hours?: number;
                }>
              ).map((service) => (
                <div
                  key={service.id}
                  className="bg-white border border-slate-200 rounded-xl p-6 text-center"
                >
                  <h3 className="font-semibold text-slate-900">
                    {service.name}
                  </h3>
                  <div className="mt-3">
                    {service.default_hourly_rate != null ? (
                      <>
                        <span className="text-3xl font-bold text-[var(--brand)]">
                          ${service.default_hourly_rate}
                        </span>
                        <span className="text-slate-500">/hr</span>
                      </>
                    ) : (
                      <span className="text-lg text-slate-500">
                        Contact for pricing
                      </span>
                    )}
                  </div>
                  {service.default_duration_hours != null && (
                    <p className="mt-2 text-xs text-slate-500">
                      Typical duration: ~
                      {service.default_duration_hours}{" "}
                      {service.default_duration_hours === 1 ? "hour" : "hours"}
                    </p>
                  )}
                  <Link
                    href="/site/book"
                    className="mt-4 inline-flex items-center px-5 py-2 text-sm font-semibold text-white bg-[var(--brand)] hover:bg-[var(--brand-dark)] rounded-lg transition-colors"
                  >
                    Book Now
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== FAQ ===== */}
      <section id="faq" className="py-16 lg:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900">
              Frequently Asked Questions
            </h2>
          </div>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <details
                key={i}
                className="group bg-white border border-slate-200 rounded-xl overflow-hidden"
              >
                <summary className="flex items-center justify-between p-5 cursor-pointer text-left font-semibold text-slate-900 hover:text-[var(--brand)] transition-colors">
                  <span>{faq.q}</span>
                  <svg
                    className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform shrink-0 ml-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                    />
                  </svg>
                </summary>
                <div className="px-5 pb-5 text-sm text-slate-600 leading-relaxed">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className="py-16 lg:py-20 bg-[var(--brand)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white">
            Ready to Get Started?
          </h2>
          <p className="mt-4 text-lg text-white/80 max-w-xl mx-auto">
            {phone
              ? `Call or text us at ${phone}, or book online in just a few minutes.`
              : "Book your first appointment online in just a few minutes. No commitment required."}
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/site/book"
              className="inline-flex items-center px-8 py-3.5 text-base font-semibold text-[var(--brand)] bg-white hover:bg-slate-50 rounded-lg transition-colors shadow-lg"
            >
              Book Now
            </Link>
            {phone && (
              <a
                href={`tel:${phone.replace(/[^+\d]/g, "")}`}
                className="inline-flex items-center px-8 py-3.5 text-base font-semibold text-white border-2 border-white/50 hover:bg-white/10 rounded-lg transition-colors"
              >
                Call {phone}
              </a>
            )}
            {selenaEnabled && (
              <Link
                href="/site/chat"
                className="inline-flex items-center px-8 py-3.5 text-base font-semibold text-white border-2 border-white/50 hover:bg-white/10 rounded-lg transition-colors"
              >
                Chat with Selena
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Selena Web Chat Widget */}
      {selenaEnabled && (
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var s = document.createElement('script');
                s.src = '/selena-widget.js';
                s.dataset.tenantId = '${tenant.id}';
                document.body.appendChild(s);
              })();
            `,
          }}
        />
      )}
    </div>
  );
}
