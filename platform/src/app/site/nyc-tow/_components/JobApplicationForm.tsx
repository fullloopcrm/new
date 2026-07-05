"use client";

import { useState } from "react";

export function JobApplicationForm({ city, state }: { city?: string; state?: string }) {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const location = city && state ? `${city}, ${state}` : state || "NYC (All Boroughs)";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const fd = new FormData(e.currentTarget);
    const payload = {
      type: "job-application" as const,
      name: String(fd.get("name") || ""),
      phone: String(fd.get("phone") || ""),
      email: String(fd.get("email") || ""),
      city: String(fd.get("city") || ""),
      state,
      hasLicense: String(fd.get("hasLicense") || ""),
      canLift: String(fd.get("canLift") || ""),
      availability: String(fd.get("availability") || ""),
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
      setError(`${msg}. Please call (212) 470-4068 instead.`);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-xl bg-teal-50 border border-teal-200 p-8 text-center">
        <p className="text-xl font-bold text-teal-700 font-heading">Application received!</p>
        <p className="mt-2 text-sm text-slate-600">We&apos;ll review your application and contact you within 48 hours.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-6 shadow-md space-y-4">
      <h3 className="text-lg font-bold text-slate-900 font-heading">Apply Now — {location}</h3>
      <p className="text-sm text-slate-500">Takes 2 minutes. We&apos;ll call you within 48 hours.</p>
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name *</label>
        <input type="text" name="name" required placeholder="Your name" className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500" />
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
        <label className="block text-sm font-semibold text-slate-700 mb-1">City / Area *</label>
        <input type="text" name="city" required defaultValue={location !== "NYC (All Boroughs)" ? location : ""} placeholder="Which borough / neighborhood do you live in?" className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500" />
      </div>
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1">Do you have a valid driver&apos;s license? *</label>
        <select name="hasLicense" required className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 appearance-none">
          <option value="">Select...</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1">Tow experience? *</label>
        <select name="canLift" required className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 appearance-none">
          <option value="">Select...</option>
          <option value="experienced-tow">Experienced tow operator</option>
          <option value="cdl-no-tow">CDL but no tow experience</option>
          <option value="willing-to-train">No experience — willing to train</option>
          <option value="dispatcher">Dispatcher / office role interest</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1">Availability *</label>
        <select name="availability" required className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 appearance-none">
          <option value="">Select...</option>
          <option value="full-time">Full-Time</option>
          <option value="part-time">Part-Time</option>
          <option value="weekends">Weekends Only</option>
          <option value="flexible">Flexible</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1">Brief note about yourself</label>
        <textarea name="about" rows={3} placeholder="Any relevant experience, why you're interested, when you can start..." className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500" />
      </div>
      {error && (
        <p className="rounded-md bg-red-50 p-2 text-sm text-red-700">{error}</p>
      )}
      <button type="submit" disabled={submitting} className="w-full rounded-lg bg-teal-700 py-3.5 text-base font-bold text-white transition-colors hover:bg-teal-800 disabled:opacity-60 font-cta">
        {submitting ? "Sending..." : "Submit Application"}
      </button>
      <p className="text-center text-xs text-slate-400">W-2 employment, not gig. Full benefits for full-time. We respond within 48 hours.</p>
    </form>
  );
}
