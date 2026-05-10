// @ts-nocheck
import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import type { HomepageSection } from "@/app/site/toll-trucks-near-me/_data/homepage-content";

const LINK_PATTERN = /\[([^\]]+)\]\(([^)]+)\)/g;

export function renderInlineLinks(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  LINK_PATTERN.lastIndex = 0;
  while ((match = LINK_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const [, label, href] = match;
    nodes.push(
      <Link
        key={`lnk-${key++}`}
        href={href}
        className="text-teal-700 underline decoration-teal-400 underline-offset-2 hover:decoration-teal-700"
      >
        {label}
      </Link>,
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }
  return nodes;
}

const TONE_CLASSES: Record<HomepageSection["tone"], { wrap: string; heading: string; kicker: string; body: string; lead: string }> = {
  light: {
    wrap: "bg-section-white py-16 sm:py-20",
    heading: "text-slate-900",
    kicker: "text-teal-600",
    body: "text-slate-700",
    lead: "text-slate-600",
  },
  teal: {
    wrap: "bg-section-teal py-16 sm:py-20",
    heading: "text-slate-900",
    kicker: "text-teal-700",
    body: "text-slate-700",
    lead: "text-slate-600",
  },
  slate: {
    wrap: "bg-slate-100 py-16 sm:py-20",
    heading: "text-slate-900",
    kicker: "text-teal-700",
    body: "text-slate-700",
    lead: "text-slate-600",
  },
  dark: {
    wrap: "bg-slate-900 py-16 sm:py-20 text-white",
    heading: "text-white",
    kicker: "text-amber-300",
    body: "text-white/80",
    lead: "text-white/70",
  },
};

interface LongFormSectionProps {
  section: HomepageSection;
}

export function LongFormSection({ section }: LongFormSectionProps) {
  const tone = TONE_CLASSES[section.tone];
  return (
    <section id={section.id} className={`relative ${tone.wrap}`}>
      <div className="mx-auto max-w-3xl px-6">
        <p className={`text-sm font-semibold uppercase tracking-widest font-cta ${tone.kicker}`}>
          {section.kicker}
        </p>
        <h2 className={`mt-3 text-3xl font-bold leading-tight font-heading sm:text-4xl ${tone.heading}`}>
          {section.heading}
        </h2>
        {section.lead && (
          <p className={`mt-5 text-lg leading-relaxed ${tone.lead}`}>
            {renderInlineLinks(section.lead)}
          </p>
        )}
        <div className={`mt-8 space-y-5 text-base leading-relaxed ${tone.body}`}>
          {section.paragraphs.map((p, i) => (
            <p key={i}>
              <Fragment>{renderInlineLinks(p)}</Fragment>
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
