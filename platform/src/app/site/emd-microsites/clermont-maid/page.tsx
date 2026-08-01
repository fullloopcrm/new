import type { Metadata } from 'next'
import EmdMicrosite from '@/app/site/the-florida-maid/_components/emd/EmdMicrosite'
import { clermontMaidConfig as config } from '@/app/site/the-florida-maid/_lib/emd/clermont-maid'

const url = `https://www.${config.domain}`

export const metadata: Metadata = {
  title: { absolute: config.metaTitle },
  description: config.metaDescription,
  alternates: { canonical: url },
  openGraph: {
    title: config.metaTitle,
    description: config.metaDescription,
    url,
    siteName: config.brandName,
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: config.metaTitle,
    description: config.metaDescription,
  },
  other: {
    'format-detection': 'telephone=yes',
    'geo.region': 'US-FL',
    'geo.placename': config.city,
    'geo.position': `${config.geo.lat};${config.geo.lng}`,
    'ICBM': `${config.geo.lat}, ${config.geo.lng}`,
  },
}

export default function ClermontMaidPage() {
  return <EmdMicrosite config={config} />
}
