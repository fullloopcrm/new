"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const topServices = [
  {
    badge: "SEO",
    title: "Local SEO for NYC Businesses",
    desc: "Dominate Google Maps and local search results. We optimize your presence so customers in your neighborhood find you first.",
    href: "/nyc-marketing-company-services-list",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  {
    badge: "Web Design",
    title: "NYC Website Design & Development",
    desc: "Custom websites built for speed, SEO, and conversion. Mobile-first, 90+ PageSpeed, launching in 4–6 weeks.",
    href: "/nyc-marketing-company-services-list",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
      </svg>
    ),
  },
  {
    badge: "Branding",
    title: "Brand Identity & Strategy in NYC",
    desc: "Logo, visual identity, and messaging that makes you the obvious choice in the most competitive market in the country.",
    href: "/nyc-marketing-company-services-list",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
      </svg>
    ),
  },
  {
    badge: "Social Media",
    title: "Social Media Marketing in New York",
    desc: "Content creation, management, and paid social campaigns that build your brand and drive real leads from local audiences.",
    href: "/nyc-marketing-company-services-list",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
      </svg>
    ),
  },
  {
    badge: "Marketing Manager",
    title: "Outsourced Marketing Manager for NYC",
    desc: "Your dedicated marketing department without the overhead. Strategy, execution, and reporting handled by our senior team.",
    href: "/nyc-marketing-company-services-list",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
  },
  {
    badge: "Marketing Consulting",
    title: "Marketing Consulting for NYC Businesses",
    desc: "Data-driven strategy and consulting for businesses that need expert guidance without a full-time hire.",
    href: "/nyc-marketing-company-services-list",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
      </svg>
    ),
  },
  {
    badge: "AI",
    title: "AI Automation & Chatbots for NYC",
    desc: "AI-powered automation, chatbots, and agents that handle leads, scheduling, and follow-ups 24/7 while you sleep.",
    href: "/artificial-intelligence-marketing-services-offered",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
      </svg>
    ),
  },
  {
    badge: "Google Business",
    title: "Google Business Profile Management NYC",
    desc: "Optimize and manage your GBP to dominate the local map pack and drive foot traffic from nearby customers.",
    href: "/nyc-marketing-company-services-list",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
      </svg>
    ),
  },
  {
    badge: "CRO",
    title: "Conversion Rate Optimization in NYC",
    desc: "Turn more visitors into customers. Data-driven testing and optimization that increases leads without increasing traffic.",
    href: "/nyc-marketing-company-services-list",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
      </svg>
    ),
  },
  {
    badge: "Link Building",
    title: "Link Building & Off-Page SEO in NYC",
    desc: "Build domain authority with quality backlinks from relevant, high-authority sites that boost your search rankings.",
    href: "/nyc-marketing-company-services-list",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.036a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.25 8.551" />
      </svg>
    ),
  },
  {
    badge: "Landing Pages",
    title: "Landing Page Design for NYC Businesses",
    desc: "High-converting landing pages built to capture leads from your campaigns. Tested, optimized, and ready to perform.",
    href: "/nyc-marketing-company-services-list",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
  },
  {
    badge: "Keyword Research",
    title: "Keyword Research & Strategy in NYC",
    desc: "Identify the exact search terms your NYC customers use and build a strategy to capture that traffic and convert it.",
    href: "/nyc-marketing-company-services-list",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
      </svg>
    ),
  },
];

export default function TopServices() {
  return (
    <section className="bg-teal-50 py-20 sm:py-28 px-6">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <p className="text-teal-600 text-sm font-semibold tracking-[0.2em] uppercase mb-4 font-cta">
            Marketing Services
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 font-heading">
            Top Marketing Services for{" "}
            <span className="text-teal-600">NYC &amp; Long Island Businesses</span>
          </h2>
          <p className="mt-4 text-slate-600 text-lg max-w-2xl mx-auto">
            From <Link href="/nyc-marketing-company-services-list" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">local SEO</Link> and <Link href="/nyc-marketing-company-services-list" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">web design</Link> to <Link href="/artificial-intelligence-marketing-services-offered" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">AI automation</Link>, <Link href="/nyc-marketing-company-services-list" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">branding</Link>, and <Link href="/nyc-marketing-company-services-list" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">social media management</Link> &mdash; every service is built for local businesses in Manhattan, Brooklyn, Queens, Long Island, Westchester, and the tri-state area. Explore our full <Link href="/nyc-marketing-company-services-list" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">marketing services list</Link>, check out <Link href="/nyc-marketing-pricing-guide" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">transparent pricing</Link>, or <Link href="/contact-nyc-marketing-company-consortium-nyc" className="text-teal-600 underline underline-offset-2 hover:text-teal-700">schedule a free strategy session</Link>.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {topServices.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: (i % 8) * 0.05 }}
            >
              <Link
                href={s.href}
                className="group block rounded-xl bg-white border border-slate-200 hover:border-teal-400 p-5 h-full transition-all hover:shadow-md"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-teal-600 font-cta">
                    {s.badge}
                  </span>
                  <span className="text-teal-600 group-hover:text-teal-500 transition-colors">
                    {s.icon}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 leading-snug mb-2 font-heading group-hover:text-teal-700 transition-colors">
                  {s.title}
                </h3>
                <p className="text-slate-500 text-xs leading-relaxed line-clamp-3 mb-3">
                  {s.desc}
                </p>
                <span className="text-teal-600 text-xs font-semibold group-hover:underline font-cta">
                  Read more &rarr;
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
