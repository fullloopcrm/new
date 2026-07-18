import PhotosView from './photos-view'

export const dynamic = 'force-dynamic'

type Params = { token: string }

export default async function PublicPhotosPage({ params }: { params: Promise<Params> }) {
  const { token } = await params
  return <PhotosView token={token} />
}
