import { getTenantFromHeaders, getTenantReviews } from "@/lib/tenant-site";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenantFromHeaders();
  return {
    title: tenant ? `Reviews — ${tenant.name}` : "Reviews",
    description: tenant ? `See what customers say about ${tenant.name}.` : "Customer reviews.",
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

export default async function ReviewsPage() {
  const tenant = await getTenantFromHeaders();
  if (!tenant) return null;

  const reviews = await getTenantReviews(tenant.id);

  if (reviews.length === 0) {
    return (
      <div className="py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold text-slate-900">Customer Reviews</h1>
          <p className="mt-6 text-lg text-slate-500">Reviews coming soon.</p>
        </div>
      </div>
    );
  }

  const avgRating = (reviews.reduce((sum: number, r: { rating?: number }) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1);
  const fiveStarCount = reviews.filter((r: { rating?: number }) => r.rating === 5).length;

  return (
    <div className="py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-14">
          <h1 className="text-4xl font-bold text-slate-900">Customer Reviews</h1>
          <p className="mt-4 text-lg text-slate-600">See what our clients have to say about their experience.</p>
        </div>

        {/* Rating Summary */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 mb-12 max-w-lg mx-auto text-center">
          <div className="text-5xl font-bold text-slate-900">{avgRating}</div>
          <div className="mt-2 flex justify-center">
            <StarRating rating={Math.round(Number(avgRating))} />
          </div>
          <p className="mt-3 text-slate-600">
            Based on <span className="font-semibold">{reviews.length}</span> review{reviews.length !== 1 ? "s" : ""}
          </p>
          {fiveStarCount > 0 && (
            <p className="mt-1 text-sm text-slate-500">
              {fiveStarCount} out of {reviews.length} gave 5 stars
            </p>
          )}
        </div>

        {/* Reviews List */}
        <div className="space-y-6 max-w-3xl mx-auto">
          {reviews.map((review: {
            id?: string;
            author_name?: string;
            rating?: number;
            text?: string;
            created_at?: string;
          }, i: number) => {
            const dateStr = review.created_at
              ? new Date(review.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long" })
              : "";

            return (
              <div key={review.id || i} className="bg-white border border-slate-200 rounded-xl p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900">{review.author_name || "Anonymous"}</h3>
                    {dateStr && <p className="text-sm text-slate-500">{dateStr}</p>}
                  </div>
                  <StarRating rating={review.rating || 5} />
                </div>
                {review.text && (
                  <p className="mt-4 text-slate-700 leading-relaxed">{review.text}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
