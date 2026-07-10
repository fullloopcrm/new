"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const reviews = [
  {
    platform: "Google",
    stars: "5.0",
    starCount: 5,
    badge: "50+ Reviews",
    snippet:
      "The NYC Marketing Company completely transformed our online presence. Within 3 months we were ranking on page one for every keyword that matters. Our leads tripled and our phone won't stop ringing. Best investment we've made in 10 years of business.",
    author: "— Michael R., Restaurant Owner, Manhattan",
  },
  {
    platform: "Clutch",
    stars: "4.9",
    starCount: 5,
    badge: "Top Digital Agency NYC 2025",
    snippet:
      "We interviewed six agencies before choosing The NYC Marketing Company. Nobody else came close to their level of strategic thinking. They don't just execute — they think like business owners. Revenue is up 140% year over year and we've cut our ad spend by 30%.",
    author: "— Sarah K., E-Commerce Founder, Brooklyn",
  },
  {
    platform: "Yelp",
    stars: "5.0",
    starCount: 5,
    badge: "Best of NYC",
    snippet:
      "After getting burned by two other agencies, we were skeptical. The NYC Marketing Company proved us wrong in the first month. Transparent reporting, real results, and a team that actually picks up the phone. They treat our business like it's their own.",
    author: "— David L., Law Firm Partner, Midtown",
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" as const },
  },
};

function StarRating({ count }: { count: number }) {
  return (
    <span className="text-yellow-400 text-xl tracking-wider">
      {Array.from({ length: count })
        .map(() => "\u2605")
        .join("")}
    </span>
  );
}

export default function SocialProof() {
  return (
    <section className="relative py-24 px-6 bg-white overflow-hidden">
      <div className="max-w-6xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 font-heading">
            Don&apos;t Take Our Word for It
          </h2>
          <p className="text-slate-600 text-lg max-w-2xl mx-auto">
            Our clients do the talking. Here&apos;s what happens when you partner with
            a team that actually delivers.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {reviews.map((review) => (
            <motion.div
              key={review.platform}
              variants={cardVariants}
              className="rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-8 flex flex-col"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-slate-900 font-bold text-xl font-heading">
                  {review.platform}
                </span>
                <span className="text-teal-600 text-sm font-semibold px-3 py-1 rounded-full border border-teal-500/30 bg-teal-50">
                  {review.badge}
                </span>
              </div>

              <div className="flex items-center gap-3 mb-5">
                <StarRating count={review.starCount} />
                <span className="text-slate-900 font-bold text-lg font-mono">
                  {review.stars}
                </span>
              </div>

              <p className="text-slate-600 leading-relaxed flex-1 mb-6 text-sm">
                &ldquo;{review.snippet}&rdquo;
              </p>

              <p className="text-slate-400 text-sm font-medium">{review.author}</p>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="text-center mt-12"
        >
          <Link
            href="/reviews"
            className="text-teal-600 hover:text-teal-700 transition-colors font-semibold text-lg underline underline-offset-4 font-cta"
          >
            Read all our reviews &rarr;
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
