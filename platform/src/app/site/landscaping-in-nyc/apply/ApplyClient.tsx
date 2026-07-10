"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { jobs } from "@/app/site/landscaping-in-nyc/_lib/jobs";
import { PHONE, PHONE_HREF, EMAIL } from "@/app/site/landscaping-in-nyc/_lib/siteData";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Upload a file directly to Supabase storage via a pre-signed URL (bypasses
// Vercel's 4.5MB function body limit — required for the 100MB video).
async function uploadFile(file: File, type: "resume" | "video"): Promise<string> {
  const signedRes = await fetch("/api/apply/signed-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, filename: file.name, contentType: file.type }),
  });
  if (!signedRes.ok) {
    const data = await signedRes.json().catch(() => ({}));
    throw new Error(data.error || `Failed to prepare ${type} upload.`);
  }
  const { path, token, publicUrl } = await signedRes.json();

  const { error } = await supabase.storage
    .from("uploads")
    .uploadToSignedUrl(path, token, file, { contentType: file.type });
  if (error) throw new Error(`Failed to upload ${type}. Please try again.`);

  return publicUrl;
}

const boroughs = [
  "Manhattan",
  "Brooklyn",
  "Queens",
  "Bronx",
  "Staten Island",
  "Long Island",
  "Westchester",
];

export default function ApplyClient() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    position: "",
    borough: "",
    experience: "",
    availability: "",
    driversLicense: "",
    about: "",
  });
  const [resume, setResume] = useState<File | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const resumeRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

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

    if (!video) {
      setErrorMsg("Please upload a short selfie video introducing yourself.");
      setStatus("error");
      return;
    }

    if (video.size > 100 * 1024 * 1024) {
      setErrorMsg("Video must be under 100MB.");
      setStatus("error");
      return;
    }

    if (resume && resume.size > 10 * 1024 * 1024) {
      setErrorMsg("Resume must be under 10MB.");
      setStatus("error");
      return;
    }

    try {
      let resumeUrl: string | null = null;
      let videoUrl: string | null = null;

      if (video) videoUrl = await uploadFile(video, "video");
      if (resume) resumeUrl = await uploadFile(resume, "resume");

      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          position: form.position,
          borough: form.borough,
          experience: form.experience,
          availability: form.availability,
          driversLicense: form.driversLicense,
          message: form.about,
          resumeUrl,
          videoUrl,
        }),
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
        <section className="bg-green-700 pt-36 pb-20 sm:pt-44 sm:pb-28">
          <div className="mx-auto max-w-2xl px-4 text-center">
            <div className="mb-6 text-6xl">&#10003;</div>
            <h1 className="text-3xl font-extrabold text-white sm:text-4xl font-heading">
              Application Received!
            </h1>
            <p className="mt-4 text-lg text-green-100/80">
              Thank you, {form.name}. We&rsquo;ve received your application for{" "}
              <strong className="text-white">{form.position}</strong>. Our team will review your video
              and resume and get back to you within 48 hours.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/careers"
                className="inline-block rounded-lg bg-white px-8 py-3 text-sm font-bold text-green-700 hover:bg-green-50 transition-colors font-cta"
              >
                View All Positions
              </Link>
              <Link
                href="/"
                className="inline-block rounded-lg border-2 border-white/30 px-8 py-3 text-sm font-bold text-white hover:bg-white/10 transition-colors font-cta"
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
      <section className="relative overflow-hidden bg-green-700 pt-36 pb-16 sm:pt-44 sm:pb-20">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <p className="mb-4 inline-block rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-green-200">
            Join Our Team
          </p>
          <h1 className="text-3xl font-extrabold text-white sm:text-4xl md:text-5xl font-heading leading-tight">
            Apply for a Landscaping Job in <span className="text-green-400">NYC</span>
          </h1>
          <p className="mt-4 text-lg text-green-100/80 max-w-xl mx-auto">
            Upload your resume and a short selfie video telling us about yourself. We review every application personally.
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
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none"
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
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none"
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
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none"
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
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none bg-white"
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
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none bg-white"
                >
                  <option value="">Any area</option>
                  {boroughs.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Experience + License */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Years of Experience
                </label>
                <select
                  name="experience"
                  value={form.experience}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none bg-white"
                >
                  <option value="">Select</option>
                  <option value="0-1">Less than 1 year</option>
                  <option value="1-3">1–3 years</option>
                  <option value="3-5">3–5 years</option>
                  <option value="5+">5+ years</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Driver&rsquo;s License
                </label>
                <select
                  name="driversLicense"
                  value={form.driversLicense}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none bg-white"
                >
                  <option value="">Select</option>
                  <option value="yes">Yes — standard</option>
                  <option value="cdl">Yes — CDL</option>
                  <option value="no">No</option>
                </select>
              </div>
            </div>

            {/* Availability */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                When can you start?
              </label>
              <select
                name="availability"
                value={form.availability}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none bg-white"
              >
                <option value="">Select</option>
                <option value="immediately">Immediately</option>
                <option value="1-week">Within 1 week</option>
                <option value="2-weeks">Within 2 weeks</option>
                <option value="1-month">Within 1 month</option>
              </select>
            </div>

            {/* About */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Tell us about yourself
              </label>
              <textarea
                name="about"
                value={form.about}
                onChange={handleChange}
                rows={4}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none resize-none"
                placeholder="What's your landscaping experience? What are you looking for in your next role?"
              />
            </div>

            {/* Selfie Video */}
            <div className="rounded-xl border-2 border-dashed border-green-300 bg-green-50 p-6">
              <label className="block text-sm font-bold text-green-800 mb-2">
                Selfie Video <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-green-700 mb-4">
                Record a 30–60 second video on your phone introducing yourself. Tell us your name,
                your experience, and why you want to work with us. This replaces a formal interview
                for the first round. <strong>Max 100MB.</strong> MP4, MOV, or WebM.
              </p>
              <input
                ref={videoRef}
                type="file"
                accept="video/mp4,video/quicktime,video/webm,video/*"
                onChange={(e) => setVideo(e.target.files?.[0] || null)}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => videoRef.current?.click()}
                className="rounded-lg bg-green-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-green-700 transition-colors"
              >
                {video ? `✓ ${video.name}` : "Upload Video"}
              </button>
              {video && (
                <p className="mt-2 text-xs text-green-700">
                  {(video.size / (1024 * 1024)).toFixed(1)} MB selected
                </p>
              )}
            </div>

            {/* Resume */}
            <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-6">
              <label className="block text-sm font-bold text-slate-800 mb-2">
                Resume
              </label>
              <p className="text-xs text-slate-600 mb-4">
                Upload your resume if you have one. PDF or Word. <strong>Max 10MB.</strong> Not required — your video matters more.
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
                {resume ? `✓ ${resume.name}` : "Upload Resume"}
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
              className="w-full rounded-lg bg-green-600 px-8 py-4 text-base font-bold text-white hover:bg-green-700 transition-colors font-cta disabled:opacity-50 disabled:cursor-not-allowed"
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
          <Link href="/careers" className="text-green-600 underline underline-offset-2 hover:text-green-700">All Careers</Link>
          <Link href="/services" className="text-green-600 underline underline-offset-2 hover:text-green-700">Our Services</Link>
          <Link href="/pricing" className="text-green-600 underline underline-offset-2 hover:text-green-700">Pricing</Link>
          <Link href="/faq" className="text-green-600 underline underline-offset-2 hover:text-green-700">FAQ</Link>
          <a href={`tel:${PHONE_HREF}`} className="text-green-600 underline underline-offset-2 hover:text-green-700">{PHONE}</a>
        </div>
      </section>
    </>
  );
}
