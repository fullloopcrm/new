// @ts-nocheck
import { PHONE } from "@/app/site/fla-dumpster-rentals/_lib/seo";

interface CTABannerProps {
  title?: string;
  subtitle?: string;
}

export default function CTABanner({
  title = "Need a Dumpster? Get a Free Quote in Minutes.",
  subtitle = "10, 20 & 30 yard roll-off dumpsters delivered across Florida. Same-day delivery available.",
}: CTABannerProps) {
  const phonePlain = PHONE.replace(/-/g, "");
  return (
    <section className="bg-gradient-to-r from-orange-700 via-orange-600 to-orange-500 py-12">
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-white sm:text-3xl">{title}</h2>
        <p className="mt-3 text-lg text-orange-100">{subtitle}</p>
        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <a
            href={`sms:${phonePlain}`}
            className="inline-flex items-center rounded-md bg-white px-7 py-3.5 text-base font-bold uppercase tracking-wide text-orange-600 transition-all hover:bg-orange-50"
          >
            Text Us for a Quote
          </a>
          <a
            href={`tel:${phonePlain}`}
            className="inline-flex items-center rounded-md border-2 border-white px-7 py-3 text-base font-bold uppercase tracking-wide text-white transition-all hover:bg-white/10"
          >
            Call {PHONE}
          </a>
        </div>
      </div>
    </section>
  );
}
