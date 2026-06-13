import { PageShell, StubNotice } from "@/components/Shell";

export const metadata = { title: "Live Exam Center" };

export default function AdminLivePage() {
  return (
    <PageShell
      title="Live Exam Center"
      subtitle="Polling monitor: active candidates, section, remaining time, connection, auto-submits."
    >
      <StubNotice feature="Live exam monitoring (E6, polling on session events)" />
    </PageShell>
  );
}
