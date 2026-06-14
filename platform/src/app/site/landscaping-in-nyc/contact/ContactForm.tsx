// @ts-nocheck
"use client";

import { useState } from "react";
import { services } from "@/app/site/landscaping-in-nyc/_lib/siteData";

export default function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    service: "",
    description: "",
    timeline: "",
  });

  const update = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  const timelines = [
    "As soon as possible",
    "Within 2 weeks",
    "Within 1 month",
    "Within 2-3 months",
    "Just getting quotes",
  ];

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
          service: form.service,
          description: form.description,
          timeline: form.timeline,
          source: "contact",
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

  if (submitted) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
        <div className="text-4xl">&#9989;</div>
        <h2 className="mt-3 text-xl font-bold text-slate-900 font-heading">Message Sent</h2>
        <p className="mt-2 text-sm text-slate-600">
          We&apos;ll get back to you within 1 business day with your free estimate.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <h2 className="text-2xl font-bold text-slate-900 font-heading">Request a Free Estimate</h2>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
        <input
          type="text"
          required
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
          placeholder="Your name"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
        <input
          type="email"
          required
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Phone *</label>
        <input
          type="tel"
          required
          value={form.phone}
          onChange={(e) => update("phone", e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
          placeholder="(212) 555-1234"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Address / Neighborhood</label>
        <input
          type="text"
          value={form.address}
          onChange={(e) => update("address", e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
          placeholder="e.g., Park Slope, Brooklyn or 123 Main St"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Service Interested In *</label>
        <select
          required
          value={form.service}
          onChange={(e) => update("service", e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
        >
          <option value="">Select a service...</option>
          {services.map((s) => (
            <option key={s.slug} value={s.name}>{s.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Project Description *</label>
        <textarea
          rows={4}
          required
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
          placeholder="Tell us about your project — size, current condition, what you'd like done..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Preferred Timeline</label>
        <select
          value={form.timeline}
          onChange={(e) => update("timeline", e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
        >
          <option value="">Select a timeline...</option>
          {timelines.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-green-600 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-cta"
      >
        {submitting ? "Sending..." : "Get Free Estimate"}
      </button>
    </form>
  );
}
