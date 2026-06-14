// @ts-nocheck
"use client";

import { useState } from "react";
import Link from "next/link";
import { services, getAllBoroughs, PHONE, PHONE_HREF, SMS_HREF } from "@/app/site/the-nyc-interior-designer/_lib/siteData";

const budgetRanges = [
  "Under $10,000",
  "$10,000 - $25,000",
  "$25,000 - $50,000",
  "$50,000 - $100,000",
  "$100,000 - $250,000",
  "$250,000+",
  "Not sure yet",
];

const propertyTypes = [
  "Co-op Apartment",
  "Condo",
  "Brownstone / Townhouse",
  "Single-Family Home",
  "Loft",
  "Penthouse",
  "Commercial / Office",
  "Restaurant / Retail",
  "Other",
];

const timeframes = [
  "As soon as possible",
  "Within 1 month",
  "Within 2-3 months",
  "3-6 months",
  "Just exploring options",
];

export default function FreeConsultationClient() {
  const boroughs = getAllBoroughs();
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    borough: "",
    serviceType: "",
    propertyType: "",
    budget: "",
    timeframe: "",
    description: "",
  });

  const update = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          address: form.address,
          borough: form.borough,
          service: form.serviceType,
          projectSize: form.propertyType,
          budget: form.budget,
          timeline: form.timeframe,
          description: form.description,
          source: "free-consultation",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Something went wrong.");
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gray-800 pt-36 pb-16 sm:pt-44 sm:pb-20">
        <div className="absolute inset-0 bg-[url('/og-image.jpg')] bg-cover bg-center opacity-15" />
        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-blue-200">
            Free Consultation &bull; No Obligation
          </p>
          <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
            Get a Free <span className="text-blue-200">Interior Design Consultation</span> for Your NYC Property
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            Tell us about your project and we&apos;ll provide a personalized consultation — including design recommendations, pricing, and timeline.
          </p>
        </div>
      </section>

      {/* Form + Sidebar */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          {submitted ? (
            <div className="mx-auto max-w-lg rounded-2xl border border-blue-200 bg-blue-50 p-10 text-center">
              <div className="text-5xl">&#9989;</div>
              <h2 className="mt-4 text-2xl font-bold text-slate-900">Consultation Request Received</h2>
              <p className="mt-3 text-base text-slate-600">
                A design specialist will reach out within 1 business day to schedule your free consultation. In the meantime, try our <Link href="/estimate" className="text-blue-600 underline hover:text-blue-800">cost estimator</Link> to get a ballpark range.
              </p>
              <a href={PHONE_HREF} className="mt-6 inline-block rounded-lg bg-blue-600 px-8 py-3 text-base font-semibold text-white hover:bg-gray-700">
                Call: {PHONE}
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_340px]">
              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                <h2 className="text-2xl font-bold text-slate-900">Tell Us About Your Project</h2>
                <p className="text-sm text-slate-500">Fill out the form below and a design specialist will contact you within 1 business day.</p>

                {/* Contact Info */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
                    <input type="text" required value={form.name} onChange={(e) => update("name", e.target.value)} className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" placeholder="John Smith" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone *</label>
                    <input type="tel" required value={form.phone} onChange={(e) => update("phone", e.target.value)} className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" placeholder="(212) 555-1234" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                  <input type="email" required value={form.email} onChange={(e) => update("email", e.target.value)} className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" placeholder="john@example.com" />
                </div>

                {/* Location */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Property Address</label>
                    <input type="text" value={form.address} onChange={(e) => update("address", e.target.value)} className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" placeholder="123 Main St, Brooklyn" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Borough *</label>
                    <select required value={form.borough} onChange={(e) => update("borough", e.target.value)} className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">
                      <option value="">Select borough...</option>
                      {boroughs.map((b) => (
                        <option key={b.slug} value={b.name}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Project Details */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Design Service *</label>
                    <select required value={form.serviceType} onChange={(e) => update("serviceType", e.target.value)} className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">
                      <option value="">Select service...</option>
                      {services.map((s) => (
                        <option key={s.slug} value={s.name}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Property Type</label>
                    <select value={form.propertyType} onChange={(e) => update("propertyType", e.target.value)} className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">
                      <option value="">Select type...</option>
                      {propertyTypes.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Budget Range</label>
                    <select value={form.budget} onChange={(e) => update("budget", e.target.value)} className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">
                      <option value="">Select budget...</option>
                      {budgetRanges.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Timeline</label>
                    <select value={form.timeframe} onChange={(e) => update("timeframe", e.target.value)} className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">
                      <option value="">Select timeline...</option>
                      {timeframes.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Project Description</label>
                  <textarea rows={4} value={form.description} onChange={(e) => update("description", e.target.value)} className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" placeholder="Tell us about your space, what you would like to change, any specific ideas or inspiration..." />
                </div>

                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}
                <button type="submit" disabled={submitting} className="w-full rounded-lg bg-blue-600 px-8 py-4 text-base font-semibold text-white transition-colors hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed">
                  {submitting ? "Submitting..." : "Request Free Consultation"}
                </button>
                <p className="text-xs text-slate-400 text-center">No spam. No obligation. A real designer will contact you.</p>
              </form>

              {/* Sidebar */}
              <div className="space-y-6">
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6 text-center">
                  <p className="text-sm font-bold uppercase tracking-wider text-blue-700">Prefer to Call?</p>
                  <a href={PHONE_HREF} className="mt-3 block text-2xl font-bold text-blue-800 hover:text-blue-900">
                    {PHONE}
                  </a>
                  <a href={SMS_HREF} className="mt-1 block text-sm text-blue-600 hover:text-blue-800">
                    Or text us
                  </a>
                  <p className="mt-1 text-xs text-blue-600">Mon-Fri 9am-6pm, Sat 10am-4pm</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6">
                  <h3 className="text-base font-bold text-slate-900">What to Expect</h3>
                  <ul className="mt-4 space-y-3">
                    {[
                      "We call you within 1 business day",
                      "Schedule a free consultation at your convenience",
                      "We assess your space, style, and goals",
                      "You receive a personalized design proposal",
                      "100% free — no fees, no obligation",
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                        <span className="mt-0.5 text-blue-500 shrink-0">&#10003;</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6">
                  <h3 className="text-base font-bold text-slate-900">While You Wait</h3>
                  <div className="mt-4 space-y-2">
                    {[
                      { label: "Try the Cost Estimator", href: "/estimate" },
                      { label: "Browse All 18 Services", href: "/services" },
                      { label: "Find Your Area", href: "/areas" },
                      { label: "Read Interior Design 101", href: "/interior-design-101" },
                    ].map((link) => (
                      <Link key={link.href} href={link.href} className="block rounded-lg px-3 py-2 text-sm text-blue-700 transition-colors hover:bg-blue-50">
                        &rarr; {link.label}
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
                  <div className="flex items-center justify-center gap-1 text-yellow-500 text-lg">
                    <span>&#9733;&#9733;&#9733;&#9733;&#9733;</span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-900">4.9/5 from NYC property owners</p>
                  <p className="mt-1 text-xs text-slate-500">Serving all 5 boroughs + suburbs</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
