"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { blogPosts } from "@/app/site/consortium-nyc/_lib/blogData";

const resources = [
  { title: "Free SEO Audit", href: "/the-free-human+ai-seo-marketing-review" },
  { title: "Marketing Checklist", href: "/master-marketing-checklist-last-updated-2026" },
  { title: "ROI Calculator", href: "/annual-marketing-spend-roi-calculator" },
];

export default function BlogSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full lg:w-64 flex-shrink-0">
      <div className="lg:sticky lg:top-36">
        {/* Blog nav */}
        <div className="mb-8">
          <Link href="/the-marketing-blog" className="text-xs font-bold uppercase tracking-wider text-teal-600 mb-3 block font-cta">
            Blog
          </Link>
          <nav className="space-y-1">
            {blogPosts.map((post) => {
              const href = `/the-marketing-blog/${post.slug}`;
              const isActive = pathname === href;
              return (
                <Link
                  key={post.slug}
                  href={href}
                  className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? "bg-teal-50 text-teal-700 font-semibold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  {post.title}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Divider */}
        <div className="h-px bg-slate-200 mb-8" />

        {/* Resources */}
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 font-cta">
            Free Resources
          </p>
          <nav className="space-y-1">
            {resources.map((r) => (
              <Link
                key={r.href}
                href={r.href}
                className="block rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              >
                {r.title}
              </Link>
            ))}
          </nav>
        </div>

      </div>
    </aside>
  );
}
