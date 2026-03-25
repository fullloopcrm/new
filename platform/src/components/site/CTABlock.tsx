export default function CTABlock({ title, subtitle }: { title?: string; subtitle?: string }) {
  return (
    <section className="bg-[#A8F0DC] py-20">
      <div className="max-w-4xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-8">
        <div>
          <h2 className="font-[family-name:var(--font-bebas)] text-3xl md:text-4xl text-[#1E2A4A] tracking-wide">
            {title || 'Ready for a Spotless Home?'}
          </h2>
          <p className="text-[#1E2A4A]/70 text-lg mt-2">
            {subtitle || 'Chat with Selena or call us today — trusted by thousands of NYC residents.'}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4 flex-shrink-0">
          <a href="/chat-with-selena" className="border-2 border-[#1E2A4A] text-[#1E2A4A] px-8 py-3.5 rounded-md font-bold text-sm tracking-widest uppercase hover:bg-[#1E2A4A] hover:text-white transition-colors">
            Chat With Selena
          </a>
          <a href="tel:2122028400" className="text-[#1E2A4A] font-semibold text-lg hover:underline underline-offset-4">
            or Call (212) 202-8400
          </a>
        </div>
      </div>
    </section>
  )
}
