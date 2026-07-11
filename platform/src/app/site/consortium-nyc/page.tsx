import type { Metadata } from "next";
import {
  JsonLd,
  webPageSchema,
  faqSchema,
  breadcrumbSchema,
} from "@/app/site/consortium-nyc/_lib/schema";
import { faqs } from "@/app/site/consortium-nyc/_lib/siteData";

export const metadata: Metadata = {
  title: "NYC Web Design & Website Design Company | Consortium NYC",
  description:
    "NYC web design & website design that ranks. Consortium NYC builds fast, SEO-engineered custom websites — from $4,600, SEO from $950/mo. Now partnered with The NYC Marketing Co. 25+ years, no contracts. Call/text (212) 202-9220.",
  alternates: { canonical: "https://www.consortiumnyc.com" },
};

// Home page sections
import Hero from "@/app/site/consortium-nyc/_components/home/Hero";
import Welcome from "@/app/site/consortium-nyc/_components/home/Welcome";
import TrustBar from "@/app/site/consortium-nyc/_components/home/TrustBar";
import ResultsTicker from "@/app/site/consortium-nyc/_components/home/ResultsTicker";
import PricingSlider from "@/app/site/consortium-nyc/_components/home/PricingSlider";
import Marquee from "@/app/site/consortium-nyc/_components/home/Marquee";
import NotLikeOthers from "@/app/site/consortium-nyc/_components/home/NotLikeOthers";
import TopServices from "@/app/site/consortium-nyc/_components/home/TopServices";
import ServicesGrid from "@/app/site/consortium-nyc/_components/home/ServicesGrid";
import ServiceDeepDives from "@/app/site/consortium-nyc/_components/home/ServiceDeepDives";
import Process from "@/app/site/consortium-nyc/_components/home/Process";
import Timeline from "@/app/site/consortium-nyc/_components/home/Timeline";
import BeforeAfter from "@/app/site/consortium-nyc/_components/home/BeforeAfter";
import CaseStudies from "@/app/site/consortium-nyc/_components/home/CaseStudies";
import StatsBar from "@/app/site/consortium-nyc/_components/home/StatsBar";
import Industries from "@/app/site/consortium-nyc/_components/home/Industries";
import AreasServed from "@/app/site/consortium-nyc/_components/home/AreasServed";
import NeighborhoodSlider from "@/app/site/consortium-nyc/_components/home/NeighborhoodSlider";
import WhyNYC from "@/app/site/consortium-nyc/_components/home/WhyNYC";
import Competitors from "@/app/site/consortium-nyc/_components/home/Competitors";
import Testimonials from "@/app/site/consortium-nyc/_components/home/Testimonials";
import SocialProof from "@/app/site/consortium-nyc/_components/home/SocialProof";
import Comparison from "@/app/site/consortium-nyc/_components/home/Comparison";
import ROICalculator from "@/app/site/consortium-nyc/_components/home/ROICalculator";
import TechStack from "@/app/site/consortium-nyc/_components/home/TechStack";
import Certifications from "@/app/site/consortium-nyc/_components/home/Certifications";
import Guarantees from "@/app/site/consortium-nyc/_components/home/Guarantees";
import WhatIsDigitalMarketing from "@/app/site/consortium-nyc/_components/home/WhatIsDigitalMarketing";
import FreeResources from "@/app/site/consortium-nyc/_components/home/FreeResources";
import VideoSection from "@/app/site/consortium-nyc/_components/home/VideoSection";
import QuickTips from "@/app/site/consortium-nyc/_components/home/QuickTips";
import ExpandedFAQ from "@/app/site/consortium-nyc/_components/home/ExpandedFAQ";
import BlogPreview from "@/app/site/consortium-nyc/_components/home/BlogPreview";
import FinalCTA from "@/app/site/consortium-nyc/_components/home/FinalCTA";
import ExitIntent from "@/app/site/consortium-nyc/_components/home/ExitIntent";

const breadcrumbs = [{ name: "Home", url: "https://www.consortiumnyc.com" }];

export default function Home() {
  return (
    <>
      {/* Schema Markup */}
      <JsonLd
        data={webPageSchema(
          "NYC Web Design & SEO | Consortium NYC",
          "NYC web design & website design company building custom, SEO-ready websites for businesses in NYC, Long Island, and Westchester.",
          "https://www.consortiumnyc.com",
          breadcrumbs
        )}
      />
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <JsonLd data={faqSchema(faqs.homepageAll)} />


      {/* 1. Hero */}
      <Hero />

      {/* 1b. Quick marketing tips */}
      <QuickTips />

      {/* 2. Welcome / About */}
      <Welcome />

      {/* 3. Client trust logos — disabled for now */}
      {/* <TrustBar /> */}

      {/* 3. Results numbers */}
      <ResultsTicker />

      {/* 4. Pricing slider */}
      <PricingSlider />

      {/* 5. Testimonials / Reviews */}
      <Testimonials />

      {/* Scrolling marquee — disabled */}
      {/* <Marquee /> */}

      {/* Top 12 Services */}
      <TopServices />

      {/* Differentiator — disabled */}
      {/* <NotLikeOthers /> */}

      {/* Services overview — disabled */}
      {/* <ServicesGrid /> */}

      {/* 7. Service deep dives */}
      <ServiceDeepDives />

      {/* 8. Our process */}
      <Process />

      {/* 9. What happens timeline — removed, covered by Process */}
      {/* <Timeline /> */}

      {/* 10. Before & after */}
      <BeforeAfter />

      {/* 11. Case studies */}
      <CaseStudies />

      {/* 12. Stats strip — removed, covered by ResultsTicker */}
      {/* <StatsBar /> */}

      {/* 13. Industries */}
      <Industries />

      {/* 14. Areas we serve */}
      <AreasServed />

      {/* 14b. Neighborhood photo slider */}
      <NeighborhoodSlider />

      {/* 15. Why NYC needs digital marketing */}
      <WhyNYC />

      {/* 16. Competitor urgency */}
      <Competitors />

      {/* Social proof platforms */}
      <SocialProof />

      {/* 19. Agency vs in-house vs freelancer */}
      <Comparison />

      {/* 20. ROI calculator */}
      <ROICalculator />

      {/* 21. Tools & tech stack */}
      <TechStack />

      {/* 22. Certifications — removed */}
      {/* <Certifications /> */}

      {/* 23. Guarantees */}
      <Guarantees />

      {/* 24. What is digital marketing (SEO content) */}
      <WhatIsDigitalMarketing />

      {/* 25. Free resources */}
      <FreeResources />

      {/* 26. Video section — removed */}
      {/* <VideoSection /> */}

      {/* 28. Expanded FAQ (18 questions) */}
      <ExpandedFAQ />

      {/* 28. Blog preview */}
      <BlogPreview />

      {/* 29. Final CTA */}
      <FinalCTA />

      {/* 30. Exit intent popup */}
      <ExitIntent />
    </>
  );
}
