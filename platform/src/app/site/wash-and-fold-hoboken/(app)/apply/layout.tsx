import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Apply to Clean — Highest Paid Cleaning Jobs in NYC, Same-Day Pay | Trabajo de Limpieza NYC',
  description:
    'Join The NYC Maid — NYC\'s highest-paying cleaning jobs starting at $30/hr with same-day pay. No experience needed. Apply now for full-time or part-time house cleaning work in New York City. Solicite ahora — los trabajos de limpieza mejor pagados en NYC.',
  alternates: { canonical: 'https://www.thenycmaid.com/apply' },
  openGraph: {
    title: 'Apply to Clean — Highest Paid Cleaning Jobs in NYC, Same-Day Pay',
    description:
      'NYC\'s best cleaning opportunities. $30/hr+, same-day pay, flexible hours. Apply in 2 minutes.',
    url: 'https://www.thenycmaid.com/apply',
    siteName: 'The NYC Maid',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Apply to Clean — Highest Paid Cleaning Jobs in NYC',
    description:
      'NYC\'s best cleaning opportunities. $30/hr+, same-day pay, flexible hours. Apply in 2 minutes.',
  },
  other: {
    'geo.region': 'US-NY',
    'geo.placename': 'New York',
  },
}

export default function ApplyLayout({ children }: { children: React.ReactNode }) {
  return children
}
