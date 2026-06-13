import { PageShell, StubNotice } from "@/components/Shell";

export default async function ExamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PageShell title="Exam details" subtitle={`Exam ${id} — overview before starting an attempt.`}>
      <StubNotice feature="Exam detail + 'Start attempt' (creates a single active attempt)" />
    </PageShell>
  );
}
