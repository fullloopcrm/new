// @ts-nocheck
"use client";

import { useState, useCallback } from "react";
import { PHONE, PHONE_HREF, EMAIL, HOURS } from "@/app/site//_data/content";
import { AddressAutocomplete } from "@/app/site/the-home-services-company/_components/AddressAutocomplete";

export default function BookPage() {
  const [submitted, setSubmitted] = useState(false);
  const [address, setAddress] = useState("");
  const [addressConfirmed, setAddressConfirmed] = useState(false);

  const handleAddressSelect = useCallback((details: { formatted: string }) => {
    setAddress(details.formatted);
    setAddressConfirmed(true);
  }, []);

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
                <form onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }} className="rounded-xl border border-slate-200 bg-white p-6 shadow-md space-y-4">
                  <h2 className="text-xl font-bold text-slate-900 font-heading">Book a Home Service</h2>
                  <p className="text-sm text-slate-500">We&apos;ll call you to confirm. No payment required now.</p>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name *</label>
                    <input type="text" required placeholder="Your name" className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Phone *</label>
                    <input type="tel" required placeholder="(555) 555-5555" className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Email *</label>
                    <input type="email" required placeholder="you@example.com" className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Service Type *</label>
                    <select required className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 appearance-none">
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
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Property Type *</label>
                    <select required className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 appearance-none">
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
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Service Address *</label>
                    <AddressAutocomplete
                      value={address}
                      onChange={setAddress}
                      onSelect={handleAddressSelect}
                      placeholder="Start typing your address..."
                      className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                    {addressConfirmed && (
                      <p className="mt-1.5 text-xs text-teal-600 font-medium">
                        ✓ Address confirmed
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">When Do You Need Service?</label>
                    <select className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 appearance-none">
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
                    <textarea required rows={4} placeholder="Tell us what's going on — the issue, the scope, and any access details (stairs, gated community, pets, etc.)..." className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500" />
                  </div>
                  <button type="submit" className="w-full rounded-lg bg-accent py-4 text-lg font-bold text-white transition-colors hover:bg-accent-dark font-cta">
                    Book Now — We&apos;ll Call You
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
