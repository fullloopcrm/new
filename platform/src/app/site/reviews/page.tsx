const reviews = [
  { name: "Sarah M.", date: "February 2026", rating: 5, comment: "Absolutely wonderful service! They were thorough, professional, and my home has never looked better. Will definitely book again." },
  { name: "James R.", date: "January 2026", rating: 5, comment: "We've been using them for our office space for over a year. Consistent quality and great communication every single time." },
  { name: "Maria L.", date: "January 2026", rating: 5, comment: "The move-out cleaning was incredible. Got our full security deposit back thanks to their attention to detail!" },
  { name: "Tom W.", date: "December 2025", rating: 4, comment: "Great job overall. The team was friendly and efficient. Only minor note is they arrived a few minutes late, but the work was excellent." },
  { name: "Emily C.", date: "December 2025", rating: 5, comment: "I've tried several services in the area and this is by far the best. They go above and beyond every time." },
  { name: "Robert K.", date: "November 2025", rating: 5, comment: "Post-construction cleaning was a huge job and they handled it flawlessly. Our new space looked perfect. Highly recommended." },
  { name: "Anna P.", date: "November 2025", rating: 5, comment: "So easy to book online and the team showed up right on time. The deep cleaning exceeded my expectations." },
  { name: "Michael D.", date: "October 2025", rating: 4, comment: "Solid service at a fair price. The recurring plan has been great for keeping our home consistently clean." },
  { name: "Lisa T.", date: "October 2025", rating: 5, comment: "They cleaned areas I didn't even think to ask about. True professionals who take pride in their work." },
  { name: "Kevin H.", date: "September 2025", rating: 5, comment: "From booking to completion, everything was seamless. The best service experience I've had in years." },
];

const avgRating = (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1);
const fiveStarCount = reviews.filter((r) => r.rating === 5).length;

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

export default function ReviewsPage() {
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
            Based on <span className="font-semibold">{reviews.length}</span> reviews
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {fiveStarCount} out of {reviews.length} reviewers gave 5 stars
          </p>
        </div>

        {/* Reviews List */}
        <div className="space-y-6 max-w-3xl mx-auto">
          {reviews.map((review, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">{review.name}</h3>
                  <p className="text-sm text-slate-500">{review.date}</p>
                </div>
                <StarRating rating={review.rating} />
              </div>
              <p className="mt-4 text-slate-700 leading-relaxed">{review.comment}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
