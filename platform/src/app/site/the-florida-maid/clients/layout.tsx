import Script from 'next/script'
import FeedbackWidget from '@/app/site/the-florida-maid/_components/FeedbackWidget'

export default function BookLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <FeedbackWidget source="Client Portal" />
      <Script id="flmaid-analytics" src="/sites/the-florida-maid/t.js" strategy="afterInteractive" />
    </>
  )
}
