// @ts-nocheck
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { services } from "@/app/site/the-nyc-marketing-company/_lib/siteData";
import { JsonLd, webPageSchema, breadcrumbSchema } from "@/app/site/the-nyc-marketing-company/_lib/schema";
import TipBlurb from "@/app/site/the-nyc-marketing-company/_components/TipBlurb";

/* ------------------------------------------------------------------ */
/*  Service icon mapping                                              */
/* ------------------------------------------------------------------ */
function ServiceIcon({ icon, size = "w-10 h-10" }: { icon: string; size?: string }) {
  const iconMap: Record<string, React.ReactNode> = {
    search: (
      <svg className={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
    ),
    layout: (
      <svg className={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25A2.25 2.25 0 015.25 3h13.5A2.25 2.25 0 0121 5.25z" />
      </svg>
    ),
    palette: (
      <svg className={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h2.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-2.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88a1.5 1.5 0 012.121 0l1.94 1.94a1.5 1.5 0 010 2.121l-2.879 2.88M10.5 8.197l.186-.186" />
      </svg>
    ),
    target: (
      <svg className={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    "trending-up": (
      <svg className={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
      </svg>
    ),
    zap: (
      <svg className={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
  };
  return (
    <div className="text-electric">{iconMap[icon] || iconMap["search"]}</div>
  );
}

/* ================================================================== */
/*  SERVICES INDEX PAGE                                               */
/* ================================================================== */
export default function ServicesPage() {
  return (
    <>
      {/* Schema Markup */}
      <JsonLd
        data={webPageSchema(
          "Our Services | Consortium NYC (Now The NYC Marketing Company)",
          "Explore our full suite of digital marketing services including SEO, web design, branding, digital strategy, business development, and automation for NYC businesses.",
          "https://www.thenycmarketingcompany.com/services"
        )}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", url: "https://www.thenycmarketingcompany.com" },
          { name: "Services", url: "https://www.thenycmarketingcompany.com/services" },
        ])}
      />

      {/* ============================================================ */}
      {/*  HERO                                                        */}
      {/* ============================================================ */}
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 px-6 overflow-hidden">
        {/* Background elements */}
        <div className="absolute inset-0 grid-bg" />
        <div className="absolute top-1/3 -left-32 w-96 h-96 rounded-full bg-violet/20 blur-3xl animate-blob" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full bg-electric/20 blur-3xl animate-blob animation-delay-2000" />

        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.1]"
          >
            Our <span className="gradient-text">Services</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="mt-6 text-lg sm:text-xl text-warm-gray max-w-2xl mx-auto"
          >
            Full-spectrum digital marketing solutions engineered for growth.
            From SEO to automation, we build integrated systems that drive
            measurable results for NYC businesses.
          </motion.p>
        </div>
      </section>

      <TipBlurb
        tip={<>You don&apos;t need every service on this list. Most businesses need <strong>two or three things done really well</strong>. The trick is knowing which ones <strong>move the needle</strong> for your specific situation.</>}
      />

      {/* ============================================================ */}
      {/*  SERVICES GRID                                               */}
      {/* ============================================================ */}
      <section className="py-16 sm:py-24 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {services.map((service, i) => (
              <motion.div
                key={service.slug}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <Link
                  href={`/services/${service.slug}`}
                  className="gradient-border block h-full bg-charcoal p-8 sm:p-10 rounded-xl hover:bg-slate-dark transition-colors group"
                >
                  <div className="mb-5">
                    <ServiceIcon icon={service.icon} size="w-10 h-10" />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-cream mb-3 group-hover:text-electric transition-colors">
                    {service.name}
                  </h2>
                  <p className="text-electric text-sm font-medium mb-4">
                    {service.tagline}
                  </p>
                  <p className="text-warm-gray leading-relaxed mb-6">
                    {service.shortDesc}
                  </p>

                  {/* Features preview */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    {service.features.slice(0, 4).map((feature) => (
                      <span
                        key={feature}
                        className="text-xs bg-white/5 text-warm-gray px-3 py-1.5 rounded-full border border-white/5"
                      >
                        {feature}
                      </span>
                    ))}
                    {service.features.length > 4 && (
                      <span className="text-xs text-electric/70 px-3 py-1.5">
                        +{service.features.length - 4} more
                      </span>
                    )}
                  </div>

                  <span className="inline-flex items-center text-electric font-medium group-hover:underline">
                    Learn More
                    <svg
                      className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
                    </svg>
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  CTA                                                         */}
      {/* ============================================================ */}
      <section className="py-24 sm:py-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-dim/20 via-midnight to-electric/10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-violet/10 blur-3xl" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="relative z-10 mx-auto max-w-3xl text-center"
        >
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold">
            Not Sure Where to <span className="gradient-text">Start</span>?
          </h2>
          <p className="mt-6 text-warm-gray text-lg max-w-xl mx-auto">
            Book a free strategy consultation. We will audit your digital
            presence and recommend the services that will have the biggest
            impact on your growth.
          </p>
          <div className="mt-10">
            <Link
              href="https://www.thenycmarketingcompany.com/contact"
              className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-electric via-violet to-hot-pink px-10 py-5 text-lg font-semibold text-midnight transition-transform hover:scale-105"
            >
              Get Your Free Consultation
            </Link>
          </div>
        </motion.div>
      </section>
    </>
  );
}