import SignView from './sign-view'

export const dynamic = 'force-dynamic'

type Params = { token: string }

export default async function PublicSignPage({ params }: { params: Promise<Params> }) {
  const { token } = await params
  return <SignView token={token} />
}
