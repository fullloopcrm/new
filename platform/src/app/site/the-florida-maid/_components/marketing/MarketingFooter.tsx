import Link from 'next/link'

const southFloridaLinks = [
  { name: 'Miami Beach', href: '/miami-beach-maid-service' },
  { name: 'Brickell', href: '/brickell-maid-service' },
  { name: 'Coral Gables', href: '/coral-gables-maid-service' },
  { name: 'Fort Lauderdale', href: '/fort-lauderdale-maid-service' },
  { name: 'Hollywood', href: '/hollywood-florida-maid-service' },
  { name: 'Boca Raton', href: '/boca-raton-maid-service' },
  { name: 'West Palm Beach', href: '/west-palm-beach-maid-service' },
  { name: 'Pembroke Pines', href: '/pembroke-pines-maid-service' },
  { name: 'Weston', href: '/weston-maid-service' },
  { name: 'Aventura', href: '/aventura-maid-service' },
  { name: 'Coconut Grove', href: '/coconut-grove-maid-service' },
  { name: 'Doral', href: '/doral-maid-service' },
]

const otherAreaLinks = [
  { name: 'Tampa', href: '/south-tampa-maid-service' },
  { name: 'St. Petersburg', href: '/st-petersburg-maid-service' },
  { name: 'Orlando', href: '/orlando-maid-service' },
  { name: 'Winter Park', href: '/winter-park-maid-service' },
  { name: 'Jacksonville', href: '/jacksonville-maid-service' },
  { name: 'Naples', href: '/naples-maid-service' },
  { name: 'Sarasota', href: '/sarasota-maid-service' },
  { name: 'Clearwater', href: '/clearwater-maid-service' },
  { name: 'Key West', href: '/key-west-maid-service' },
  { name: 'All Areas', href: '/service-areas-served-by-the-florida-maid' },
]

const serviceFooterLinks = [
  { name: 'Deep Cleaning', href: '/services/deep-cleaning-service-in-florida' },
  { name: 'House Cleaning', href: '/services/house-cleaning-service-in-florida' },
  { name: 'Weekly Service', href: '/services/weekly-maid-service-in-florida' },
  { name: 'Move-In/Move-Out', href: '/services/move-in-move-out-cleaning-service-in-florida' },
  { name: 'Post-Construction', href: '/services/post-construction-cleanup-service-in-florida' },
  { name: 'Airbnb Cleaning', href: '/services/airbnb-cleaning-in-florida' },
  { name: 'Same-Day Cleaning', href: '/services/same-day-cleaning-service-in-florida' },
]

export default function MarketingFooter() {
  return (
    <footer className="bg-[#1E2A4A] text-gray-400">
      {/* Main footer brand */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-8">
        <h2 className="font-[family-name:var(--font-bebas)] text-white text-3xl md:text-4xl tracking-wide text-center mb-2">The Florida Maid</h2>
        <div className="w-16 h-[2px] bg-[#A8F0DC] mx-auto mb-12" />
      </div>

      {/* Links grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-10">
          <div>
            <h3 className="text-xs font-semibold text-gray-300 tracking-[0.2em] uppercase mb-5">South Florida</h3>
            <ul className="space-y-2.5">
              {southFloridaLinks.map(link => (
                <li key={link.href}><Link href={link.href} className="text-sm hover:text-white transition-colors">{link.name}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-gray-300 tracking-[0.2em] uppercase mb-5">More Areas</h3>
            <ul className="space-y-2.5">
              {otherAreaLinks.map(link => (
                <li key={link.href}><Link href={link.href} className="text-sm hover:text-white transition-colors">{link.name}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-gray-300 tracking-[0.2em] uppercase mb-5">Services</h3>
            <ul className="space-y-2.5">
              {serviceFooterLinks.map(link => (
                <li key={link.href}><Link href={link.href} className="text-sm hover:text-white transition-colors">{link.name}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-gray-300 tracking-[0.2em] uppercase mb-5">Company</h3>
            <ul className="space-y-2.5">
              <li><Link href="/about-the-florida-maid-service-company" className="text-sm hover:text-white transition-colors">About Us</Link></li>
              <li><Link href="/contact-the-florida-maid-service-today" className="text-sm hover:text-white transition-colors">Contact</Link></li>
              <li><Link href="/updated-florida-maid-service-industry-pricing" className="text-sm hover:text-white transition-colors">Pricing</Link></li>
              <li><Link href="/florida-customer-reviews-for-the-florida-maid" className="text-sm hover:text-white transition-colors">Reviews</Link></li>
              <li><Link href="/available-florida-maid-jobs" className="text-sm hover:text-white transition-colors">Careers</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-gray-300 tracking-[0.2em] uppercase mb-5">Resources</h3>
            <ul className="space-y-2.5">
              <li><a href="https://buy.stripe.com/8x2aEZ4FL0wYfxe5f0fnO03" target="_blank" rel="noopener noreferrer" className="text-sm hover:text-white transition-colors">Make a Payment</a></li>
              <li><Link href="/get-paid-for-cleaning-referrals-every-time-they-are-serviced" target="_blank" className="text-sm hover:text-white transition-colors">Referral Program</Link></li>
              <li><a href="sms:9547103636" className="text-sm hover:text-white transition-colors">Text to Book</a></li>
              <li><Link href="/florida-cleaning-service-frequently-asked-questions-in-2026" className="text-sm hover:text-white transition-colors">FAQ</Link></li>
              <li><Link href="/florida-maid-service-blog" className="text-sm hover:text-white transition-colors">Blog</Link></li>
              <li><Link href="/florida-maid-and-cleaning-tips-and-advice-by-the-florida-maid" className="text-sm hover:text-white transition-colors">Cleaning Tips</Link></li>
              <li><Link href="/service/florida-emergency-cleaning-service" className="text-sm hover:text-white transition-colors">Emergency Cleaning</Link></li>
              <li><Link href="/apply" className="text-sm hover:text-white transition-colors">Apply to Clean</Link></li>
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
            <Link href="/do-not-share-policy" className="hover:text-gray-300 transition-colors">Do Not Share</Link>
          </div>
          <p className="text-xs text-gray-500">&copy; {new Date().getFullYear()} The Florida Maid &middot; <a href="tel:9547103636" className="text-[#A8F0DC]/70 hover:text-[#A8F0DC]">(954) 710-3636</a> &middot; NYC Web Design by{' '}<a href="https://www.consortiumnyc.com/" target="_blank" rel="noopener noreferrer" className="text-[#A8F0DC] font-semibold hover:text-white underline underline-offset-2 decoration-[#A8F0DC]/50">Consortium NYC</a></p>
        </div>
      </div>

      {/* Full Loop CRM attribution */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 text-center">
          <p className="text-[11px] text-gray-500">
            Built and managed by{' '}
            <a href="https://www.fullloopcrm.com/" target="_blank" rel="noopener noreferrer" className="text-[#A8F0DC]/70 hover:text-[#A8F0DC] font-semibold underline underline-offset-2 decoration-[#A8F0DC]/40">
              Full Loop CRM
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
