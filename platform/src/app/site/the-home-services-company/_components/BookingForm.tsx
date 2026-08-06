"use client";

import { useState } from "react";
import { SERVICES } from "@/app/site/the-home-services-company/_data/services";

interface FieldErrors {
  name?: string;
  phone?: string;
  zip?: string;
  when?: string;
  service?: string;
}

export function BookingForm({ variant = "default" }: { variant?: "default" | "hero" | "dark" }) {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [zip, setZip] = useState("");
  const [when, setWhen] = useState("");
  const [service, setService] = useState("");

  const isDark = variant === "dark" || variant === "hero";

  function validateForm(): FieldErrors {
    const errors: FieldErrors = {};
    if (!name.trim()) errors.name = "Please enter your name.";
    if (!phone.trim() || phone.replace(/\D/g, "").length < 10) errors.phone = "Please enter a valid phone number.";
    if (!zip.trim()) errors.zip = "Please enter your zip code.";
    if (!when) errors.when = "Please select a timeframe.";
    if (!service) errors.service = "Please select a service type.";
    return errors;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    // Show every missing/invalid field at once instead of relying on the
    // browser's native one-at-a-time validation bubble.
    const errors = validateForm();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setError("Please fix the highlighted fields below.");
      return;
    }

    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const payload = {
      type: "booking" as const,
      name: name.trim(),
      phone: phone.trim(),
      zip: zip.trim(),
      when,
      service,
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
      setError(`${msg}. Please call (888) 700-4001 instead.`);
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
            value={name}
            onChange={(e) => { setName(e.target.value); setFieldErrors((prev) => ({ ...prev, name: undefined })); }}
            className={`w-full rounded-lg border px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 ${fieldErrors.name ? "border-red-400 ring-1 ring-red-300" : "border-slate-300"}`}
          />
          {fieldErrors.name && <p className="mt-1 text-xs text-red-500">{fieldErrors.name}</p>}
        </div>
        <div>
          <label className={`block text-sm font-semibold mb-1 font-cta ${isDark ? "text-white/80" : "text-slate-700"}`}>Phone</label>
          <input
            type="tel"
            name="phone"
            required
            placeholder="(555) 555-5555"
            value={phone}
            onChange={(e) => { setPhone(e.target.value); setFieldErrors((prev) => ({ ...prev, phone: undefined })); }}
            className={`w-full rounded-lg border px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 ${fieldErrors.phone ? "border-red-400 ring-1 ring-red-300" : "border-slate-300"}`}
          />
          {fieldErrors.phone && <p className="mt-1 text-xs text-red-500">{fieldErrors.phone}</p>}
        </div>
        <div>
          <label className={`block text-sm font-semibold mb-1 font-cta ${isDark ? "text-white/80" : "text-slate-700"}`}>Zip Code</label>
          <input
            type="text"
            name="zip"
            required
            placeholder="10001"
            value={zip}
            onChange={(e) => { setZip(e.target.value); setFieldErrors((prev) => ({ ...prev, zip: undefined })); }}
            className={`w-full rounded-lg border px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 ${fieldErrors.zip ? "border-red-400 ring-1 ring-red-300" : "border-slate-300"}`}
          />
          {fieldErrors.zip && <p className="mt-1 text-xs text-red-500">{fieldErrors.zip}</p>}
        </div>
        <div>
          <label className={`block text-sm font-semibold mb-1 font-cta ${isDark ? "text-white/80" : "text-slate-700"}`}>When</label>
          <select
            name="when"
            required
            value={when}
            onChange={(e) => { setWhen(e.target.value); setFieldErrors((prev) => ({ ...prev, when: undefined })); }}
            className={`w-full rounded-lg border px-4 py-2.5 text-sm text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 ${fieldErrors.when ? "border-red-400 ring-1 ring-red-300" : "border-slate-300"}`}
          >
            <option value="">Select timing</option>
            <option value="today">Today</option>
            <option value="tomorrow">Tomorrow</option>
            <option value="this-week">This Week</option>
            <option value="next-week">Next Week</option>
            <option value="flexible">Flexible</option>
          </select>
          {fieldErrors.when && <p className="mt-1 text-xs text-red-500">{fieldErrors.when}</p>}
        </div>
      </div>
      <div className="mt-4">
        <label className={`block text-sm font-semibold mb-1 font-cta ${isDark ? "text-white/80" : "text-slate-700"}`}>Service Needed *</label>
        <select
          name="service"
          required
          value={service}
          onChange={(e) => { setService(e.target.value); setFieldErrors((prev) => ({ ...prev, service: undefined })); }}
          className={`w-full rounded-lg border px-4 py-2.5 text-sm text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 ${fieldErrors.service ? "border-red-400 ring-1 ring-red-300" : "border-slate-300"}`}
        >
          <option value="">Select a service...</option>
          {SERVICES.map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.title}
            </option>
          ))}
          <option value="other">Other — describe below</option>
        </select>
        {fieldErrors.service && <p className="mt-1 text-xs text-red-500">{fieldErrors.service}</p>}
      </div>
      <div className="mt-4">
        <label className={`block text-sm font-semibold mb-1 font-cta ${isDark ? "text-white/80" : "text-slate-700"}`}>Describe the service you need</label>
        <textarea
          name="details"
          rows={3}
          placeholder="Tell us what's going on — the issue, the scope, and any access details..."
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
        {submitting ? "Sending..." : "Book Now — We'll Call You"}
      </button>
      <p className={`mt-2 text-center text-xs ${isDark ? "text-white/40" : "text-slate-400"}`}>
        Starting at $99/hour &bull; Upfront pricing &bull; Licensed and insured &bull; Same-day available
      </p>
    </form>
  );
}
