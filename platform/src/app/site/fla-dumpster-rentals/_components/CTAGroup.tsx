import { PHONE } from "@/app/site/fla-dumpster-rentals/_lib/seo";

type CTAVariant = "hero" | "mid" | "preFaq" | "final" | "inline";

interface CTAGroupProps {
  variant: CTAVariant;
  title?: string;
  subtitle?: string;
}

const defaults: Record<CTAVariant, { title: string; subtitle: string }> = {
  hero: {
    title: "Get Your Dumpster Delivered Today.",
    subtitle:
      "Fast, affordable roll-off dumpster rental across Florida. Text or call for an instant quote.",
  },
  mid: {
    title: "Same-Day Delivery Available Statewide.",
    subtitle:
      "We deliver 10, 20 & 30 yard roll-off dumpsters anywhere in Florida. No hidden fees, no surprises.",
  },
  preFaq: {
    title: "Florida's Most Trusted Dumpster Rental.",
    subtitle:
      "Contractors, homeowners, and businesses across Florida rely on us for fast, reliable dumpster service.",
  },
  final: {
    title: "Ready to Order Your Dumpster?",
    subtitle:
      "Text us your project details for an instant quote, or call to speak with a dumpster specialist.",
  },
  inline: {
    title: "Need a Dumpster? We Make It Easy.",
    subtitle:
      "Text, call, or book online. Most dumpsters delivered same-day or next-day across Florida.",
  },
};

const phonePlain = PHONE.replace(/-/g, "");

export default function CTAGroup({ variant, title, subtitle }: CTAGroupProps) {
  const d = defaults[variant];
  const heading = title ?? d.title;
  const sub = subtitle ?? d.subtitle;

  if (variant === "hero") {
    return (
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <a
          href={`sms:${phonePlain}`}
          className="inline-flex items-center justify-center rounded-md bg-orange-600 px-7 py-3 text-sm font-bold uppercase tracking-wide text-white transition-all hover:bg-orange-500"
        >
          Text Us for a Quote
        </a>
        <a
          href={`tel:${phonePlain}`}
          className="inline-flex items-center justify-center rounded-md border-2 border-white/20 px-7 py-3 text-sm font-bold uppercase tracking-wide text-white transition-all hover:border-white/40 hover:bg-white/5"
        >
          Call {PHONE}
        </a>
        <a
          href="/schedule-dumpster-rental-form"
          className="inline-flex items-center justify-center rounded-md border-2 border-orange-500/40 px-7 py-3 text-sm font-bold uppercase tracking-wide text-orange-400 transition-all hover:border-orange-400 hover:bg-orange-500/10"
        >
          Book Online
        </a>
      </div>
    );
  }

  const isLarge = variant === "final";

  return (
    <section className={`bg-gradient-to-r from-orange-700 via-orange-600 to-orange-500 ${isLarge ? "py-20" : "py-14"}`}>
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <h2
          className={`font-bold text-white ${isLarge ? "text-3xl sm:text-4xl" : "text-2xl sm:text-3xl"}`}
        >
          {heading}
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-lg text-orange-100">{sub}</p>
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
          <a
            href="/schedule-dumpster-rental-form"
            className="inline-flex items-center rounded-md border-2 border-white/40 px-7 py-3 text-base font-bold uppercase tracking-wide text-white transition-all hover:border-white hover:bg-white/10"
          >
            Book Online
          </a>
        </div>
      </div>
    </section>
  );
}
