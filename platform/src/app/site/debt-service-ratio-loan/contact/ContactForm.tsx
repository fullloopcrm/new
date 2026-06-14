// @ts-nocheck
"use client";

import { useState } from "react";

export default function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  const update = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

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
          message: form.message,
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
          We&apos;ll get back to you within 1 business day.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <h2 className="text-2xl font-bold text-slate-900 font-heading">Send a Message</h2>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
        <input
          type="text"
          required
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
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
          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
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
          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
          placeholder="(555) 123-4567"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Message *</label>
        <textarea
          rows={5}
          required
          value={form.message}
          onChange={(e) => update("message", e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
          placeholder="How can we help?"
        />
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-teal-600 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed font-cta"
      >
        {submitting ? "Sending..." : "Send Message"}
      </button>
    </form>
  );
}
