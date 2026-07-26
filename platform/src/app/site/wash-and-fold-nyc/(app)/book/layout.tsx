import FeedbackWidget from '@/app/site/wash-and-fold-nyc/_components/FeedbackWidget'
import TenantAnalyticsScript from '@/components/analytics/TenantAnalyticsScript'

export default function BookLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <FeedbackWidget source="Client Portal" />
      <TenantAnalyticsScript slug="wash-and-fold-nyc" />
    </>
  )
}
