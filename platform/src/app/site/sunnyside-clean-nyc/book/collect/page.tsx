import { redirect } from 'next/navigation'

// Sunnyside Clean NYC has no collect-info flow of its own — redirect to NYC
// Maid's, carrying params (src, convo_id, etc.) through unchanged.
export default async function BookCollectRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string') qs.set(key, value)
  }
  const query = qs.toString()
  redirect(`https://www.thenycmaid.com/book/collect${query ? `?${query}` : ''}`)
}
