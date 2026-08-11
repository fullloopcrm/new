import type { SiteConfig } from '@/app/site/template/_config/types'
import ReviewsList from '@/app/site/template/reviews/ReviewsList'

// Reviews page for the streetwear-editorial variant — real per-tenant
// reviews (ReviewsList reads /api/reviews, already tenant-generic) inside
// streetwear chrome instead of the cleaning-business editorial page.
export default function StreetwearReviews({ config }: { config: SiteConfig }) {
  return (
    <div className="bg-black min-h-screen text-white">
      <div className="max-w-[1600px] mx-auto px-5 sm:px-8 pt-12 pb-8 border-b border-white/10">
        <p className="text-[var(--accent)] text-[11px] font-bold tracking-[0.25em] uppercase mb-2 font-[family-name:var(--font-plex-mono)]">
          {config.identity.name}
        </p>
        <h1 className="font-[family-name:var(--font-anton)] text-5xl sm:text-6xl uppercase tracking-wide mb-3">Reviews</h1>
        <p className="text-white/50 max-w-xl leading-relaxed">What the block is saying.</p>
      </div>

      <section className="bg-white text-black py-16 sm:py-24">
        <div className="max-w-[1600px] mx-auto px-5 sm:px-8 max-w-3xl">
          <ReviewsList />
        </div>
      </section>

      {config.googleReviewLink && (
        <section className="bg-white text-black pb-16 sm:pb-24 border-t border-black/10 pt-16">
          <div className="max-w-[1600px] mx-auto px-5 sm:px-8 max-w-3xl">
            <a
              href={config.googleReviewLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-black text-white px-8 py-4 font-bold text-sm tracking-[0.15em] uppercase hover:bg-[var(--accent)] hover:text-black transition-colors"
            >
              Write a Review
            </a>
          </div>
        </section>
      )}
    </div>
  )
}
