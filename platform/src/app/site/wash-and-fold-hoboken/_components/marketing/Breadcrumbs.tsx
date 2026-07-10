import Link from 'next/link'

interface BreadcrumbItem {
  name: string
  href: string
}

export default function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-gray-400 mb-8">
      <ol className="flex items-center gap-2 flex-wrap">
        <li><Link href="/" className="hover:text-[#1E2A4A] transition-colors">Home</Link></li>
        {items.map((item, i) => (
          <li key={item.href} className="flex items-center gap-2">
            <span className="text-gray-300">/</span>
            {i === items.length - 1 ? (
              <span className="text-[#1E2A4A] font-medium">{item.name}</span>
            ) : (
              <Link href={item.href} className="hover:text-[#1E2A4A] transition-colors">{item.name}</Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
