// @ts-nocheck
"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import TipBlurb from "@/app/site/consortium-nyc/_components/TipBlurb";

export default function FreeSEOAudit() {
  const [url, setUrl] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "seo-audit", name, email, url }),
      });
    } catch {
      // noop
    }
    setSubmitted(true);
  };

  return (
    <>
      {/* Hero */}
      <section className="pt-32 pb-16 bg-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-teal-400 text-sm font-semibold tracking-[0.2em] uppercase mb-4 font-cta">
            Free SEO Audit
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-6 font-heading">
            Get a Free SEO Audit for Your{" "}
            <span className="text-teal-400">NYC Business</span>
          </h1>
          <p className="text-white/70 text-lg max-w-2xl mx-auto">
            A complete analysis of your website&apos;s SEO health — technical issues, keyword gaps, backlink profile, and competitor benchmarks. No strings attached. No sales pitch. Just an honest look at where you stand.
          </p>
        </div>
      </section>

      <TipBlurb
        tip={<>Most &ldquo;free audits&rdquo; are just <strong>sales pitches in disguise</strong>. Ours isn&apos;t. We&apos;ll show you exactly what&apos;s broken, what&apos;s working, and what your competitors are doing — <strong>whether you hire us or not</strong>.</>}
      />

      {/* Form */}
      <section className="py-20 bg-white">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          {submitted ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16"
            >
              <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center mx-auto mb-6">
                <span className="text-teal-600 text-3xl">&#x2713;</span>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-3 font-heading">Audit Request Received</h2>
              <p className="text-slate-600 mb-6">
                We&apos;ll have your free SEO audit ready within 48 hours. Check your email for a detailed report on your website&apos;s SEO health, keyword opportunities, and what your competitors are doing.
              </p>
              <Link
                href="/"
                className="text-teal-600 font-semibold hover:underline font-cta"
              >
                Back to Home
              </Link>
            </motion.div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-slate-900 mb-2 font-heading text-center">
                Enter Your Website to Get Started
              </h2>
              <p className="text-slate-500 text-sm text-center mb-8">
                We&apos;ll manually audit your site — not an automated scan. You&apos;ll get a real report from a real person with 25 years of experience.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-slate-700 mb-1">Your Name</label>
                  <input
                    id="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Smith"
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-1">Email Address</label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john@yourbusiness.com"
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="url" className="block text-sm font-semibold text-slate-700 mb-1">Your Website URL</label>
                  <input
                    id="url"
                    type="url"
                    required
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://yourbusiness.com"
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none text-sm"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full px-6 py-4 text-base font-bold text-white rounded-lg bg-teal-600 hover:bg-teal-700 transition-colors shadow-lg font-cta"
                >
                  Get My Free SEO Audit
                </button>
                <p className="text-slate-400 text-xs text-center">
                  100% free. No credit card. No obligation. Audit delivered within 48 hours.
                </p>
              </form>
            </>
          )}

          {/* What you get */}
          <div className="mt-16 grid sm:grid-cols-2 gap-4">
            {[
              { title: "Technical SEO Analysis", desc: "Site speed, Core Web Vitals, crawlability, indexing issues, and mobile optimization." },
              { title: "Keyword Gap Report", desc: "Keywords your competitors rank for that you don't — and the traffic you're missing." },
              { title: "Backlink Profile Review", desc: "Your domain authority, toxic links, and opportunities to build quality backlinks." },
              { title: "Competitor Benchmarks", desc: "How you stack up against the top 3 competitors in your market — rankings, traffic, and content." },
              { title: "Google Business Profile Audit", desc: "Your GBP completeness, review score, and local pack ranking potential." },
              { title: "Action Plan & Quick Wins", desc: "The top 5 things you can fix right now to start improving your rankings immediately." },
            ].map((item) => (
              <div key={item.title} className="rounded-lg bg-teal-50 border border-teal-100 p-4">
                <p className="text-slate-900 text-sm font-bold mb-1">{item.title}</p>
                <p className="text-slate-500 text-xs">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-16 bg-teal-600">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-extrabold text-white mb-4 font-heading">
            Want More Than an Audit?
          </h2>
          <p className="text-white/80 text-lg mb-8">
            Schedule a free strategy session and we&apos;ll walk you through the audit results live, answer every question, and build a roadmap for your business.
          </p>
          <Link
            href="/contact-nyc-marketing-company-consortium-nyc"
            className="inline-block px-8 py-4 text-base font-bold text-teal-600 rounded-lg bg-white hover:bg-slate-100 transition-colors shadow-lg font-cta"
          >
            Schedule a Strategy Session
          </Link>
        </div>
      </section>
    </>
  );
}
