// @ts-nocheck
import Link from "next/link";
import Logo from "@/app/site/stretch-service/_components/Logo";
import { SITE_SMS_LINK, SITE_PHONE } from "@/app/site/stretch-service/_lib/siteData";

export default function NotFound() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-teal-800 pt-36 pb-24 sm:pt-44 min-h-screen">
      <div className="absolute inset-0 grid-bg opacity-30" />
      <div className="relative mx-auto max-w-3xl px-6 text-center">
        <div className="mb-6 flex justify-center">
        </div>
        <p className="text-8xl font-bold text-white/20 font-heading">404</p>
        <h1 className="mt-4 text-3xl font-bold text-white font-heading">Page Not Found</h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
          The page you&apos;re looking for doesn&apos;t exist or has moved. But our assisted stretch service is still here — $99/hr, mobile across all 50 states.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link href="/">
            <span className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-colors hover:bg-teal-50 font-cta">Go Home</span>
          </Link>
          <a href={SITE_SMS_LINK}>
            <span className="inline-block rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/60 font-cta">Text {SITE_PHONE}</span>
          </a>
        </div>
        <div className="mx-auto mt-12 max-w-2xl">
          <p className="text-sm font-semibold text-teal-200 mb-4">Popular Pages:</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Link href="/services" className="rounded-lg bg-white/10 px-4 py-3 text-sm text-white hover:bg-white/20 transition-colors">Services</Link>
            <Link href="/locations" className="rounded-lg bg-white/10 px-4 py-3 text-sm text-white hover:bg-white/20 transition-colors">Locations</Link>
            <Link href="/parks" className="rounded-lg bg-white/10 px-4 py-3 text-sm text-white hover:bg-white/20 transition-colors">Parks</Link>
            <Link href="/pricing" className="rounded-lg bg-white/10 px-4 py-3 text-sm text-white hover:bg-white/20 transition-colors">Pricing</Link>
            <Link href="/hotel-stretching" className="rounded-lg bg-white/10 px-4 py-3 text-sm text-white hover:bg-white/20 transition-colors">Hotel Stretch</Link>
            <Link href="/stretching-101" className="rounded-lg bg-white/10 px-4 py-3 text-sm text-white hover:bg-white/20 transition-colors">Stretching 101</Link>
            <Link href="/faq" className="rounded-lg bg-white/10 px-4 py-3 text-sm text-white hover:bg-white/20 transition-colors">FAQ</Link>
            <Link href="/contact" className="rounded-lg bg-white/10 px-4 py-3 text-sm text-white hover:bg-white/20 transition-colors">Contact</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
