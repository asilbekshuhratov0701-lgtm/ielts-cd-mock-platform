import { PageShell, StubNotice } from "@/components/Shell";

export default async function AdminImportReviewPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <PageShell
      title="Review imported exam"
      subtitle={`Import ${id} — original vs reconstructed, accept/reject AI suggestions, edit, preview.`}
    >
      <StubNotice feature="AI import review (admin oversight gate — nothing auto-publishes)" />
    </PageShell>
  );
}
