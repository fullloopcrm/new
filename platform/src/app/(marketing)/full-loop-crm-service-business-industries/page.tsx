import type { Metadata } from "next";
import Link from "next/link";
import {
  JsonLd,
  webPageSchema,
  breadcrumbSchema,
  localBusinessSchema,
  itemListSchema,
} from "@/lib/schema";

export const metadata: Metadata = {
  title:
    "50+ Home Service Industries We Support | Full Loop CRM",
  description:
    "Full Loop CRM serves 50+ home service trades with exclusive territory partnerships. Cleaning, HVAC, plumbing, landscaping, pest control, roofing, and more.",
  keywords: [
    "home service CRM industries",
    "CRM for cleaning services",
    "CRM for HVAC",
    "CRM for plumbing",
    "CRM for landscaping",
    "CRM for pest control",
    "field service industries supported",
    "home service trades CRM",
    "CRM for handyman",
    "CRM for roofing",
  ],
  openGraph: {
    title: "50+ Home Service Industries | Full Loop CRM",
    description:
      "One CRM platform for every home service trade. Exclusive territory partnerships available.",
    url: "https://fullloopcrm.com/full-loop-crm-service-business-industries",
    type: "website",
  },
  alternates: {
    canonical: "https://fullloopcrm.com/full-loop-crm-service-business-industries",
  },
  twitter: {
    card: "summary_large_image",
    title: "50+ Home Service Industries | Full Loop CRM",
    description:
      "One CRM platform for every home service trade. Exclusive territory partnerships available.",
  },
};

const breadcrumbs = [
  { name: "Home", url: "https://fullloopcrm.com" },
  { name: "Industries", url: "https://fullloopcrm.com/full-loop-crm-service-business-industries" },
];

const industries: { name: string; description: string }[] = [
  { name: "Cleaning Services", description: "Residential and commercial cleaning operations with recurring schedules." },
  { name: "Carpet Cleaning", description: "Deep cleaning, stain removal, and carpet restoration services." },
  { name: "Window Cleaning", description: "Interior and exterior window washing for homes and buildings." },
  { name: "Pressure Washing", description: "High-pressure surface cleaning for driveways, decks, and exteriors." },
  { name: "Landscaping", description: "Full-service landscape design, installation, and maintenance." },
  { name: "Lawn Care", description: "Mowing, fertilization, aeration, and seasonal lawn programs." },
  { name: "Tree Service", description: "Tree trimming, removal, stump grinding, and emergency response." },
  { name: "Handyman Services", description: "General repairs, installations, and small project work." },
  { name: "Pest Control", description: "Residential and commercial extermination and prevention programs." },
  { name: "HVAC", description: "Heating, ventilation, and air conditioning install and repair." },
  { name: "Plumbing", description: "Pipe repair, fixture installation, drain clearing, and water heaters." },
  { name: "Electrical", description: "Wiring, panel upgrades, lighting, and electrical troubleshooting." },
  { name: "Painting (Interior/Exterior)", description: "Surface prep, priming, and professional paint application." },
  { name: "Junk Removal", description: "Hauling away furniture, debris, and unwanted items." },
  { name: "Pool Cleaning & Maintenance", description: "Chemical balancing, filter service, and seasonal pool care." },
  { name: "Roofing", description: "Roof repair, replacement, inspection, and storm damage restoration." },
  { name: "Garage Door Repair", description: "Spring replacement, opener repair, and new door installation." },
  { name: "Appliance Repair", description: "Diagnosing and fixing washers, dryers, refrigerators, and more." },
  { name: "Locksmith", description: "Lock installation, rekeying, and emergency lockout services." },
  { name: "Flooring Installation", description: "Hardwood, tile, laminate, and vinyl floor installation." },
  { name: "Fencing", description: "Wood, vinyl, chain-link, and ornamental fence installation." },
  { name: "Gutter Cleaning", description: "Gutter debris removal, flushing, and guard installation." },
  { name: "Chimney Sweep", description: "Chimney cleaning, inspection, and cap installation." },
  { name: "Drywall Repair", description: "Patching holes, water damage repair, and texture matching." },
  { name: "Concrete & Masonry", description: "Foundations, patios, walkways, and brick or block work." },
  { name: "Deck Building", description: "Custom deck design, construction, and refinishing." },
  { name: "Home Inspection", description: "Pre-purchase, pre-listing, and annual home inspections." },
  { name: "Mold Remediation", description: "Mold testing, containment, removal, and prevention." },
  { name: "Water Damage Restoration", description: "Water extraction, drying, and structural repair after floods." },
  { name: "Fire Damage Restoration", description: "Smoke cleanup, structural repair, and content restoration." },
  { name: "Septic Services", description: "Septic pumping, inspection, and system maintenance." },
  { name: "Irrigation", description: "Sprinkler system design, installation, and seasonal service." },
  { name: "Snow Removal", description: "Plowing, salting, and sidewalk clearing for winter storms." },
  { name: "Power Washing", description: "Commercial-grade surface cleaning for buildings and hardscapes." },
  { name: "House Cleaning", description: "Recurring residential cleaning with customized checklists." },
  { name: "Move-In/Move-Out Cleaning", description: "Deep cleaning for rental turnovers and real estate closings." },
  { name: "Post-Construction Cleaning", description: "Dust removal, debris hauling, and final polish after builds." },
  { name: "Air Duct Cleaning", description: "HVAC duct sanitization to improve indoor air quality." },
  { name: "Dryer Vent Cleaning", description: "Lint removal and vent inspection to prevent fire hazards." },
  { name: "Solar Panel Cleaning", description: "Debris and residue removal to maximize solar efficiency." },
  { name: "Upholstery Cleaning", description: "Deep cleaning for sofas, chairs, and fabric surfaces." },
  { name: "Pet Waste Removal", description: "Scheduled yard cleanup and sanitation for pet owners." },
  { name: "Mobile Car Detailing", description: "On-site interior and exterior vehicle cleaning and detailing." },
  { name: "Mobile Pet Grooming", description: "Door-to-door bathing, trimming, and pet care services." },
  { name: "Mobile Salon Services", description: "Hair, nails, and beauty services delivered to client locations." },
  { name: "Hauling Services", description: "Material transport, dump runs, and large-item pickup." },
  { name: "Demolition", description: "Interior and exterior tear-down and site prep services." },
  { name: "Paving", description: "Asphalt and concrete driveway, lot, and road paving." },
  { name: "Stucco Repair", description: "Crack patching, re-coating, and exterior stucco restoration." },
  { name: "Siding Installation", description: "Vinyl, fiber cement, and wood siding install and replacement." },
  { name: "Insulation", description: "Spray foam, blown-in, and batt insulation for energy efficiency." },
];

const steps = [
  {
    step: "1",
    title: "Apply",
    description: "Submit your partnership request with your trade and target metro.",
  },
  {
    step: "2",
    title: "Territory Check",
    description: "We verify your metro is available for your trade — one partner per territory.",
  },
  {
    step: "3",
    title: "Onboard",
    description: "We build your SEO site, configure your CRM, and connect your channels.",
  },
  {
    step: "4",
    title: "Launch",
    description: "Go live with leads, automation, and Selenas AI handling your front office.",
  },
];

export default function IndustriesPage() {
  return (
    <>
      <JsonLd
        data={webPageSchema(
          "50+ Home Service Industries We Support | Full Loop CRM",
          "Full Loop CRM serves 50+ home service trades with exclusive territory partnerships.",
          "https://fullloopcrm.com/full-loop-crm-service-business-industries",
          breadcrumbs
        )}
      />
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <JsonLd data={localBusinessSchema("United States", "Country")} />
      <JsonLd
        data={itemListSchema(
          "Home Service Industries Supported by Full Loop CRM",
          industries.map((ind) => ({
            name: ind.name,
            url: `https://fullloopcrm.com/full-loop-crm-service-business-industries`,
            description: ind.description,
          }))
        )}
      />

      {/* Hero */}
      <section className="bg-slate-900 py-24 px-6">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white font-heading mb-6">
            50+ Home Service Industries.{" "}
            <span className="text-teal-400">One CRM Platform.</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto">
            One partner per trade per metro.{" "}
            <span className="text-yellow-300 font-cta">Exclusive territory.</span>{" "}
            No competing with another Full Loop partner in your market.
          </p>
        </div>
      </section>

      {/* Industry Grid */}
      <section className="py-20 px-6 bg-white">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-3xl font-bold text-slate-900 font-heading text-center mb-4">
            Industries We Serve
          </h2>
          <p className="text-slate-600 text-center mb-12 max-w-2xl mx-auto">
            From cleaning to construction, Full Loop CRM is built for every field service trade.
            Each partner gets an exclusive metro territory for their industry.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {industries.map((industry) => (
              <div
                key={industry.name}
                className="border border-slate-200 rounded-lg p-5 hover:border-teal-400 hover:shadow-md transition-all"
              >
                <h3 className="text-base font-bold text-slate-900 font-heading mb-1">
                  {industry.name}
                </h3>
                <p className="text-sm text-slate-500 leading-snug">
                  {industry.description}
                </p>
              </div>
            ))}
          </div>

          {/* Don't see your trade */}
          <div className="mt-12 text-center border-t border-slate-200 pt-12">
            <p className="text-lg text-slate-700 mb-4">
              Don&apos;t see your trade?{" "}
              <span className="font-semibold text-slate-900">
                We support any field service business.
              </span>
            </p>
            <Link
              href="/crm-partnership-request-form"
              className="inline-block bg-teal-600 text-white font-cta px-8 py-3 rounded-lg hover:bg-teal-700 transition-colors"
            >
              Request Your Territory
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold text-slate-900 font-heading text-center mb-4">
            How It Works
          </h2>
          <p className="text-slate-600 text-center mb-12 max-w-xl mx-auto">
            From application to launch in four steps. No long contracts, no setup fees.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {steps.map((s) => (
              <div key={s.step} className="text-center">
                <div className="w-14 h-14 rounded-full bg-teal-600 text-white text-xl font-bold flex items-center justify-center mx-auto mb-4 font-mono">
                  {s.step}
                </div>
                <h3 className="text-lg font-bold text-slate-900 font-heading mb-2">
                  {s.title}
                </h3>
                <p className="text-sm text-slate-600">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-slate-900 py-20 px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-white font-heading mb-4">
            Ready to Own Your Metro?
          </h2>
          <p className="text-slate-300 mb-8 text-lg">
            Lock in your exclusive territory before a competitor does. One partner per trade per city.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/crm-partnership-request-form"
              className="inline-block bg-yellow-300 text-slate-900 font-cta px-8 py-3 rounded-lg hover:bg-yellow-400 transition-colors"
            >
              Request Partnership
            </Link>
            <Link
              href="/full-loop-crm-service-features"
              className="text-teal-400 underline underline-offset-2 hover:text-teal-300 font-cta"
            >
              See All Features
            </Link>
            <Link
              href="/full-loop-crm-pricing"
              className="text-teal-400 underline underline-offset-2 hover:text-teal-300 font-cta"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
