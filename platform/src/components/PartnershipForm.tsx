"use client";

import { useState, FormEvent, ChangeEvent } from "react";
import Link from "next/link";

const TRADES = [
  "Cleaning Services",
  "Carpet Cleaning",
  "Pressure Washing",
  "Landscaping",
  "Lawn Care",
  "Handyman",
  "Pest Control",
  "HVAC",
  "Plumbing",
  "Electrical",
  "Painting",
  "Junk Removal",
  "Pool Cleaning",
  "Roofing",
  "Appliance Repair",
  "Locksmith",
  "Flooring",
  "Tree Service",
  "Mobile Detailing",
  "Window Cleaning",
  "Garage Door Repair",
  "Fencing",
  "Other",
];

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
];

const REVENUE_RANGES = [
  "Under $5K",
  "$5K-$10K",
  "$10K-$25K",
  "$25K-$50K",
  "$50K-$100K",
  "$100K+",
];

const REFERRAL_SOURCES = [
  "Google Search",
  "Social Media",
  "Referral",
  "Industry Event",
  "Other",
];

type FormData = {
  full_name: string;
  business_name: string;
  email: string;
  phone: string;
  trade: string;
  city: string;
  state: string;
  monthly_revenue: string;
  referral_source: string;
  notes: string;
};

const initialForm: FormData = {
  full_name: "",
  business_name: "",
  email: "",
  phone: "",
  trade: "",
  city: "",
  state: "",
  monthly_revenue: "",
  referral_source: "",
  notes: "",
};

export default function PartnershipForm() {
  const [form, setForm] = useState<FormData>(initialForm);
  const [submitted, setSubmitted] = useState(false);

  function handleChange(
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: form.business_name,
          contact_name: form.full_name,
          email: form.email,
          phone: form.phone,
          service_category: form.trade,
          city: form.city,
          state: form.state,
          years_in_business: "N/A",
          team_size: "N/A",
          monthly_revenue: form.monthly_revenue,
          referral_source: form.referral_source,
          pitch: form.notes || "No additional notes",
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-colors font-mono text-sm";
  const selectClass =
    "w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 appearance-none focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-colors cursor-pointer text-sm";
  const labelClass = "text-sm font-medium text-slate-700 mb-1.5 block font-cta";

  const chevronIcon = (
    <svg
      className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );

  return (
    <>
      {/* Hero */}
      <section className="bg-slate-900 pt-32 pb-16 px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white font-heading mb-4 tracking-tight">
            Request Your CRM Partnership
          </h1>
          <p className="text-lg text-slate-300 max-w-xl mx-auto">
            One partner per trade per metro. Apply to lock your exclusive
            territory.
          </p>
        </div>
      </section>

      {/* Form Section */}
      <section className="bg-white py-16 px-6">
        <div className="mx-auto max-w-2xl">
          {submitted ? (
            <div className="rounded-xl border border-green-200 bg-green-50 p-8 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                <svg
                  className="h-7 w-7 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 font-heading mb-2">
                Application Received!
              </h2>
              <p className="text-slate-600 mb-6">
                We&apos;ll review your application and check territory
                availability. Expect a response within 24&ndash;48 hours.
              </p>
              <Link
                href="/"
                className="inline-block rounded-lg bg-teal-600 px-6 py-3 text-sm font-semibold text-white hover:bg-teal-700 transition-colors font-cta"
              >
                Back to Home
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Full Name */}
              <div>
                <label htmlFor="full_name" className={labelClass}>
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="full_name"
                  name="full_name"
                  type="text"
                  required
                  value={form.full_name}
                  onChange={handleChange}
                  placeholder="Jane Smith"
                  className={inputClass}
                />
              </div>

              {/* Business Name */}
              <div>
                <label htmlFor="business_name" className={labelClass}>
                  Business Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="business_name"
                  name="business_name"
                  type="text"
                  required
                  value={form.business_name}
                  onChange={handleChange}
                  placeholder="Acme Cleaning Co."
                  className={inputClass}
                />
              </div>

              {/* Email + Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="email" className={labelClass}>
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={form.email}
                    onChange={handleChange}
                    placeholder="jane@acmecleaning.com"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="phone" className={labelClass}>
                    Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    required
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="(555) 123-4567"
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Trade/Industry */}
              <div>
                <label htmlFor="trade" className={labelClass}>
                  Trade / Industry <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    id="trade"
                    name="trade"
                    required
                    value={form.trade}
                    onChange={handleChange}
                    className={selectClass}
                  >
                    <option value="">Select your trade</option>
                    {TRADES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  {chevronIcon}
                </div>
              </div>

              {/* City + State */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="city" className={labelClass}>
                    City / Metro Area <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="city"
                    name="city"
                    type="text"
                    required
                    value={form.city}
                    onChange={handleChange}
                    placeholder="Dallas-Fort Worth"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="state" className={labelClass}>
                    State <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      id="state"
                      name="state"
                      required
                      value={form.state}
                      onChange={handleChange}
                      className={selectClass}
                    >
                      <option value="">Select state</option>
                      {US_STATES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                    {chevronIcon}
                  </div>
                </div>
              </div>

              {/* Monthly Revenue */}
              <div>
                <label htmlFor="monthly_revenue" className={labelClass}>
                  Current Monthly Revenue <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    id="monthly_revenue"
                    name="monthly_revenue"
                    required
                    value={form.monthly_revenue}
                    onChange={handleChange}
                    className={selectClass}
                  >
                    <option value="">Select range</option>
                    {REVENUE_RANGES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  {chevronIcon}
                </div>
              </div>

              {/* Referral Source */}
              <div>
                <label htmlFor="referral_source" className={labelClass}>
                  How did you hear about us?
                </label>
                <div className="relative">
                  <select
                    id="referral_source"
                    name="referral_source"
                    value={form.referral_source}
                    onChange={handleChange}
                    className={selectClass}
                  >
                    <option value="">Select source</option>
                    {REFERRAL_SOURCES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  {chevronIcon}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label htmlFor="notes" className={labelClass}>
                  Anything else?
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={4}
                  value={form.notes}
                  onChange={handleChange}
                  placeholder="Tell us about your business, goals, or questions..."
                  className={`${inputClass} resize-none`}
                />
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Submit */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-lg bg-teal-600 px-8 py-3.5 text-base font-semibold text-white hover:bg-teal-700 transition-colors font-cta disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "Submitting..." : "Submit Partnership Request"}
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* Contact + Next Steps */}
      <section className="bg-slate-50 py-16 px-6">
        <div className="mx-auto max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Prefer to talk? */}
          <div>
            <h2 className="text-xl font-bold text-slate-900 font-heading mb-4">
              Prefer to talk?
            </h2>
            <div className="space-y-3">
              <a
                href="sms:+12122029220"
                className="flex items-center gap-3 text-teal-600 hover:text-teal-700 transition-colors font-cta text-sm"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-100 text-teal-600">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </span>
                Text Us: (212) 202-9220
              </a>
              <a
                href="tel:+12122029220"
                className="flex items-center gap-3 text-teal-600 hover:text-teal-700 transition-colors font-cta text-sm"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-100 text-teal-600">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </span>
                Call Us: (212) 202-9220
              </a>
              <a
                href="mailto:hello@fullloopcrm.com"
                className="flex items-center gap-3 text-teal-600 hover:text-teal-700 transition-colors font-cta text-sm"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-100 text-teal-600">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </span>
                hello@fullloopcrm.com
              </a>
            </div>
          </div>

          {/* What happens next? */}
          <div>
            <h2 className="text-xl font-bold text-slate-900 font-heading mb-4">
              What happens next?
            </h2>
            <ol className="space-y-3 text-sm text-slate-600">
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-600 text-white text-xs font-bold">
                  1
                </span>
                We review your application and verify your business details.
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-600 text-white text-xs font-bold">
                  2
                </span>
                We check territory availability for your trade and metro area.
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-600 text-white text-xs font-bold">
                  3
                </span>
                You&apos;ll hear back within 24&ndash;48 hours with next steps.
              </li>
            </ol>
          </div>
        </div>
      </section>

      {/* What You Get + Pricing */}
      <section className="bg-slate-900 py-16 px-6">
        <div className="mx-auto max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
          {/* What you get */}
          <div>
            <h2 className="text-xl font-bold text-white font-heading mb-5">
              What you get
            </h2>
            <ul className="space-y-3 text-sm text-slate-300">
              {[
                "Exclusive territory — one partner per trade per metro",
                "Full CRM platform: leads, scheduling, invoicing, reviews",
                "AI-powered sales assistant that books jobs 24/7",
                "Branded client portal and online booking page",
                "Automated follow-ups, reminders, and review requests",
                "GPS tracking and team management tools",
                "Dedicated onboarding and ongoing support",
              ].map((item) => (
                <li key={item} className="flex gap-2.5">
                  <svg
                    className="h-5 w-5 shrink-0 text-teal-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Pricing */}
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-8 text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-teal-400 mb-2 font-cta">
              Plans Starting At
            </p>
            <p className="text-4xl font-extrabold text-white font-heading mb-1">
              $199
              <span className="text-lg font-normal text-slate-400">/mo</span>
            </p>
            <p className="text-sm text-slate-400 mb-6">
              All features included. $999 setup. No contracts.
            </p>
            <ul className="space-y-2 text-sm text-slate-300 text-left">
              {[
                "Full platform access",
                "Lead generation network",
                "AI sales tools",
                "Unlimited team members",
                "Priority support",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <svg
                    className="h-5 w-5 shrink-0 text-yellow-300"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
