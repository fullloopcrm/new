// @ts-nocheck
'use client'

import BrowsePage from '@/app/site/nyc-classifieds/_components/BrowsePage'
import PageDescription from '@/app/site/nyc-classifieds/_components/PageDescription'
import { categoryBySlug, slugify } from '@/app/site/nyc-classifieds/_lib/data'
import { getLongTailH1 } from '@/app/site/nyc-classifieds/_lib/page-content'

export default function SubcategoryPageClient({ categorySlug, subcategorySlug }: { categorySlug: string; subcategorySlug: string }) {
  const cat = categoryBySlug[categorySlug]
  const subName = cat?.subs.find(s => slugify(s) === subcategorySlug)

  if (!cat || !subName) {
    return (
      <main style={{ maxWidth: '1050px', margin: '0 auto', padding: '48px 24px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827' }}>Not found</h1>
      </main>
    )
  }

  return (
    <BrowsePage
      title={getLongTailH1({ categorySlug: cat.slug, subcategoryName: subName, subcategorySlug })}
      description={
        <PageDescription
          categorySlug={cat.slug}
          categoryName={cat.name}
          subcategorySlug={subcategorySlug}
          subcategoryName={subName}
        />
      }
      breadcrumbs={[
        { label: cat.name, href: `/listings/${cat.slug}` },
        { label: subName, href: `/listings/${cat.slug}/${subcategorySlug}` },
      ]}
      category={cat}
      subcategorySlug={subcategorySlug}
    />
  )
}
