"use client";

import { useState } from "react";
import Link from "next/link";
import { CtaButtons } from "@/app/site/toll-trucks-near-me/_components/CtaButtons";
import { PHONE, PHONE_HREF, EMAIL, HOURS } from "@/app/site/toll-trucks-near-me/_data/content";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const payload = {
      type: "contact" as const,
      name: String(fd.get("name") || ""),
      email: String(fd.get("email") || ""),
      phone: String(fd.get("phone") || "n/a"),
      details: `${String(fd.get("subject") || "")}: ${String(fd.get("message") || "")}`,
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
      setError(`${msg}. Please email ${EMAIL} instead.`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">Get in Touch</p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            Contact <span className="gradient-text">Toll Trucks Near Me</span> Tow Truck Dispatch
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            Have a question? Need info? We&apos;re here to help. For booking a pickup, use our <Link href="/book-tow-truck-now" className="underline text-white hover:text-teal-200">booking page</Link>.
          </p>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
            {/* Left — contact info */}
            <div>
              <h2 className="text-center text-2xl font-bold text-slate-900 font-heading">Get in Touch</h2>

              <div className="mt-8 space-y-6">
                <div>
                  <p className="text-sm font-bold uppercase tracking-widest text-teal-600 font-cta">Phone</p>
                  <a href={PHONE_HREF} className="mt-1 block text-xl font-bold text-slate-900 hover:text-teal-700 transition-colors">{PHONE}</a>
                  <p className="mt-0.5 text-sm text-slate-500">Call or text</p>
                </div>

                <div>
                  <p className="text-sm font-bold uppercase tracking-widest text-teal-600 font-cta">Email</p>
                  <a href={`mailto:${EMAIL}`} className="mt-1 block text-lg font-bold text-slate-900 hover:text-teal-700 transition-colors">{EMAIL}</a>
                </div>

                <div>
                  <p className="text-sm font-bold uppercase tracking-widest text-teal-600 font-cta">Service Area</p>
                  <p className="mt-1 text-base text-slate-700">All 50 states — 900+ cities nationwide</p>
                </div>

                <div>
                  <p className="text-sm font-bold uppercase tracking-widest text-teal-600 font-cta">Hours</p>
                  <p className="mt-1 text-base text-slate-700">{HOURS} &bull; 7 Days a Week</p>
                </div>

                <div className="mt-8 rounded-xl border-2 border-accent/30 bg-accent/5 p-5">
                  <p className="text-sm font-bold text-accent font-cta">Looking to book a pickup?</p>
                  <p className="mt-1 text-sm text-slate-600">This form is for questions and communication only.</p>
                  <Link href="/book-tow-truck-now" className="mt-3 inline-block rounded-lg bg-accent px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-accent-dark font-cta">
                    Go to Booking Page →
                  </Link>
                </div>
              </div>
            </div>

            {/* Right — contact form ONLY */}
            <div>
              <h2 className="text-center text-2xl font-bold text-slate-900 font-heading">Send Us a Message</h2>
              <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-slate-500">Questions, feedback, partnerships, media — we&apos;ll get back to you within 24 hours.</p>

              {submitted ? (
                <div className="mt-6 rounded-xl bg-teal-50 border border-teal-200 p-8 text-center">
                  <p className="text-xl font-bold text-teal-700 font-heading">Message sent!</p>
                  <p className="mt-2 text-sm text-slate-600">We&apos;ll get back to you within 24 hours.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Name *</label>
                    <input type="text" name="name" required placeholder="Your name" className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Email *</label>
                    <input type="email" name="email" required placeholder="you@example.com" className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Phone</label>
                    <input type="tel" name="phone" placeholder="(555) 555-5555" className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Subject *</label>
                    <select name="subject" required className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 appearance-none">
                      <option value="">Select a topic...</option>
                      <option value="question">General Question</option>
                      <option value="pricing">Pricing Question</option>
                      <option value="commercial">Commercial Account</option>
                      <option value="franchise">Franchise Inquiry</option>
                      <option value="partnership">Partnership</option>
                      <option value="media">Media / Press</option>
                      <option value="careers">Careers / Jobs</option>
                      <option value="feedback">Feedback</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Message *</label>
                    <textarea name="message" required rows={5} placeholder="How can we help?" className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500" />
                  </div>
                  {error && (
                    <p className="rounded-md bg-red-50 p-2 text-sm text-red-700">{error}</p>
                  )}
                  <button type="submit" disabled={submitting} className="w-full rounded-lg bg-teal-700 py-3.5 text-base font-bold text-white transition-colors hover:bg-teal-800 disabled:opacity-60 font-cta">
                    {submitting ? "Sending..." : "Send Message"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 py-16">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <h2 className="text-center text-3xl font-bold text-white sm:text-4xl font-heading">Ready to Book?</h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">Head to our booking page to schedule your tow truck service pickup.</p>
          <CtaButtons variant="dark" />
        </div>
      </section>
    </>
  );
}
