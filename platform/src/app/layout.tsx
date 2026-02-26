import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Full Loop CRM | The First Full-Cycle CRM for Home Service Businesses',
  description: 'Full Loop CRM is the first full-cycle CRM for home service businesses — organic lead generation, AI sales chatbot, scheduling, GPS field operations, payments, reviews, and retargeting in one platform.',
  keywords: 'home service CRM, cleaning business CRM, full cycle CRM, lead generation CRM, AI sales chatbot, field service management, booking software for cleaners, maid service software',
  authors: [{ name: 'Full Loop CRM' }],
  openGraph: {
    title: 'Full Loop CRM — The First Full-Cycle CRM for Home Service Businesses',
    description: 'From lead generation to 5-star reviews. The only CRM that closes the entire business loop for home service companies.',
    type: 'website',
    url: 'https://fullloopcrm.com',
    siteName: 'Full Loop CRM',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Full Loop CRM — Lead Gen to Reviews in One Platform',
    description: 'The first CRM that takes home service businesses from organic lead generation through AI sales, scheduling, operations, payments, reviews, and retargeting.',
  },
  alternates: {
    canonical: 'https://fullloopcrm.com',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${inter.className} antialiased`}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
