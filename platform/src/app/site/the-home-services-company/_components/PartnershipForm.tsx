"use client";

import { useState } from "react";
import { SERVICES } from "@/app/site/the-home-services-company/_data/services";

export function PartnershipForm({ city, state }: { city?: string; state?: string }) {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const location = city && state ? `${city}, ${state}` : state || "Nationwide";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const fd = new FormData(e.currentTarget);
    const payload = {
      type: "partnership" as const,
      name: String(fd.get("name") || ""),
      businessName: String(fd.get("businessName") || ""),
      phone: String(fd.get("phone") || ""),
      email: String(fd.get("email") || ""),
      city: String(fd.get("city") || ""),
      state,
      trade: String(fd.get("trade") || ""),
      hasLicense: String(fd.get("hasLicense") || ""),
      about: String(fd.get("about") || ""),
      source: typeof window !== "undefined" ? window.location.pathname : "",
    };

    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Submission failed");
      setSubmitted(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(`${msg}. Please email hello@thehomeservicescompany.com or call (888) 700-4001.`);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-xl bg-teal-50 border border-teal-200 p-8 text-center">
        <p className="text-xl font-bold text-teal-700 font-heading">Partnership inquiry received!</p>
        <p className="mt-2 text-sm text-slate-600">Our partnerships team will reach out within 48 hours.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-6 shadow-md space-y-4">
      <h3 className="text-lg font-bold text-slate-900 font-heading">Partnership Inquiry — {location}</h3>
      <p className="text-sm text-slate-500">Takes 2 minutes. We reply within 48 hours.</p>
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1">Your Name *</label>
        <input type="text" name="name" required placeholder="Your name" className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500" />
      </div>
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1">Business Name</label>
        <input type="text" name="businessName" placeholder="If you run a contracting business" className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500" />
      </div>
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1">Phone *</label>
        <input type="tel" name="phone" required placeholder="(555) 555-5555" className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500" />
      </div>
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1">Email *</label>
        <input type="email" name="email" required placeholder="you@example.com" className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500" />
      </div>
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1">City / Market *</label>
        <input type="text" name="city" required defaultValue={city || ""} placeholder="What city do you serve?" className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500" />
      </div>
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1">Trade / Specialty *</label>
        <select name="trade" required className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 appearance-none">
          <option value="">Select a trade...</option>
          {SERVICES.map((s) => (
            <option key={s.slug} value={s.slug}>{s.title}</option>
          ))}
          <option value="other">Other — describe below</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1">Licensed and insured? *</label>
        <select name="hasLicense" required className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 appearance-none">
          <option value="">Select...</option>
          <option value="yes">Yes — licensed and insured</option>
          <option value="license-only">Licensed, need insurance guidance</option>
          <option value="insured-only">Insured, license in progress</option>
          <option value="no">Not yet — want to discuss</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1">Tell us about your business</label>
        <textarea name="about" rows={4} placeholder="How long have you been in the trade? Crew size? Current job volume? Anything else we should know..." className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500" />
      </div>
      {error && (
        <p className="rounded-md bg-red-50 p-2 text-sm text-red-700">{error}</p>
      )}
      <button type="submit" disabled={submitting} className="w-full rounded-lg bg-accent px-6 py-3.5 text-center text-base font-semibold text-white transition-colors hover:bg-accent-dark disabled:opacity-60 font-cta">
        {submitting ? "Sending..." : "Apply Now"}
      </button>
      <p className="text-center text-xs text-slate-400">Goes directly to hello@thehomeservicescompany.com. We reply within 48 hours.</p>
    </form>
  );
}
