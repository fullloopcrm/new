"use client";

import { useState } from "react";

interface ContactFormProps {
  service?: string;
  neighborhood?: string;
  compact?: boolean;
  dark?: boolean;
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
      dumpsterSize: (form.elements.namedItem("dumpsterSize") as HTMLSelectElement).value,
      projectTimeline: (form.elements.namedItem("projectTimeline") as HTMLSelectElement).value,
      message: (form.elements.namedItem("message") as HTMLTextAreaElement).value,
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
            ? "border-orange-800 bg-orange-900/30 p-6"
            : "border-orange-200 bg-orange-50"
        } ${compact ? "p-6" : "p-10"}`}
      >
        <div className="text-3xl">&#10003;</div>
        <h3
          className={`mt-2 text-lg font-semibold ${dark ? "text-orange-300" : "text-orange-900"}`}
        >
          Quote Request Received
        </h3>
        <p className={`mt-1 text-sm ${dark ? "text-orange-400" : "text-orange-700"}`}>
          Thank you! We&apos;ll get back to you with pricing within the hour.
        </p>
        <button
          onClick={() => setStatus("idle")}
          className={`mt-4 text-sm font-medium underline ${
            dark
              ? "text-orange-400 hover:text-orange-300"
              : "text-orange-700 hover:text-orange-900"
          }`}
        >
          Submit another request
        </button>
      </div>
    );
  }

  const inputClass = dark
    ? "mt-1 block w-full rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2.5 text-sm text-white shadow-sm placeholder:text-zinc-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
    : "mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500";
  const selectClass = dark
    ? "mt-1 block w-full rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2.5 text-sm text-white shadow-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
    : "mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm text-zinc-900 shadow-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500";
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
            <input type="tel" id="phone" name="phone" required className={inputClass} placeholder="(555) 555-5555" />
          </div>
        </div>
        <div>
          <label htmlFor="email" className={labelClass}>Email *</label>
          <input type="email" id="email" name="email" required className={inputClass} placeholder="you@email.com" />
        </div>
        <input type="hidden" name="businessName" value="" />
        <input type="hidden" name="service" value={service || ""} />
        <input type="hidden" name="location" value={neighborhood || ""} />
        <div>
          <label htmlFor="dumpsterSize" className={labelClass}>Dumpster Size</label>
          <select id="dumpsterSize" name="dumpsterSize" className={selectClass}>
            <option value="">Not sure yet</option>
            <option value="10-yard">10 Yard</option>
            <option value="20-yard">20 Yard</option>
            <option value="30-yard">30 Yard</option>
          </select>
        </div>
        <input type="hidden" name="projectTimeline" value="" />
        <div>
          <label htmlFor="message" className={labelClass}>Project details *</label>
          <textarea id="message" name="message" required rows={3} className={inputClass} placeholder="Tell us about your project..." />
        </div>
        <button type="submit" disabled={status === "sending"} className="w-full rounded-lg bg-orange-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-orange-700 disabled:opacity-50">
          {status === "sending" ? "Sending..." : "Get a Free Quote"}
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
          <label htmlFor="businessName" className={labelClass}>Company Name</label>
          <input type="text" id="businessName" name="businessName" className={inputClass} placeholder="Your company (if applicable)" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="email" className={labelClass}>Email *</label>
          <input type="email" id="email" name="email" required className={inputClass} placeholder="you@email.com" />
        </div>
        <div>
          <label htmlFor="phone" className={labelClass}>Phone *</label>
          <input type="tel" id="phone" name="phone" required className={inputClass} placeholder="(555) 555-5555" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="service" className={labelClass}>What&apos;s the dumpster for? *</label>
          <input type="text" id="service" name="service" required defaultValue={service || ""} className={inputClass} placeholder="e.g. Renovation, Junk Removal, Roofing" />
        </div>
        <div>
          <label htmlFor="location" className={labelClass}>Delivery location *</label>
          <input type="text" id="location" name="location" required defaultValue={neighborhood || ""} className={inputClass} placeholder="e.g. Miami, Fort Lauderdale" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="dumpsterSize" className={labelClass}>Dumpster Size *</label>
          <select id="dumpsterSize" name="dumpsterSize" required className={selectClass}>
            <option value="">Select size</option>
            <option value="10-yard">10 Yard Dumpster</option>
            <option value="20-yard">20 Yard Dumpster</option>
            <option value="30-yard">30 Yard Dumpster</option>
            <option value="not-sure">Not sure - need help choosing</option>
          </select>
        </div>
        <div>
          <label htmlFor="projectTimeline" className={labelClass}>When do you need it? *</label>
          <select id="projectTimeline" name="projectTimeline" required className={selectClass}>
            <option value="">Select one</option>
            <option value="today">Today</option>
            <option value="tomorrow">Tomorrow</option>
            <option value="this-week">This week</option>
            <option value="next-week">Next week</option>
            <option value="planning">Just planning ahead</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="message" className={labelClass}>Project details *</label>
        <textarea id="message" name="message" required rows={4} className={inputClass} placeholder="Tell us about your project - what type of debris, how long you need the dumpster, any access restrictions, etc." />
      </div>

      <button
        type="submit"
        disabled={status === "sending"}
        className="w-full rounded-lg bg-orange-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-orange-700 disabled:opacity-50"
      >
        {status === "sending" ? "Submitting..." : "Get a Free Quote"}
      </button>

      <p className={`text-center text-xs ${dark ? "text-zinc-500" : "text-zinc-500"}`}>
        No commitment required. We&apos;ll get back to you with pricing within the hour.
      </p>

      {status === "error" && (
        <p className={`text-center text-sm ${dark ? "text-red-400" : "text-red-600"}`}>
          Something went wrong. Please try again or call us directly.
        </p>
      )}
    </form>
  );
}
