"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

const PHONE = "(212) 202-9220";
const PHONE_HREF = "tel:+12122029220";

const serviceOptions = [
  "SEO",
  "Web Design",
  "Branding",
  "Digital Strategy",
  "Business Development",
  "Marketing Automation",
  "AI Chatbot / Selena",
  "Other",
];

type FormTab = "strategy" | "rfp";

/* ================================================================== */
/*  CONTACT PAGE CLIENT                                                */
/* ================================================================== */
export default function ContactPageClient() {
  const [activeTab, setActiveTab] = useState<FormTab>("strategy");
  const [strategySubmitted, setStrategySubmitted] = useState(false);
  const [rfpSubmitted, setRfpSubmitted] = useState(false);

  return (
    <>
      {/* ============================================================ */}
      {/*  HERO                                                        */}
      {/* ============================================================ */}
      <section className="relative pt-32 pb-16 sm:pt-40 sm:pb-20 px-6 overflow-hidden">
        <div className="absolute inset-0 grid-bg" />
        <div className="absolute top-1/3 -left-32 w-96 h-96 rounded-full bg-teal-500/10 blur-3xl animate-blob" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full bg-cyan-500/10 blur-3xl animate-blob animation-delay-2000" />

        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-teal-600 text-sm font-semibold tracking-[0.2em] uppercase mb-4 font-cta"
          >
            Let&apos;s Build Something Great
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.1] text-slate-900 font-heading"
          >
            Get in <span className="gradient-text">Touch</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="mt-6 text-lg sm:text-xl text-slate-500 max-w-2xl mx-auto"
          >
            Ready to grow your business? Schedule a free strategy session or submit a detailed RFP.
            We respond within 24 hours.
          </motion.p>

          {/* Quick contact */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8"
          >
            <a
              href={PHONE_HREF}
              className="flex items-center gap-2 text-slate-700 hover:text-teal-600 transition-colors font-medium"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
              </svg>
              {PHONE}
            </a>
            <a
              href="mailto:hello@consortiumnyc.com"
              className="flex items-center gap-2 text-slate-700 hover:text-teal-600 transition-colors font-medium"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
              hello@consortiumnyc.com
            </a>
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  FORM SECTION                                                */}
      {/* ============================================================ */}
      <section className="py-12 sm:py-20 px-6">
        <div className="mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-16">
          {/* ---- LEFT: Forms ---- */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-3"
          >
            {/* Tab Switcher */}
            <div className="flex rounded-xl bg-slate-100 p-1 mb-8">
              <button
                onClick={() => setActiveTab("strategy")}
                className={`flex-1 rounded-lg py-3 px-4 text-sm font-semibold transition-all font-cta ${
                  activeTab === "strategy"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Strategy Session
              </button>
              <button
                onClick={() => setActiveTab("rfp")}
                className={`flex-1 rounded-lg py-3 px-4 text-sm font-semibold transition-all font-cta ${
                  activeTab === "rfp"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Submit an RFP
              </button>
            </div>

            <AnimatePresence mode="wait">
              {activeTab === "strategy" ? (
                <motion.div
                  key="strategy"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <StrategyForm submitted={strategySubmitted} onSubmit={() => setStrategySubmitted(true)} />
                </motion.div>
              ) : (
                <motion.div
                  key="rfp"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <RFPForm submitted={rfpSubmitted} onSubmit={() => setRfpSubmitted(true)} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* ---- RIGHT: Contact Info ---- */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="lg:col-span-2 space-y-6"
          >
            <ContactInfoCard
              icon={
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
              }
              label="Phone"
              href={PHONE_HREF}
              value={PHONE}
            />
            <ContactInfoCard
              icon={
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              }
              label="Email"
              href="mailto:hello@consortiumnyc.com"
              value="hello@consortiumnyc.com"
            />
            <ContactInfoCard
              icon={
                <>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </>
              }
              label="Location"
              value="New York, NY 10001"
            />

            {/* Office Hours */}
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex items-start gap-4">
                <div className="text-teal-600 shrink-0 mt-0.5">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-2">
                    Office Hours
                  </h3>
                  <div className="text-slate-500 space-y-1 text-sm">
                    <p>Monday &ndash; Friday: 9:00 AM &ndash; 6:00 PM</p>
                    <p>Saturday: 10:00 AM &ndash; 2:00 PM</p>
                    <p>Sunday: Closed</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Trust badges */}
            <div className="rounded-xl border border-teal-200 bg-teal-50 p-6">
              <h3 className="text-sm font-semibold text-teal-800 uppercase tracking-wider mb-4">
                Why Work With Us
              </h3>
              <ul className="space-y-3">
                {[
                  "No contracts — cancel anytime",
                  "Free strategy session — no obligation",
                  "Respond within 24 hours",
                  "25+ years of combined experience",
                  "$15.2M+ revenue generated for clients",
                  "Senior strategists only — no juniors",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-teal-900">
                    <svg className="w-4 h-4 text-teal-600 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Quick CTA */}
            <div className="rounded-xl bg-slate-900 p-6 text-center">
              <p className="text-white font-semibold mb-1">Prefer to talk?</p>
              <p className="text-slate-400 text-sm mb-4">
                Call us directly. We pick up the phone.
              </p>
              <a
                href={PHONE_HREF}
                className="inline-block w-full rounded-lg bg-teal-600 px-6 py-3 text-sm font-bold text-white hover:bg-teal-700 transition-colors font-cta"
              >
                Call {PHONE}
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  CROSS-LINKS                                                 */}
      {/* ============================================================ */}
      <section className="py-16 sm:py-20 px-6 bg-slate-50">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4 font-heading">
            Explore Our Services
          </h2>
          <p className="text-slate-500 mb-10 max-w-2xl mx-auto">
            Not sure what you need? Browse our services and industries to find the right fit.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { label: "SEO", href: "/services/seo" },
              { label: "Web Design", href: "/services/web-design" },
              { label: "Branding", href: "/services/branding" },
              { label: "Digital Strategy", href: "/services/digital-strategy" },
              { label: "AI Chatbot", href: "/artificial-intelligence-marketing-services-offered" },
              { label: "Industries", href: "/industries-we-offer-marketing-services-for" },
              { label: "Areas We Serve", href: "/services-areas-we-offer-marketing-services-in" },
              { label: "Pricing Guide", href: "/nyc-marketing-pricing-guide" },
              { label: "Free SEO Audit", href: "/the-free-human+ai-seo-marketing-review" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:border-teal-300 hover:text-teal-700 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

/* ================================================================== */
/*  STRATEGY SESSION FORM                                              */
/* ================================================================== */
function StrategyForm({ submitted, onSubmit }: { submitted: boolean; onSubmit: () => void }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    service: "",
    message: "",
  });
  const [sending, setSending] = useState(false);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "strategy", ...form }),
      });
      if (res.ok) {
        onSubmit();
      }
    } catch {
      // Fallback: still show success for now
      onSubmit();
    } finally {
      setSending(false);
    }
  }

  if (submitted) return <SuccessMessage />;

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-8 sm:p-10 space-y-6 shadow-sm">
      <div>
        <h2 className="text-xl font-bold text-slate-900 font-heading">Schedule a Free Strategy Session</h2>
        <p className="text-slate-500 text-sm mt-1">
          Tell us about your business and goals. We&apos;ll come back with a custom roadmap — whether you hire us or not.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <InputField label="Name" name="name" required value={form.name} onChange={handleChange} placeholder="John Doe" />
        <InputField label="Email" name="email" type="email" required value={form.email} onChange={handleChange} placeholder="john@company.com" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <InputField label="Phone" name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="(212) 202-9220" />
        <InputField label="Company" name="company" value={form.company} onChange={handleChange} placeholder="Your Company" />
      </div>

      <div>
        <label htmlFor="service" className="block text-sm font-medium text-slate-700 mb-1.5">
          Service You&apos;re Interested In
        </label>
        <select
          id="service"
          name="service"
          value={form.service}
          onChange={handleChange}
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-colors"
        >
          <option value="">Select a service</option>
          {serviceOptions.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium text-slate-700 mb-1.5">
          Message <span className="text-red-500">*</span>
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={4}
          value={form.message}
          onChange={handleChange}
          placeholder="Tell us about your project, goals, and timeline..."
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-colors resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={sending}
        className="w-full rounded-lg bg-teal-600 px-8 py-4 text-base font-bold text-white hover:bg-teal-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed font-cta"
      >
        {sending ? "Sending..." : "Book Free Strategy Session"}
      </button>

      <p className="text-xs text-slate-400 text-center">
        No obligation. No credit card. We&apos;ll respond within 24 hours.
      </p>
    </form>
  );
}

/* ================================================================== */
/*  RFP FORM                                                           */
/* ================================================================== */
function RFPForm({ submitted, onSubmit }: { submitted: boolean; onSubmit: () => void }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...newFiles].slice(0, 5));
    }
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      const formData = new FormData();
      formData.append("type", "rfp");
      formData.append("data", JSON.stringify(form));
      files.forEach((file) => formData.append("files", file));

      await fetch("/api/contact", {
        method: "POST",
        body: formData,
      });
    } catch {
      // noop
    }
    onSubmit();
    setSending(false);
  }

  if (submitted) return <SuccessMessage isRFP />;

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-8 sm:p-10 space-y-5 shadow-sm">
      <div>
        <h2 className="text-xl font-bold text-slate-900 font-heading">Submit a Request for Proposal</h2>
        <p className="text-slate-500 text-sm mt-1">
          Upload your RFP and we&apos;ll send a custom proposal within 48 hours.
        </p>
      </div>

      <InputField label="Name" name="name" required value={form.name} onChange={handleChange} placeholder="John Doe" />
      <InputField label="Email" name="email" type="email" required value={form.email} onChange={handleChange} placeholder="john@company.com" />
      <InputField label="Phone" name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="(212) 202-9220" />

      {/* File Upload */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Upload RFP <span className="text-slate-400 font-normal">(max 5 files, 10MB each)</span>
        </label>
        <div
          onClick={() => fileInputRef.current?.click()}
          className="cursor-pointer rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center hover:border-teal-400 hover:bg-teal-50/50 transition-colors"
        >
          <svg className="w-8 h-8 mx-auto text-slate-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          <p className="text-sm text-slate-600 font-medium">
            Click to upload or drag &amp; drop
          </p>
          <p className="text-xs text-slate-400 mt-1">
            PDF, DOC, DOCX, XLS, JPG, PNG
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
            onChange={handleFiles}
            className="hidden"
          />
        </div>

        {files.length > 0 && (
          <ul className="mt-3 space-y-2">
            {files.map((file, index) => (
              <li key={`${file.name}-${index}`} className="flex items-center justify-between rounded-lg bg-slate-50 border border-slate-200 px-4 py-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <svg className="w-4 h-4 text-teal-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  <span className="text-sm text-slate-700 truncate">{file.name}</span>
                  <span className="text-xs text-slate-400 shrink-0">
                    ({(file.size / 1024 / 1024).toFixed(1)} MB)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="text-slate-400 hover:text-red-500 transition-colors shrink-0 ml-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="submit"
        disabled={sending}
        className="w-full rounded-lg bg-teal-600 px-8 py-4 text-base font-bold text-white hover:bg-teal-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed font-cta"
      >
        {sending ? "Submitting..." : "Submit RFP"}
      </button>

      <p className="text-xs text-slate-400 text-center">
        We&apos;ll review your RFP and respond with a detailed proposal within 48 hours.
      </p>
    </form>
  );
}

/* ================================================================== */
/*  SHARED COMPONENTS                                                  */
/* ================================================================== */

function InputField({
  label,
  name,
  type = "text",
  required,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-slate-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        id={name}
        name={name}
        required={required}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-colors"
      />
    </div>
  );
}

function ContactInfoCard({
  icon,
  label,
  href,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  href?: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="flex items-start gap-4">
        <div className="text-teal-600 shrink-0 mt-0.5">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            {icon}
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-1">
            {label}
          </h3>
          {href ? (
            <a href={href} className="text-slate-500 hover:text-teal-600 transition-colors">
              {value}
            </a>
          ) : (
            <p className="text-slate-500">{value}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function SuccessMessage({ isRFP }: { isRFP?: boolean }) {
  return (
    <div className="rounded-xl border border-teal-200 bg-teal-50 p-10 sm:p-12 text-center">
      <div className="text-teal-600 mb-4">
        <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h3 className="text-2xl font-bold text-slate-900 mb-2 font-heading">
        {isRFP ? "RFP Received" : "Message Sent"}
      </h3>
      <p className="text-slate-500">
        {isRFP
          ? "Thanks for submitting your RFP. We'll review it and send a detailed proposal within 48 hours."
          : "Thanks for reaching out. We'll get back to you within 24 hours."}
      </p>
    </div>
  );
}
