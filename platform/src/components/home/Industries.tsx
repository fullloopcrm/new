"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const industries: { name: string; slug: string; desc: string }[] = [
  { name: "Cleaning Services", slug: "cleaning-services", desc: "Manage recurring clients, dispatch crews, and fill every open slot with AI-driven lead generation." },
  { name: "Carpet Cleaning", slug: "carpet-cleaning", desc: "Book more jobs, route technicians efficiently, and automate follow-ups for repeat carpet cleaning service." },
  { name: "Window Cleaning", slug: "window-cleaning", desc: "Schedule recurring routes, convert online leads instantly, and manage seasonal demand spikes." },
  { name: "Pressure Washing", slug: "pressure-washing", desc: "Fill your calendar, track jobs with GPS, and build a steady pipeline of residential and commercial clients." },
  { name: "Landscaping", slug: "landscaping", desc: "Manage seasonal crews, upsell design services, and keep every property on a recurring maintenance schedule." },
  { name: "Lawn Care", slug: "lawn-care", desc: "Automate route scheduling, client communication, and rebooking so you spend more time on the route." },
  { name: "Handyman Services", slug: "handyman-services", desc: "Quote on-site, track multiple trades, and convert one-time repairs into recurring maintenance plans." },
  { name: "Pest Control", slug: "pest-control", desc: "Automate quarterly treatments, route technicians by zone, and capture emergency leads 24/7 with AI." },
  { name: "HVAC", slug: "hvac", desc: "Schedule seasonal tune-ups, dispatch emergency calls, and track parts inventory across your fleet." },
  { name: "Plumbing", slug: "plumbing", desc: "Capture emergency leads instantly, dispatch the nearest plumber, and automate follow-up for maintenance plans." },
  { name: "Electrical", slug: "electrical", desc: "Manage permits, schedule inspections, and convert one-time calls into ongoing commercial contracts." },
  { name: "Painting", slug: "painting", desc: "Generate painting estimates, schedule multi-day jobs, and build a referral pipeline that fills your calendar." },
  { name: "Junk Removal", slug: "junk-removal", desc: "Book same-day pickups, optimize truck routes, and automate pricing based on volume and distance." },
  { name: "Pool Cleaning", slug: "pool-cleaning", desc: "Manage recurring pool routes, track chemical logs, and automate seasonal opening and closing schedules." },
  { name: "Roofing", slug: "roofing", desc: "Capture storm-damage leads, manage multi-week projects, and track crew hours with GPS verification." },
  { name: "Gutter Cleaning", slug: "gutter-cleaning", desc: "Schedule seasonal cleanings, send automated reminders, and build recurring revenue from annual contracts." },
  { name: "Appliance Repair", slug: "appliance-repair", desc: "Dispatch repair techs by specialty, track parts orders, and follow up automatically for warranty renewals." },
  { name: "Locksmith", slug: "locksmith", desc: "Capture emergency calls 24/7 with AI, dispatch the nearest tech, and invoice on-site instantly." },
  { name: "Moving Services", slug: "moving-services", desc: "Quote based on home size, schedule crews and trucks, and collect deposits with automated payment reminders." },
  { name: "Tree Service", slug: "tree-service", desc: "Generate leads for removals and trimming, schedule large crew jobs, and track equipment across sites." },
  { name: "Garage Door Repair", slug: "garage-door-repair", desc: "Capture emergency leads instantly, dispatch techs with parts inventory, and automate warranty follow-ups." },
  { name: "Flooring", slug: "flooring", desc: "Manage multi-day installations, schedule material deliveries, and convert estimates into booked jobs faster." },
  { name: "Fencing", slug: "fencing", desc: "Quote by linear foot, schedule installation crews, and build a pipeline from neighborhood referrals." },
  { name: "Concrete & Masonry", slug: "concrete-and-masonry", desc: "Manage large project timelines, track crew hours with GPS, and automate progress updates to clients." },
  { name: "Home Inspection", slug: "home-inspection", desc: "Book inspections from realtor referrals, deliver reports automatically, and build recurring revenue from annual plans." },
];

export default function Industries() {
  return (
    <section className="py-20 sm:py-28 bg-teal-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-teal-600 text-sm font-semibold tracking-[0.2em] uppercase mb-4 font-cta">
            Home Service Industries
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 font-heading">
            50+ Home Service Industries.{" "}
            <span className="text-teal-600">One CRM Platform.</span>
          </h2>
          <p className="text-slate-600 text-lg max-w-2xl mx-auto">
            Full Loop CRM works for any field service business that books
            appointments in a defined geographic area. Explore our{" "}
            <Link
              href="/full-loop-crm-service-features"
              className="text-teal-600 underline underline-offset-2 hover:text-teal-700"
            >
              features
            </Link>{" "}
            or see{" "}
            <Link
              href="/full-loop-crm-pricing"
              className="text-teal-600 underline underline-offset-2 hover:text-teal-700"
            >
              pricing
            </Link>
            .
          </p>
        </motion.div>

        {/* Grid */}
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {industries.map((ind, i) => (
            <motion.div
              key={ind.slug}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: (i % 10) * 0.05 }}
            >
              <Link
                href={`/industry/crm-for-${ind.slug.replace(/-services$/, "-service").replace(/-s$/, "")}-businesses`}
                className="group block rounded-xl bg-white border border-slate-200 hover:border-teal-400 p-5 h-full transition-all shadow-sm hover:shadow-md"
              >
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-teal-700 transition-colors font-heading mb-2">
                  {ind.name}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-2">
                  {ind.desc}
                </p>
                <span className="text-teal-600 text-xs font-semibold group-hover:underline font-cta inline-block">
                  Learn more &rarr;
                </span>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mt-16"
        >
          <p className="text-slate-600 text-lg mb-6">
            These are just a sample. If your home service business books jobs in
            a service area, Full Loop CRM was built for you. Learn more in our{" "}
            <Link
              href="/full-loop-crm-101-educational-tips"
              className="text-teal-600 underline underline-offset-2 hover:text-teal-700"
            >
              CRM 101 guide
            </Link>
            .
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/full-loop-crm-service-business-industries"
              className="inline-block px-8 py-4 text-base font-bold text-teal-600 rounded-lg bg-white border-2 border-teal-600 hover:bg-teal-50 transition-colors shadow-lg font-cta"
            >
              See All Industries We Serve
            </Link>
            <Link
              href="/crm-partnership-request-form"
              className="inline-block px-8 py-4 text-base font-bold text-white rounded-lg bg-teal-600 hover:bg-teal-700 transition-colors shadow-lg font-cta"
            >
              Request a Partnership
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
