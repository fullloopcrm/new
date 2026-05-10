// @ts-nocheck
'use client'

import BrowsePage from '@/app/site/nyc-classifieds/_components/BrowsePage'
import PageDescription from '@/app/site/nyc-classifieds/_components/PageDescription'
import { boroughBySlug, categoryBySlug, findNeighborhood } from '@/app/site/nyc-classifieds/_lib/data'
import { getLongTailH1 } from '@/app/site/nyc-classifieds/_lib/page-content'

export default function NeighborhoodCategoryClient({ boroughSlug, neighborhoodSlug, categorySlug }: { boroughSlug: string; neighborhoodSlug: string; categorySlug: string }) {
  const b = boroughBySlug[boroughSlug]
  const nh = findNeighborhood(boroughSlug, neighborhoodSlug)
  const cat = categoryBySlug[categorySlug]
  if (!b || !nh || !cat) return null

  return (
    <BrowsePage
      title={getLongTailH1({ categorySlug: cat.slug, neighborhood: nh.name, borough: b.name })}
      description={
        <PageDescription
          categorySlug={cat.slug}
          categoryName={cat.name}
          neighborhood={nh.name}
          neighborhoodHref={`/${b.slug}/${neighborhoodSlug}`}
          borough={b.name}
        />
      }
      breadcrumbs={[
        { label: b.name, href: `/${b.slug}` },
        { label: nh.name, href: `/${b.slug}/${neighborhoodSlug}` },
        { label: cat.name, href: `/${b.slug}/${neighborhoodSlug}/${cat.slug}` },
      ]}
      category={cat}
      borough={b.name}
      neighborhood={nh.name}
    />
  )
}
