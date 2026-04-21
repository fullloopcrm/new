import InvoiceView from './invoice-view'

export const dynamic = 'force-dynamic'

type Params = { token: string }

export default async function PublicInvoicePage({ params }: { params: Promise<Params> }) {
  const { token } = await params
  return <InvoiceView token={token} />
}
