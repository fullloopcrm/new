"use client";

import { useState, useEffect, useMemo, FormEvent, ChangeEvent } from "react";

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
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
  category_id: string;
  territory_id: string;
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
  category_id: "",
  territory_id: "",
  city: "",
  state: "",
  monthly_revenue: "",
  referral_source: "",
  notes: "",
};

export default function PartnerApplyForm() {
  const [form, setForm] = useState<FormData>(initialForm);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [territories, setTerritories] = useState<
    { id: string; name: string; state: string | null; kind: string }[]
  >([]);

  useEffect(() => {
    fetch("/api/territories/options")
      .then((r) => r.json())
      .then((d) => {
        setCategories(d.categories || []);
        setTerritories(d.territories || []);
      })
      .catch(() => {});
  }, []);

  // Group 969 territories by state for a usable native <optgroup> picker.
  const territoryGroups = useMemo(() => {
    const by: Record<string, { id: string; name: string }[]> = {};
    for (const t of territories) {
      const k = t.state || "—";
      (by[k] = by[k] || []).push({ id: t.id, name: t.name });
    }
    return Object.keys(by)
      .sort()
      .map((state) => ({ state, items: by[state] }));
  }, [territories]);

  function handleChange(
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

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
          service_category:
            categories.find((c) => c.id === form.category_id)?.name || "",
          category_id: form.category_id,
          territory_id: form.territory_id,
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

  if (submitted) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
          <svg
            className="h-7 w-7 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-slate-900 font-heading mb-2">
          Application Received
        </h3>
        <p className="text-slate-600">
          We&apos;ll review your application and check territory availability.
          Expect a response within 24&ndash;48 hours.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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

      <div>
        <label htmlFor="category_id" className={labelClass}>
          Trade / Category <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <select
            id="category_id"
            name="category_id"
            required
            value={form.category_id}
            onChange={handleChange}
            className={selectClass}
          >
            <option value="">Select your category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {chevronIcon}
        </div>
      </div>

      <div>
        <label htmlFor="territory_id" className={labelClass}>
          Territory <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <select
            id="territory_id"
            name="territory_id"
            required
            value={form.territory_id}
            onChange={handleChange}
            className={selectClass}
          >
            <option value="">Select your territory</option>
            {territoryGroups.map((g) => (
              <optgroup key={g.state} label={g.state}>
                {g.items.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          {chevronIcon}
        </div>
        <p className="text-xs text-slate-500 mt-1">
          One owner per category per territory — availability confirmed at checkout.
        </p>
      </div>

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

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

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
  );
}
