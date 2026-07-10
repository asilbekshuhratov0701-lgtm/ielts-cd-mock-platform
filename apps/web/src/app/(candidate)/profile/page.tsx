import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@ielts/db";
import { PageShell } from "@/components/Shell";
import { ProfileForm } from "@/components/ProfileForm";

export const metadata = { title: "Profile" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { candidateProfile: true }
  });
  if (!user) redirect("/login");

  return (
    <PageShell title="Profile settings" subtitle="Personal details, target band and password.">
      <ProfileForm
        initial={{
          name: user.name ?? "",
          email: user.email,
          phone: user.candidateProfile?.phone ?? "",
          country: user.candidateProfile?.country ?? "",
          targetBand: user.candidateProfile?.targetBand ?? null
        }}
      />
    </PageShell>
  );
}
