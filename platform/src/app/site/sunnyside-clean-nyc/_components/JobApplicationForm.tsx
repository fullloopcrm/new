"use client";

import { useState } from "react";

export function JobApplicationForm() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [photoName, setPhotoName] = useState<string>("");
  const [photoUploading, setPhotoUploading] = useState(false);

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      setError("Profile photo must be an image.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Profile photo too large (max 10MB).");
      return;
    }
    setError(null);
    setPhotoUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("folder", "job-applications");
      const res = await fetch("/api/public-upload", { method: "POST", body });
      const data = (await res.json()) as { success: boolean; url?: string; error?: string };
      if (!res.ok || !data.success || !data.url) throw new Error(data.error || "Upload failed");
      setPhotoUrl(data.url);
      setPhotoName(file.name);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Photo upload failed");
    } finally {
      setPhotoUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!photoUrl) {
      setError("A profile photo is required to apply.");
      return;
    }
    setSubmitting(true);

    const fd = new FormData(e.currentTarget);
    const payload = {
      formType: "job-application" as const,
      name: String(fd.get("name") || ""),
      phone: String(fd.get("phone") || ""),
      email: String(fd.get("email") || ""),
      position: "House Cleaner",
      experience: String(fd.get("experience") || ""),
      availability: String(fd.get("availability") || ""),
      location: String(fd.get("location") || ""),
      photo_url: photoUrl,
      source: typeof window !== "undefined" ? window.location.pathname : "",
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Submission failed");
      setSubmitted(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-teal-200 bg-teal-50 p-8 text-center">
        <p className="text-xl font-bold text-teal-700 font-heading">Application received!</p>
        <p className="mt-2 text-sm text-slate-600">We&apos;ll review your application and reach out soon.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-6 shadow-md space-y-4">
      <h3 className="text-lg font-bold text-slate-900 font-heading">Apply to Join Our Cleaning Team</h3>
      <p className="text-sm text-slate-500">We&apos;re looking for reliable, detail-oriented cleaners in NYC.</p>
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name *</label>
        <input type="text" name="name" required className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500" />
      </div>
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1">Phone *</label>
        <input type="tel" name="phone" required placeholder="(555) 555-5555" className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500" />
      </div>
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1">Email *</label>
        <input type="email" name="email" required className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500" />
      </div>
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1">Neighborhood / Area *</label>
        <input type="text" name="location" required placeholder="e.g. Sunnyside, Queens" className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500" />
      </div>
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1">Cleaning Experience</label>
        <select name="experience" className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500">
          <option value="">Select...</option>
          <option value="none">No professional experience</option>
          <option value="1-2 years">1-2 years</option>
          <option value="3-5 years">3-5 years</option>
          <option value="5+ years">5+ years</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1">Availability</label>
        <select name="availability" className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500">
          <option value="">Select...</option>
          <option value="full-time">Full-time</option>
          <option value="part-time">Part-time</option>
          <option value="weekends">Weekends only</option>
          <option value="flexible">Flexible</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1">Profile photo *</label>
        <input type="file" accept="image/*" onChange={handlePhoto} disabled={photoUploading} className="w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-teal-700 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-teal-800" />
        {photoUploading && <p className="mt-1 text-xs text-slate-500">Uploading photo…</p>}
        {photoUrl && !photoUploading && <p className="mt-1 text-xs font-semibold text-teal-700">✓ {photoName || "Photo uploaded"}</p>}
      </div>
      {error && <p className="rounded-md bg-red-50 p-2 text-sm text-red-700">{error}</p>}
      <button type="submit" disabled={submitting} className="w-full rounded-lg bg-teal-700 py-3.5 text-base font-bold text-white transition-colors hover:bg-teal-800 disabled:opacity-60 font-cta">
        {submitting ? "Sending..." : "Submit Application"}
      </button>
    </form>
  );
}
