'use client'

import { useParams, useRouter } from 'next/navigation'
import BookingDetailContent from '../BookingDetailContent'

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  return (
    <BookingDetailContent
      bookingId={id}
      onClose={() => router.push('/dashboard/bookings')}
    />
  )
}
