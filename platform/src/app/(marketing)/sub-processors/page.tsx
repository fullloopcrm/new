import type { Metadata } from "next";
import {
  JsonLd,
  webPageSchema,
  breadcrumbSchema,
  localBusinessSchema,
} from "@/lib/schema";
import {
  SUB_PROCESSORS,
  SUB_PROCESSORS_LAST_UPDATED,
  type SubProcessorCategory,
} from "@/lib/legal/sub-processors";

const breadcrumbs = [
  { name: "Home", url: "https://homeservicesbusinesscrm.com" },
  { name: "Sub-Processors", url: "https://homeservicesbusinesscrm.com/sub-processors" },
];

export const metadata: Metadata = {
  title: "Sub-Processors | Full Loop CRM",
  description:
    "The third-party sub-processors Full Loop CRM uses to deliver its service, what they process, and where. Maintained per GDPR Article 28 and CCPA.",
  keywords:
    "sub-processors, GDPR, Article 28, data processing, DPA, Full Loop CRM, CCPA",
  alternates: { canonical: "https://homeservicesbusinesscrm.com/sub-processors" },
  openGraph: {
    title: "Sub-Processors | Full Loop CRM",
    description:
      "The third-party sub-processors Full Loop CRM uses to deliver its service.",
    url: "https://homeservicesbusinesscrm.com/sub-processors",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Sub-Processors | Full Loop CRM",
    description:
      "The third-party sub-processors Full Loop CRM uses to deliver its service.",
  },
};

// Preserve the declared order of categories as they first appear in the registry.
const CATEGORY_ORDER: SubProcessorCategory[] = SUB_PROCESSORS.reduce(
  (acc, sp) => (acc.includes(sp.category) ? acc : [...acc, sp.category]),
  [] as SubProcessorCategory[]
);

export default function SubProcessorsPage() {
  return (
    <>
      <JsonLd
        data={webPageSchema(
          "Sub-Processors | Full Loop CRM",
          "The third-party sub-processors Full Loop CRM uses to deliver its service.",
          "https://homeservicesbusinesscrm.com/sub-processors",
          breadcrumbs
        )}
      />
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <JsonLd data={localBusinessSchema("United States", "Country")} />

      <section className="bg-slate-900 py-20 px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-extrabold text-white font-heading mb-4">
            Sub-Processors
          </h1>
          <p className="text-slate-300">Last updated: {SUB_PROCESSORS_LAST_UPDATED}</p>
        </div>
      </section>

      <section className="py-16 px-6 bg-white">
        <div className="mx-auto max-w-4xl prose prose-slate prose-headings:font-heading">
          <p>
            Full Loop CRM engages the third-party service providers
            (&quot;sub-processors&quot;) below to process personal data on our
            behalf as part of delivering the platform. We maintain this list
            under Article 28 of the GDPR and provide it to customers so you can
            evaluate the vendors in your data supply chain. We give advance
            notice of material changes as described in our data processing terms.
          </p>

          {CATEGORY_ORDER.map((category) => (
            <div key={category}>
              <h2>{category}</h2>
              {SUB_PROCESSORS.filter((sp) => sp.category === category).map((sp) => (
                <div key={sp.name} className="not-prose mb-8 rounded-xl border border-slate-200 p-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-lg font-bold text-slate-900 font-heading">
                      {sp.name}
                    </h3>
                    <a
                      href={sp.privacyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-blue-600 underline underline-offset-2"
                    >
                      Privacy / DPA
                    </a>
                  </div>
                  <p className="mt-2 text-sm text-slate-700">{sp.purpose}</p>
                  <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="font-semibold text-slate-500">Data processed</dt>
                      <dd className="text-slate-700">{sp.dataProcessed}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-500">Location</dt>
                      <dd className="text-slate-700">{sp.location}</dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>
          ))}

          <h2>Questions or Objections</h2>
          <p>
            If you have questions about a sub-processor, or wish to object to a
            new one, contact us at{" "}
            <a href="mailto:hi@fullloopcrm.com">hi@fullloopcrm.com</a>. See our{" "}
            <a href="/privacy-policy">Privacy Policy</a> for how we handle your
            data overall.
          </p>
        </div>
      </section>
    </>
  );
}
