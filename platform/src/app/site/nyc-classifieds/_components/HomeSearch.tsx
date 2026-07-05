'use client'

import { useRouter } from 'next/navigation'
import SearchAutocomplete from './SearchAutocomplete'

export default function HomeSearch() {
  const router = useRouter()

  return (
    <SearchAutocomplete
      onSearch={(q) => router.push(`/search?q=${encodeURIComponent(q)}`)}
      placeholder="Search all of NYC..."
    />
  )
}
