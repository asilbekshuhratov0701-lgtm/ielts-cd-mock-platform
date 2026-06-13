import { PageShell, StubNotice } from "@/components/Shell";

export const metadata = { title: "System Logs" };

export default function AdminLogsPage() {
  return (
    <PageShell
      title="System Logs"
      subtitle="Logins, exam starts/submissions, admin actions, evaluations, security events."
    >
      <StubNotice feature="Audit log viewer" />
    </PageShell>
  );
}
