// @ts-nocheck
"use client";

import { useState } from "react";

export function BookingForm({ variant = "default" }: { variant?: "default" | "hero" | "dark" }) {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDark = variant === "dark" || variant === "hero";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const fd = new FormData(e.currentTarget);
    const payload = {
      type: "booking" as const,
      name: String(fd.get("name") || ""),
      phone: String(fd.get("phone") || ""),
      zip: String(fd.get("zip") || ""),
      when: String(fd.get("when") || ""),
      details: String(fd.get("details") || ""),
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
      <div className={`rounded-xl p-8 text-center ${isDark ? "bg-white/10 backdrop-blur-sm" : "bg-teal-50 border border-teal-200"}`}>
        <p className={`text-2xl font-bold font-heading ${isDark ? "text-white" : "text-teal-700"}`}>We&apos;ll be in touch shortly!</p>
        <p className={`mt-2 text-base ${isDark ? "text-white/70" : "text-slate-600"}`}>Our team will call or text you to confirm your booking.</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`rounded-xl p-6 ${isDark ? "bg-white/10 backdrop-blur-sm" : "bg-white border border-slate-200 shadow-md"}`}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={`block text-sm font-semibold mb-1 font-cta ${isDark ? "text-white/80" : "text-slate-700"}`}>Name</label>
          <input
            type="text"
            name="name"
            required
            placeholder="Your name"
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>
        <div>
          <label className={`block text-sm font-semibold mb-1 font-cta ${isDark ? "text-white/80" : "text-slate-700"}`}>Phone</label>
          <input
            type="tel"
            name="phone"
            required
            placeholder="(555) 555-5555"
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>
        <div>
          <label className={`block text-sm font-semibold mb-1 font-cta ${isDark ? "text-white/80" : "text-slate-700"}`}>Zip Code</label>
          <input
            type="text"
            name="zip"
            required
            placeholder="10001"
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>
        <div>
          <label className={`block text-sm font-semibold mb-1 font-cta ${isDark ? "text-white/80" : "text-slate-700"}`}>When</label>
          <select
            name="when"
            required
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="">Select timing</option>
            <option value="today">Today</option>
            <option value="tomorrow">Tomorrow</option>
            <option value="this-week">This Week</option>
            <option value="next-week">Next Week</option>
            <option value="flexible">Flexible</option>
          </select>
        </div>
      </div>
      <div className="mt-4">
        <label className={`block text-sm font-semibold mb-1 font-cta ${isDark ? "text-white/80" : "text-slate-700"}`}>What's the situation?</label>
        <textarea
          name="details"
          rows={3}
          placeholder="Vehicle year/make/model, what's wrong (dead battery, flat tire, tow, lockout, gas, etc.), and where it needs to go..."
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>
      {error && (
        <p className={`mt-3 rounded-md p-2 text-sm ${isDark ? "bg-red-500/20 text-red-100" : "bg-red-50 text-red-700"}`}>
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="mt-4 w-full rounded-lg bg-accent py-3.5 text-base font-bold text-white transition-colors hover:bg-accent-dark disabled:opacity-60 font-cta"
      >
        {submitting ? "Sending..." : "Request Service — Dispatch Will Call You"}
      </button>
      <p className={`mt-2 text-center text-xs ${isDark ? "text-white/40" : "text-slate-400"}`}>
        24/7 dispatch &bull; Flat-rate pricing &bull; 20–40 min arrival &bull; NYC DCWP licensed
      </p>
    </form>
  );
}
