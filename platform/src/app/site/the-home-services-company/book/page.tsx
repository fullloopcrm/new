"use client";

import { useState, useCallback } from "react";
import { PHONE, PHONE_HREF, EMAIL, HOURS } from "@/app/site/the-home-services-company/_data/content";
import { AddressAutocomplete } from "@/app/site/the-home-services-company/_components/AddressAutocomplete";

interface FieldErrors {
  name?: string;
  phone?: string;
  email?: string;
  serviceType?: string;
  propertyType?: string;
  address?: string;
  details?: string;
}

export default function BookPage() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [when, setWhen] = useState("");
  const [details, setDetails] = useState("");
  const [address, setAddress] = useState("");
  const [addressConfirmed, setAddressConfirmed] = useState(false);

  const handleAddressSelect = useCallback((details: { formatted: string }) => {
    setAddress(details.formatted);
    setAddressConfirmed(true);
  }, []);

  function validateForm(): FieldErrors {
    const errors: FieldErrors = {};
    if (!name.trim()) errors.name = "Please enter your name.";
    if (!phone.trim() || phone.replace(/\D/g, "").length < 10) errors.phone = "Please enter a valid phone number.";
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Please enter a valid email.";
    if (!serviceType) errors.serviceType = "Please select a service type.";
    if (!propertyType) errors.propertyType = "Please select a property type.";
    if (!address.trim()) errors.address = "Please enter the service address.";
    if (!details.trim()) errors.details = "Please describe the service you need.";
    return errors;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    // Show every missing/invalid field at once so the client knows exactly
    // what's blocking their request, instead of the browser's native
    // one-at-a-time validation bubble.
    const errors = validateForm();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setError("Please fix the highlighted fields below.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "booking",
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          service: serviceType,
          property_type: propertyType,
          address,
          when: when || undefined,
          details: details.trim(),
          source: typeof window !== "undefined" ? window.location.pathname : "",
        }),
      });
      const data = await res.json().catch(() => ({}));
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
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-16 sm:pt-44 sm:pb-24">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-200 font-cta">Starting at $99/hour &bull; Upfront Pricing &bull; Licensed and Insured</p>
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl font-heading">
            Book a <span className="gradient-text">Home Service</span> Today
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            Fill out the form below and we&apos;ll call you to confirm your appointment. Same-day available in most markets.
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
                  { step: "1", title: "Fill Out the Form", desc: "Tell us your name, number, and what service you need. Takes 60 seconds." },
                  { step: "2", title: "We Call You", desc: "Our scheduler calls to confirm pricing and book your appointment." },
                  { step: "3", title: "Technician Arrives", desc: "Our licensed technician arrives in the scheduled window and walks the job with you." },
                  { step: "4", title: "Upfront Estimate", desc: "Written estimate before work begins. The invoice matches the estimate at the end." },
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
                  <p className="text-sm font-bold uppercase tracking-widest text-teal-600 font-cta">Prefer to Call?</p>
                  <a href={PHONE_HREF} className="mt-1 block text-xl font-bold text-slate-900 hover:text-teal-700 transition-colors">{PHONE}</a>
                </div>
                <div>
                  <p className="text-sm font-bold uppercase tracking-widest text-teal-600 font-cta">Email</p>
                  <a href={`mailto:${EMAIL}`} className="mt-1 block text-base text-slate-700 hover:text-teal-700 transition-colors">{EMAIL}</a>
                </div>
                <div>
                  <p className="text-sm font-bold uppercase tracking-widest text-teal-600 font-cta">Hours</p>
                  <p className="mt-1 text-base text-slate-700">{HOURS} &bull; 7 Days a Week</p>
                </div>
              </div>
            </div>

            {/* Right — booking form */}
            <div>
              {submitted ? (
                <div className="rounded-xl bg-teal-50 border border-teal-200 p-10 text-center">
                  <p className="text-2xl font-bold text-teal-700 font-heading">Booking received!</p>
                  <p className="mt-3 text-base text-slate-600">Our team will call you shortly to confirm your pickup time and go over details.</p>
                  <p className="mt-6 text-sm text-slate-500">Need it faster? Call us directly at <a href={PHONE_HREF} className="text-teal-700 font-bold">{PHONE}</a></p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-6 shadow-md space-y-4">
                  <h2 className="text-xl font-bold text-slate-900 font-heading">Book a Home Service</h2>
                  <p className="text-sm text-slate-500">We&apos;ll call you to confirm. No payment required now.</p>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="Your name"
                      value={name}
                      onChange={(e) => { setName(e.target.value); setFieldErrors((prev) => ({ ...prev, name: undefined })); }}
                      className={`w-full rounded-lg border bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 ${fieldErrors.name ? "border-red-400 ring-1 ring-red-300" : "border-slate-300"}`}
                    />
                    {fieldErrors.name && <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Phone *</label>
                    <input
                      type="tel"
                      required
                      placeholder="(555) 555-5555"
                      value={phone}
                      onChange={(e) => { setPhone(e.target.value); setFieldErrors((prev) => ({ ...prev, phone: undefined })); }}
                      className={`w-full rounded-lg border bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 ${fieldErrors.phone ? "border-red-400 ring-1 ring-red-300" : "border-slate-300"}`}
                    />
                    {fieldErrors.phone && <p className="mt-1 text-xs text-red-600">{fieldErrors.phone}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Email *</label>
                    <input
                      type="email"
                      required
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setFieldErrors((prev) => ({ ...prev, email: undefined })); }}
                      className={`w-full rounded-lg border bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 ${fieldErrors.email ? "border-red-400 ring-1 ring-red-300" : "border-slate-300"}`}
                    />
                    {fieldErrors.email && <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Service Type *</label>
                    <select
                      required
                      value={serviceType}
                      onChange={(e) => { setServiceType(e.target.value); setFieldErrors((prev) => ({ ...prev, serviceType: undefined })); }}
                      className={`w-full rounded-lg border bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 appearance-none ${fieldErrors.serviceType ? "border-red-400 ring-1 ring-red-300" : "border-slate-300"}`}
                    >
                      <option value="">Select service type...</option>
                      <option value="hvac-services">HVAC Services</option>
                      <option value="plumbing">Plumbing</option>
                      <option value="electrical">Electrical</option>
                      <option value="painting">Painting</option>
                      <option value="flooring-installation">Flooring Installation</option>
                      <option value="house-cleaning">House Cleaning</option>
                      <option value="handyman-services">Handyman Services</option>
                      <option value="appliance-repair">Appliance Repair</option>
                      <option value="roofing">Roofing</option>
                      <option value="landscaping">Landscaping</option>
                      <option value="kitchen-remodeling">Kitchen Remodeling</option>
                      <option value="bathroom-remodeling">Bathroom Remodeling</option>
                      <option value="garage-door-repair">Garage Door Repair</option>
                      <option value="locksmith-services">Locksmith Services</option>
                      <option value="pest-control">Pest Control</option>
                      <option value="gutter-cleaning">Gutter Cleaning</option>
                      <option value="pressure-washing">Pressure Washing</option>
                      <option value="tree-services">Tree Services</option>
                      <option value="moving-services">Moving Services</option>
                      <option value="junk-removal">Junk Removal</option>
                      <option value="other">Other — describe below</option>
                    </select>
                    {fieldErrors.serviceType && <p className="mt-1 text-xs text-red-600">{fieldErrors.serviceType}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Property Type *</label>
                    <select
                      required
                      value={propertyType}
                      onChange={(e) => { setPropertyType(e.target.value); setFieldErrors((prev) => ({ ...prev, propertyType: undefined })); }}
                      className={`w-full rounded-lg border bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 appearance-none ${fieldErrors.propertyType ? "border-red-400 ring-1 ring-red-300" : "border-slate-300"}`}
                    >
                      <option value="">Select property type...</option>
                      <option value="house">House</option>
                      <option value="apartment">Apartment</option>
                      <option value="condo">Condo / Townhouse</option>
                      <option value="office">Office</option>
                      <option value="warehouse">Warehouse / Industrial</option>
                      <option value="retail">Retail / Commercial</option>
                      <option value="storage">Storage Unit</option>
                      <option value="other">Other</option>
                    </select>
                    {fieldErrors.propertyType && <p className="mt-1 text-xs text-red-600">{fieldErrors.propertyType}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Service Address *</label>
                    <AddressAutocomplete
                      value={address}
                      onChange={(v) => { setAddress(v); setFieldErrors((prev) => ({ ...prev, address: undefined })); }}
                      onSelect={handleAddressSelect}
                      placeholder="Start typing your address..."
                      className={`w-full rounded-lg border bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 ${fieldErrors.address ? "border-red-400 ring-1 ring-red-300" : "border-slate-300"}`}
                    />
                    {fieldErrors.address ? (
                      <p className="mt-1.5 text-xs text-red-600">{fieldErrors.address}</p>
                    ) : addressConfirmed ? (
                      <p className="mt-1.5 text-xs text-teal-600 font-medium">✓ Address confirmed</p>
                    ) : null}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">When Do You Need Service?</label>
                    <select
                      value={when}
                      onChange={(e) => setWhen(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 appearance-none"
                    >
                      <option value="">Select timing...</option>
                      <option value="today">Today (same-day)</option>
                      <option value="tomorrow">Tomorrow</option>
                      <option value="this-week">This Week</option>
                      <option value="next-week">Next Week</option>
                      <option value="flexible">Flexible / No Rush</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Describe the Service You Need *</label>
                    <textarea
                      required
                      rows={4}
                      placeholder="Tell us what's going on — the issue, the scope, and any access details (stairs, gated community, pets, etc.)..."
                      value={details}
                      onChange={(e) => { setDetails(e.target.value); setFieldErrors((prev) => ({ ...prev, details: undefined })); }}
                      className={`w-full rounded-lg border bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 ${fieldErrors.details ? "border-red-400 ring-1 ring-red-300" : "border-slate-300"}`}
                    />
                    {fieldErrors.details && <p className="mt-1 text-xs text-red-600">{fieldErrors.details}</p>}
                  </div>
                  {error && <p className="rounded-md bg-red-50 p-2 text-sm text-red-700">{error}</p>}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-lg bg-accent py-4 text-lg font-bold text-white transition-colors hover:bg-accent-dark disabled:opacity-60 font-cta"
                  >
                    {submitting ? "Sending…" : "Book Now — We'll Call You"}
                  </button>
                  <p className="text-center text-xs text-slate-400">Starting at $99/hour &bull; Upfront pricing &bull; Licensed and insured &bull; Same-day available</p>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
