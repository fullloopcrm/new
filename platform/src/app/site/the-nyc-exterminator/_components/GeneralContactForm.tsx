// @ts-nocheck
"use client";

import { useState, useEffect, useRef } from "react";
import { track } from "@vercel/analytics";
import { track as localTrack, getSessionId } from "@/app/site/the-nyc-exterminator/_lib/tracker";

export default function GeneralContactForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );
  const openedRef = useRef(false);
  const submittedRef = useRef(false);
  const lastFieldRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!openedRef.current) {
      openedRef.current = true;
      localTrack.formOpen("general-inquiry");
    }
    const onFocus = (e: FocusEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "SELECT" || t.tagName === "TEXTAREA")) {
        lastFieldRef.current = (t as HTMLInputElement).name;
      }
    };
    const onBeforeUnload = () => {
      if (openedRef.current && !submittedRef.current) {
        localTrack.formAbandon("general-inquiry", lastFieldRef.current);
      }
    };
    document.addEventListener("focusin", onFocus);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("focusin", onFocus);
      window.removeEventListener("beforeunload", onBeforeUnload);
      if (openedRef.current && !submittedRef.current) {
        localTrack.formAbandon("general-inquiry", lastFieldRef.current);
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
      subject: (form.elements.namedItem("subject") as HTMLInputElement).value,
      message: (form.elements.namedItem("message") as HTMLTextAreaElement).value,
      formType: "general-inquiry",
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
          form: "general-inquiry",
          subject: data.subject || "none",
        });
        localTrack.formSuccess("general-inquiry", { subject: data.subject });
        form.reset();
      } else {
        setStatus("error");
        localTrack.formError("general-inquiry", { status: res.status });
      }
    } catch {
      setStatus("error");
      localTrack.formError("general-inquiry", { reason: "network" });
    }
  }

  if (status === "sent") {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-10 text-center">
        <div className="text-3xl">&#10003;</div>
        <h3 className="mt-2 text-lg font-semibold text-green-900">
          Message Sent
        </h3>
        <p className="mt-1 text-sm text-green-700">
          Thanks for reaching out. We&apos;ll get back to you shortly.
        </p>
        <button
          onClick={() => setStatus("idle")}
          className="mt-4 text-sm font-medium text-green-700 underline hover:text-green-900"
        >
          Send another message
        </button>
      </div>
    );
  }

  const inputClass =
    "mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-green-500 focus:ring-1 focus:ring-green-500";
  const labelClass = "block text-sm font-medium text-zinc-700";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="name" className={labelClass}>Name *</label>
          <input type="text" id="name" name="name" required className={inputClass} placeholder="Your name" />
        </div>
        <div>
          <label htmlFor="email" className={labelClass}>Email *</label>
          <input type="email" id="email" name="email" required className={inputClass} placeholder="you@email.com" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="phone" className={labelClass}>Phone</label>
          <input type="tel" id="phone" name="phone" className={inputClass} placeholder="(555) 555-5555" />
        </div>
        <div>
          <label htmlFor="subject" className={labelClass}>Subject *</label>
          <input type="text" id="subject" name="subject" required className={inputClass} placeholder="What's this about?" />
        </div>
      </div>

      <div>
        <label htmlFor="message" className={labelClass}>Message *</label>
        <textarea id="message" name="message" required rows={5} className={inputClass} placeholder="How can we help?" />
      </div>

      <button
        type="submit"
        disabled={status === "sending"}
        className="w-full rounded-lg bg-green-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-green-700 disabled:opacity-50"
      >
        {status === "sending" ? "Sending..." : "Send Message"}
      </button>

      {status === "error" && (
        <p className="text-center text-sm text-red-600">
          Something went wrong. Please try again or call us directly.
        </p>
      )}
    </form>
  );
}
