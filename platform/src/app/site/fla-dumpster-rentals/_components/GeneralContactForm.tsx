"use client";

import { useState } from "react";

export default function GeneralContactForm() {
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
      subject: (form.elements.namedItem("subject") as HTMLInputElement).value,
      message: (form.elements.namedItem("message") as HTMLTextAreaElement).value,
      formType: "general-inquiry",
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
      <div className="rounded-xl border border-orange-800 bg-orange-900/30 p-10 text-center">
        <div className="text-3xl">&#10003;</div>
        <h3 className="mt-2 text-lg font-semibold text-orange-300">
          Message Sent
        </h3>
        <p className="mt-1 text-sm text-orange-400">
          Thanks for reaching out. We&apos;ll get back to you shortly.
        </p>
        <button
          onClick={() => setStatus("idle")}
          className="mt-4 text-sm font-medium text-orange-400 underline hover:text-orange-300"
        >
          Send another message
        </button>
      </div>
    );
  }

  const inputClass =
    "mt-1 block w-full rounded-lg border border-zinc-600 bg-zinc-700 px-3 py-2.5 text-sm text-white shadow-sm placeholder:text-zinc-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500";
  const labelClass = "block text-sm font-medium text-zinc-200";

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
        className="w-full rounded-lg bg-orange-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-orange-700 disabled:opacity-50"
      >
        {status === "sending" ? "Sending..." : "Send Message"}
      </button>

      {status === "error" && (
        <p className="text-center text-sm text-red-400">
          Something went wrong. Please try again or call us directly.
        </p>
      )}
    </form>
  );
}
