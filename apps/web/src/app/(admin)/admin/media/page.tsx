import { PageShell, StubNotice } from "@/components/Shell";

export const metadata = { title: "Media Library" };

export default function AdminMediaPage() {
  return (
    <PageShell
      title="Media Library"
      subtitle="Folders, tags, search, version history, archive — audio/images/documents."
    >
      <StubNotice feature="Media library (E9, R2-backed, storage usage)" />
    </PageShell>
  );
}
