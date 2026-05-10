// @ts-nocheck
"use client";

import { useState } from "react";

interface ContactFormProps {
  service?: string;
  neighborhood?: string;
  compact?: boolean;
  dark?: boolean;
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length < 4) return digits;
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export default function ContactForm({
  service,
  neighborhood,
  compact = false,
  dark = false,
}: ContactFormProps) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );
  const [phone, setPhone] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");

    const form = e.currentTarget;
    const data = {
      name: (form.elements.namedItem("name") as HTMLInputElement).value,
      email: (form.elements.namedItem("email") as HTMLInputElement).value,
      phone: (form.elements.namedItem("phone") as HTMLInputElement).value,
      businessName: (form.elements.namedItem("businessName") as HTMLInputElement).value,
      service: (form.elements.namedItem("service") as HTMLInputElement).value,
      location: (form.elements.namedItem("location") as HTMLInputElement).value,
      website: (form.elements.namedItem("website") as HTMLInputElement).value,
      monthlyBudget: (form.elements.namedItem("monthlyBudget") as HTMLSelectElement).value,
      currentMarketing: (form.elements.namedItem("currentMarketing") as HTMLSelectElement).value,
      timeline: (form.elements.namedItem("timeline") as HTMLSelectElement).value,
      message: (form.elements.namedItem("message") as HTMLTextAreaElement).value,
      additionalServices: Array.from(form.querySelectorAll<HTMLInputElement>('input[name="additionalServices"]:checked')).map((el) => el.value),
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        setStatus("sent");
        form.reset();
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div
        className={`rounded-xl border text-center ${
          dark
            ? "border-green-800 bg-green-900/30 p-6"
            : "border-green-200 bg-green-50"
        } ${compact ? "p-6" : "p-10"}`}
      >
        <div className="text-3xl">&#10003;</div>
        <h3
          className={`mt-2 text-lg font-semibold ${dark ? "text-green-300" : "text-green-900"}`}
        >
          Request Received
        </h3>
        <p className={`mt-1 text-sm ${dark ? "text-green-400" : "text-green-700"}`}>
          Thank you for reaching out. We&apos;ll review everything and get
          back to you within 24 hours.
        </p>
        <button
          onClick={() => setStatus("idle")}
          className={`mt-4 text-sm font-medium underline ${
            dark
              ? "text-green-400 hover:text-green-300"
              : "text-green-700 hover:text-green-900"
          }`}
        >
          Submit another
        </button>
      </div>
    );
  }

  const inputClass = dark
    ? "mt-1 block w-full rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2.5 text-sm text-white shadow-sm placeholder:text-zinc-500 focus:border-[#0080FE] focus:ring-1 focus:ring-[#0080FE]"
    : "mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500";
  const selectClass = dark
    ? "mt-1 block w-full rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2.5 text-sm text-white shadow-sm focus:border-[#0080FE] focus:ring-1 focus:ring-[#0080FE]"
    : "mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm text-zinc-900 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500";
  const labelClass = dark
    ? "block text-sm font-medium text-zinc-300"
    : "block text-sm font-medium text-zinc-700";

  if (compact) {
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className={labelClass}>Name *</label>
            <input type="text" id="name" name="name" required className={inputClass} placeholder="Your name" />
          </div>
          <div>
            <label htmlFor="phone" className={labelClass}>Phone *</label>
            <input type="tel" id="phone" name="phone" required value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} className={inputClass} placeholder="(555) 555-5555" />
          </div>
        </div>
        <div>
          <label htmlFor="email" className={labelClass}>Email *</label>
          <input type="email" id="email" name="email" required className={inputClass} placeholder="you@email.com" />
        </div>
        <input type="hidden" name="businessName" value="" />
        <input type="hidden" name="service" value={service || ""} />
        <input type="hidden" name="location" value={neighborhood || ""} />
        <input type="hidden" name="website" value="" />
        <input type="hidden" name="monthlyBudget" value="" />
        <input type="hidden" name="currentMarketing" value="" />
        <input type="hidden" name="timeline" value="" />
        <div>
          <label htmlFor="message" className={labelClass}>What do you need help with? *</label>
          <textarea id="message" name="message" required rows={3} className={inputClass} placeholder="Tell us about your business and what you're looking for..." />
        </div>
        <button type="submit" disabled={status === "sending"} className="w-full rounded-lg bg-[#0080FE] px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#0070E0] disabled:opacity-50">
          {status === "sending" ? "Sending..." : "Request a Partnership"}
        </button>
        {status === "error" && (
          <p className={`text-center text-sm ${dark ? "text-red-400" : "text-red-600"}`}>Something went wrong. Please try again or call us directly.</p>
        )}
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="name" className={labelClass}>Your Name *</label>
          <input type="text" id="name" name="name" required className={inputClass} placeholder="Full name" />
        </div>
        <div>
          <label htmlFor="phone" className={labelClass}>Phone *</label>
          <input type="tel" id="phone" name="phone" required value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} className={inputClass} placeholder="(555) 555-5555" />
        </div>
      </div>

      <div>
        <label htmlFor="email" className={labelClass}>Email *</label>
        <input type="email" id="email" name="email" required className={inputClass} placeholder="you@email.com" />
      </div>

      <input type="hidden" name="businessName" value="" />
      <input type="hidden" name="service" value={service || ""} />
      <input type="hidden" name="location" value={neighborhood || ""} />
      <input type="hidden" name="website" value="" />
      <input type="hidden" name="currentMarketing" value="" />
      <input type="hidden" name="timeline" value="" />

      <div>
        <label htmlFor="monthlyBudget" className={labelClass}>Monthly budget *</label>
        <select id="monthlyBudget" name="monthlyBudget" required defaultValue="" className={selectClass}>
          <option value="" disabled>Select a range</option>
          <option value="under-1000">Under $1,000</option>
          <option value="1000-2500">$1,000 - $2,500</option>
          <option value="2500-5000">$2,500 - $5,000</option>
          <option value="5000-10000">$5,000 - $10,000</option>
          <option value="10000+">$10,000+</option>
        </select>
      </div>

      <div>
        <label className={labelClass}>Services you need *</label>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {[
            "SEO",
            "Web Design",
            "Google Ads",
            "Social Media",
            "Branding",
            "Automation & AI",
            "Content",
            "Full Marketing Manager",
          ].map((svc) => (
            <label
              key={svc}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm cursor-pointer ${
                dark
                  ? "border-zinc-700 text-zinc-300 hover:border-[#0080FE] hover:bg-zinc-800 has-[:checked]:border-[#0080FE] has-[:checked]:bg-zinc-800"
                  : "border-zinc-200 text-zinc-700 hover:border-blue-300 hover:bg-blue-50 has-[:checked]:border-[#0080FE] has-[:checked]:bg-blue-50"
              }`}
            >
              <input type="checkbox" name="additionalServices" value={svc} className="h-4 w-4 rounded border-zinc-300 text-[#0080FE] focus:ring-[#0080FE]" />
              {svc}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="message" className={labelClass}>What do you need help with? *</label>
        <textarea id="message" name="message" required rows={4} className={inputClass} placeholder="Tell us about your business and what you're looking for." />
      </div>

      <button
        type="submit"
        disabled={status === "sending"}
        className="w-full rounded-lg bg-[#0080FE] px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#0070E0] disabled:opacity-50"
      >
        {status === "sending" ? "Submitting..." : "Request a Partnership"}
      </button>

      {status === "error" && (
        <p className={`text-center text-sm ${dark ? "text-red-400" : "text-red-600"}`}>
          Something went wrong. Please try again or call us directly.
        </p>
      )}
    </form>
  );
}
