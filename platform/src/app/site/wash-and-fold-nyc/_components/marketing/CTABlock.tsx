// @ts-nocheck
export default function CTABlock({ title, subtitle }: { title?: string; subtitle?: string }) {
  return (
    <section className="bg-gradient-to-r from-[#4BA3D4] to-[#7EC8E3] py-20">
      <div className="max-w-4xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-8">
        <div>
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-white tracking-wide">
            {title || 'Ready for Fresh, Folded Laundry?'}
          </h2>
          <p className="text-white/80 text-lg mt-2">
            {subtitle || 'Text or call us today — $3/lb, free pickup & delivery across NYC.'}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4 flex-shrink-0">
          <a href="sms:9179706002" className="border-2 border-white text-white px-8 py-3.5 rounded-md font-bold text-sm tracking-widest uppercase hover:bg-white hover:text-[#4BA3D4] transition-colors">
            Text (917) 970-6002
          </a>
          <a href="tel:9179706002" className="text-white font-semibold text-lg hover:underline underline-offset-4">
            or Call (917) 970-6002
          </a>
        </div>
      </div>
    </section>
  )
}
