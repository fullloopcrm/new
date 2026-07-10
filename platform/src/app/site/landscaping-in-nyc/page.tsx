import type { Metadata } from "next";
import { JsonLd, organizationSchema, websiteSchema, faqSchema, breadcrumbSchema } from "@/app/site/landscaping-in-nyc/_lib/schema";
import { SITE_NAME, SITE_DOMAIN, PHONE, PHONE_HREF, ADDRESS, EMAIL, services, getAllBoroughs } from "@/app/site/landscaping-in-nyc/_lib/siteData";
import HomeClient from "./HomeClient";

const homeFAQs = [
  { question: "What landscaping services do you offer in NYC?", answer: "We offer comprehensive landscaping services including landscape design, rooftop gardens, irrigation systems, outdoor lighting, lawn maintenance, hardscaping, snow removal, seasonal flower rotations, tree care, and more. We serve all five boroughs, Long Island, and Westchester." },
  { question: "Do you work in all five boroughs?", answer: "Yes. We provide full-service landscaping across Manhattan, Brooklyn, Queens, the Bronx, and Staten Island, as well as Long Island and Westchester County. Each area has unique landscaping needs and we tailor our approach accordingly." },
  { question: "How much does landscaping cost in NYC?", answer: "Landscaping costs in NYC vary based on project scope, property size, and materials. A basic garden cleanup might start around $500, while a full landscape design and installation for a brownstone backyard ranges from $5,000 to $25,000+. Rooftop gardens typically start at $10,000. Contact us for a free estimate tailored to your property." },
  { question: "Do you offer free estimates?", answer: "Yes. We provide free on-site estimates for all landscaping projects in our service area. One of our landscape professionals will visit your property, discuss your vision, and provide a detailed written estimate with no obligation." },
  { question: "What is the best time of year for landscaping in NYC?", answer: "Spring (March-May) and fall (September-November) are ideal for major landscaping work in NYC. However, we provide year-round services including winter snow removal, holiday lighting, and indoor plant care. Planning in winter allows us to begin installation as soon as the ground thaws." },
  { question: "Do you handle NYC permits for landscaping work?", answer: "Yes. Certain landscaping projects in NYC require permits from the Department of Buildings (DOB), especially rooftop installations, retaining walls, and significant grading work. We handle all permit applications and coordinate with building management and co-op/condo boards on your behalf." },
];

const reviewSchema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: SITE_NAME,
  url: SITE_DOMAIN,
  telephone: "+1-212-470-9637",
  email: EMAIL,
  address: {
    "@type": "PostalAddress",
    streetAddress: "150 W 47th St",
    addressLocality: "New York",
    addressRegion: "NY",
    postalCode: "10036",
    addressCountry: "US",
  },
  areaServed: [
    { "@type": "City", name: "New York" },
    { "@type": "AdministrativeArea", name: "Long Island" },
    { "@type": "AdministrativeArea", name: "Westchester County" },
  ],
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.9",
    reviewCount: "187",
    bestRating: "5",
    worstRating: "1",
  },
  review: [
    {
      "@type": "Review",
      author: { "@type": "Person", name: "Rachel M." },
      datePublished: "2026-02-18",
      reviewRating: { "@type": "Rating", ratingValue: "5", bestRating: "5" },
      reviewBody: "They transformed our brownstone backyard in Park Slope into an absolute oasis. Beautiful bluestone patio, native plantings, and a drip irrigation system that keeps everything green with zero effort on our part. Best investment we've made in this house.",
    },
    {
      "@type": "Review",
      author: { "@type": "Person", name: "David K." },
      datePublished: "2026-01-25",
      reviewRating: { "@type": "Rating", ratingValue: "5", bestRating: "5" },
      reviewBody: "Our condo building hired them for a complete rooftop garden installation in Midtown. They handled the structural assessment, DOB permits, waterproofing coordination — everything. The residents are thrilled and it's already boosted our property values.",
    },
    {
      "@type": "Review",
      author: { "@type": "Person", name: "Angela T." },
      datePublished: "2026-03-05",
      reviewRating: { "@type": "Rating", ratingValue: "5", bestRating: "5" },
      reviewBody: "We use them for year-round maintenance on our commercial property in Astoria. Spring cleanups, summer flower rotations, fall leaf removal, winter snow clearing. Completely reliable and the property always looks immaculate. Our tenants love it.",
    },
  ],
};

const howToSchema = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to Hire a Landscaping Company in NYC",
  description: "Step-by-step process for planning, designing, and completing a professional landscaping project in New York City.",
  totalTime: "PT14D",
  step: [
    { "@type": "HowToStep", position: 1, name: "Assess Your Outdoor Space", text: "Evaluate your property's current condition, sunlight exposure, soil quality, and any structural considerations. For rooftops and terraces, check load-bearing capacity with your building management." },
    { "@type": "HowToStep", position: 2, name: "Define Your Vision and Budget", text: "Decide what you want — a relaxing garden retreat, an entertaining space, low-maintenance greenery, or a full property transformation. Set a realistic budget based on NYC landscaping costs." },
    { "@type": "HowToStep", position: 3, name: "Request a Free Estimate", text: "Contact a professional NYC landscaper for an on-site consultation. A qualified landscaper will assess drainage, sun patterns, access constraints, and provide a detailed written proposal." },
    { "@type": "HowToStep", position: 4, name: "Review the Design Plan", text: "Your landscaper presents a design plan with plant selections, hardscape layouts, irrigation details, and a phased timeline. Review 3D renderings and make revisions before construction begins." },
    { "@type": "HowToStep", position: 5, name: "Installation and Construction", text: "Professional crews handle all installation — grading, drainage, hardscaping, planting, irrigation, and lighting. Most residential projects complete in 1-3 weeks depending on scope." },
    { "@type": "HowToStep", position: 6, name: "Enjoy and Maintain", text: "Your new landscape is complete. Enroll in a seasonal maintenance plan to keep everything looking its best year-round, including spring cleanups, summer care, fall prep, and winter protection." },
  ],
};

export const metadata: Metadata = {
  title: "NYC Landscaping Services — Premium Landscape Design & Maintenance (2026)",
  description:
    "The #1 NYC landscaping company. Landscape design, rooftop gardens, irrigation, hardscaping, maintenance & more across all 5 boroughs, Long Island & Westchester. Free estimates. Call (212) 470-9637.",
  keywords: [
    "nyc landscaping",
    "landscaping in nyc",
    "new york city landscaping",
    "nyc landscape design",
    "rooftop garden nyc",
    "landscaping company nyc",
    "nyc lawn care",
    "brooklyn landscaping",
    "manhattan landscaping",
    "queens landscaping",
    "nyc hardscaping",
    "landscaping services near me",
  ],
};

export default function HomePage() {
  return (
    <>
      <JsonLd data={organizationSchema} />
      <JsonLd data={websiteSchema} />
      <JsonLd data={reviewSchema} />
      <JsonLd data={howToSchema} />
      <JsonLd data={faqSchema(homeFAQs)} />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", url: SITE_DOMAIN },
        ])}
      />
      <HomeClient />
    </>
  );
}
