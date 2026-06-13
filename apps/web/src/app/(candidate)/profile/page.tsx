import { PageShell, StubNotice } from "@/components/Shell";

export const metadata = { title: "Profile" };

export default function ProfilePage() {
  return (
    <PageShell title="Profile settings" subtitle="Personal details, target band, password.">
      <StubNotice feature="Profile settings" />
    </PageShell>
  );
}
