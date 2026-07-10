"use client";

import { useState } from "react";
import { motion } from "framer-motion";

const PHONE = "(212) 202-9220";
const PHONE_HREF = "tel:+12122029220";

export default function ContactLandingClient() {
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "strategy-quick", ...form }),
      });
    } catch {
      // noop
    }
    setSubmitted(true);
    setSending(false);
  }

  return (
    <section className="relative min-h-[calc(100vh-80px)] flex items-center py-20 px-6 overflow-hidden">
      {/* Subtle bg */}
      <div className="absolute inset-0 bg-gradient-to-br from-white via-teal-50/40 to-white" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-teal-500/5 blur-3xl" />

      <div className="relative z-10 mx-auto w-full max-w-5xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* ---- LEFT: Copy ---- */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Trust signal */}
            <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 border border-teal-200 px-4 py-1.5 mb-6">
              <span className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </span>
              <span className="text-xs font-semibold text-teal-800">4.9/5 from 47 reviews</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 leading-[1.15] tracking-tight font-heading">
              Stop Losing Customers to Your Competitors
            </h1>

            <p className="mt-5 text-lg text-slate-500 leading-relaxed max-w-lg">
              Get a free strategy session with NYC&apos;s highest-rated marketing team. We&apos;ll show you exactly where you&apos;re losing money and how to fix it.
            </p>

            {/* Stats row */}
            <div className="mt-8 flex gap-8">
              <div>
                <p className="text-2xl font-extrabold text-slate-900 font-heading">$15.2M+</p>
                <p className="text-xs text-slate-400 uppercase tracking-wider mt-0.5">Revenue Generated</p>
              </div>
              <div>
                <p className="text-2xl font-extrabold text-slate-900 font-heading">200+</p>
                <p className="text-xs text-slate-400 uppercase tracking-wider mt-0.5">NYC Businesses</p>
              </div>
              <div>
                <p className="text-2xl font-extrabold text-slate-900 font-heading">24hr</p>
                <p className="text-xs text-slate-400 uppercase tracking-wider mt-0.5">Response Time</p>
              </div>
            </div>

            {/* Phone CTA - big and bold */}
            <div className="mt-8 pt-8 border-t border-slate-200">
              <p className="text-sm text-slate-400 uppercase tracking-wider font-semibold mb-2">
                Or call us right now
              </p>
              <a
                href={PHONE_HREF}
                className="inline-flex items-center gap-3 text-2xl sm:text-3xl font-extrabold text-teal-600 hover:text-teal-700 transition-colors font-mono"
              >
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                </svg>
                {PHONE}
              </a>
              <p className="text-sm text-slate-400 mt-1">We pick up the phone.</p>
            </div>
          </motion.div>

          {/* ---- RIGHT: Form ---- */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            {submitted ? (
              <div className="rounded-2xl border border-teal-200 bg-teal-50 p-10 text-center shadow-lg shadow-teal-600/5">
                <svg className="w-14 h-14 mx-auto text-teal-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h2 className="text-2xl font-bold text-slate-900 mb-2 font-heading">You&apos;re In</h2>
                <p className="text-slate-600">
                  We&apos;ll call you within 24 hours to schedule your free strategy session. Check your email for a confirmation.
                </p>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="rounded-2xl border border-slate-200 bg-white p-8 sm:p-10 shadow-xl shadow-slate-900/5"
              >
                <div className="text-center mb-8">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-heading">
                    Book Your Free Strategy Session
                  </h2>
                  <p className="text-slate-500 text-sm mt-2">
                    30 minutes. No pitch. Just a clear plan to grow your business.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <input
                      type="text"
                      name="name"
                      required
                      value={form.name}
                      onChange={handleChange}
                      placeholder="Your Name"
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 px-5 py-4 text-slate-900 text-base placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
                    />
                  </div>
                  <div>
                    <input
                      type="email"
                      name="email"
                      required
                      value={form.email}
                      onChange={handleChange}
                      placeholder="Email Address"
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 px-5 py-4 text-slate-900 text-base placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
                    />
                  </div>
                  <div>
                    <input
                      type="tel"
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="Phone Number (optional)"
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 px-5 py-4 text-slate-900 text-base placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={sending}
                  className="mt-6 w-full rounded-xl bg-teal-600 px-8 py-4.5 text-lg font-bold text-white hover:bg-teal-700 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-teal-600/25 font-cta"
                >
                  {sending ? "Submitting..." : "Get My Free Strategy Session"}
                </button>

                {/* Micro-trust */}
                <div className="mt-6 flex flex-col items-center gap-3">
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      No contracts
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      No obligation
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      100% free
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Trusted by 200+ NYC businesses &middot; $15.2M+ in client revenue
                  </p>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
