import { PageShell, StubNotice } from "@/components/Shell";

export const metadata = { title: "Settings" };

export default function AdminSettingsPage() {
  return (
    <PageShell
      title="Settings"
      subtitle="Branding, band conversion tables, session limits, security, email, notifications, storage."
    >
      <StubNotice feature="Platform settings (table-driven scoring & config)" />
    </PageShell>
  );
}
