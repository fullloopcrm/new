import type { Metadata } from "next";
import { JobApplicationForm } from "@/app/site/sunnyside-clean-nyc/_components/JobApplicationForm";

export const metadata: Metadata = {
  title: "Careers | Sunnyside Clean NYC",
  description: "Join the Sunnyside Clean NYC cleaning team — apply online in under 2 minutes.",
  alternates: { canonical: "https://www.cleaningservicesunnysideny.com/careers" },
};

export default function CareersPage() {
  return (
    <section className="bg-slate-50 py-16">
      <div className="mx-auto max-w-lg px-6">
        <h1 className="text-center text-3xl font-bold text-slate-900 font-heading">Join Our Team</h1>
        <p className="mt-3 text-center text-slate-600">
          Sunnyside Clean NYC is hiring reliable, detail-oriented house cleaners across Queens and NYC.
        </p>
        <div className="mt-8">
          <JobApplicationForm />
        </div>
      </div>
    </section>
  );
}
