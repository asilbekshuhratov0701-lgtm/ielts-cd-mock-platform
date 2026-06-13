import { PageShell, StubNotice } from "@/components/Shell";

export const metadata = { title: "Analytics" };

export default function AdminAnalyticsPage() {
  return (
    <PageShell
      title="Analytics"
      subtitle="Exam activity, candidate growth, band distribution, completion, writing stats."
    >
      <StubNotice feature="Admin analytics dashboards" />
    </PageShell>
  );
}
