"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { markAllRead } from "@/lib/notifications";

export async function markAllReadAction(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  await markAllRead(session.user.id);
  revalidatePath("/notifications");
}
