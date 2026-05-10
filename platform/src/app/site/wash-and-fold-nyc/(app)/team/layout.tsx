// @ts-nocheck
import type { Metadata } from 'next'
import FeedbackWidget from '@/app/site/wash-and-fold-nyc/_components/FeedbackWidget'

export const metadata: Metadata = {
  manifest: '/team-manifest.json',
  applicationName: 'Wash and Fold Team',
  appleWebApp: {
    capable: true,
    title: 'Team Portal',
    statusBarStyle: 'default',
  },
}

export default function TeamLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <FeedbackWidget source="Team Portal" />
    </>
  )
}
