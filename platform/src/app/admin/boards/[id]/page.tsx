'use client'

import { useParams } from 'next/navigation'
import BoardBody from '@/components/boards/BoardBody'

export default function AdminBoardPage() {
  const params = useParams<{ id: string }>()
  return <BoardBody apiBase="/api/admin/boards" boardId={params.id} richUpdates={false} />
}
