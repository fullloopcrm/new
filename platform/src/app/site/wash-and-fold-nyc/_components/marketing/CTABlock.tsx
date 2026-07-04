// @ts-nocheck
import PickupRequestForm from '@/app/site/wash-and-fold-nyc/(marketing)/_components/PickupRequestForm'

/**
 * Sitewide lead band — renders on every marketing page. Primary path is the
 * $10 self-book quick-book form (posts to the FL backend). Secondary is Text/Call.
 */
export default function CTABlock({ title, subtitle }: { title?: string; subtitle?: string }) {
  return (
    <section className="bg-gradient-to-r from-[#4BA3D4] to-[#7EC8E3] py-16">
      <div className="max-w-5xl mx-auto px-4 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <p className="text-white/90 text-xs font-semibold tracking-[0.25em] uppercase mb-3">Self-Book &amp; Save $10</p>
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-white tracking-wide">
            {title || 'Ready for Fresh, Folded Laundry?'}
          </h2>
          <p className="text-white/80 text-lg mt-2">
            {subtitle || 'Book your pickup online and save $10 — $3/lb, free pickup & delivery across NYC.'}
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <a href="sms:9179706002" className="border-2 border-white text-white px-6 py-3 rounded-md font-bold text-sm tracking-widest uppercase hover:bg-white hover:text-[#4BA3D4] transition-colors">
              Or Text (917) 970-6002
            </a>
            <a href="tel:9179706002" className="text-white font-semibold hover:underline underline-offset-4">or Call</a>
          </div>
        </div>
        <div className="rounded-2xl bg-white shadow-xl p-6">
          <p className="font-[family-name:var(--font-bebas)] text-xl text-[#1a3a5c] tracking-wide mb-1">Quick-Book — Save $10</p>
          <p className="text-gray-500 text-xs mb-4">Drop your details, we&apos;ll text to confirm a pickup window.</p>
          <PickupRequestForm compact selfBook />
        </div>
      </div>
    </section>
  )
}
