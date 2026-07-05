"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { blogPosts } from "@/app/site/consortium-nyc/_lib/blogData";

export default function BlogNav() {
  const pathname = usePathname();
  const currentIndex = blogPosts.findIndex((p) => `/the-marketing-blog/${p.slug}` === pathname);

  if (currentIndex === -1) return null;

  const prev = currentIndex > 0 ? blogPosts[currentIndex - 1] : null;
  const next = currentIndex < blogPosts.length - 1 ? blogPosts[currentIndex + 1] : null;

  return (
    <div className="mt-16 pt-8 border-t border-slate-200">
      <div className="flex items-stretch gap-4">
        {prev ? (
          <Link
            href={`/the-marketing-blog/${prev.slug}`}
            className="flex-1 group rounded-xl border border-slate-200 hover:border-teal-300 p-5 transition-all"
          >
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-2 font-cta">&larr; Previous</p>
            <p className="text-sm font-bold text-slate-900 group-hover:text-teal-600 transition-colors font-heading">
              {prev.title}
            </p>
          </Link>
        ) : (
          <div className="flex-1" />
        )}

        {next ? (
          <Link
            href={`/the-marketing-blog/${next.slug}`}
            className="flex-1 group rounded-xl border border-slate-200 hover:border-teal-300 p-5 transition-all text-right"
          >
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-2 font-cta">Next &rarr;</p>
            <p className="text-sm font-bold text-slate-900 group-hover:text-teal-600 transition-colors font-heading">
              {next.title}
            </p>
          </Link>
        ) : (
          <div className="flex-1" />
        )}
      </div>
    </div>
  );
}
