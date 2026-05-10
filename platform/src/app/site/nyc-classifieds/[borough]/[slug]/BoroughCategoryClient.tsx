// @ts-nocheck
'use client'

import BrowsePage from '@/app/site/nyc-classifieds/_components/BrowsePage'
import PageDescription from '@/app/site/nyc-classifieds/_components/PageDescription'
import { boroughBySlug, categoryBySlug } from '@/app/site/nyc-classifieds/_lib/data'

export default function BoroughCategoryClient({ boroughSlug, categorySlug }: { boroughSlug: string; categorySlug: string }) {
  const b = boroughBySlug[boroughSlug]
  const cat = categoryBySlug[categorySlug]
  if (!b || !cat) return null

  return (
    <BrowsePage
      title={`${cat.name} in ${b.name}`}
      description={
        <PageDescription
          categorySlug={cat.slug}
          categoryName={cat.name}
          borough={b.name}
        />
      }
      breadcrumbs={[
        { label: b.name, href: `/${b.slug}` },
        { label: cat.name, href: `/${b.slug}/${cat.slug}` },
      ]}
      category={cat}
      borough={b.name}
    />
  )
}
