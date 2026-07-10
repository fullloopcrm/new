"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const articles = [
  {
    title: "10 SEO Mistakes NYC Businesses Make in 2026",
    excerpt:
      "Most NYC businesses are sabotaging their own search rankings without realizing it. From ignoring local citations to neglecting mobile speed, these ten mistakes are costing you customers every single day.",
    slug: "10-seo-mistakes-nyc-businesses-2026",
    category: "SEO",
  },
  {
    title: "Local SEO vs National SEO: What Your Business Actually Needs",
    excerpt:
      "The strategies that rank you nationally are completely different from the ones that dominate local search. Here's how to figure out which approach — or combination — will drive the most revenue for your business.",
    slug: "local-seo-vs-national-seo",
    category: "SEO",
  },
  {
    title: "How to Choose a Marketing Company (Without Getting Burned)",
    excerpt:
      "The agency landscape is full of big promises and little accountability. We break down the exact questions to ask, red flags to watch for, and benchmarks to demand before signing any contract.",
    slug: "how-to-choose-digital-marketing-agency",
    category: "Strategy",
  },
];

export default function BlogPreview() {
  return (
    <section className="py-20 sm:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-teal-600 text-sm font-semibold tracking-[0.2em] uppercase mb-4">
            From the Blog
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 font-heading">
            Latest <span className="text-teal-600">Insights</span>
          </h2>
          <p className="text-slate-600 text-lg max-w-2xl mx-auto">
            Actionable strategies and honest analysis from the team that lives
            and breathes digital marketing in the tri-state area.
          </p>
        </motion.div>

        {/* Article Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {articles.map((article, i) => (
            <motion.article
              key={article.slug}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="group rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-teal-300 p-6 sm:p-8 transition-all flex flex-col"
            >
              <p className="text-teal-600 text-xs font-bold tracking-wide uppercase mb-4 font-cta">
                {article.category}
              </p>
              <h3 className="text-lg font-bold text-slate-900 group-hover:text-teal-600 transition-colors mb-3 leading-snug font-heading">
                {article.title}
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-6 flex-1">
                {article.excerpt}
              </p>
              <Link
                href={`/the-marketing-blog/${article.slug}`}
                className="inline-flex items-center gap-2 text-teal-600 text-sm font-semibold hover:underline font-cta"
              >
                Read More
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </Link>
            </motion.article>
          ))}
        </div>

        {/* View All */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-center mt-12"
        >
          <Link
            href="/the-marketing-blog"
            className="inline-flex items-center gap-2 text-teal-600 font-semibold hover:underline transition-all font-cta"
          >
            View All Articles
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
