import { prisma, Prisma } from "@ielts/db";

export async function logAudit(entry: {
  orgId: string;
  actorId?: string | null;
  action: string;
  entity?: string;
  entityId?: string;
  meta?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        orgId: entry.orgId,
        actorId: entry.actorId ?? null,
        action: entry.action,
        entity: entry.entity ?? null,
        entityId: entry.entityId ?? null,
        metaJson: entry.meta ? (entry.meta as Prisma.InputJsonValue) : undefined
      }
    });
  } catch (error) {
    console.error("audit log failed", error);
  }
}
