"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

const tiers = [
  {
    rate: 100,
    name: "Growth",
    description: "Perfect for local businesses ready to start ranking",
    services: [
      { label: "Local SEO", href: "/nyc-marketing-company-services-list" },
      { label: "Keyword Research", href: "/nyc-marketing-company-services-list" },
      { label: "On-Page SEO", href: "/nyc-marketing-company-services-list" },
      { label: "Google Business Profile", href: "/nyc-marketing-company-services-list" },
      { label: "SEO Audit", href: "/nyc-marketing-company-services-list" },
      { label: "Monthly Reporting", href: null },
    ],
  },
  {
    rate: 125,
    name: "Growth+",
    description: "SEO plus a website that actually converts",
    services: [
      { label: "Everything in Growth", href: null },
      { label: "Website Design", href: "/nyc-marketing-company-services-list" },
      { label: "Mobile Responsive Design", href: "/nyc-marketing-company-services-list" },
      { label: "Landing Page Design", href: "/nyc-marketing-company-services-list" },
      { label: "Conversion Rate Optimization", href: "/nyc-marketing-company-services-list" },
      { label: "Website Optimization", href: "/nyc-marketing-company-services-list" },
    ],
  },
  {
    rate: 150,
    name: "Scale",
    description: "Full marketing engine for serious growth",
    services: [
      { label: "Everything in Growth+", href: null },
      { label: "Brand Strategy", href: "/nyc-marketing-company-services-list" },
      { label: "Brand Identity Design", href: "/nyc-marketing-company-services-list" },
      { label: "Logo Design", href: "/nyc-marketing-company-services-list" },
      { label: "Social Media Management", href: "/nyc-marketing-company-services-list" },
      { label: "Social Media Content", href: "/nyc-marketing-company-services-list" },
      { label: "Off-Page SEO & Link Building", href: "/nyc-marketing-company-services-list" },
    ],
  },
  {
    rate: 175,
    name: "Scale+",
    description: "Marketing department in a box",
    services: [
      { label: "Everything in Scale", href: null },
      { label: "Marketing Manager", href: "/nyc-marketing-company-services-list" },
      { label: "Marketing Consulting", href: "/nyc-marketing-company-services-list" },
      { label: "Social Media Advertising", href: "/nyc-marketing-company-services-list" },
      { label: "Brand Messaging & Copywriting", href: "/nyc-marketing-company-services-list" },
      { label: "Competitor Analysis", href: null },
      { label: "Dedicated Account Manager", href: null },
    ],
  },
  {
    rate: 200,
    name: "Enterprise",
    description: "Custom strategy for high-growth businesses",
    services: [
      { label: "Everything in Scale+", href: null },
      { label: "AI Automation", href: "/artificial-intelligence-marketing-services-offered" },
      { label: "AI Chatbots", href: "/artificial-intelligence-marketing-services-offered" },
      { label: "Multi-Location SEO", href: "/nyc-marketing-company-services-list" },
      { label: "Micro-Site Design", href: "/nyc-marketing-company-services-list" },
      { label: "Influencer Marketing", href: "/nyc-marketing-company-services-list" },
      { label: "Brand Style Guide", href: "/nyc-marketing-company-services-list" },
      { label: "Dedicated Team", href: null },
    ],
  },
  {
    rate: 250,
    name: "Enterprise+",
    description: "The full NYC Marketing Company experience — everything we offer, fully custom",
    services: [
      { label: "Everything in Enterprise", href: null },
      { label: "AI Agents", href: "/artificial-intelligence-marketing-services-offered" },
      { label: "Custom AI Solutions", href: "/artificial-intelligence-marketing-services-offered" },
      { label: "Naming & Rebranding", href: "/nyc-marketing-company-services-list" },
      { label: "Custom Website Design", href: "/nyc-marketing-company-services-list" },
      { label: "Social Media Strategy", href: "/nyc-marketing-company-services-list" },
      { label: "Fractional CMO", href: null },
      { label: "Executive Strategy Sessions", href: null },
      { label: "Whatever You Need", href: null },
    ],
  },
];

export default function PricingSlider() {
  const [index, setIndex] = useState(0);
  const tier = tiers[index];

  return (
    <section className="bg-white py-20 sm:py-28 px-6">
      <div className="mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <p className="text-teal-600 text-sm font-semibold tracking-[0.2em] uppercase mb-4 font-cta">
            Marketing Company Pricing
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 font-heading">
            The Most Transparent Marketing Pricing for{" "}
            <span className="text-teal-600">NYC &amp; Long Island Businesses</span>
          </h2>
          <p className="mt-4 text-slate-600 text-lg max-w-2xl mx-auto">
            No contracts, no hidden fees, no surprises. Slide to your budget and see exactly what <Link href="/nyc-marketing-company-services-list" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">marketing services</Link> are included. View our full <Link href="/nyc-marketing-pricing-guide" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">pricing guide</Link>.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="rounded-2xl border border-slate-200 bg-white shadow-lg p-6 sm:p-8"
        >
          {/* Rate + Slider inline */}
          <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-10 mb-6">
            {/* Rate display */}
            <div className="text-center sm:text-left shrink-0">
              <div className="text-5xl sm:text-6xl font-extrabold text-slate-900 font-mono leading-none">
                ${tier.rate}<span className="text-xl sm:text-2xl text-slate-400 font-medium">/hr</span>
              </div>
              <div className="text-lg font-bold text-teal-600 font-heading mt-1">{tier.name}</div>
              <p className="text-slate-500 text-sm">{tier.description}</p>
            </div>

            {/* Slider */}
            <div className="flex-1 w-full">
              <div className="flex justify-between text-xs text-slate-400 font-mono mb-2">
                <span>$100/hr</span>
                <span>$250/hr</span>
              </div>
            <input
              type="range"
              min={0}
              max={tiers.length - 1}
              value={index}
              onChange={(e) => setIndex(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-teal-600 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:bg-teal-600 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-pointer"
            />
            </div>
          </div>

          {/* Services list */}
          <div className="border-t border-slate-100 pt-6">
            <p className="text-teal-600 text-xs font-semibold tracking-[0.15em] uppercase mb-6 font-cta">
              What&apos;s Included
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {tier.services.map((service) =>
                service.href ? (
                  <Link
                    key={service.label}
                    href={service.href}
                    className="px-4 py-2 text-sm text-teal-700 border border-teal-200 rounded-full bg-teal-50 font-medium hover:bg-teal-100 hover:border-teal-300 transition-colors"
                  >
                    {service.label}
                  </Link>
                ) : (
                  <span
                    key={service.label}
                    className="px-4 py-2 text-sm text-slate-700 border border-slate-200 rounded-full bg-slate-50 font-medium"
                  >
                    {service.label}
                  </span>
                )
              )}
            </div>
          </div>

          {/* CTA */}
          <div className="mt-8 flex flex-col items-center gap-3">
            <Link
              href="/contact-nyc-marketing-company-consortium-nyc"
              className="inline-block px-10 py-4 text-base font-bold text-white rounded-lg bg-teal-600 hover:bg-teal-700 transition-colors shadow-lg font-cta"
            >
              Get Started at ${tier.rate}/hr
            </Link>
            <Link
              href="/nyc-marketing-pricing-guide"
              className="text-teal-600 hover:text-teal-700 text-sm font-semibold underline underline-offset-2 decoration-teal-600/50 font-cta"
            >
              View Full Pricing Details
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
