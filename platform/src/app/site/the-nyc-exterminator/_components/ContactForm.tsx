"use client";

import { useState, useEffect, useRef } from "react";
import { track } from "@vercel/analytics";
import { track as localTrack, getSessionId } from "@/app/site/the-nyc-exterminator/_lib/tracker";

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
  const openedRef = useRef(false);
  const submittedRef = useRef(false);
  const lastFieldRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!openedRef.current) {
      openedRef.current = true;
      localTrack.formOpen("service-quote");
    }
    const onFocus = (e: FocusEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "SELECT" || t.tagName === "TEXTAREA")) {
        lastFieldRef.current = (t as HTMLInputElement).name;
      }
    };
    const onBeforeUnload = () => {
      if (openedRef.current && !submittedRef.current) {
        localTrack.formAbandon("service-quote", lastFieldRef.current);
      }
    };
    document.addEventListener("focusin", onFocus);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("focusin", onFocus);
      window.removeEventListener("beforeunload", onBeforeUnload);
      if (openedRef.current && !submittedRef.current) {
        localTrack.formAbandon("service-quote", lastFieldRef.current);
      }
    };
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");

    const form = e.currentTarget;
    const data = {
      name: (form.elements.namedItem("name") as HTMLInputElement).value,
      email: (form.elements.namedItem("email") as HTMLInputElement).value,
      phone: (form.elements.namedItem("phone") as HTMLInputElement).value,
      address: (form.elements.namedItem("address") as HTMLInputElement).value,
      pestType: (form.elements.namedItem("pestType") as HTMLInputElement).value,
      propertyType: (form.elements.namedItem("propertyType") as HTMLSelectElement).value,
      location: (form.elements.namedItem("location") as HTMLInputElement).value,
      urgency: (form.elements.namedItem("urgency") as HTMLSelectElement).value,
      message: (form.elements.namedItem("message") as HTMLTextAreaElement).value,
      // Online form submission = self-book online → eligible for the $10 self-book discount
      selfBook: true,
      session_id: getSessionId(),
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        setStatus("sent");
        submittedRef.current = true;
        track("lead_submitted", {
          form: "service-quote",
          service: service || data.pestType || "general",
          neighborhood: neighborhood || data.location || "unspecified",
          urgency: data.urgency || "unspecified",
        });
        localTrack.formSuccess("service-quote", {
          pestType: data.pestType,
          propertyType: data.propertyType,
          urgency: data.urgency,
        });
        form.reset();
      } else {
        setStatus("error");
        localTrack.formError("service-quote", { status: res.status });
      }
    } catch {
      setStatus("error");
      localTrack.formError("service-quote", { reason: "network" });
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
          Quote Request Received
        </h3>
        <p className={`mt-1 text-sm ${dark ? "text-green-400" : "text-green-700"}`}>
          Thank you! We&apos;ll review your request and get back to you within
          2 hours during business hours.
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
    ? "mt-1 block w-full rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2.5 text-sm text-white shadow-sm placeholder:text-zinc-500 focus:border-green-500 focus:ring-1 focus:ring-green-500"
    : "mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-green-500 focus:ring-1 focus:ring-green-500";
  const selectClass = dark
    ? "mt-1 block w-full rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2.5 text-sm text-white shadow-sm focus:border-green-500 focus:ring-1 focus:ring-green-500"
    : "mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm text-zinc-900 shadow-sm focus:border-green-500 focus:ring-1 focus:ring-green-500";
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
        <div>
          <label htmlFor="address" className={labelClass}>Service address *</label>
          <input type="text" id="address" name="address" required autoComplete="street-address" className={inputClass} placeholder="Street address, unit, city, ZIP" />
        </div>
        <input type="hidden" name="pestType" value={service || ""} />
        <input type="hidden" name="propertyType" value="" />
        <input type="hidden" name="location" value={neighborhood || ""} />
        <input type="hidden" name="urgency" value="" />
        <div>
          <label htmlFor="message" className={labelClass}>Describe your pest problem *</label>
          <textarea id="message" name="message" required rows={3} className={inputClass} placeholder="What pests are you seeing? Where in the property?" />
        </div>
        <button type="submit" disabled={status === "sending"} className="w-full rounded-lg bg-green-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-green-700 disabled:opacity-50">
          {status === "sending" ? "Sending..." : "Book Online — Save $10"}
        </button>
        <p className="text-center text-xs text-green-500">Booking online saves you $10 — we take it off your quote.</p>
        {status === "error" && (
          <p className={`text-center text-sm ${dark ? "text-red-400" : "text-red-600"}`}>Something went wrong. Please try again or text us at 212-202-8545.</p>
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
          <input type="tel" id="phone" name="phone" required className={inputClass} placeholder="(555) 555-5555" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="email" className={labelClass}>Email *</label>
          <input type="email" id="email" name="email" required className={inputClass} placeholder="you@email.com" />
        </div>
        <div>
          <label htmlFor="pestType" className={labelClass}>What pest are you dealing with? *</label>
          <input type="text" id="pestType" name="pestType" required defaultValue={service || ""} className={inputClass} placeholder="e.g. Cockroaches, Bed Bugs, Rats" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="propertyType" className={labelClass}>Property type *</label>
          <select id="propertyType" name="propertyType" required className={selectClass}>
            <option value="">Select type</option>
            <option value="apartment">Apartment</option>
            <option value="house">House / Townhouse</option>
            <option value="condo">Condo / Co-op</option>
            <option value="commercial">Commercial / Office</option>
            <option value="restaurant">Restaurant / Food Service</option>
            <option value="retail">Retail Store</option>
            <option value="warehouse">Warehouse / Storage</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label htmlFor="location" className={labelClass}>Neighborhood / Borough *</label>
          <input type="text" id="location" name="location" required defaultValue={neighborhood || ""} className={inputClass} placeholder="e.g. Brooklyn Heights, Jersey City" />
        </div>
      </div>

      <div>
        <label htmlFor="address" className={labelClass}>Full service address *</label>
        <input type="text" id="address" name="address" required autoComplete="street-address" className={inputClass} placeholder="Street address, apt/unit, city, ZIP" />
      </div>

      <div>
        <label htmlFor="urgency" className={labelClass}>How urgent is this? *</label>
        <select id="urgency" name="urgency" required className={selectClass}>
          <option value="">Select urgency</option>
          <option value="emergency">Emergency — need same-day service</option>
          <option value="asap">ASAP — within a few days</option>
          <option value="this-week">This week</option>
          <option value="planning">Planning ahead / prevention</option>
        </select>
      </div>

      <div>
        <label htmlFor="message" className={labelClass}>Tell us about the problem *</label>
        <textarea id="message" name="message" required rows={4} className={inputClass} placeholder="Where are you seeing pests? How long has this been going on? Any other details that would help us prepare..." />
      </div>

      <button
        type="submit"
        disabled={status === "sending"}
        className="w-full rounded-lg bg-green-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-green-700 disabled:opacity-50"
      >
        {status === "sending" ? "Submitting..." : "Book Online — Save $10"}
      </button>

      <p className="text-center text-xs font-medium text-green-500">
        Booking online saves you $10 — we take it off your quote.
      </p>
      <p className={`text-center text-xs ${dark ? "text-zinc-500" : "text-zinc-500"}`}>
        Free inspections. Upfront pricing. No obligation.
        We&apos;ll respond within 2 hours during business hours.
      </p>

      {status === "error" && (
        <p className={`text-center text-sm ${dark ? "text-red-400" : "text-red-600"}`}>
          Something went wrong. Please try again or text us at 212-202-8545.
        </p>
      )}
    </form>
  );
}
