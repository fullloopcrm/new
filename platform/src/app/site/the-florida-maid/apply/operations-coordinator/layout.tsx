import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Apply — Operations Admin (Part-Time) | The Florida Maid',
  description:
    'Apply for the part-time Operations Admin position at The Florida Maid. 10% per completed job, paid via Zelle. Averaged ~$40/hr last month. Own the calendar, cleaners, and collections.',
  alternates: { canonical: 'https://www.thefloridamaid.com/apply/operations-coordinator' },
  openGraph: {
    title: 'Apply — Operations Admin (Part-Time) | The Florida Maid',
    description:
      'Apply for the part-time Operations Admin role. 10% per job, averaged ~$40/hr last month. Paid per job via Zelle. Aiming for $8K/mo.',
    url: 'https://www.thefloridamaid.com/apply/operations-coordinator',
    siteName: 'The Florida Maid',
    locale: 'en_US',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
