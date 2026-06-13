import { PageShell, StubNotice } from "@/components/Shell";

export const metadata = { title: "Analytics" };

export default function AnalyticsPage() {
  return (
    <PageShell
      title="Progress Analytics"
      subtitle="Average band, skill improvements, weak areas, score trends, target tracking."
    >
      <StubNotice feature="Candidate analytics (trends, weak areas, target band)" />
    </PageShell>
  );
}
