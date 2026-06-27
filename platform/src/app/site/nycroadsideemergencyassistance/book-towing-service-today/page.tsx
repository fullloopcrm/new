// @ts-nocheck
"use client";

import { useState, useCallback } from "react";
import { PHONE, PHONE_HREF, EMAIL, HOURS } from "@/app/site/nycroadsideemergencyassistance/_data/content";
import { AddressAutocomplete } from "@/app/site/nycroadsideemergencyassistance/_components/AddressAutocomplete";
import { JsonLd, breadcrumbSchema } from "@/app/site/nycroadsideemergencyassistance/_lib/schema";

export default function BookPage() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [address, setAddress] = useState("");
  const [addressConfirmed, setAddressConfirmed] = useState(false);

  const handleAddressSelect = useCallback((details: { formatted: string }) => {
    setAddress(details.formatted);
    setAddressConfirmed(true);
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const serviceType = String(fd.get("serviceType") || "");
    const vehicle = String(fd.get("vehicle") || "");
    const narrative = String(fd.get("narrative") || "");
    const payload = {
      type: "booking" as const,
      name: String(fd.get("name") || ""),
      phone: String(fd.get("phone") || ""),
      email: String(fd.get("email") || ""),
      when: String(fd.get("when") || ""),
      message: [
        serviceType && `Service: ${serviceType}`,
        vehicle && `Vehicle: ${vehicle}`,
        address && `Location: ${address}`,
        narrative && `Details: ${narrative}`,
      ].filter(Boolean).join(" | "),
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
      setError(`${msg}. Please call ${PHONE} instead.`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <JsonLd
        schema={breadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Book a Tow", url: "/book-towing-service-today" },
        ])}
      />
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-700/85 via-teal-600/80 to-teal-800/90" />
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 inline-block rounded-full bg-yellow-400/20 px-4 py-1 text-sm font-bold uppercase tracking-widest text-yellow-200 font-cta ring-1 ring-yellow-300/40">$25 Off Online &bull; First Hour $124 &bull; Fastest Dispatch</p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            <span className="gradient-text">Book Online And Save $25</span> — Fastest Way To Get A Truck Rolling
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            Form takes 60 seconds and lands directly on the dispatcher&apos;s screen — no hold time. Your first hour is <span className="text-yellow-200 font-bold">$124</span> instead of the standard $149. Same trucks, same drivers, same 20–40 minute arrival. Need it right this second? Call <a href={PHONE_HREF} className="text-white underline">{PHONE}</a> at the standard $149/hr rate.
          </p>
        </div>
      </section>

      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
            {/* Left — info */}
            <div>
              <h2 className="text-center text-2xl font-bold text-slate-900 font-heading">How It Works</h2>
              <div className="mt-6 space-y-6">
                {[
                  { step: "1", title: "Submit Online — Save $25", desc: "Form lands on dispatch's screen instantly. Your first hour is $124 instead of $149 — that's the online-booking discount baked in. Phone is the same rate without the $25 off." },
                  { step: "2", title: "$149/hr — 1-Hour Minimum, No Hidden Costs", desc: "One rate for every service: tow, roadside, recovery. 1-hour minimum, half-hour increments after. No NYC surcharge, no after-hours markup, no storage fees on same-day drops." },
                  { step: "3", title: "Driver Arrives In 20–40 Min", desc: "Driver confirms vehicle condition, takes timestamped photos, and walks through the procedure before touching anything. Same trucks online or by phone." },
                  { step: "4", title: "Done & Receipt", desc: "Paid at completion by card, Apple Pay, Google Pay, or cash. Receipt emailed immediately. Insurance billing direct for accident tows." },
                ].map((item) => (
                  <div key={item.step} className="flex gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-600 text-base font-bold text-white">{item.step}</div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 font-heading">{item.title}</h3>
                      <p className="mt-1 text-sm text-slate-600">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-10 space-y-4">
                <div>
                  <p className="text-sm font-bold uppercase tracking-widest text-teal-600 font-cta">Standard Phone Rate — $149/hr</p>
                  <a href={PHONE_HREF} className="mt-1 block text-xl font-bold text-slate-900 hover:text-teal-700 transition-colors">{PHONE}</a>
                  <p className="mt-1 text-xs text-slate-500">Online booking saves $25 on the first hour.</p>
                </div>
                <div>
                  <p className="text-sm font-bold uppercase tracking-widest text-teal-600 font-cta">Email</p>
                  <a href={`mailto:${EMAIL}`} className="mt-1 block text-base text-slate-700 hover:text-teal-700 transition-colors">{EMAIL}</a>
                </div>
                <div>
                  <p className="text-sm font-bold uppercase tracking-widest text-teal-600 font-cta">Hours</p>
                  <p className="mt-1 text-base text-slate-700">{HOURS}</p>
                </div>
              </div>
            </div>

            {/* Right — booking form */}
            <div>
              {submitted ? (
                <div className="rounded-xl bg-teal-50 border border-teal-200 p-10 text-center">
                  <p className="text-2xl font-bold text-teal-700 font-heading">Request received — your $25 discount is locked in.</p>
                  <p className="mt-3 text-base text-slate-600">First hour will bill at $124 instead of $149. Dispatch will call you shortly to confirm the estimated hours, truck ETA, and dispatch the nearest available driver.</p>
                  <p className="mt-6 text-sm text-slate-500">Immediate breakdown? Call directly at <a href={PHONE_HREF} className="text-teal-700 font-bold">{PHONE}</a></p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-6 shadow-md space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-xl font-bold text-slate-900 font-heading">Service Request</h2>
                    <span className="rounded-full bg-yellow-400 px-3 py-1 text-xs font-bold text-slate-900 font-cta">$25 OFF</span>
                  </div>
                  <p className="text-sm text-slate-600">Online booking — first hour <span className="font-bold text-teal-700">$124</span> instead of $149. Dispatch will call you to confirm. For immediate service at the standard $149/hr rate, call <a href={PHONE_HREF} className="text-teal-700 font-bold">{PHONE}</a>.</p>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name *</label>
                    <input type="text" name="name" required placeholder="Your name" className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Phone *</label>
                    <input type="tel" name="phone" required placeholder="(555) 555-5555" className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Email *</label>
                    <input type="email" name="email" required placeholder="you@example.com" className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Service Type *</label>
                    <select name="serviceType" required className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 appearance-none">
                      <option value="">Select service type...</option>
                      <option value="light-duty-tow">Light-Duty Tow (Car/Sedan/Compact SUV)</option>
                      <option value="flatbed-tow">Flatbed Tow (AWD / EV / Luxury / Motorcycle)</option>
                      <option value="heavy-duty-tow">Heavy-Duty Tow (Truck/Van/Commercial)</option>
                      <option value="jump-start">Jump Start / Dead Battery</option>
                      <option value="flat-tire">Flat Tire Change</option>
                      <option value="lockout">Lockout — Keys Locked In</option>
                      <option value="gas-delivery">Gas Delivery</option>
                      <option value="winch-out">Winch-Out — Stuck</option>
                      <option value="accident">Accident / Collision Tow</option>
                      <option value="impound">Impound / Pound Recovery</option>
                      <option value="junk-car">Junk Car Removal</option>
                      <option value="fleet">Fleet / Commercial Account</option>
                      <option value="other">Other / Not Sure</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Vehicle Year / Make / Model *</label>
                    <input type="text" name="vehicle" required placeholder="e.g. 2019 Toyota RAV4" className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Current Location / Cross-Streets *</label>
                    <AddressAutocomplete
                      value={address}
                      onChange={setAddress}
                      onSelect={handleAddressSelect}
                      placeholder="Street address or cross-streets..."
                      className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                    {addressConfirmed && (
                      <p className="mt-1.5 text-xs text-teal-600 font-medium">
                        ✓ Location confirmed
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">When</label>
                    <select name="when" className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 appearance-none">
                      <option value="">Select timing...</option>
                      <option value="now">Right now — immediate</option>
                      <option value="today">Today — within a few hours</option>
                      <option value="tomorrow">Tomorrow</option>
                      <option value="scheduled">Scheduled in advance</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Describe What's Happening *</label>
                    <textarea name="narrative" required rows={4} placeholder="What's wrong with the vehicle, where it needs to go, and anything unusual (in a garage, on a bridge, hit by another car, etc.)" className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500" />
                  </div>
                  {error && (
                    <p className="rounded-md bg-red-50 p-2 text-sm text-red-700">{error}</p>
                  )}
                  <button type="submit" disabled={submitting} className="w-full rounded-lg bg-accent py-4 text-lg font-bold text-white transition-colors hover:bg-accent-dark disabled:opacity-60 font-cta">
                    {submitting ? "Sending..." : "Book Now — Save $25 ($124 First Hour)"}
                  </button>
                  <p className="text-center text-xs text-slate-400">24/7 dispatch &bull; $149/hr, 1-hr minimum &bull; $25 off online &bull; NYC DCWP licensed &bull; Fully insured</p>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}