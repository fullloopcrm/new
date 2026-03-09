"use client";

import Link from "next/link";
import TipBlurb from "@/components/TipBlurb";

export default function QuickTips() {
  return (
    <TipBlurb
      label="Why We Built a Full-Service Home Service CRM:"
      tip={
        <>
          Full Loop CRM was created by someone who spent 20+ years <strong>working in, managing, and owning</strong> multiple home service companies. Every <Link href="/full-loop-crm-101-educational-tips" className="text-yellow-300 underline underline-offset-2 hover:text-yellow-200">CRM for service businesses</Link> out there covered one piece &mdash; scheduling here, invoicing there, leads somewhere else. None of them closed the loop. So we built the <Link href="/full-loop-crm-service-features" className="text-yellow-300 underline underline-offset-2 hover:text-yellow-200">all-in-one field service platform</Link> we always wanted: one system that <strong>generates leads organically, converts them with AI, books the job, tracks the crew, collects payment, earns the review, and retargets for the next booking.</strong> No integrations. No duct-taped tools. Just one <Link href="/why-you-should-choose-full-loop-crm-for-your-business" className="text-yellow-300 underline underline-offset-2 hover:text-yellow-200">automated home service CRM</Link> that runs the entire business. <strong>Full loop.</strong>
        </>
      }
      signature="— Built from inside the business. Not a boardroom."
    />
  );
}
