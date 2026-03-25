import Link from 'next/link'

interface FooterProps {
  businessName: string
  phone: string
  email: string
  services: { name: string; href: string }[]
  areas: { name: string; href: string }[]
}

export default function MarketingFooter({ businessName, phone, email, services, areas }: FooterProps) {
  const phoneDigits = phone.replace(/\D/g, '')

  // Split areas into two columns if there are enough
  const areasCol1 = areas.slice(0, Math.ceil(areas.length / 2))
  const areasCol2 = areas.slice(Math.ceil(areas.length / 2))

  return (
    <footer className="bg-[var(--brand)] text-gray-400">
      {/* Main footer brand */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-8">
        <h2 className="font-[family-name:var(--font-bebas)] text-white text-3xl md:text-4xl tracking-wide text-center mb-2">{businessName}</h2>
        <div className="w-16 h-[2px] bg-[var(--brand-accent)] mx-auto mb-12" />
      </div>

      {/* Links grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-10">
          {areasCol1.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-300 tracking-[0.2em] uppercase mb-5">Service Areas</h3>
              <ul className="space-y-2.5">
                {areasCol1.map(link => (
                  <li key={link.href}><Link href={link.href} className="text-sm hover:text-white transition-colors">{link.name}</Link></li>
                ))}
              </ul>
            </div>
          )}
          {areasCol2.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-300 tracking-[0.2em] uppercase mb-5">More Areas</h3>
              <ul className="space-y-2.5">
                {areasCol2.map(link => (
                  <li key={link.href}><Link href={link.href} className="text-sm hover:text-white transition-colors">{link.name}</Link></li>
                ))}
              </ul>
            </div>
          )}
          {services.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-300 tracking-[0.2em] uppercase mb-5">Services</h3>
              <ul className="space-y-2.5">
                {services.map(link => (
                  <li key={link.href}><Link href={link.href} className="text-sm hover:text-white transition-colors">{link.name}</Link></li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <h3 className="text-xs font-semibold text-gray-300 tracking-[0.2em] uppercase mb-5">Company</h3>
            <ul className="space-y-2.5">
              <li><Link href="/about" className="text-sm hover:text-white transition-colors">About Us</Link></li>
              <li><Link href="/contact" className="text-sm hover:text-white transition-colors">Contact</Link></li>
              <li><Link href="/pricing" className="text-sm hover:text-white transition-colors">Pricing</Link></li>
              <li><Link href="/reviews" className="text-sm hover:text-white transition-colors">Reviews</Link></li>
              <li><Link href="/careers" className="text-sm hover:text-white transition-colors">Careers</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-gray-300 tracking-[0.2em] uppercase mb-5">Resources</h3>
            <ul className="space-y-2.5">
              <li><Link href="/book/new" target="_blank" className="text-sm hover:text-white transition-colors">Book Online</Link></li>
              <li><Link href="/referral" className="text-sm hover:text-white transition-colors">Referral Program</Link></li>
              <li><Link href="/faq" className="text-sm hover:text-white transition-colors">FAQ</Link></li>
              <li><Link href="/apply" className="text-sm hover:text-white transition-colors">Apply</Link></li>
              <li><Link href="/feedback" className="text-sm hover:text-white transition-colors">Leave Feedback</Link></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-gray-500">
            <Link href="/privacy-policy" className="hover:text-gray-300 transition-colors">Privacy</Link>
            <Link href="/terms-conditions" className="hover:text-gray-300 transition-colors">Terms</Link>
            <Link href="/refund-policy" className="hover:text-gray-300 transition-colors">Refunds</Link>
            <Link href="/legal" className="hover:text-gray-300 transition-colors">Legal</Link>
          </div>
          <p className="text-xs text-gray-500">&copy; {new Date().getFullYear()} {businessName}{phone ? <> &middot; <a href={`tel:${phoneDigits}`} className="text-[var(--brand-accent)]/70 hover:text-[var(--brand-accent)]">{phone}</a></> : null} &middot; Powered by{' '}<a href="https://www.fullloopcrm.com/" target="_blank" rel="noopener noreferrer" className="text-[var(--brand-accent)] font-semibold hover:text-white underline underline-offset-2 decoration-[var(--brand-accent)]/50">FullLoop CRM</a></p>
        </div>
      </div>
    </footer>
  )
}
