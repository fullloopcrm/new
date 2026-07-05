"use client";

import { useState } from "react";
import Link from "next/link";
import type { Service } from "@/app/site/the-nyc-interior-designer/_lib/siteData";
import { services, getServiceUrl, PHONE, PHONE_HREF, SMS_HREF } from "@/app/site/the-nyc-interior-designer/_lib/siteData";
import type { ServiceContent } from "@/app/site/the-nyc-interior-designer/_lib/serviceContentTypes";

interface Props {
  service: Service;
  content: ServiceContent | null;
}

export default function ServicePageClient({ service, content }: Props) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const otherServices = services.filter((s) => s.slug !== service.slug).slice(0, 6);
  const relatedServices = content?.relatedSlugs
    ? services.filter((s) => content.relatedSlugs.includes(s.slug))
    : otherServices;

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-slate-900 pt-36 pb-16 sm:pt-44 sm:pb-20">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-blue-300 font-cta">
            Interior Design Service
          </p>
          <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl font-heading">
            {service.h1}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            {service.tagline}
          </p>
          {/* Inner links to related services */}
          {relatedServices.length > 0 && (
            <div className="mx-auto mt-5 flex flex-wrap items-center justify-center gap-2 max-w-3xl">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-300/70">Related:</span>
              {relatedServices.slice(0, 5).map((s) => (
                <Link
                  key={s.slug}
                  href={getServiceUrl(s)}
                  className="rounded-full border border-white/20 px-3 py-1 text-xs font-medium text-white/70 transition-colors hover:border-blue-400 hover:text-white hover:bg-white/10"
                >
                  {s.name}
                </Link>
              ))}
            </div>
          )}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <a href={SMS_HREF} className="rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-slate-900 shadow-lg hover:bg-blue-50 font-cta">
              Text Us
            </a>
            <a href={PHONE_HREF} className="rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white hover:border-white/60 font-cta">
              Call {PHONE}
            </a>
            <Link href="/contact" className="rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white hover:border-white/60 font-cta">
              Free Consultation
            </Link>
          </div>
        </div>
      </section>

      {/* Table of Contents + Content */}
      <div className="bg-section-white py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="lg:grid lg:grid-cols-[260px_1fr] lg:gap-12">
            {/* Sidebar TOC */}
            {content && content.tableOfContents.length > 0 && (
              <aside className="hidden lg:block">
                <div className="sticky top-28">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">In This Guide</h2>
                  <nav className="mt-3 space-y-1">
                    {content.tableOfContents.map((item) => (
                      <a
                        key={item.id}
                        href={`#${item.id}`}
                        className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-blue-800 transition-colors hover:bg-blue-50 hover:text-blue-900 font-medium"
                      >
                        <span className="text-blue-400">&rarr;</span>
                        {item.title}
                      </a>
                    ))}
                  </nav>
                </div>
              </aside>
            )}

            {/* Main Content */}
            <div>
              {/* Description */}
              <section>
                <h2 className="text-2xl font-bold text-slate-900 font-heading">
                  About {service.name}
                </h2>
                <p className="mt-4 text-base leading-relaxed text-slate-600">
                  {service.description}
                </p>
              </section>

              {/* Features */}
              <section className="mt-12">
                <h2 className="text-2xl font-bold text-slate-900 font-heading">
                  Key Features
                </h2>
                <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {service.features.map((feature, i) => (
                    <div key={i} className="flex gap-3 rounded-lg border border-slate-200 bg-white p-4">
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-800">
                        {i + 1}
                      </div>
                      <p className="text-sm leading-relaxed text-slate-600">{feature}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Content Sections */}
              {content && content.sections.map((section) => (
                <section key={section.id} id={section.id} className="mt-12">
                  <h2 className="text-2xl font-bold text-slate-900 font-heading">
                    {section.title}
                  </h2>
                  {section.paragraphs.map((p, j) => (
                    <p key={j} className="mt-4 text-base leading-relaxed text-slate-600">
                      {p}
                    </p>
                  ))}
                </section>
              ))}

              {/* Key Takeaways */}
              {content && content.keyTakeaways.length > 0 && (
                <section className="mt-12">
                  <h2 className="text-2xl font-bold text-slate-900 font-heading">
                    Key Takeaways
                  </h2>
                  <ul className="mt-4 space-y-3">
                    {content.keyTakeaways.map((takeaway, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-800">
                          &#10003;
                        </span>
                        <span className="text-base leading-relaxed text-slate-600">{takeaway}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* FAQs */}
              {content && content.faqs.length > 0 && (
                <section className="mt-12">
                  <h2 className="text-2xl font-bold text-slate-900 font-heading">
                    Frequently Asked Questions
                  </h2>
                  <div className="mt-6 space-y-3">
                    {content.faqs.map((faq, i) => (
                      <div key={i} className="rounded-xl border border-slate-200 bg-white">
                        <button
                          onClick={() => setOpenFaq(openFaq === i ? null : i)}
                          className="flex w-full items-center justify-between px-6 py-4 text-left text-base font-semibold text-slate-900 hover:text-blue-800 font-heading"
                        >
                          {faq.question}
                          <span className="ml-4 shrink-0 text-lg text-blue-500">
                            {openFaq === i ? "\u2212" : "+"}
                          </span>
                        </button>
                        {openFaq === i && (
                          <div className="px-6 pb-5 text-base leading-relaxed text-slate-600">
                            {faq.answer}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Related Services */}
      <section className="bg-section-alt py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-2xl font-bold text-slate-900 font-heading">
            Related Interior Design Services
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-base text-slate-500">
            Explore other services that complement {service.name}.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {relatedServices.map((s) => (
              <Link key={s.slug} href={getServiceUrl(s)}>
                <div className="group rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-blue-400 hover:shadow-md">
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-700 font-heading">
                    {s.name}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 line-clamp-2">{s.shortDesc}</p>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-6 text-center">
            <Link href="/services" className="text-sm font-semibold text-blue-700 hover:text-blue-800 font-cta">
              View All 18 Services &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-slate-900 py-16">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl font-heading">
            Ready to Get Started with {service.name}?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
            Get a free consultation, explore our full service guide, or connect with a design specialist today.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href={SMS_HREF} className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-slate-900 shadow-lg hover:bg-blue-50 font-cta">
              Text Us
            </a>
            <a href={PHONE_HREF} className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white hover:border-white/60 font-cta">
              Call {PHONE}
            </a>
            <Link href="/contact" className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white hover:border-white/60 font-cta">
              Free Consultation
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
