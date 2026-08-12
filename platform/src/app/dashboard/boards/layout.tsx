import BoardsSidebar from '@/components/boards/BoardsSidebar'

export default function BoardsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full flex">
      <BoardsSidebar apiBase="/api/boards" boardHrefBase="/dashboard/boards" />
      <div className="flex-1 min-w-0 h-full overflow-y-auto pl-4 pr-1">{children}</div>
    </div>
  )
}
