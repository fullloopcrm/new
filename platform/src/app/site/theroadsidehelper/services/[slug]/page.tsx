// @ts-nocheck
import Link from "next/link";
import Image from "next/image";
import { CtaButtons } from "@/app/site/theroadsidehelper/_components/CtaButtons";
import { notFound } from "next/navigation";
import { PHONE, PHONE_HREF, CITY_COUNT, STATE_COUNT } from "@/app/site/theroadsidehelper/_data/content";
import { SERVICES, SERVICE_CATEGORIES, getExtendedContent } from "@/app/site/theroadsidehelper/_data/services";
import { SERVICE_PHOTOS } from "@/app/site/theroadsidehelper/_data/photos";
import { serviceSchema, breadcrumbSchema, howToSchema, graph } from "@/app/site/theroadsidehelper/_lib/schema";
import { pageSeo } from "@/app/site/theroadsidehelper/_lib/seo";

export function generateStaticParams() { return [] }

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = SERVICES.find((s) => s.slug === slug);
  if (!service) return {};
  const lower = service.title.toLowerCase();
  return pageSeo({
    title: `${service.title} Near Me — 24/7 at $149/hr | (888) 944-3001`,
    description: `${service.title} nationwide. ${service.description.slice(0, 100)}... Flat $149/hr, 1-hour min, 24/7. Call (888) 944-3001. ${CITY_COUNT} cities, all ${STATE_COUNT} states.`,
    keywords: [
      `${lower} near me`,
      `24/7 ${lower}`,
      `cheap ${lower}`,
      `${lower} cost`,
      `${lower} $149`,
      `emergency ${lower}`,
      `${lower} service nearby`,
    ],
    path: `/services/${slug}`,
    ogTitle: `${service.title} Near Me — Flat $149/hr 24/7`,
    ogDescription: service.description.slice(0, 150),
  });
}

export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = SERVICES.find((s) => s.slug === slug);
  if (!service) notFound();

  const category = SERVICE_CATEGORIES[service.category];
  const relatedServices = SERVICES.filter((s) => s.category === service.category && s.slug !== service.slug);
  const otherServices = SERVICES.filter((s) => s.category !== service.category).slice(0, 6);
  const heroPhoto = SERVICE_PHOTOS[service.slug];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: graph([
            serviceSchema({
              name: service.title,
              description: service.description,
              slug: service.slug,
              subtitle: service.subtitle,
            }),
            howToSchema({ name: service.title, description: service.description }),
            breadcrumbSchema([
              { name: "Home", path: "/" },
              { name: "Services", path: "/services" },
              { name: service.title, path: `/services/${service.slug}` },
            ]),
          ]),
        }}
      />
      {/* Hero */}
      <section className="relative overflow-hidden bg-slate-900 pt-36 pb-16 sm:pt-44 sm:pb-24">
        {heroPhoto && (
          <div className="absolute inset-0">
            <Image
              src={heroPhoto.url}
              alt={heroPhoto.alt}
              fill
              priority
              sizes="100vw"
              className="object-cover opacity-30"
            />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-slate-900/70 to-emerald-900/80" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-amber-300 font-cta">
            {category.label}
          </p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            {service.title} Near Me — 24/7 at $149/hr Flat
          </h1>
          <p className="mt-4 text-2xl font-semibold text-amber-200 font-heading">
            {service.subtitle}
          </p>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            {service.description}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {service.ideal.map((tag) => (
              <span key={tag} className="rounded-full bg-white/10 px-3 py-1 text-sm text-amber-200 backdrop-blur-sm">{tag}</span>
            ))}
          </div>
          <CtaButtons variant="dark" />
        </div>
      </section>

      {/* About */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">
            About {service.title}
          </h2>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            <p>{service.longDescription}</p>
          </div>
        </div>
      </section>

      {/* Extended deep-dive content (from data) */}
      <section className="bg-section-teal py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Everything to Know About {service.title}</h2>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-slate-700">
            {getExtendedContent(service).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>
      </section>

      {/* How pricing works for this service */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">How {service.title} Pricing Works</h2>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-base leading-relaxed text-slate-700">
            <p><strong>The rate:</strong> $149 per hour with a 1-hour minimum. Same rate overnight, weekends, holidays. No after-hours surcharges. Most {service.title.toLowerCase()} calls finish inside the 1-hour minimum — which means the minimum is also the maximum for the typical job.</p>
            <p><strong>Add-on costs at actual market rate:</strong> tow mileage past 5 miles billed at the local per-mile rate, fuel billed at pump price, replacement parts (like a new battery) billed at retail price plus install time. Nothing inflated.</p>
            <p><strong>When you call:</strong> the dispatcher confirms the rate before the technician rolls. The technician confirms again on arrival. If the situation turns out to be more complex than typical, additional time is quoted before continuing.</p>
          </div>
        </div>
      </section>

      {/* Related services */}
      {relatedServices.length > 0 && (
        <section className="bg-section-teal py-16">
          <div className="mx-auto max-w-5xl px-6">
            <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Related {category.label} Services</h2>
            <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relatedServices.map((s) => {
                const photo = SERVICE_PHOTOS[s.slug];
                return (
                  <Link key={s.slug} href={`/services/${s.slug}`} className="group block overflow-hidden rounded-xl border border-slate-200 bg-white transition-shadow hover:shadow-md">
                    {photo && (
                      <div className="relative h-36 w-full overflow-hidden bg-slate-100">
                        <Image src={photo.url} alt={photo.alt} fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                      </div>
                    )}
                    <div className="p-5">
                      <h3 className="text-base font-bold text-slate-900 font-heading">{s.title}</h3>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-emerald-700 font-cta">{s.subtitle}</p>
                      <p className="mt-3 text-sm text-slate-600 leading-relaxed line-clamp-3">{s.description}</p>
                      <span className="mt-3 inline-block text-sm font-semibold text-emerald-700 group-hover:underline font-cta">Learn more →</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Other categories */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900 font-heading">Other Roadside Services</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-base text-slate-600">All services use the same flat $149/hr rate.</p>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {otherServices.map((s) => (
              <Link key={s.slug} href={`/services/${s.slug}`} className="rounded-xl border border-slate-200 bg-white p-5 hover:shadow-md transition-shadow">
                <h3 className="text-base font-bold text-slate-900 font-heading">{s.title}</h3>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-emerald-700 font-cta">{s.subtitle}</p>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed line-clamp-3">{s.description}</p>
              </Link>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link href="/services" className="text-emerald-700 font-semibold text-base hover:underline font-cta">View All Services →</Link>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-slate-900 py-20">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl font-heading">Need {service.title} Now?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/80">
            Call <a href={PHONE_HREF} className="text-amber-300 hover:underline">{PHONE}</a> for fastest dispatch. Average response under 60 minutes.
          </p>
          <CtaButtons variant="dark" />
        </div>
      </section>
    </>
  );
}