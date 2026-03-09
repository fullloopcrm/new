import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Anonymous Feedback | Full Loop CRM",
  description:
    "Share your thoughts, suggestions, or concerns about Full Loop CRM. 100% anonymous — no account or identity required.",
  alternates: { canonical: "https://fullloopcrm.com/feedback" },
  openGraph: {
    title: "Anonymous Feedback | Full Loop CRM",
    description:
      "Share anonymous feedback about Full Loop CRM. No tracking, no cookies, no identity collected.",
    url: "https://fullloopcrm.com/feedback",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Anonymous Feedback | Full Loop CRM",
    description: "Share anonymous feedback about Full Loop CRM.",
  },
};

export default function FeedbackLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
