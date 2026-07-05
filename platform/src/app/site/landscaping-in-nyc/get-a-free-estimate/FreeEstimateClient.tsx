"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { services, getAllBoroughs, PHONE, PHONE_HREF, SMS_HREF } from "@/app/site/landscaping-in-nyc/_lib/siteData";

const budgetRanges = [
  "Under $5,000",
  "$5,000 – $15,000",
  "$15,000 – $30,000",
  "$30,000 – $50,000",
  "$50,000 – $100,000",
  "$100,000+",
  "Not sure yet",
];

const projectSizes = [
  "Small (under 200 sq ft)",
  "Medium (200–500 sq ft)",
  "Large (500–1,000 sq ft)",
  "Extra Large (1,000+ sq ft)",
  "Not sure",
];

const timeframes = [
  "As soon as possible",
  "Within 2 weeks",
  "Within 1 month",
  "Within 2–3 months",
  "Just getting quotes",
];

export default function FreeEstimateClient() {
  const boroughs = getAllBoroughs();
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    borough: "",
    serviceType: "",
    projectSize: "",
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
          service_type: form.serviceType,
          project_size: form.projectSize,
          budget: form.budget,
          timeframe: form.timeframe,
          description: form.description,
          source: "free-estimate",
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
      <section className="relative overflow-hidden bg-green-700 pt-36 pb-16 sm:pt-44 sm:pb-20">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl animate-blob" />
        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-3 text-sm font-semibold uppercase tracking-widest text-green-200 font-cta">
            Free Estimate &bull; No Obligation
          </motion.p>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl font-heading">
            Get a Free <span className="text-green-200">Landscaping Estimate</span> for Your NYC Property
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            Tell us about your project and we&apos;ll provide a detailed written estimate — including pricing, timeline, and design recommendations.
          </motion.p>
        </div>
      </section>

      {/* Form + Sidebar */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          {submitted ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mx-auto max-w-lg rounded-2xl border border-green-200 bg-green-50 p-10 text-center">
              <div className="text-5xl">&#9989;</div>
              <h2 className="mt-4 text-2xl font-bold text-slate-900 font-heading">Estimate Request Received</h2>
              <p className="mt-3 text-base text-slate-600">
                A landscaping specialist will reach out within 1 business day to schedule your free on-site estimate. In the meantime, try our <Link href="/estimate" className="text-green-600 underline hover:text-green-800">cost estimator</Link> to get a ballpark range.
              </p>
              <a href={PHONE_HREF} className="mt-6 inline-block rounded-lg bg-green-600 px-8 py-3 text-base font-semibold text-white hover:bg-green-700 font-cta">
                Call: {PHONE}
              </a>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_340px]">
              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                <h2 className="text-2xl font-bold text-slate-900 font-heading">Tell Us About Your Project</h2>
                <p className="text-sm text-slate-500">Fill out the form below and a landscaping specialist will contact you within 1 business day.</p>

                {/* Contact Info */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
                    <input type="text" required value={form.name} onChange={(e) => update("name", e.target.value)} className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 focus:border-green-500 focus:ring-2 focus:ring-green-500/20" placeholder="John Smith" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone *</label>
                    <input type="tel" required value={form.phone} onChange={(e) => update("phone", e.target.value)} className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 focus:border-green-500 focus:ring-2 focus:ring-green-500/20" placeholder="(212) 555-1234" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                  <input type="email" required value={form.email} onChange={(e) => update("email", e.target.value)} className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 focus:border-green-500 focus:ring-2 focus:ring-green-500/20" placeholder="john@example.com" />
                </div>

                {/* Location */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Property Address *</label>
                    <input type="text" required value={form.address} onChange={(e) => update("address", e.target.value)} className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 focus:border-green-500 focus:ring-2 focus:ring-green-500/20" placeholder="123 Main St, Brooklyn" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Borough *</label>
                    <select required value={form.borough} onChange={(e) => update("borough", e.target.value)} className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 focus:border-green-500 focus:ring-2 focus:ring-green-500/20">
                      <option value="">Select borough...</option>
                      {boroughs.map((b) => (
                        <option key={b.slug} value={b.name}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Project Details */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Service Type *</label>
                  <select required value={form.serviceType} onChange={(e) => update("serviceType", e.target.value)} className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 focus:border-green-500 focus:ring-2 focus:ring-green-500/20">
                    <option value="">Select service...</option>
                    {services.map((s) => (
                      <option key={s.slug} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Project Size</label>
                    <select value={form.projectSize} onChange={(e) => update("projectSize", e.target.value)} className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 focus:border-green-500 focus:ring-2 focus:ring-green-500/20">
                      <option value="">Select size...</option>
                      {projectSizes.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Budget Range</label>
                    <select value={form.budget} onChange={(e) => update("budget", e.target.value)} className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 focus:border-green-500 focus:ring-2 focus:ring-green-500/20">
                      <option value="">Select budget...</option>
                      {budgetRanges.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Timeline</label>
                  <select value={form.timeframe} onChange={(e) => update("timeframe", e.target.value)} className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 focus:border-green-500 focus:ring-2 focus:ring-green-500/20">
                    <option value="">Select timeline...</option>
                    {timeframes.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Project Description</label>
                  <textarea rows={4} value={form.description} onChange={(e) => update("description", e.target.value)} className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 focus:border-green-500 focus:ring-2 focus:ring-green-500/20" placeholder="Tell us about your outdoor space, what you'd like done, any specific ideas or concerns..." />
                </div>

                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}
                <button type="submit" disabled={submitting} className="w-full rounded-lg bg-green-600 px-8 py-4 text-base font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-cta">
                  {submitting ? "Submitting..." : "Request Free Estimate"}
                </button>
                <p className="text-xs text-slate-400 text-center">No spam. No obligation. A real human will contact you.</p>
              </form>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Call Now */}
                <div className="rounded-2xl border border-green-200 bg-green-50 p-6 text-center">
                  <p className="text-sm font-bold uppercase tracking-wider text-green-700">Prefer to Call?</p>
                  <a href={PHONE_HREF} className="mt-3 block text-2xl font-bold text-green-800 hover:text-green-900 font-heading">
                    {PHONE}
                  </a>
                  <a href={SMS_HREF} className="mt-1 block text-sm text-green-600 hover:text-green-800">
                    Or text us
                  </a>
                  <p className="mt-1 text-xs text-green-600">Mon-Fri 7am-7pm, Sat 8am-5pm</p>
                </div>

                {/* What to Expect */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6">
                  <h3 className="text-base font-bold text-slate-900 font-heading">What to Expect</h3>
                  <ul className="mt-4 space-y-3">
                    {[
                      "We call you within 1 business day",
                      "Schedule a free on-site visit at your convenience",
                      "We assess your space, soil, sun, and drainage",
                      "You receive a detailed written estimate in 3-5 days",
                      "100% free — no fees, no obligation",
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                        <span className="mt-0.5 text-green-500 shrink-0">&#10003;</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Quick Links */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6">
                  <h3 className="text-base font-bold text-slate-900 font-heading">While You Wait</h3>
                  <div className="mt-4 space-y-2">
                    {[
                      { label: "Try the Cost Estimator", href: "/estimate" },
                      { label: "Browse All 18 Services", href: "/services" },
                      { label: "Find Your Area", href: "/areas" },
                      { label: "Read the Landscaping 101 Guide", href: "/landscaping-101" },
                    ].map((link) => (
                      <Link key={link.href} href={link.href} className="block rounded-lg px-3 py-2 text-sm text-green-700 transition-colors hover:bg-green-50 font-cta">
                        &rarr; {link.label}
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Trust */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
                  <div className="flex items-center justify-center gap-1 text-yellow-500 text-lg">
                    <span>&#9733;&#9733;&#9733;&#9733;&#9733;</span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-900">4.9/5 from NYC property owners</p>
                  <p className="mt-1 text-xs text-slate-500">Serving all 5 boroughs</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
