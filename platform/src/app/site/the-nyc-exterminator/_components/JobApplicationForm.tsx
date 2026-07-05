"use client";

import { useState, useEffect, useRef } from "react";
import { track } from "@vercel/analytics";
import { track as localTrack, getSessionId } from "@/app/site/the-nyc-exterminator/_lib/tracker";

interface JobApplicationFormProps {
  position?: string;
  neighborhood?: string;
}

export default function JobApplicationForm({
  position,
  neighborhood,
}: JobApplicationFormProps) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );
  const openedRef = useRef(false);
  const submittedRef = useRef(false);
  const lastFieldRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!openedRef.current) {
      openedRef.current = true;
      localTrack.formOpen("job-application");
    }
    const onFocus = (e: FocusEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "SELECT" || t.tagName === "TEXTAREA")) {
        lastFieldRef.current = (t as HTMLInputElement).name;
      }
    };
    const onBeforeUnload = () => {
      if (openedRef.current && !submittedRef.current) {
        localTrack.formAbandon("job-application", lastFieldRef.current);
      }
    };
    document.addEventListener("focusin", onFocus);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("focusin", onFocus);
      window.removeEventListener("beforeunload", onBeforeUnload);
      if (openedRef.current && !submittedRef.current) {
        localTrack.formAbandon("job-application", lastFieldRef.current);
      }
    };
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");

    const form = e.currentTarget;
    const data = {
      formType: "job-application",
      name: (form.elements.namedItem("name") as HTMLInputElement).value,
      email: (form.elements.namedItem("email") as HTMLInputElement).value,
      phone: (form.elements.namedItem("phone") as HTMLInputElement).value,
      position: (form.elements.namedItem("position") as HTMLSelectElement).value,
      experience: (form.elements.namedItem("experience") as HTMLSelectElement).value,
      license: (form.elements.namedItem("license") as HTMLSelectElement).value,
      availability: (form.elements.namedItem("availability") as HTMLSelectElement).value,
      location: (form.elements.namedItem("location") as HTMLInputElement).value,
      message: (form.elements.namedItem("message") as HTMLTextAreaElement).value,
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
          form: "job-application",
          position: data.position || "unspecified",
          neighborhood: neighborhood || data.location || "unspecified",
        });
        localTrack.formSuccess("job-application", {
          position: data.position,
          experience: data.experience,
          license: data.license,
        });
        form.reset();
      } else {
        setStatus("error");
        localTrack.formError("job-application", { status: res.status });
      }
    } catch {
      setStatus("error");
      localTrack.formError("job-application", { reason: "network" });
    }
  }

  if (status === "sent") {
    return (
      <div className="rounded-xl border border-green-800 bg-green-900/30 p-10 text-center">
        <div className="text-3xl">&#10003;</div>
        <h3 className="mt-2 text-lg font-semibold text-green-300">
          Application Received
        </h3>
        <p className="mt-1 text-sm text-green-400">
          Thank you for applying! Our hiring team will review your application
          and get back to you within 48 hours.
        </p>
        <button
          onClick={() => setStatus("idle")}
          className="mt-4 text-sm font-medium text-green-400 underline hover:text-green-300"
        >
          Submit another application
        </button>
      </div>
    );
  }

  const inputClass =
    "mt-1 block w-full rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2.5 text-sm text-white shadow-sm placeholder:text-zinc-500 focus:border-green-500 focus:ring-1 focus:ring-green-500";
  const selectClass =
    "mt-1 block w-full rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2.5 text-sm text-white shadow-sm focus:border-green-500 focus:ring-1 focus:ring-green-500";
  const labelClass = "block text-sm font-medium text-zinc-300";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="app-name" className={labelClass}>Full Name *</label>
          <input type="text" id="app-name" name="name" required className={inputClass} placeholder="Your full name" />
        </div>
        <div>
          <label htmlFor="app-phone" className={labelClass}>Phone *</label>
          <input type="tel" id="app-phone" name="phone" required className={inputClass} placeholder="(555) 555-5555" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="app-email" className={labelClass}>Email *</label>
          <input type="email" id="app-email" name="email" required className={inputClass} placeholder="you@email.com" />
        </div>
        <div>
          <label htmlFor="app-position" className={labelClass}>Position *</label>
          <select id="app-position" name="position" required className={selectClass} defaultValue={position || ""}>
            <option value="">Select position</option>
            <option value="Lead Exterminator">Lead Exterminator</option>
            <option value="Pest Control Technician">Pest Control Technician</option>
            <option value="Wildlife Control Specialist">Wildlife Control Specialist</option>
            <option value="Commercial Account Manager">Commercial Account Manager</option>
            <option value="Customer Service Representative">Customer Service Representative</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="app-experience" className={labelClass}>Pest Control Experience *</label>
          <select id="app-experience" name="experience" required className={selectClass}>
            <option value="">Select experience level</option>
            <option value="none">No experience — willing to learn</option>
            <option value="less-than-1">Less than 1 year</option>
            <option value="1-3">1–3 years</option>
            <option value="3-5">3–5 years</option>
            <option value="5+">5+ years</option>
          </select>
        </div>
        <div>
          <label htmlFor="app-license" className={labelClass}>Do you have a pest control license? *</label>
          <select id="app-license" name="license" required className={selectClass}>
            <option value="">Select</option>
            <option value="nys-dec-7a">Yes — NYS DEC Category 7A</option>
            <option value="nys-dec-other">Yes — other NYS DEC certification</option>
            <option value="other-state">Yes — licensed in another state</option>
            <option value="no-willing">No — but willing to get certified</option>
            <option value="no">No</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="app-availability" className={labelClass}>Availability *</label>
          <select id="app-availability" name="availability" required className={selectClass}>
            <option value="">Select</option>
            <option value="immediately">Can start immediately</option>
            <option value="1-week">Within 1 week</option>
            <option value="2-weeks">Within 2 weeks</option>
            <option value="1-month">Within 1 month</option>
          </select>
        </div>
        <div>
          <label htmlFor="app-location" className={labelClass}>Your Neighborhood / City *</label>
          <input type="text" id="app-location" name="location" required defaultValue={neighborhood || ""} className={inputClass} placeholder="e.g. Astoria, Jersey City" />
        </div>
      </div>

      <div>
        <label htmlFor="app-message" className={labelClass}>Tell us about yourself *</label>
        <textarea
          id="app-message"
          name="message"
          required
          rows={4}
          className={inputClass}
          placeholder="Your pest control experience, certifications, what kind of role you're looking for, and why you want to join The NYC Exterminator..."
        />
      </div>

      <button
        type="submit"
        disabled={status === "sending"}
        className="w-full rounded-lg bg-green-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-green-600/20 transition-all hover:bg-green-500 disabled:opacity-50"
      >
        {status === "sending" ? "Submitting..." : "Submit Application"}
      </button>

      <p className="text-center text-xs text-zinc-500">
        We respond to every application within 48 hours. No resume required — just tell us about yourself.
      </p>

      {status === "error" && (
        <p className="text-center text-sm text-red-400">
          Something went wrong. Please try again or text us directly.
        </p>
      )}
    </form>
  );
}
