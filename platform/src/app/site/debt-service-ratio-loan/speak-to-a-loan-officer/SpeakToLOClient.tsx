"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { getAllStates } from "@/app/site/debt-service-ratio-loan/_lib/siteData";

const propertyTypes = [
  "Single-Family Rental",
  "Multi-Family (2–4 units)",
  "Multi-Family (5+ units)",
  "Short-Term Rental (Airbnb/VRBO)",
  "Condo / Condotel",
  "New Construction",
  "Mixed-Use",
  "Fix & Rent (BRRRR)",
  "Cash-Out Refinance",
  "Portfolio (Multiple Properties)",
  "Other",
];

const timeframes = [
  "Ready now — I have a property under contract",
  "Within 30 days — actively looking",
  "1–3 months — researching",
  "Just exploring my options",
];

export default function SpeakToLOClient() {
  const states = getAllStates();
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    state: "",
    city: "",
    propertyType: "",
    timeframe: "",
    estimatedValue: "",
    downPayment: "",
    message: "",
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
          state: form.state,
          city: form.city,
          property_type: form.propertyType,
          timeframe: form.timeframe,
          estimated_value: form.estimatedValue,
          down_payment: form.downPayment,
          message: form.message,
          source: "speak-to-loan-officer",
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
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-20">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-teal-500/20 blur-3xl animate-blob" />
        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">
            Free Consultation &bull; No Obligation
          </motion.p>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl font-heading">
            Speak to an Experienced <span className="text-teal-200">DSCR Loan Officer</span> in Your City
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            Get personalized guidance from a loan officer who knows DSCR loans inside and out — and understands your local market.
          </motion.p>
        </div>
      </section>

      {/* Form + Sidebar */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          {submitted ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mx-auto max-w-lg rounded-2xl border border-green-200 bg-green-50 p-10 text-center">
              <div className="text-5xl">&#9989;</div>
              <h2 className="mt-4 text-2xl font-bold text-slate-900 font-heading">Request Received</h2>
              <p className="mt-3 text-base text-slate-600">
                A DSCR loan officer will reach out within 1 business day. In the meantime, try our <Link href="/calculator" className="text-teal-600 underline hover:text-teal-800">DSCR calculator</Link> to run the numbers on your property.
              </p>
              <a href="sms:+18553003727" className="mt-6 inline-block rounded-lg bg-teal-600 px-8 py-3 text-base font-semibold text-white hover:bg-teal-700 font-cta">
                Call or Text: (855) 300-DSCR | Text
              </a>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_340px]">
              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                <h2 className="text-2xl font-bold text-slate-900 font-heading">Tell Us About Your Investment</h2>
                <p className="text-sm text-slate-500">Fill out the form below and a DSCR specialist will contact you within 1 business day.</p>

                {/* Contact Info */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
                    <input type="text" required value={form.name} onChange={(e) => update("name", e.target.value)} className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" placeholder="John Smith" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone *</label>
                    <input type="tel" required value={form.phone} onChange={(e) => update("phone", e.target.value)} className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" placeholder="(555) 123-4567" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                  <input type="email" required value={form.email} onChange={(e) => update("email", e.target.value)} className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" placeholder="john@example.com" />
                </div>

                {/* Location */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">State (where the property is) *</label>
                    <select required value={form.state} onChange={(e) => update("state", e.target.value)} className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20">
                      <option value="">Select state...</option>
                      {states.map((s) => (
                        <option key={s.abbr} value={s.abbr}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                    <input type="text" value={form.city} onChange={(e) => update("city", e.target.value)} className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" placeholder="e.g., Houston" />
                  </div>
                </div>

                {/* Property Details */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Property Type *</label>
                  <select required value={form.propertyType} onChange={(e) => update("propertyType", e.target.value)} className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20">
                    <option value="">Select type...</option>
                    {propertyTypes.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Timeframe</label>
                  <select value={form.timeframe} onChange={(e) => update("timeframe", e.target.value)} className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20">
                    <option value="">Select timeframe...</option>
                    {timeframes.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Estimated Property Value</label>
                    <input type="text" value={form.estimatedValue} onChange={(e) => update("estimatedValue", e.target.value)} className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" placeholder="e.g., $350,000" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Down Payment Available</label>
                    <input type="text" value={form.downPayment} onChange={(e) => update("downPayment", e.target.value)} className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" placeholder="e.g., 25%" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Anything else we should know?</label>
                  <textarea rows={4} value={form.message} onChange={(e) => update("message", e.target.value)} className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20" placeholder="Tell us about your investment goals, property details, or questions..." />
                </div>

                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}
                <button type="submit" disabled={submitting} className="w-full rounded-lg bg-teal-600 px-8 py-4 text-base font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed font-cta">
                  {submitting ? "Submitting..." : "Request Free Consultation"}
                </button>
                <p className="text-xs text-slate-400 text-center">No spam. No obligation. A real human will call you.</p>
              </form>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Call Now */}
                <div className="rounded-2xl border border-teal-200 bg-teal-50 p-6 text-center">
                  <p className="text-sm font-bold uppercase tracking-wider text-teal-700">Prefer to Call?</p>
                  <a href="sms:+18553003727" className="mt-3 block text-2xl font-bold text-teal-800 hover:text-teal-900 font-heading">
                    (855) 300-DSCR | Text
                  </a>
                  <p className="mt-1 text-xs text-teal-600">Mon–Fri 9am–6pm EST</p>
                </div>

                {/* What to Expect */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6">
                  <h3 className="text-base font-bold text-slate-900 font-heading">What to Expect</h3>
                  <ul className="mt-4 space-y-3">
                    {[
                      "A DSCR specialist calls you within 1 business day",
                      "We review your property and investment goals",
                      "You get a personalized rate quote and loan options",
                      "No hard credit pull until you're ready to apply",
                      "100% free — no fees, no obligation",
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                        <span className="mt-0.5 text-teal-500 shrink-0">&#10003;</span>
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
                      { label: "Run the DSCR Calculator", href: "/calculator" },
                      { label: "Browse All 18 Services", href: "/services" },
                      { label: "Find Your City", href: "/locations" },
                      { label: "Read the DSCR 101 Guide", href: "/dscr-101" },
                    ].map((link) => (
                      <Link key={link.href} href={link.href} className="block rounded-lg px-3 py-2 text-sm text-teal-700 transition-colors hover:bg-teal-50 font-cta">
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
                  <p className="mt-2 text-sm font-semibold text-slate-900">4.9/5 from 312 investors</p>
                  <p className="mt-1 text-xs text-slate-500">6 offices nationwide</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
