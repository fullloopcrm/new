import DocumentEditor from './document-editor'

export const dynamic = 'force-dynamic'

type Params = { id: string }

export default async function DocumentDetailPage({ params }: { params: Promise<Params> }) {
  const { id } = await params
  return <DocumentEditor id={id} />
}
