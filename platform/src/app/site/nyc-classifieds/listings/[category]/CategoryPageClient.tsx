// @ts-nocheck
'use client'

import BrowsePage from '@/app/site//_components/BrowsePage'
import PageDescription from '@/app/site//_components/PageDescription'
import { categoryBySlug } from '@/app/site/nyc-classifieds/_lib/data'
import { categoryFaqs } from '@/app/site/nyc-classifieds/_lib/seo-faqs'
import { getLongTailH1 } from '@/app/site/nyc-classifieds/_lib/page-content'

export default function CategoryPageClient({ categorySlug }: { categorySlug: string }) {
  const cat = categoryBySlug[categorySlug]
  if (!cat) {
    return (
      <main style={{ maxWidth: '1050px', margin: '0 auto', padding: '48px 24px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827' }}>Category not found</h1>
      </main>
    )
  }

  return (
    <BrowsePage
      title={getLongTailH1({ categorySlug: cat.slug })}
      description={
        <PageDescription
          categorySlug={cat.slug}
          categoryName={cat.name}
        />
      }
      breadcrumbs={[{ label: cat.name, href: `/listings/${cat.slug}` }]}
      category={cat}
      faqs={categoryFaqs[categorySlug]}
    />
  )
}
