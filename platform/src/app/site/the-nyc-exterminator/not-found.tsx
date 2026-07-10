import Link from "next/link";
import { PHONE } from "@/app/site/the-nyc-exterminator/_lib/seo";

const phonePlain = PHONE.replace(/-/g, "");

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-[#0A0A0A] px-4 text-white">
      <div className="max-w-lg text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-green-500">
          Page Not Found
        </p>
        <h1 className="mt-3 text-5xl font-extrabold tracking-tight sm:text-6xl">
          404
        </h1>
        <p className="mt-4 text-lg text-zinc-400">
          This page doesn&apos;t exist &mdash; but we do. Let&apos;s get you back on track.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="inline-flex items-center rounded-xl bg-green-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-green-600/25 hover:bg-green-500"
          >
            Back to Home
          </Link>
          <Link
            href="/services"
            className="inline-flex items-center rounded-xl border border-zinc-700 bg-white/5 px-6 py-3 text-sm font-bold text-white hover:border-zinc-500 hover:bg-white/10"
          >
            View Services
          </Link>
          <a
            href={`sms:${phonePlain}`}
            className="inline-flex items-center rounded-xl px-6 py-3 text-sm font-bold text-green-400 hover:text-green-300"
          >
            Text Us
          </a>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Services", href: "/services" },
            { label: "Areas", href: "/areas" },
            { label: "Pricing", href: "/pricing" },
            { label: "Tips", href: "/pest-control-tips" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2.5 text-xs font-medium text-zinc-400 hover:border-green-500/50 hover:text-green-400"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
