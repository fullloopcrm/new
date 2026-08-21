import type { Metadata } from 'next'
import WashFoldMicrosite from '@/app/site/wash-and-fold-nyc/_components/emd/WashFoldMicrosite'
import { washAndFoldUpperEastSideConfig as config } from '@/app/site/wash-and-fold-nyc/_lib/emd/washandfolduppereastside'

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
    'geo.placename': config.areaName,
    'geo.position': `${config.geo.lat};${config.geo.lng}`,
    ICBM: `${config.geo.lat}, ${config.geo.lng}`,
  },
}

export default function WashAndFoldUpperEastSidePage() {
  return <WashFoldMicrosite config={config} />
}
