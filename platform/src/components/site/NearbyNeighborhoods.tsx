import Link from 'next/link'
import { getNeighborhood } from '@/lib/seo/locations'

export default function NearbyNeighborhoods({ slugs }: { slugs: string[] }) {
  const neighborhoods = slugs.map(s => getNeighborhood(s)).filter(Boolean)
  if (neighborhoods.length === 0) return null

  return (
    <section className="py-12">
      <h2 className="text-xs font-semibold text-gray-400 tracking-[0.2em] uppercase mb-6">Nearby Neighborhoods</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {neighborhoods.map(n => n && (
          <Link
            key={n.slug}
            href={`/${n.urlSlug}`}
            className="p-5 bg-white border border-gray-200 rounded-xl hover:border-[#A8F0DC] hover:shadow-md transition-all group"
          >
            <p className="font-semibold text-[#1E2A4A] group-hover:text-[#1E2A4A]">{n.name}</p>
            <p className="text-sm text-gray-400 mt-1">Cleaning services &rarr;</p>
          </Link>
        ))}
      </div>
    </section>
  )
}
