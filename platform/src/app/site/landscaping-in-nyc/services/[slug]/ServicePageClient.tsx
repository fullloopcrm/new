"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import type { Service } from "@/app/site/landscaping-in-nyc/_lib/siteData";
import { getServiceUrl, PHONE, SMS_HREF } from "@/app/site/landscaping-in-nyc/_lib/siteData";
import type { ServiceContent } from "@/app/site/landscaping-in-nyc/_lib/serviceContentTypes";

interface Props {
  service: Service;
  otherServices: Service[];
  content: ServiceContent | null;
}

/* -- Transcribe / Listen Button -- */

function TranscribeButton({ service, content }: { service: Service; content: ServiceContent | null }) {
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [supported, setSupported] = useState(true);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const totalCharsRef = useRef(0);
  const spokenCharsRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setSupported(false);
    }
    return () => {
      window.speechSynthesis?.cancel();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const buildText = useCallback(() => {
    const parts: string[] = [];
    parts.push(`${service.name}. ${service.tagline}.`);
    parts.push(service.shortDesc);
    if (content) {
      for (const section of content.sections) {
        parts.push(section.title);
        for (const p of section.paragraphs) {
          parts.push(p);
        }
      }
      if (content.faqs.length > 0) {
        parts.push("Frequently Asked Questions.");
        for (const faq of content.faqs) {
          parts.push(`Question: ${faq.question}`);
          parts.push(`Answer: ${faq.answer}`);
        }
      }
    }
    return parts.join(" . ");
  }, [service, content]);

  const handlePlay = useCallback(() => {
    const synth = window.speechSynthesis;
    if (!synth) return;

    if (paused) {
      synth.resume();
      setPaused(false);
      setPlaying(true);
      return;
    }

    synth.cancel();
    const text = buildText();
    totalCharsRef.current = text.length;
    spokenCharsRef.current = 0;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    const voices = synth.getVoices();
    const preferred = voices.find(
      (v) => v.name.includes("Samantha") || v.name.includes("Karen") || v.name.includes("Daniel") || v.name.includes("Google US English")
    );
    if (preferred) utterance.voice = preferred;

    utterance.onboundary = (e) => {
      spokenCharsRef.current = e.charIndex;
      setProgress(Math.round((e.charIndex / totalCharsRef.current) * 100));
    };

    utterance.onend = () => {
      setPlaying(false);
      setPaused(false);
      setProgress(100);
      if (intervalRef.current) clearInterval(intervalRef.current);
      setTimeout(() => setProgress(0), 2000);
    };

    utteranceRef.current = utterance;
    synth.speak(utterance);
    setPlaying(true);
    setPaused(false);
  }, [paused, buildText]);

  const handlePause = useCallback(() => {
    window.speechSynthesis?.pause();
    setPaused(true);
    setPlaying(false);
  }, []);

  const handleStop = useCallback(() => {
    window.speechSynthesis?.cancel();
    setPlaying(false);
    setPaused(false);
    setProgress(0);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  if (!supported) return null;

  const estimatedMinutes = content
    ? Math.ceil(
        (content.sections.reduce((acc, s) => acc + s.paragraphs.join(" ").length, 0) +
          content.faqs.reduce((acc, f) => acc + f.question.length + f.answer.length, 0)) /
          900
      )
    : 5;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      {playing ? (
        <button
          onClick={handlePause}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-600 text-white hover:bg-green-700 transition-colors"
          aria-label="Pause"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <rect x="3" y="2" width="4" height="12" rx="1" />
            <rect x="9" y="2" width="4" height="12" rx="1" />
          </svg>
        </button>
      ) : (
        <button
          onClick={handlePlay}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-600 text-white hover:bg-green-700 transition-colors"
          aria-label={paused ? "Resume" : "Listen to this article"}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4 2.5v11l9-5.5z" />
          </svg>
        </button>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800">
          {playing ? "Playing..." : paused ? "Paused" : "Listen to this article"}
        </p>
        <p className="text-xs text-slate-400">
          ~{estimatedMinutes} min read
        </p>
        {(playing || paused) && (
          <div className="mt-1.5 h-1 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-green-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {(playing || paused) && (
        <button
          onClick={handleStop}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
          aria-label="Stop"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <rect x="1" y="1" width="10" height="10" rx="1" />
          </svg>
        </button>
      )}
    </div>
  );
}

/* -- Visual break components -- */

function PullQuote({ text }: { text: string }) {
  return (
    <div className="my-10 border-l-4 border-green-500 bg-green-50 py-5 pl-6 pr-4">
      <p className="text-lg font-medium leading-relaxed text-green-900 italic font-heading">
        &ldquo;{text}&rdquo;
      </p>
    </div>
  );
}

function StatCallout({ stats }: { stats: { label: string; value: string }[] }) {
  return (
    <div className="my-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
      {stats.map((s, i) => (
        <div key={i} className="rounded-xl border border-green-200/60 bg-white p-5 text-center shadow-sm">
          <p className="text-2xl font-bold text-green-700 font-heading">{s.value}</p>
          <p className="mt-1 text-xs font-medium text-slate-500 uppercase tracking-wide">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

function TipBox({ title, text }: { title: string; text: string }) {
  return (
    <div className="my-10 rounded-xl border border-green-200 bg-green-50 p-6">
      <h3 className="text-base font-bold text-green-800 font-heading">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-green-900/80">{text}</p>
    </div>
  );
}

function MidPageCta({ serviceName }: { serviceName: string }) {
  return (
    <div className="my-10 rounded-2xl bg-green-700 p-8 text-center shadow-lg">
      <h3 className="text-xl font-bold text-white font-heading">
        Ready to Get Started with {serviceName}?
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-white/80">
        Get a free estimate or connect with a landscaping specialist who can design the perfect solution for your property.
      </p>
      <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <a href={SMS_HREF}>
          <span className="inline-block rounded-lg bg-white px-6 py-2.5 text-sm font-semibold text-green-700 shadow transition-colors hover:bg-green-50 font-cta">
            Text Us: {PHONE}
          </span>
        </a>
        <Link href="/contact">
          <span className="inline-block rounded-lg border-2 border-white/30 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:border-white/60 font-cta">
            Get a Free Estimate
          </span>
        </Link>
      </div>
    </div>
  );
}

/* -- Extract a "pull quote" from a paragraph -- */
function extractPullQuote(paragraphs: string[]): string | null {
  for (const p of paragraphs) {
    const sentences = p.split(/(?<=[.!])\s+/);
    for (const s of sentences) {
      if (
        (s.match(/\d/) && s.length > 40 && s.length < 200) ||
        (s.includes("most") && s.length > 50 && s.length < 200) ||
        (s.includes("key") && s.length > 50 && s.length < 200)
      ) {
        return s.replace(/\.$/, "");
      }
    }
  }
  return null;
}

/* -- Section layout variants -- */

function ContentSection({
  section,
  variant,
  serviceName,
  sectionIndex,
  totalSections,
}: {
  section: { id: string; title: string; paragraphs: string[] };
  variant: "standard" | "pullquote" | "tip" | "stats";
  serviceName: string;
  sectionIndex: number;
  totalSections: number;
}) {
  const bgClass = sectionIndex % 2 === 0 ? "bg-section-green" : "bg-section-white";
  const midpoint = Math.floor(totalSections / 2);
  const showMidCta = sectionIndex === midpoint;

  const firstParagraphs = section.paragraphs.slice(0, 2);
  const remainingParagraphs = section.paragraphs.slice(2);
  const pullQuote = variant === "pullquote" ? extractPullQuote(section.paragraphs) : null;

  return (
    <section id={section.id} className={`${bgClass} py-16`}>
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="text-2xl font-bold text-slate-900 font-heading">{section.title}</h2>

        {firstParagraphs.map((p, i) => (
          <p key={i} className="mt-4 text-base leading-relaxed text-slate-600">
            {p}
          </p>
        ))}

        {variant === "pullquote" && pullQuote && <PullQuote text={pullQuote} />}

        {variant === "tip" && section.paragraphs.length > 2 && (
          <TipBox
            title="Pro Tip"
            text={section.paragraphs[2].split(/(?<=[.!])\s+/).slice(0, 2).join(" ")}
          />
        )}

        {variant === "stats" && (
          <StatCallout
            stats={[
              { label: "Years Experience", value: "15+" },
              { label: "Projects Completed", value: "2,000+" },
              { label: "Neighborhoods", value: "137" },
              { label: "Satisfaction", value: "98%" },
            ]}
          />
        )}

        {remainingParagraphs.map((p, i) => {
          if (variant === "tip" && i === 0) return null;
          return (
            <p key={`r-${i}`} className="mt-4 text-base leading-relaxed text-slate-600">
              {p}
            </p>
          );
        })}

        {showMidCta && <MidPageCta serviceName={serviceName} />}
      </div>
    </section>
  );
}

export default function ServicePageClient({ service, otherServices, content }: Props) {
  const variants: ("standard" | "pullquote" | "tip" | "stats")[] = [
    "stats",
    "pullquote",
    "standard",
    "tip",
    "pullquote",
    "standard",
    "tip",
    "pullquote",
    "standard",
    "stats",
  ];

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-green-700 pt-36 pb-16 sm:pt-44 sm:pb-20">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-3 text-sm font-semibold uppercase tracking-widest text-green-200 font-cta"
          >
            NYC Landscaping Service
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl font-heading"
          >
            {service.h1}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mx-auto mt-4 max-w-2xl text-lg text-white/80"
          >
            {service.tagline}
          </motion.p>
          {/* Inner links to related services */}
          {otherServices.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="mx-auto mt-5 flex flex-wrap items-center justify-center gap-2 max-w-3xl"
            >
              <span className="text-xs font-semibold uppercase tracking-wider text-green-200/70">Related:</span>
              {otherServices.slice(0, 5).map((s) => (
                <Link
                  key={s.slug}
                  href={getServiceUrl(s)}
                  className="rounded-full border border-white/20 px-3 py-1 text-xs font-medium text-white/70 transition-colors hover:border-green-300 hover:text-white hover:bg-white/10"
                >
                  {s.name}
                </Link>
              ))}
            </motion.div>
          )}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <a href={SMS_HREF}>
              <span className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-green-700 shadow-lg transition-colors hover:bg-green-50 font-cta">
                Text Us: {PHONE}
              </span>
            </a>
            <Link href="/contact">
              <span className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">
                Get a Free Estimate
              </span>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Transcribe / Listen Button */}
      {content && (
        <section className="bg-section-white pt-10 pb-0">
          <div className="mx-auto max-w-4xl px-6">
            <TranscribeButton service={service} content={content} />
          </div>
        </section>
      )}

      {/* Table of Contents */}
      {content && (
        <section className="bg-section-white py-12 border-b border-slate-200">
          <div className="mx-auto max-w-4xl px-6">
            <h2 className="text-lg font-bold text-slate-900 font-heading">In This Guide</h2>
            <nav className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {content.tableOfContents.map((item, i) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="group flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 transition-all hover:border-green-400 hover:shadow-sm"
                >
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-700 group-hover:bg-green-600 group-hover:text-white transition-colors">
                    {i + 1}
                  </span>
                  <span className="text-sm font-medium text-slate-700 group-hover:text-green-700">
                    {item.title}
                  </span>
                </a>
              ))}
            </nav>
          </div>
        </section>
      )}

      {/* Key Takeaways */}
      {content && content.keyTakeaways.length > 0 && (
        <section className="bg-section-green py-12">
          <div className="mx-auto max-w-4xl px-6">
            <h2 className="text-lg font-bold text-slate-900 font-heading">Key Takeaways</h2>
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {content.keyTakeaways.map((takeaway, i) => (
                <div key={i} className="flex gap-3 rounded-xl border border-green-200/60 bg-white p-4 shadow-sm">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-600 text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <p className="text-sm leading-relaxed text-slate-700">{takeaway}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Features */}
      <section className="bg-section-white py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold text-slate-900 font-heading">Key Features</h2>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {service.features.map((feature, i) => (
              <div key={i} className="flex gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-700">
                  {i + 1}
                </div>
                <p className="text-sm leading-relaxed text-slate-600">{feature}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Rich Content Sections */}
      {content && content.sections.map((section, idx) => (
        <ContentSection
          key={section.id}
          section={section}
          variant={variants[idx % variants.length]}
          serviceName={service.name}
          sectionIndex={idx}
          totalSections={content.sections.length}
        />
      ))}

      {/* Comparison Table */}
      {content?.comparisonTable && (
        <section className="bg-section-white py-16">
          <div className="mx-auto max-w-4xl px-6">
            <h2 className="text-2xl font-bold text-slate-900 font-heading mb-2">Side-by-Side Comparison</h2>
            <p className="text-sm text-slate-500 mb-8">How the options stack up across key factors.</p>
            <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-green-50">
                    {content.comparisonTable.headers.map((h, i) => (
                      <th key={i} className="px-5 py-4 text-left font-semibold text-green-800 font-heading">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {content.comparisonTable.rows.map((row, i) => (
                    <tr key={i} className={`${i % 2 === 0 ? "bg-white" : "bg-slate-50/50"} border-t border-slate-100`}>
                      <td className="px-5 py-3.5 font-medium text-slate-900">{row.feature}</td>
                      {row.values.map((v, j) => (
                        <td key={j} className="px-5 py-3.5 text-slate-600">{v}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* FAQs */}
      {content && content.faqs.length > 0 && (
        <section id="faqs" className="bg-section-green py-16">
          <div className="mx-auto max-w-4xl px-6">
            <div className="text-center mb-10">
              <h2 className="text-2xl font-bold text-slate-900 font-heading">
                Frequently Asked Questions
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Everything you need to know about {service.name}.
              </p>
            </div>
            <div className="space-y-3">
              {content.faqs.map((faq, i) => (
                <details key={i} className="group rounded-xl border border-green-200/60 bg-white shadow-sm">
                  <summary className="cursor-pointer px-6 py-4 text-base font-semibold text-slate-900 transition-colors hover:text-green-700 font-heading flex items-center justify-between">
                    <span>{faq.question}</span>
                    <span className="ml-4 shrink-0 text-green-400 group-open:rotate-180 transition-transform text-lg">
                      &#9662;
                    </span>
                  </summary>
                  <div className="px-6 pb-5 text-base leading-relaxed text-slate-600 border-t border-slate-100 pt-4">
                    {faq.answer}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Inner Links */}
      <section className="bg-section-white py-12">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-lg font-bold text-slate-900 font-heading">Related Landscaping Resources</h2>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { href: "/contact", label: "Get a Free Estimate", desc: "Start your project" },
              { href: "/about", label: "About Us", desc: "Meet our team" },
              { href: "/areas", label: "Browse 137+ Neighborhoods", desc: "Find us near you" },
              { href: "/blog", label: "Landscaping Blog", desc: "Tips and inspiration" },
              { href: "/faq", label: "FAQ", desc: "Common questions" },
              { href: "/services", label: "All Landscaping Services", desc: "Explore all services" },
            ].map((link) => (
              <Link key={link.href} href={link.href} className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 transition-all hover:border-green-400 hover:shadow-sm">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-50 group-hover:bg-green-100 transition-colors">
                  <span className="text-green-600 text-sm font-bold">&rarr;</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 group-hover:text-green-700">{link.label}</p>
                  <p className="text-xs text-slate-400">{link.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Other Services */}
      <section className="bg-section-green py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-2xl font-bold text-slate-900 font-heading">
            Other Landscaping Services
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {otherServices.map((s) => (
              <Link key={s.slug} href={getServiceUrl(s)}>
                <div className="group rounded-xl border border-green-200/60 bg-white p-5 transition-all hover:border-green-400 hover:shadow-md">
                  <h3 className="font-bold text-slate-900 group-hover:text-green-600 font-heading text-sm">
                    {s.name}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">{s.shortDesc}</p>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link
              href="/services"
              className="text-sm font-semibold text-green-600 hover:text-green-700 font-cta"
            >
              View All Services &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-green-700 py-16">
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl font-heading">
            Get {service.name} in Your Neighborhood
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
            Browse 137+ neighborhoods for local landscaping options, get a free estimate, or speak to a specialist today.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/areas">
              <motion.span
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-green-700 shadow-lg transition-colors hover:bg-green-50 font-cta"
              >
                Browse Areas
              </motion.span>
            </Link>
            <a href={SMS_HREF}>
              <motion.span
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta"
              >
                Text Us: {PHONE}
              </motion.span>
            </a>
            <Link href="/contact">
              <motion.span
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta"
              >
                Free Estimate
              </motion.span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
