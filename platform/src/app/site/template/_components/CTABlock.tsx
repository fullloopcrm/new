import Link from 'next/link'

export default function CTABlock({ title, subtitle }: { title?: string; subtitle?: string }) {
  return (
    <section className="bg-[var(--accent)] py-20">
      <div className="max-w-4xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-8">
        <div>
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[var(--brand)] tracking-wide">
            {title || 'Ready for a Spotless Home?'}
          </h2>
          <p className="text-[rgb(var(--brand-rgb)/0.7)] text-lg mt-2">
            {subtitle || 'Book online in under a minute — trusted by thousands of NYC residents.'}
          </p>
          <div className="flex items-center gap-3 mt-3">
            <Link href="/reviews" className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
              <span className="text-yellow-500 text-sm">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
              <span className="text-[rgb(var(--brand-rgb)/0.7)] text-sm font-medium">5.0 from 50+ verified reviews</span>
            </Link>
            <span className="text-[rgb(var(--brand-rgb)/0.3)]">|</span>
            <Link href="https://g.page/r/CSX9IqciUG9SEAE/review" className="text-[var(--brand)] text-sm font-semibold underline underline-offset-2 hover:opacity-80">Write a Review</Link>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 flex-shrink-0">
          <Link href="/book/new" className="bg-[var(--brand)] text-white px-8 py-3.5 rounded-md font-bold text-sm tracking-widest uppercase hover:bg-[rgb(var(--brand-rgb)/0.9)] transition-colors">
            Self Booking $10 OFF
          </Link>
          <a href="sms:5555555555" className="border-2 border-[var(--brand)] text-[var(--brand)] px-8 py-3.5 rounded-md font-bold text-sm tracking-widest uppercase hover:bg-[var(--brand)] hover:text-white transition-colors">
            Text 555.555.5555
          </a>
        </div>
      </div>
    </section>
  )
}
