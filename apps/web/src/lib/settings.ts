import { prisma, Prisma } from "@ielts/db";

export const SETTING_KEYS = {
  task2Weight: "scoring.task2Weight",
  passBand: "scoring.passBand"
} as const;

export async function getNumberSetting(
  orgId: string,
  key: string,
  fallback: number
): Promise<number> {
  const row = await prisma.setting.findUnique({ where: { orgId_key: { orgId, key } } });
  const value = row?.valueJson;
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export async function setSetting(orgId: string, key: string, value: number): Promise<void> {
  await prisma.setting.upsert({
    where: { orgId_key: { orgId, key } },
    update: { valueJson: value as Prisma.InputJsonValue },
    create: { orgId, key, valueJson: value as Prisma.InputJsonValue }
  });
}
