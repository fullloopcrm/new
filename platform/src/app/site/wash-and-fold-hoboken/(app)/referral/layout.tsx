import FeedbackWidget from '@/app/site/wash-and-fold-hoboken/_components/FeedbackWidget'

export default function ReferralLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <FeedbackWidget source="Referral Portal" />
    </>
  )
}
