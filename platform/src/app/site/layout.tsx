import Link from "next/link";
import { getTenantFromHeaders } from "@/lib/tenant-site";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const tenant = await getTenantFromHeaders();

  if (!tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-900">Site Not Found</h1>
          <p className="mt-4 text-slate-600">
            The site you are looking for does not exist or is not configured.
          </p>
        </div>
      </div>
    );
  }

  const businessName = tenant.name || "Business";
  const phone = tenant.phone || "";
  const email = tenant.email || "";
  const address = tenant.address || "";
  const primaryColor = tenant.primary_color || "oklch(0.55 0.15 175)";
  const secondaryColor = tenant.secondary_color || "oklch(0.48 0.15 175)";
  const tagline = tenant.tagline || "";

  return (
    <div
      className="min-h-screen flex flex-col"
      style={
        {
          "--brand": primaryColor,
          "--brand-dark": secondaryColor,
        } as React.CSSProperties
      }
    >
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/site" className="text-xl font-bold text-slate-900 hover:text-[var(--brand)] transition-colors">
              {tenant.logo_url ? (
                <img src={tenant.logo_url} alt={businessName} className="h-10 w-auto" />
              ) : (
                businessName
              )}
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-8">
              <Link href="/site/services" className="text-sm font-medium text-slate-600 hover:text-[var(--brand)] transition-colors">
                Services
              </Link>
              <Link href="/site/about" className="text-sm font-medium text-slate-600 hover:text-[var(--brand)] transition-colors">
                About
              </Link>
              <Link href="/site/reviews" className="text-sm font-medium text-slate-600 hover:text-[var(--brand)] transition-colors">
                Reviews
              </Link>
              <Link href="/site/contact" className="text-sm font-medium text-slate-600 hover:text-[var(--brand)] transition-colors">
                Contact
              </Link>
              <Link
                href="/site/book"
                className="inline-flex items-center px-5 py-2 text-sm font-semibold text-white bg-[var(--brand)] hover:bg-[var(--brand-dark)] rounded-lg transition-colors"
              >
                Book Now
              </Link>
            </nav>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <Link
                href="/site/book"
                className="inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-[var(--brand)] hover:bg-[var(--brand-dark)] rounded-lg transition-colors"
              >
                Book Now
              </Link>
            </div>
          </div>

          {/* Mobile Nav */}
          <nav className="md:hidden flex items-center gap-6 pb-3 overflow-x-auto">
            <Link href="/site/services" className="text-sm font-medium text-slate-600 hover:text-[var(--brand)] transition-colors whitespace-nowrap">
              Services
            </Link>
            <Link href="/site/about" className="text-sm font-medium text-slate-600 hover:text-[var(--brand)] transition-colors whitespace-nowrap">
              About
            </Link>
            <Link href="/site/reviews" className="text-sm font-medium text-slate-600 hover:text-[var(--brand)] transition-colors whitespace-nowrap">
              Reviews
            </Link>
            <Link href="/site/contact" className="text-sm font-medium text-slate-600 hover:text-[var(--brand)] transition-colors whitespace-nowrap">
              Contact
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Business Info */}
            <div>
              <h3 className="text-lg font-bold text-white mb-4">{businessName}</h3>
              {tagline && (
                <p className="text-sm leading-relaxed">{tagline}</p>
              )}
              {!tagline && (
                <p className="text-sm leading-relaxed">
                  Professional, reliable, and trusted. We take pride in delivering exceptional service every time.
                </p>
              )}
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-lg font-bold text-white mb-4">Quick Links</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/site" className="hover:text-white transition-colors">Home</Link>
                </li>
                <li>
                  <Link href="/site/services" className="hover:text-white transition-colors">Services</Link>
                </li>
                <li>
                  <Link href="/site/about" className="hover:text-white transition-colors">About Us</Link>
                </li>
                <li>
                  <Link href="/site/reviews" className="hover:text-white transition-colors">Reviews</Link>
                </li>
                <li>
                  <Link href="/site/book" className="hover:text-white transition-colors">Book Online</Link>
                </li>
                <li>
                  <Link href="/site/contact" className="hover:text-white transition-colors">Contact</Link>
                </li>
              </ul>
            </div>

            {/* Contact Info */}
            <div>
              <h3 className="text-lg font-bold text-white mb-4">Contact Us</h3>
              <ul className="space-y-2 text-sm">
                {address && <li>{address}</li>}
                {phone && (
                  <li>
                    <a href={`tel:${phone.replace(/[^+\d]/g, '')}`} className="hover:text-white transition-colors">{phone}</a>
                  </li>
                )}
                {email && (
                  <li>
                    <a href={`mailto:${email}`} className="hover:text-white transition-colors">{email}</a>
                  </li>
                )}
              </ul>
            </div>
          </div>

          <div className="mt-10 pt-8 border-t border-slate-700 text-center text-sm text-slate-500">
            &copy; {new Date().getFullYear()} {businessName}. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
