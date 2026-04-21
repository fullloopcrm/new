import Link from 'next/link'

export default function CTABlock({ title, subtitle }: { title?: string; subtitle?: string }) {
  return (
    <section className="bg-[#A8F0DC] py-20">
      <div className="max-w-4xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-8">
        <div>
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#1E2A4A] tracking-wide">
            {title || 'Ready for a Spotless Home?'}
          </h2>
          <p className="text-[#1E2A4A]/70 text-lg mt-2">
            {subtitle || 'Text us today — trusted by thousands of NYC residents.'}
          </p>
          <div className="flex items-center gap-3 mt-3">
            <Link href="/reviews" className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
              <span className="text-yellow-500 text-sm">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
              <span className="text-[#1E2A4A]/70 text-sm font-medium">5.0 from 50+ verified reviews</span>
            </Link>
            <span className="text-[#1E2A4A]/30">|</span>
            <Link href="/reviews/submit" className="text-[#1E2A4A] text-sm font-semibold underline underline-offset-2 hover:opacity-80">Write a Review</Link>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 flex-shrink-0">
          <a href="tel:2122029030" className="bg-[#1E2A4A] text-white px-8 py-3.5 rounded-md font-bold text-sm tracking-widest uppercase hover:bg-[#1E2A4A]/90 transition-colors">
            Call (212) 202-9030
          </a>
          <a href="sms:2122029030" className="border-2 border-[#1E2A4A] text-[#1E2A4A] px-8 py-3.5 rounded-md font-bold text-sm tracking-widest uppercase hover:bg-[#1E2A4A] hover:text-white transition-colors">
            Text (212) 202-9030
          </a>
        </div>
      </div>
    </section>
  )
}
