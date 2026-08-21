import type { Metadata } from 'next'
import NeighborhoodMicrosite from '@/app/site/the-nyc-exterminator/_components/emd/NeighborhoodMicrosite'
import { tribecaExterminatorConfig as config } from '@/app/site/the-nyc-exterminator/_lib/emd/tribeca-exterminator'

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
    'geo.region': 'US-NY',
    'geo.placename': config.neighborhoodName,
    'geo.position': `${config.geo.lat};${config.geo.lng}`,
    ICBM: `${config.geo.lat}, ${config.geo.lng}`,
  },
}

export default function TribecaExterminatorPage() {
  return <NeighborhoodMicrosite config={config} />
}
