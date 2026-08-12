'use client'

import { useParams } from 'next/navigation'
import BoardBody from '@/components/boards/BoardBody'

export default function DashboardBoardPage() {
  const params = useParams<{ id: string }>()
  return <BoardBody apiBase="/api/boards" boardId={params.id} />
}
