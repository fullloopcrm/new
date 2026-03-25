export default function CTABlock({ title, subtitle, phone }: { title?: string; subtitle?: string; phone?: string }) {
  const phoneDigits = phone?.replace(/\D/g, '') || ''
  return (
    <section className="bg-[var(--brand-accent)] py-20">
      <div className="max-w-4xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-8">
        <div>
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[var(--brand)] tracking-wide">
            {title || 'Ready to Get Started?'}
          </h2>
          <p className="text-[var(--brand)]/70 text-lg mt-2">
            {subtitle || 'Chat with us or call today.'}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4 flex-shrink-0">
          <a href="/book/new" className="border-2 border-[var(--brand)] text-[var(--brand)] px-8 py-3.5 rounded-md font-bold text-sm tracking-widest uppercase hover:bg-[var(--brand)] hover:text-white transition-colors">
            Book Online
          </a>
          {phone && (
            <a href={`tel:${phoneDigits}`} className="text-[var(--brand)] font-semibold text-lg hover:underline underline-offset-4">
              or Call {phone}
            </a>
          )}
        </div>
      </div>
    </section>
  )
}
