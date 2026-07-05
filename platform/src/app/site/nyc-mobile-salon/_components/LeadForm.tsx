"use client";

import { useActionState, useState } from "react";
import { serviceOptions, boroughs } from "@/app/site/nyc-mobile-salon/_lib/constants";
import type { FormErrors } from "@/app/site/nyc-mobile-salon/_lib/validation";

type FormState = {
  success: boolean;
  errors: FormErrors;
  serverError: string;
};

const initialState: FormState = {
  success: false,
  errors: {},
  serverError: "",
};

async function submitLead(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const service = (formData.get("service") as string) || "";
  const date = (formData.get("date") as string) || "";
  const userMessage = (formData.get("message") as string) || "";

  // /api/contact is the tenant-aware lead endpoint (resolves the salon from
  // the host, writes to clients + portal_leads, admin-only notification).
  // Map borough→location and fold salon-specific fields into subject/message
  // so nothing is lost.
  const data = {
    name: formData.get("name") as string,
    email: formData.get("email") as string,
    phone: formData.get("phone") as string,
    location: (formData.get("borough") as string) || "",
    subject: service ? `Mobile salon booking — ${service}` : "Mobile salon booking",
    message: [date ? `Preferred date: ${date}` : "", userMessage]
      .filter(Boolean)
      .join("\n"),
  };

  try {
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const json = await res.json();

    if (!res.ok) {
      if (json.errors) {
        return { success: false, errors: json.errors, serverError: "" };
      }
      return {
        success: false,
        errors: {},
        serverError: json.error || "Something went wrong",
      };
    }

    return { success: true, errors: {}, serverError: "" };
  } catch {
    return {
      success: false,
      errors: {},
      serverError: "Network error. Please try again.",
    };
  }
}

export default function LeadForm({ id, variant = "light" }: { id?: string; variant?: "light" | "dark" }) {
  const [state, formAction, isPending] = useActionState(
    submitLead,
    initialState
  );
  const [submitted, setSubmitted] = useState(false);

  const isDark = variant === "dark";

  if (state.success && !submitted) {
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div id={id} className={`rounded-2xl p-8 text-center ${isDark ? "border border-white/10" : "border border-gray-100"}`}>
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-sage-light">
          <svg className="h-8 w-8 text-sage" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className={`mb-2 text-2xl font-semibold font-display ${isDark ? "text-white" : "text-charcoal"}`}>You&apos;re All Set</h3>
        <p className={isDark ? "text-gray-400" : "text-gray-500"}>
          We&apos;ll be in touch within 24 hours to confirm your appointment.
        </p>
      </div>
    );
  }

  const inputClass = isDark
    ? "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-gray-500 transition-all focus:border-sage focus:ring-1 focus:ring-sage focus:outline-none"
    : "w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-charcoal placeholder-gray-400 transition-all focus:border-sage focus:ring-1 focus:ring-sage focus:outline-none";

  const labelClass = isDark
    ? "mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400"
    : "mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500";

  return (
    <form id={id} action={formAction} className={`rounded-2xl p-6 sm:p-8 ${isDark ? "border border-white/10" : "border border-gray-100"}`}>
      <h3 className={`mb-1 text-center text-xl font-semibold font-display ${isDark ? "text-white" : "text-charcoal"}`}>
        Book Your Appointment
      </h3>
      <p className={`mb-6 text-center text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
        Fill in the details and we&apos;ll get back to you within 24 hours.
      </p>

      {state.serverError && (
        <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {state.serverError}
        </p>
      )}

      <div className="space-y-3">
        <div>
          <label htmlFor={`${id}-name`} className={labelClass}>Name</label>
          <input id={`${id}-name`} name="name" type="text" placeholder="Your name" className={inputClass} />
          {state.errors.name && <p className="mt-1 text-xs text-red-500">{state.errors.name}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor={`${id}-email`} className={labelClass}>Email</label>
            <input id={`${id}-email`} name="email" type="email" placeholder="you@email.com" className={inputClass} />
            {state.errors.email && <p className="mt-1 text-xs text-red-500">{state.errors.email}</p>}
          </div>
          <div>
            <label htmlFor={`${id}-phone`} className={labelClass}>Phone</label>
            <input id={`${id}-phone`} name="phone" type="tel" placeholder="(555) 123-4567" className={inputClass} />
            {state.errors.phone && <p className="mt-1 text-xs text-red-500">{state.errors.phone}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor={`${id}-service`} className={labelClass}>Service</label>
            <select id={`${id}-service`} name="service" defaultValue="" className={inputClass}>
              <option value="" disabled>Choose one</option>
              {serviceOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            {state.errors.service && <p className="mt-1 text-xs text-red-500">{state.errors.service}</p>}
          </div>
          <div>
            <label htmlFor={`${id}-borough`} className={labelClass}>Borough</label>
            <select id={`${id}-borough`} name="borough" defaultValue="" className={inputClass}>
              <option value="" disabled>Your borough</option>
              {boroughs.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
            {state.errors.borough && <p className="mt-1 text-xs text-red-500">{state.errors.borough}</p>}
          </div>
        </div>

        <div>
          <label htmlFor={`${id}-date`} className={labelClass}>Preferred Date</label>
          <input id={`${id}-date`} name="date" type="date" className={inputClass} />
          {state.errors.date && <p className="mt-1 text-xs text-red-500">{state.errors.date}</p>}
        </div>

        <div>
          <label htmlFor={`${id}-message`} className={labelClass}>
            Message <span className={isDark ? "text-gray-600" : "text-gray-300"}>(optional)</span>
          </label>
          <textarea
            id={`${id}-message`}
            name="message"
            rows={2}
            placeholder="Anything we should know?"
            className={inputClass}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className={`mt-5 w-full rounded-full py-3.5 text-sm font-semibold uppercase tracking-wide disabled:opacity-60 ${isDark ? "btn-sage" : "btn-primary text-white"}`}
      >
        {isPending ? "Sending..." : "Book My Appointment"}
      </button>
    </form>
  );
}
