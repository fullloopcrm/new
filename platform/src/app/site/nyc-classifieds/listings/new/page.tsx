import type { Metadata } from 'next'
import PostListingClient from './PostListingClient'

export const metadata: Metadata = {
  title: 'Post a Free Listing',
  description: 'Post a free classified listing in New York City. Apartments, jobs, services, for sale, gigs and more — from geo-verified NYC residents.',
  robots: { index: false, follow: false },
}

export default function PostListingPage() {
  return <PostListingClient />
}
