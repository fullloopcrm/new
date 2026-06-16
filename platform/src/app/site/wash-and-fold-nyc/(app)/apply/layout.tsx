// @ts-nocheck
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Apply to Clean — Highest Paid Cleaning Jobs in NYC, Same-Day Pay | Trabajo de Limpieza NYC',
  description:
    'Join The NYC Wash and Fold Service Company — NYC\'s highest-paying laundry jobs starting at $30/hr with same-day pay. No experience needed. Apply now for full-time or part-time laundry work in New York City. Solicite ahora — los trabajos de lavandería mejor pagados en NYC.',
  alternates: { canonical: 'https://www.washandfoldnyc.com/apply' },
  openGraph: {
    title: 'Apply to Clean — Highest Paid Cleaning Jobs in NYC, Same-Day Pay',
    description:
      'NYC\'s best cleaning opportunities. $30/hr+, same-day pay, flexible hours. Apply in 2 minutes.',
    url: 'https://www.washandfoldnyc.com/apply',
    siteName: 'The NYC Wash and Fold Service Company',
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
