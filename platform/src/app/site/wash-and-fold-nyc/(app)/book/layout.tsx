import Script from 'next/script'
import FeedbackWidget from '@/app/site/wash-and-fold-nyc/_components/FeedbackWidget'

export default function BookLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <FeedbackWidget source="Client Portal" />
      <Script id="nycmaid-analytics" src="/t.js" strategy="afterInteractive" />
    </>
  )
}
