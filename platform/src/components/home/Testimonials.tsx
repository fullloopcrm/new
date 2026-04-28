"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { testimonials } from "@/lib/siteData";

function Stars({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          className={`w-5 h-5 ${i < count ? "text-[#1F4D2C]" : "text-[#1C1C1C]"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export default function Testimonials() {
  return (
    <section className="py-20 sm:py-28 bg-[#F4F4F1]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-[#1F4D2C] text-sm font-semibold tracking-[0.2em] uppercase mb-4 font-cta">
            Home Service Business Reviews
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#1C1C1C] mb-4 font-heading">
            What Home Service Business Owners Are Saying{" "}
            <span className="text-[#1F4D2C]">About Full Loop CRM</span>
          </h2>

          {/* Overall rating summary */}
          <div className="flex flex-col items-center gap-3 mt-8">
            <div className="flex items-center gap-3">
              <span className="text-4xl font-extrabold text-[#1C1C1C] font-mono">5.0</span>
              <div>
                <Stars count={5} />
                <p className="text-[#6F6F6B] text-xs mt-1">
                  Average Rating
                </p>
              </div>
            </div>

            {/* Google Reviews badge */}
            <div className="flex items-center gap-2 mt-2 px-4 py-2 rounded-full bg-white/10 border border-white/20">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              <span className="text-[#1C1C1C] text-sm font-medium">Google Reviews</span>
              <span className="text-[#1C1C1C] text-sm">&middot;</span>
              <span className="text-[#1F4D2C] text-sm font-semibold">10 Reviews</span>
            </div>
          </div>
        </motion.div>

        {/* Testimonial cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="rounded-xl bg-[#FAF9F5] border border-[#C8C5BC] hover:border-[#C8C5BC] transition-colors p-5 flex flex-col"
            >
              {/* Header: avatar + name + Google logo */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#1F4D2C] flex items-center justify-center shrink-0">
                    <span className="text-[#1C1C1C] font-bold text-sm font-heading">
                      {t.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="text-[#1C1C1C] font-semibold text-sm font-heading leading-tight">{t.name}</p>
                    <p className="text-[#6F6F6B] text-xs leading-tight">{t.business}</p>
                    <Stars count={t.rating} />
                  </div>
                </div>
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
              </div>

              {/* Review text */}
              <p className="text-[#1C1C1C] text-sm leading-relaxed flex-1">
                {t.text}
              </p>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mt-16"
        >
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/contact"
              className="inline-block px-8 py-4 text-base font-bold text-slate-900 rounded-lg bg-white hover:bg-slate-100 transition-colors shadow-lg font-cta"
            >
              Check Your City&apos;s Availability
            </Link>
            <Link
              href="/contact"
              className="inline-block px-8 py-4 text-base font-bold text-[#1C1C1C] rounded-lg bg-[#1F4D2C] hover:bg-[#1F4D2C] transition-colors shadow-lg font-cta"
            >
              Become Our Next Success Story
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
