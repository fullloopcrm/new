import { redirect } from 'next/navigation'

// Forwards to the real booking intake form, carrying through any query
// params (ref, src, convo_id) callers already attach to this URL. Previously
// hardcoded a redirect to '/contact-the-nyc-maid-service-today' — a leftover
// nycmaid URL that doesn't exist on this tenant, 404ing every visitor who
// hit /book/new (the URL every EMD microsite's "Book Now" CTA uses).
export default async function BookNewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string') query.set(key, value)
  }
  const qs = query.toString()
  redirect(`/book/collect${qs ? `?${qs}` : ''}`)
}
