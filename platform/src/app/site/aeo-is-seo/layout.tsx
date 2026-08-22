import type { Metadata } from 'next'
import { Source_Serif_4, Inter } from 'next/font/google'
import JsonLd from '@/components/site/JsonLd'
import { allSchemas } from './_lib/schema'
import './globals.css'

const serif = Source_Serif_4({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
})

const sans = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
})

const TITLE = 'AEO Is SEO — The Complete Guide to Answer Engine Optimization'
const DESCRIPTION =
  'What is AEO (Answer Engine Optimization)? A complete guide covering AEO vs SEO, how AI Overviews and ChatGPT Search actually source answers, retrieval-augmented generation explained, a 130+ term AI search glossary, and how to generate organic leads in the AI-search era.'

export const metadata: Metadata = {
  metadataBase: new URL('https://aeoisseo.com'),
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    'AEO',
    'SEO',
    'answer engine optimization',
    'generative engine optimization',
    'GEO',
    'AI search optimization',
    'what is AEO',
    'AEO vs SEO',
    'how to optimize for AI search',
    'AI Overviews',
    'retrieval augmented generation',
    'agent experience optimization',
    'AI search glossary',
  ],
  authors: [{ name: 'Full Loop CRM', url: 'https://fullloopcrm.com' }],
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  alternates: { canonical: 'https://aeoisseo.com' },
  openGraph: {
    type: 'article',
    url: 'https://aeoisseo.com',
    siteName: 'AEO Is SEO',
    title: TITLE,
    description: DESCRIPTION,
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
}

export default function AeoIsSeoLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`}>
      <head>
        <JsonLd data={allSchemas} />
      </head>
      <body
        style={{
          margin: 0,
          backgroundColor: '#ffffff',
          color: '#111111',
          fontFamily: 'var(--font-serif), Georgia, serif',
        }}
      >
        {children}
      </body>
    </html>
  )
}
