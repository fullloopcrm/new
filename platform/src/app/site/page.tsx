import Link from "next/link";
import { getTenantFromHeaders, getTenantServices, getTenantReviews } from "@/lib/tenant-site";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenantFromHeaders();
  return {
    title: tenant ? `${tenant.name} — Home` : "Home",
    description: tenant?.tagline || "Professional service you can trust.",
  };
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5 text-amber-400">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} className={`w-5 h-5 ${i < rating ? "fill-current" : "text-slate-300"}`} viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export default async function HomePage() {
  const tenant = await getTenantFromHeaders();
  if (!tenant) return null;

  const services = await getTenantServices(tenant.id);
  const reviews = await getTenantReviews(tenant.id);
  const topReviews = reviews.slice(0, 3);

  const businessName = tenant.name || "Our Business";
  const tagline = tenant.tagline || "Professional Service You Can Trust";
  const phone = tenant.phone || "";

  // Calculate years in business
  const createdAt = tenant.created_at ? new Date(tenant.created_at) : new Date();
  const yearsInBusiness = Math.max(1, Math.floor((Date.now() - createdAt.getTime()) / (365.25 * 24 * 60 * 60 * 1000)));

  // Calculate average rating from reviews
  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum: number, r: { rating: number }) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-slate-50 to-slate-100 py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 leading-tight">
            {businessName}
            <br />
            <span className="text-[var(--brand)]">{tagline}</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto">
            Book online in minutes and experience the difference that true professionals make.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/site/book"
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold text-white bg-[var(--brand)] hover:bg-[var(--brand-dark)] rounded-lg transition-colors shadow-lg"
            >
              Book Now
            </Link>
            {phone && (
              <a
                href={`tel:${phone.replace(/[^+\d]/g, '')}`}
                className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors"
              >
                Call {phone}
              </a>
            )}
            {!phone && (
              <Link
                href="/site/services"
                className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors"
              >
                Learn More
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="py-12 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-[var(--brand)]">{yearsInBusiness}+</div>
              <div className="mt-1 text-sm text-slate-600">{yearsInBusiness === 1 ? "Year" : "Years"} in Business</div>
            </div>
            {avgRating && (
              <div>
                <div className="text-3xl font-bold text-[var(--brand)]">{avgRating}</div>
                <div className="mt-1 text-sm text-slate-600">Average Rating</div>
              </div>
            )}
            {reviews.length > 0 && (
              <div>
                <div className="text-3xl font-bold text-[var(--brand)]">{reviews.length}+</div>
                <div className="mt-1 text-sm text-slate-600">Reviews</div>
              </div>
            )}
            <div>
              <div className="text-3xl font-bold text-[var(--brand)]">100%</div>
              <div className="mt-1 text-sm text-slate-600">Satisfaction Guarantee</div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      {services.length > 0 && (
        <section className="py-16 lg:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-slate-900">Our Services</h2>
              <p className="mt-3 text-slate-600 max-w-xl mx-auto">
                We offer a range of professional services tailored to your needs.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.slice(0, 6).map((service: { id: string; name: string; description?: string }) => (
                <div
                  key={service.id}
                  className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-lg hover:border-[var(--brand)]/30 transition-all"
                >
                  <h3 className="text-lg font-semibold text-slate-900">{service.name}</h3>
                  {service.description && (
                    <p className="mt-2 text-sm text-slate-600 leading-relaxed">{service.description}</p>
                  )}
                </div>
              ))}
            </div>
            <div className="text-center mt-10">
              <Link
                href="/site/services"
                className="inline-flex items-center text-sm font-semibold text-[var(--brand)] hover:text-[var(--brand-dark)] transition-colors"
              >
                View All Services &rarr;
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Testimonials */}
      {topReviews.length > 0 && (
        <section className="py-16 lg:py-20 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-slate-900">What Our Clients Say</h2>
              <p className="mt-3 text-slate-600">Don&apos;t just take our word for it.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {topReviews.map((review: { id?: string; author_name?: string; rating?: number; text?: string }, i: number) => (
                <div key={review.id || i} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                  <StarRating rating={review.rating || 5} />
                  {review.text && (
                    <p className="mt-4 text-slate-700 leading-relaxed">&ldquo;{review.text}&rdquo;</p>
                  )}
                  {review.author_name && (
                    <p className="mt-4 text-sm font-semibold text-slate-900">{review.author_name}</p>
                  )}
                </div>
              ))}
            </div>
            <div className="text-center mt-10">
              <Link
                href="/site/reviews"
                className="inline-flex items-center text-sm font-semibold text-[var(--brand)] hover:text-[var(--brand-dark)] transition-colors"
              >
                Read All Reviews &rarr;
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* CTA Banner */}
      <section className="py-16 lg:py-20 bg-[var(--brand)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white">Ready to Get Started?</h2>
          <p className="mt-4 text-lg text-white/80 max-w-xl mx-auto">
            Book your first appointment online in just a few minutes. No commitment required.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/site/book"
              className="inline-flex items-center px-8 py-3.5 text-base font-semibold text-[var(--brand)] bg-white hover:bg-slate-50 rounded-lg transition-colors shadow-lg"
            >
              Book Now
            </Link>
            {phone && (
              <a
                href={`tel:${phone.replace(/[^+\d]/g, '')}`}
                className="inline-flex items-center px-8 py-3.5 text-base font-semibold text-white border-2 border-white/50 hover:bg-white/10 rounded-lg transition-colors"
              >
                Call {phone}
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Selena Web Chat Widget */}
      {tenant.selena_config?.enabled && (
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var s = document.createElement('script');
                s.src = '/selena-widget.js';
                s.dataset.tenantId = '${tenant.id}';
                document.body.appendChild(s);
              })();
            `,
          }}
        />
      )}
    </div>
  );
}
