import type { Metadata } from 'next'
import EditListingClient from './EditListingClient'

export const metadata: Metadata = {
  title: 'Edit Listing',
  description: 'Edit your listing on NYC Classifieds',
}

export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <EditListingClient id={id} />
}
