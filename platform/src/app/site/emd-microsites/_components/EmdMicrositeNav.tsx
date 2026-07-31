'use client'

const SECTIONS = [
  { id: 'services', label: 'Services' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'areas', label: 'Areas We Serve' },
  { id: 'faq', label: 'FAQ' },
]

/** In-page section menu for one-page EMD microsites — anchors to sections on this same page, not links to other pages (those routes don't exist on the EMD domain). */
export default function EmdMicrositeNav({ brandName, bookUrl }: { brandName: string; bookUrl: string }) {
  return (
    <header className="bg-white sticky top-0 z-50 shadow-sm">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <a href="#main-content" className="flex-shrink-0 leading-tight">
            <span className="block font-[family-name:var(--font-bebas)] text-2xl text-[#1E2A4A] tracking-wide">{brandName}</span>
            <span className="block text-[10px] text-gray-500 tracking-wide">(A Florida Maid Services Company)</span>
          </a>
          <nav className="hidden md:flex items-center gap-6">
            {SECTIONS.map(s => (
              <a key={s.id} href={`#${s.id}`} className="text-[#1E2A4A] hover:text-[#CC6222] font-medium text-sm tracking-wide transition-colors">
                {s.label}
              </a>
            ))}
          </nav>
          <a
            href={bookUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 bg-[#CC6222] text-white px-5 py-2.5 rounded-lg font-bold text-xs tracking-widest uppercase hover:bg-[#B5551D] transition-colors"
          >
            Book Now
          </a>
        </div>
      </div>
    </header>
  )
}
