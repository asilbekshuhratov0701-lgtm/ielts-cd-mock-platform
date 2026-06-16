import { prisma, Prisma } from "@ielts/db";

export type ResultReleasedPayload = { attemptId: string; examTitle: string };

export async function createResultReleasedNotification(
  userId: string,
  payload: ResultReleasedPayload
): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId,
        type: "result.released",
        payloadJson: payload as unknown as Prisma.InputJsonValue
      }
    });
  } catch (error) {
    console.error("notification create failed", error);
  }
}

export async function listNotifications(userId: string) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50
  });
}

export async function countUnread(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, readAt: null } });
}

export async function markAllRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() }
  });
}
