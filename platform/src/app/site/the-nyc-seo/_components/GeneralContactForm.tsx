"use client";

import { useState } from "react";

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length < 4) return digits;
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export default function GeneralContactForm() {
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
      subject: "General Inquiry",
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
    "mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500";
  const labelClass = "block text-sm font-medium text-zinc-700";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
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

      <div>
        <label htmlFor="message" className={labelClass}>Message *</label>
        <textarea id="message" name="message" required rows={4} className={inputClass} placeholder="How can we help?" />
      </div>

      <button
        type="submit"
        disabled={status === "sending"}
        className="w-full rounded-lg bg-[#0080FE] px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#0070E0] disabled:opacity-50"
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
