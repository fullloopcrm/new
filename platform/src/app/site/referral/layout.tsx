import FeedbackWidget from '@/components/FeedbackWidget'

export default function ReferralLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <FeedbackWidget source="Referral Portal" />
    </>
  )
}
