import { redirect } from "next/navigation";
import { prisma } from "@ielts/db";
import { auth } from "@/auth";

export async function requireAdminUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const me = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!me || me.status !== "ACTIVE" || (me.role !== "ADMIN" && me.role !== "SUPER_ADMIN")) {
    redirect("/admin");
  }
  return me;
}
