import Link from "next/link";
import { PHONE } from "@/app/site/the-nyc-seo/_lib/seo";

type CTAVariant = "hero" | "mid" | "preFaq" | "final";

interface CTAGroupProps {
  variant: CTAVariant;
  /** Override the default headline */
  title?: string;
  /** Override the default subtitle */
  subtitle?: string;
}

const defaults: Record<CTAVariant, { title: string; subtitle: string; formLabel: string }> = {
  hero: {
    title: "Ready When You Are.",
    subtitle: "No pitch. No pressure. Just a real conversation about what it takes to rank in your market.",
    formLabel: "Start a Conversation",
  },
  mid: {
    title: "Wondering What You\u2019re Leaving on the Table?",
    subtitle: "Most NYC service businesses are invisible on Google, Bing, and AI search. It doesn\u2019t have to stay that way.",
    formLabel: "Let\u2019s Find Out",
  },
  preFaq: {
    title: "20 Years. Hundreds of Businesses Ranked. Your Turn.",
    subtitle: "We\u2019ve been doing this since before Google existed. Your competitors wish they had this kind of experience on their side.",
    formLabel: "Work With Us",
  },
  final: {
    title: "Let\u2019s Build Something That Lasts.",
    subtitle: "Tell us about your business and we\u2019ll tell you exactly what we\u2019d do \u2014 and what we wouldn\u2019t waste your money on.",
    formLabel: "Tell Us About Your Business",
  },
};

const phonePlain = PHONE.replace(/-/g, "");

export default function CTAGroup({ variant, title, subtitle }: CTAGroupProps) {
  const d = defaults[variant];
  const heading = title ?? d.title;
  const sub = subtitle ?? d.subtitle;
  const formLabel = d.formLabel;

  /* Hero variant renders on dark background (no blue wrapper) */
  if (variant === "hero") {
    return (
      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
        <Link
          href="/partnership-request-form"
          className="inline-flex items-center justify-center rounded-lg bg-[#0080FE] px-6 py-3 text-sm font-semibold text-white hover:bg-[#0070E0]"
        >
          {formLabel}
        </Link>
        <a
          href={`tel:${phonePlain}`}
          className="inline-flex items-center justify-center rounded-lg border border-zinc-700 px-6 py-3 text-sm font-semibold text-white hover:border-zinc-500 hover:bg-white/5"
        >
          Call {PHONE}
        </a>
        <a
          href={`sms:${phonePlain}`}
          className="inline-flex items-center justify-center rounded-lg px-6 py-3 text-sm font-semibold text-[#5CB8FF] hover:text-[#8DD0FF]"
        >
          Text Us
        </a>
      </div>
    );
  }

  /* Blue background CTA section for mid, preFaq, final */
  const isLarge = variant === "final";

  return (
    <section className={`bg-[#0080FE] ${isLarge ? "py-20" : "py-14"}`}>
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className={`font-bold text-white ${isLarge ? "text-3xl sm:text-4xl" : "text-2xl sm:text-3xl"}`}>
          {heading}
        </h2>
        <p className={`mx-auto mt-3 max-w-2xl text-blue-100 ${isLarge ? "text-lg" : "text-lg"}`}>
          {sub}
        </p>
        <div className="mt-6 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/partnership-request-form"
            className="inline-flex items-center rounded-lg bg-white px-6 py-3 text-lg font-semibold text-[#0080FE] hover:bg-blue-50"
          >
            {formLabel}
          </Link>
          <a
            href={`tel:${phonePlain}`}
            className="inline-flex items-center rounded-lg border-2 border-white px-6 py-3 text-lg font-semibold text-white hover:bg-white/10"
          >
            Call {PHONE}
          </a>
          <a
            href={`sms:${phonePlain}`}
            className="inline-flex items-center rounded-lg px-6 py-3 text-lg font-semibold text-blue-100 hover:text-white"
          >
            Text Us
          </a>
        </div>
      </div>
    </section>
  );
}
