import Script from 'next/script'
import FeedbackLink from '@/app/site/nycmaid/_components/FeedbackLink'

export default function BookLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <FeedbackLink />
      <Script id="nycmaid-analytics" src="/t.js" strategy="afterInteractive" />
    </>
  )
}
