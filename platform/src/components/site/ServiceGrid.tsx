import Link from 'next/link'

import type { ReactNode } from 'react'

const serviceIcons: Record<string, ReactNode> = {
  'deep-cleaning': (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  ),
  'regular-cleaning': (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  ),
  'default': (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    </svg>
  ),
}

interface ServiceItem {
  name: string
  slug: string
  description?: string
  price_range?: string
}

export default function ServiceGrid({ services }: { services?: ServiceItem[] }) {
  if (!services || services.length === 0) return null

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {services.map(service => {
        const slug = service.slug || service.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
        return (
          <Link
            key={slug}
            href={`/services/${slug}`}
            className="group border border-gray-200 rounded-2xl p-7 hover:border-[var(--brand-accent)] hover:shadow-lg transition-all bg-white"
          >
            <div className="w-12 h-12 bg-[var(--brand-accent)]/10 border border-[var(--brand-accent)]/30 rounded-xl flex items-center justify-center text-[var(--brand)] mb-5 group-hover:bg-[var(--brand-accent)]/20 transition-colors">
              {serviceIcons[slug] || serviceIcons['default']}
            </div>
            <h3 className="font-[family-name:var(--font-bebas)] text-xl text-[var(--brand)] tracking-wide mb-2">
              {service.name}
            </h3>
            {service.description && (
              <p className="text-gray-500 text-sm leading-relaxed mb-4">{service.description.slice(0, 120)}...</p>
            )}
            <div className="flex items-center justify-between">
              {service.price_range && <span className="text-xs font-semibold text-[var(--brand)] tracking-wide">From {service.price_range.split('–')[0]}</span>}
              <span className="text-[var(--brand)] text-sm font-medium group-hover:underline underline-offset-4">Learn More &rarr;</span>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
