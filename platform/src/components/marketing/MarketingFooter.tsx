import Link from 'next/link'

const manhattanLinks = [
  { name: 'Upper East Side', href: '/upper-east-side-maid-service' },
  { name: 'Upper West Side', href: '/upper-west-side-maid-service' },
  { name: 'Midtown', href: '/midtown-manhattan-maid-service' },
  { name: "Hell's Kitchen", href: '/hells-kitchen-maid-service' },
  { name: 'Chelsea', href: '/chelsea-maid-service' },
  { name: 'SoHo', href: '/soho-maid-service' },
  { name: 'Tribeca', href: '/tribeca-maid-service' },
  { name: 'West Village', href: '/west-village-maid-service' },
  { name: 'East Village', href: '/east-village-maid-service' },
  { name: 'Financial District', href: '/financial-district-maid-service' },
  { name: 'Gramercy', href: '/gramercy-maid-service' },
  { name: 'Murray Hill', href: '/murray-hill-maid-service' },
]

const otherAreaLinks = [
  { name: 'Brooklyn Heights', href: '/brooklyn-heights-maid-service' },
  { name: 'Park Slope', href: '/park-slope-maid-service' },
  { name: 'DUMBO', href: '/dumbo-maid-service' },
  { name: 'Williamsburg', href: '/williamsburg-maid-service' },
  { name: 'Long Island City', href: '/long-island-city-maid-service' },
  { name: 'Astoria', href: '/astoria-maid-service' },
  { name: 'Forest Hills', href: '/forest-hills-maid-service' },
  { name: 'Hoboken', href: '/hoboken-maid-service' },
  { name: 'Jersey City', href: '/jersey-city-maid-service' },
  { name: 'Great Neck', href: '/great-neck-maid-service' },
]

const serviceFooterLinks = [
  { name: 'Deep Cleaning', href: '/services/deep-cleaning-service-in-nyc' },
  { name: 'Regular Cleaning', href: '/services/apartment-cleaning-service-in-nyc' },
  { name: 'Weekly Service', href: '/services/weekly-maid-service-in-nyc' },
  { name: 'Move-In/Move-Out', href: '/services/move-in-move-out-cleaning-service-in-nyc' },
  { name: 'Post-Construction', href: '/services/post-construction-cleanup-service-in-nyc' },
  { name: 'Airbnb Cleaning', href: '/services/airbnb-cleaning-in-nyc' },
  { name: 'Same-Day Cleaning', href: '/services/same-day-cleaning-service-in-nyc' },
]

export default function MarketingFooter() {
  return (
    <footer className="bg-[#1E2A4A] text-gray-400">
      {/* Main footer brand */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-8">
        <h2 className="font-[family-name:var(--font-bebas)] text-white text-3xl md:text-4xl tracking-wide text-center mb-2">The NYC Maid</h2>
        <div className="w-16 h-[2px] bg-[#A8F0DC] mx-auto mb-6" />
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">
          <Link href="/reviews" className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
            <span className="text-yellow-400">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
            <span className="text-gray-300 text-sm font-medium">5.0 from 50+ verified reviews</span>
          </Link>
          <span className="text-white/20 hidden sm:inline">|</span>
          <Link href="/reviews/submit" className="text-[#A8F0DC] text-sm font-semibold hover:text-white transition-colors">Write a Review</Link>
        </div>
      </div>

      {/* Links grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-10">
          <div>
            <h3 className="text-xs font-semibold text-gray-300 tracking-[0.2em] uppercase mb-5">Manhattan</h3>
            <ul className="space-y-2.5">
              {manhattanLinks.map(link => (
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
              <li><Link href="/about-the-nyc-maid-service-company" className="text-sm hover:text-white transition-colors">About Us</Link></li>
              <li><Link href="/contact-the-nyc-maid-service-today" className="text-sm hover:text-white transition-colors">Contact</Link></li>
              <li><Link href="/updated-nyc-maid-service-industry-pricing" className="text-sm hover:text-white transition-colors">Pricing</Link></li>
              <li><Link href="/reviews" className="text-sm hover:text-white transition-colors">Reviews</Link></li>
              <li><Link href="/available-nyc-maid-jobs" className="text-sm hover:text-white transition-colors">Careers</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-gray-300 tracking-[0.2em] uppercase mb-5">Resources</h3>
            <ul className="space-y-2.5">
              <li><a href="https://buy.stripe.com/8x2aEZ4FL0wYfxe5f0fnO03" target="_blank" rel="noopener noreferrer" className="text-sm hover:text-white transition-colors">Make a Payment</a></li>
              <li><Link href="/get-paid-for-cleaning-referrals-every-time-they-are-serviced" target="_blank" className="text-sm hover:text-white transition-colors">Referral Program</Link></li>
              <li><a href="tel:2122029030" className="text-sm hover:text-white transition-colors">Call Sales: (212) 202-9030</a></li>
              <li><a href="sms:2122029030" className="text-sm hover:text-white transition-colors">Text Sales: (212) 202-9030</a></li>
              <li><a href="sms:6464900130" className="text-sm hover:text-white transition-colors">Text Support: (646) 490-0130</a></li>
              <li><Link href="/nyc-cleaning-service-frequently-asked-questions-in-2025" className="text-sm hover:text-white transition-colors">FAQ</Link></li>
              <li><Link href="/nyc-maid-service-blog" className="text-sm hover:text-white transition-colors">Blog</Link></li>
              <li><Link href="/nyc-maid-and-cleaning-tips-and-advice-by-the-nyc-maid" className="text-sm hover:text-white transition-colors">Cleaning Tips</Link></li>
              <li><Link href="/service/nyc-emergency-cleaning-service" className="text-sm hover:text-white transition-colors">Emergency Cleaning</Link></li>
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
          <p className="text-xs text-gray-500">&copy; {new Date().getFullYear()} The NYC Maid &middot; Sales: <a href="sms:2122029030" className="text-[#A8F0DC]/70 hover:text-[#A8F0DC]">(212) 202-9030</a> &middot; Support: <a href="sms:6464900130" className="text-[#A8F0DC]/70 hover:text-[#A8F0DC]">(646) 490-0130</a> &middot; NYC Web Design by{' '}<a href="https://www.consortiumnyc.com/" target="_blank" rel="noopener noreferrer" className="text-[#A8F0DC] font-semibold hover:text-white underline underline-offset-2 decoration-[#A8F0DC]/50">Consortium NYC</a></p>
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
