import type { Metadata } from 'next'
import { Sora, DM_Sans, Space_Grotesk, JetBrains_Mono } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

const sora = Sora({ subsets: ['latin'], weight: ['600', '800'], variable: '--font-sora', display: 'swap' })
const dmSans = DM_Sans({ subsets: ['latin'], weight: ['400', '500', '700'], variable: '--font-dm-sans', display: 'swap' })
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-space-grotesk', display: 'swap' })
const jetbrains = JetBrains_Mono({ subsets: ['latin'], weight: ['400'], variable: '--font-jetbrains', display: 'swap' })

export const metadata: Metadata = {
  title: 'Full Loop CRM | The First Full-Cycle CRM for Home Service Businesses',
  description: 'Full Loop CRM is the first full-cycle CRM for home service businesses — organic lead generation, AI sales chatbot, scheduling, GPS field operations, payments, reviews, and retargeting in one platform.',
  keywords: 'home service CRM, cleaning business CRM, full cycle CRM, lead generation CRM, AI sales chatbot, field service management, booking software for cleaners, maid service software',
  authors: [{ name: 'Full Loop CRM' }],
  openGraph: {
    title: 'Full Loop CRM — The First Full-Cycle CRM for Home Service Businesses',
    description: 'From lead generation to 5-star reviews. The only CRM that closes the entire business loop for home service companies.',
    type: 'website',
    url: 'https://www.fullloopcrm.com',
    siteName: 'Full Loop CRM',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Full Loop CRM — Lead Gen to Reviews in One Platform',
    description: 'The first CRM that takes home service businesses from organic lead generation through AI sales, scheduling, operations, payments, reviews, and retargeting.',
  },
  icons: {
    icon: '/icon.svg',
  },
  alternates: {
    canonical: 'https://www.fullloopcrm.com',
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
        <body className={`${sora.variable} ${dmSans.variable} ${spaceGrotesk.variable} ${jetbrains.variable} antialiased`}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
