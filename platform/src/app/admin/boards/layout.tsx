import BoardsSidebar from '@/components/boards/BoardsSidebar'

// Admin's <main> scrolls the whole page (no full-bleed mode like the tenant
// dashboard's ComHub/Boards routes) — the sidebar stays visible via sticky
// positioning within a bounded height instead of a locked flex-column layout.
export default function AdminBoardsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4">
      <div className="sticky top-4 self-start h-[calc(100vh-160px)]">
        <BoardsSidebar apiBase="/api/admin/boards" boardHrefBase="/admin/boards" />
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}
