import QuoteView from './quote-view'

export const dynamic = 'force-dynamic'

type Params = { token: string }

export default async function PublicQuotePage({ params }: { params: Promise<Params> }) {
  const { token } = await params
  return <QuoteView token={token} />
}
