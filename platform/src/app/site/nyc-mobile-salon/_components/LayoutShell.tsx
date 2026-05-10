// @ts-nocheck
'use client'
import { usePathname } from 'next/navigation'
import Header from '@/app/site/nyc-mobile-salon/_components/Header'
import Footer from '@/app/site/nyc-mobile-salon/_components/Footer'

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAdmin = pathname.startsWith('/admin') || pathname.startsWith('/login')

  return (
    <>
      {!isAdmin && <Header />}
      <main>{children}</main>
      {!isAdmin && <Footer />}
    </>
  )
}
