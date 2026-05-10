// @ts-nocheck
"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { jobs } from "@/app/site/the-nyc-interior-designer/_lib/jobs";
import { PHONE, PHONE_HREF, EMAIL } from "@/app/site/the-nyc-interior-designer/_lib/siteData";

const boroughs = [
  "Manhattan",
  "Brooklyn",
  "Queens",
  "Bronx",
  "Staten Island",
  "Long Island",
  "Westchester",
  "New Jersey",
];

export default function ApplyClient() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    position: "",
    borough: "",
    experience: "",
    portfolioUrl: "",
    message: "",
  });
  const [resume, setResume] = useState<File | null>(null);
  const [portfolio, setPortfolio] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const resumeRef = useRef<HTMLInputElement>(null);
  const portfolioRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg("");

    if (!form.name || !form.email || !form.phone || !form.position) {
      setErrorMsg("Please fill in all required fields.");
      setStatus("error");
      return;
    }

    if (resume && resume.size > 10 * 1024 * 1024) {
      setErrorMsg("Resume must be under 10MB.");
      setStatus("error");
      return;
    }

    if (portfolio && portfolio.size > 50 * 1024 * 1024) {
      setErrorMsg("Portfolio file must be under 50MB.");
      setStatus("error");
      return;
    }

    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, val]) => {
        if (val) formData.append(key, val);
      });
      if (resume) formData.append("resume", resume);
      if (portfolio) formData.append("portfolio", portfolio);

      const res = await fetch("/api/apply", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Something went wrong.");
      }

      setStatus("success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <>
        <section className="bg-gray-800 pt-36 pb-20 sm:pt-44 sm:pb-28">
          <div className="mx-auto max-w-2xl px-4 text-center">
            <div className="mb-6 text-6xl">&#10003;</div>
            <h1 className="text-3xl font-extrabold text-white sm:text-4xl">
              Application Received!
            </h1>
            <p className="mt-4 text-lg text-gray-300">
              Thank you, {form.name}. We&rsquo;ve received your application for{" "}
              <strong className="text-white">{form.position}</strong>. Our team will review your
              resume and portfolio and get back to you within 48 hours.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/careers"
                className="inline-block rounded-lg bg-white px-8 py-3 text-sm font-bold text-blue-800 hover:bg-blue-50 transition-colors"
              >
                View All Positions
              </Link>
              <Link
                href="/"
                className="inline-block rounded-lg border-2 border-white/30 px-8 py-3 text-sm font-bold text-white hover:bg-white/10 transition-colors"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gray-800 pt-36 pb-16 sm:pt-44 sm:pb-20">
        <div className="absolute inset-0 bg-[url('/og-image.jpg')] bg-cover bg-center opacity-15" />
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <p className="mb-4 inline-block rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-blue-200">
            Join Our Team
          </p>
          <h1 className="text-3xl font-extrabold text-white sm:text-4xl md:text-5xl leading-tight">
            Apply for an Interior Design Job in <span className="text-blue-300">NYC</span>
          </h1>
          <p className="mt-4 text-lg text-gray-300 max-w-xl mx-auto">
            Upload your resume and share your portfolio. We review every application personally.
          </p>
        </div>
      </section>

      {/* Form */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-2xl px-4 sm:px-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                placeholder="Your full name"
              />
            </div>

            {/* Email + Phone */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                  placeholder="you@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                  placeholder="(555) 555-5555"
                />
              </div>
            </div>

            {/* Position + Borough */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Position Applying For <span className="text-red-500">*</span>
                </label>
                <select
                  name="position"
                  value={form.position}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none bg-white"
                >
                  <option value="">Select a position</option>
                  {jobs.map((j) => (
                    <option key={j.slug} value={j.title}>
                      {j.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Preferred Borough/Area
                </label>
                <select
                  name="borough"
                  value={form.borough}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none bg-white"
                >
                  <option value="">Any area</option>
                  {boroughs.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Experience */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Years of Experience
              </label>
              <select
                name="experience"
                value={form.experience}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none bg-white"
              >
                <option value="">Select</option>
                <option value="0-1">Less than 1 year</option>
                <option value="1-3">1-3 years</option>
                <option value="3-5">3-5 years</option>
                <option value="5+">5+ years</option>
              </select>
            </div>

            {/* Portfolio URL */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Portfolio URL
              </label>
              <input
                type="url"
                name="portfolioUrl"
                value={form.portfolioUrl}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                placeholder="https://your-portfolio.com"
              />
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Tell us about yourself
              </label>
              <textarea
                name="message"
                value={form.message}
                onChange={handleChange}
                rows={4}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none resize-none"
                placeholder="What is your design experience? What kind of projects excite you? What are you looking for in your next role?"
              />
            </div>

            {/* Portfolio Upload */}
            <div className="rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 p-6">
              <label className="block text-sm font-bold text-blue-800 mb-2">
                Portfolio File
              </label>
              <p className="text-xs text-blue-700 mb-4">
                Upload your portfolio as a PDF. Include your best residential and/or commercial
                projects. <strong>Max 50MB.</strong> You can also share a link above instead.
              </p>
              <input
                ref={portfolioRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => setPortfolio(e.target.files?.[0] || null)}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => portfolioRef.current?.click()}
                className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-gray-700 transition-colors"
              >
                {portfolio ? `Selected: ${portfolio.name}` : "Upload Portfolio"}
              </button>
              {portfolio && (
                <p className="mt-2 text-xs text-blue-700">
                  {(portfolio.size / (1024 * 1024)).toFixed(1)} MB selected
                </p>
              )}
            </div>

            {/* Resume */}
            <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-6">
              <label className="block text-sm font-bold text-slate-800 mb-2">
                Resume
              </label>
              <p className="text-xs text-slate-600 mb-4">
                Upload your resume. PDF or Word. <strong>Max 10MB.</strong>
              </p>
              <input
                ref={resumeRef}
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(e) => setResume(e.target.files?.[0] || null)}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => resumeRef.current?.click()}
                className="rounded-lg bg-slate-200 px-6 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-300 transition-colors"
              >
                {resume ? `Selected: ${resume.name}` : "Upload Resume"}
              </button>
              {resume && (
                <p className="mt-2 text-xs text-slate-500">
                  {(resume.size / (1024 * 1024)).toFixed(1)} MB selected
                </p>
              )}
            </div>

            {/* Error */}
            {status === "error" && errorMsg && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {errorMsg}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={status === "submitting"}
              className="w-full rounded-lg bg-blue-600 px-8 py-4 text-base font-bold text-white hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === "submitting" ? "Submitting..." : "Submit Application"}
            </button>

            <p className="text-center text-xs text-slate-400">
              We review every application. You&rsquo;ll hear from us within 48 hours.
            </p>
          </form>
        </div>
      </section>

      {/* Links */}
      <section className="bg-slate-50 py-12">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 flex flex-wrap justify-center gap-4 text-sm">
          <Link href="/careers" className="text-blue-600 underline underline-offset-2 hover:text-blue-700">All Careers</Link>
          <Link href="/services" className="text-blue-600 underline underline-offset-2 hover:text-blue-700">Our Services</Link>
          <Link href="/pricing" className="text-blue-600 underline underline-offset-2 hover:text-blue-700">Pricing</Link>
          <Link href="/faq" className="text-blue-600 underline underline-offset-2 hover:text-blue-700">FAQ</Link>
          <a href={PHONE_HREF} className="text-blue-600 underline underline-offset-2 hover:text-blue-700">{PHONE}</a>
        </div>
      </section>
    </>
  );
}
