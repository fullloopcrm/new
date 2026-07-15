import type { Metadata } from "next";
import { JsonLd, organizationSchema, websiteSchema, faqSchema, breadcrumbSchema } from "@/app/site/the-nyc-interior-designer/_lib/schema";
import { SITE_NAME, SITE_DOMAIN, PHONE, PHONE_HREF, ADDRESS, EMAIL, services, getAllBoroughs } from "@/app/site/the-nyc-interior-designer/_lib/siteData";
import HomeClient from "./HomeClient";

const homeFAQs = [
  { question: "What interior design services do you offer in NYC?", answer: "We offer comprehensive interior design services including full-home design, kitchen design, bathroom design, space planning, color consultation, furniture selection, lighting design, renovation management, staging, custom closets, and more. We serve all five boroughs, Long Island, Westchester, and New Jersey." },
  { question: "Do you work in all five boroughs?", answer: "Yes. We provide full-service interior design across Manhattan, Brooklyn, Queens, the Bronx, and Staten Island, as well as Long Island, Westchester County, and New Jersey. Each area has unique design challenges and we tailor our approach accordingly." },
  { question: "How much does interior design cost in NYC?", answer: "Interior design costs in NYC vary based on project scope, property size, and material selections. A single-room design starts around $2,500, while a full-home design ranges from $15,000 to $50,000+. Kitchen and bathroom renovations typically range from $25,000 to $100,000+. Contact us for a free consultation tailored to your project." },
  { question: "Do you offer free consultations?", answer: "Yes. We provide free initial consultations for all interior design projects in our service area. One of our design professionals will visit your property, discuss your vision, and provide a detailed proposal with no obligation." },
  { question: "What is the best time to start an interior design project in NYC?", answer: "Any time is a good time to start planning. However, spring and fall are popular for renovations due to milder weather for deliveries and construction. Winter is ideal for planning and design work so you're ready to begin construction in spring. Lead times for custom furniture and materials can be 8-16 weeks, so starting early is always smart." },
  { question: "Do you handle NYC permits and co-op board approvals?", answer: "Yes. Many interior renovation projects in NYC require permits from the Department of Buildings (DOB), especially those involving plumbing, electrical, or structural changes. We handle all permit applications and coordinate with co-op and condo boards on alteration agreements on your behalf." },
];

const reviewSchema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: SITE_NAME,
  url: SITE_DOMAIN,
  telephone: "+1-917-473-2013",
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
    { "@type": "AdministrativeArea", name: "New Jersey" },
  ],
};

const howToSchema = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to Hire an Interior Designer in NYC",
  description: "Step-by-step process for planning, designing, and completing a professional interior design project in New York City.",
  totalTime: "PT56D",
  step: [
    { "@type": "HowToStep", position: 1, name: "Assess Your Space and Needs", text: "Evaluate your property's current condition, what's working, what isn't, and what you want to change. Consider your lifestyle, how you use each room, storage needs, and any building-specific constraints like co-op rules or DOB requirements." },
    { "@type": "HowToStep", position: 2, name: "Define Your Style and Budget", text: "Gather inspiration images, decide on your aesthetic direction, and set a realistic budget. NYC interior design costs vary widely based on scope — knowing your budget upfront helps your designer make smart recommendations from the start." },
    { "@type": "HowToStep", position: 3, name: "Book a Free Consultation", text: "Contact a professional NYC interior designer for an in-home consultation. A qualified designer will assess your space, discuss your vision and budget, and explain their process and pricing structure." },
    { "@type": "HowToStep", position: 4, name: "Review the Design Concept", text: "Your designer presents mood boards, space plans, material selections, and 3D renderings. Review color palettes, furniture options, and finish samples. Make revisions until the design feels perfect for your lifestyle." },
    { "@type": "HowToStep", position: 5, name: "Procurement and Installation", text: "Your designer handles furniture ordering, contractor coordination, permit filing, and delivery logistics. Custom pieces are fabricated, materials are installed, and every detail is managed to maintain quality and timeline." },
    { "@type": "HowToStep", position: 6, name: "Final Styling and Reveal", text: "Your designer completes the final styling — art hanging, accessory placement, pillow arrangement, and every finishing touch. Walk through your transformed space and enjoy your new interior." },
  ],
};

export const metadata: Metadata = {
  title: "NYC Interior Design Services — Premium Residential & Commercial Design (2026)",
  description:
    "The #1 NYC interior design company. Full-home design, kitchen & bathroom renovation, space planning, staging & more across all 5 boroughs, Long Island, Westchester & NJ. Free consultations. Call (917) 473-2013.",
  keywords: [
    "nyc interior design",
    "interior designer nyc",
    "new york city interior design",
    "nyc apartment design",
    "kitchen design nyc",
    "bathroom design nyc",
    "interior design company nyc",
    "nyc home renovation",
    "brooklyn interior design",
    "manhattan interior design",
    "queens interior design",
    "interior design services near me",
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
