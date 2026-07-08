"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma, Prisma } from "@ielts/db";
import { auth } from "@/auth";
import { hashPassword } from "@/lib/password";
import { logAudit } from "@/lib/audit";
import { parseCandidateFile, type ImportRow } from "@/lib/candidates-import";
import { EMPTY_IMPORT_RESULT, type ImportResult } from "@/lib/candidate-admin-types";

async function requireAdmin() {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user?.id || (role !== "ADMIN" && role !== "SUPER_ADMIN")) redirect("/admin");
  const dbUser = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!dbUser) redirect("/admin");
  return dbUser;
}

function randomPassword(length = 10): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += alphabet[bytes[i]! % alphabet.length];
  return out;
}

function shuffle<T>(input: T[]): T[] {
  const array = [...input];
  for (let i = array.length - 1; i > 0; i--) {
    const j = randomBytes(1)[0]! % (i + 1);
    [array[i], array[j]] = [array[j]!, array[i]!];
  }
  return array;
}

function profileCreateData(row: ImportRow) {
  return {
    phone: row.phone ?? null,
    country: row.country ?? null,
    targetBand: row.targetBand ?? null
  };
}

async function upsertProfile(userId: string, row: ImportRow) {
  await prisma.candidateProfile.upsert({
    where: { userId },
    create: { userId, ...profileCreateData(row) },
    update: {
      ...(row.phone ? { phone: row.phone } : {}),
      ...(row.country ? { country: row.country } : {}),
      ...(row.targetBand !== undefined ? { targetBand: row.targetBand } : {})
    }
  });
}

export async function importCandidatesAction(
  _prev: ImportResult,
  formData: FormData
): Promise<ImportResult> {
  const admin = await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ...EMPTY_IMPORT_RESULT, ok: false, message: "Choose a CSV, JSON, or Excel file." };
  }

  let rows: ImportRow[];
  try {
    rows = await parseCandidateFile(file);
  } catch {
    return {
      ...EMPTY_IMPORT_RESULT,
      ok: false,
      message: "Could not read the file. Check the format and column headers."
    };
  }
  if (rows.length === 0) {
    return {
      ...EMPTY_IMPORT_RESULT,
      ok: false,
      message: "No valid rows found — a recognizable 'email' column is required."
    };
  }

  const orgId = admin.orgId;
  const errors: string[] = [];
  const generated: { email: string; password: string }[] = [];
  let created = 0;
  let updated = 0;
  let failed = 0;
  let groupsCreated = 0;

  const groupNames = [...new Set(rows.map((r) => r.group).filter((g): g is string => Boolean(g)))];
  const groupIdByName = new Map<string, string>();
  if (groupNames.length > 0) {
    const existingGroups = await prisma.candidateGroup.findMany({ where: { orgId } });
    for (const group of existingGroups) groupIdByName.set(group.name.toLowerCase(), group.id);
    for (const name of groupNames) {
      if (!groupIdByName.has(name.toLowerCase())) {
        const group = await prisma.candidateGroup.create({ data: { orgId, name } });
        groupIdByName.set(name.toLowerCase(), group.id);
        groupsCreated++;
      }
    }
  }

  const existingUsers = await prisma.user.findMany({
    where: { email: { in: rows.map((r) => r.email) } }
  });
  const userByEmail = new Map(existingUsers.map((u) => [u.email.toLowerCase(), u]));
  const memberships: { groupId: string; candidateId: string }[] = [];

  for (const row of rows) {
    try {
      const existing = userByEmail.get(row.email);
      let userId: string;

      if (existing) {
        if (existing.orgId !== orgId) {
          failed++;
          errors.push(`${row.email}: already registered in another organisation.`);
          continue;
        }
        const data: Prisma.UserUpdateInput = {};
        if (row.name) data.name = row.name;
        if (row.password) {
          if (row.password.length < 6) {
            failed++;
            errors.push(`${row.email}: password too short (min 6 characters).`);
            continue;
          }
          data.passwordHash = await hashPassword(row.password);
        }
        await prisma.user.update({ where: { id: existing.id }, data });
        await upsertProfile(existing.id, row);
        userId = existing.id;
        updated++;
      } else {
        let password = row.password;
        if (password && password.length < 6) {
          failed++;
          errors.push(`${row.email}: password too short (min 6 characters).`);
          continue;
        }
        if (!password) {
          password = randomPassword();
          generated.push({ email: row.email, password });
        }
        const user = await prisma.user.create({
          data: {
            orgId,
            email: row.email,
            name: row.name ?? null,
            role: "CANDIDATE",
            status: "ACTIVE",
            passwordHash: await hashPassword(password),
            candidateProfile: { create: profileCreateData(row) }
          }
        });
        userId = user.id;
        created++;
      }

      if (row.group) {
        const groupId = groupIdByName.get(row.group.toLowerCase());
        if (groupId) memberships.push({ groupId, candidateId: userId });
      }
    } catch (error) {
      failed++;
      errors.push(`${row.email}: ${(error as Error).message}`);
    }
  }

  if (memberships.length > 0) {
    const unique = [
      ...new Map(memberships.map((m) => [`${m.groupId}:${m.candidateId}`, m])).values()
    ];
    const already = await prisma.candidateGroupMember.findMany({
      where: { OR: unique.map((m) => ({ groupId: m.groupId, candidateId: m.candidateId })) },
      select: { groupId: true, candidateId: true }
    });
    const have = new Set(already.map((m) => `${m.groupId}:${m.candidateId}`));
    const toCreate = unique.filter((m) => !have.has(`${m.groupId}:${m.candidateId}`));
    if (toCreate.length > 0) await prisma.candidateGroupMember.createMany({ data: toCreate });
  }

  await logAudit({
    orgId,
    actorId: admin.id,
    action: "candidate.import",
    entity: "user",
    meta: { created, updated, failed, groupsCreated }
  });
  revalidatePath("/admin/candidates");
  revalidatePath("/admin/groups");

  return {
    ok: failed === 0,
    created,
    updated,
    failed,
    groupsCreated,
    errors: errors.slice(0, 50),
    generated,
    message: `Imported ${created} new candidate${created === 1 ? "" : "s"}, updated ${updated}${
      groupsCreated ? `, ${groupsCreated} group${groupsCreated === 1 ? "" : "s"} created` : ""
    }${failed ? `, ${failed} failed` : ""}.`
  };
}

export async function updateCandidateAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = String(formData.get("candidateId") ?? "");
  if (!id) return;
  const user = await prisma.user.findFirst({
    where: { id, orgId: admin.orgId, role: "CANDIDATE" }
  });
  if (!user) return;

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const country = String(formData.get("country") ?? "").trim();
  const targetRaw = String(formData.get("targetBand") ?? "").trim();
  const target = Number(targetRaw);

  if (email && email !== user.email) {
    const clash = await prisma.user.findUnique({ where: { email } });
    if (clash) redirect("/admin/candidates?error=email");
  }

  await prisma.user.update({
    where: { id },
    data: { name: name || null, ...(email ? { email } : {}) }
  });
  await prisma.candidateProfile.upsert({
    where: { userId: id },
    create: {
      userId: id,
      phone: phone || null,
      country: country || null,
      targetBand: targetRaw && Number.isFinite(target) ? target : null
    },
    update: {
      phone: phone || null,
      country: country || null,
      targetBand: targetRaw && Number.isFinite(target) ? target : null
    }
  });
  revalidatePath("/admin/candidates");
}

export async function deleteCandidateAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = String(formData.get("candidateId") ?? "");
  if (!id || id === admin.id) return;
  const user = await prisma.user.findFirst({
    where: { id, orgId: admin.orgId, role: "CANDIDATE" }
  });
  if (!user) return;
  await prisma.user.delete({ where: { id } });
  await logAudit({
    orgId: admin.orgId,
    actorId: admin.id,
    action: "candidate.delete",
    entity: "user",
    entityId: id,
    meta: { email: user.email }
  });
  revalidatePath("/admin/candidates");
}

export async function createGroupAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const group = await prisma.candidateGroup.create({ data: { orgId: admin.orgId, name } });
  revalidatePath("/admin/groups");
  redirect(`/admin/groups/${group.id}`);
}

export async function renameGroupAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = String(formData.get("groupId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) return;
  await prisma.candidateGroup.updateMany({ where: { id, orgId: admin.orgId }, data: { name } });
  revalidatePath(`/admin/groups/${id}`);
  revalidatePath("/admin/groups");
}

export async function deleteGroupAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = String(formData.get("groupId") ?? "");
  if (!id) return;
  await prisma.candidateGroup.deleteMany({ where: { id, orgId: admin.orgId } });
  revalidatePath("/admin/groups");
  redirect("/admin/groups");
}

export async function addGroupMembersAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const groupId = String(formData.get("groupId") ?? "");
  if (!groupId) return;
  const group = await prisma.candidateGroup.findFirst({
    where: { id: groupId, orgId: admin.orgId }
  });
  if (!group) return;
  const candidateIds = formData.getAll("candidateId").map(String).filter(Boolean);
  if (candidateIds.length === 0) return;
  const valid = await prisma.user.findMany({
    where: { id: { in: candidateIds }, orgId: admin.orgId, role: "CANDIDATE" },
    select: { id: true }
  });
  const already = await prisma.candidateGroupMember.findMany({
    where: { groupId, candidateId: { in: valid.map((v) => v.id) } },
    select: { candidateId: true }
  });
  const have = new Set(already.map((m) => m.candidateId));
  const toCreate = valid.filter((v) => !have.has(v.id)).map((v) => ({ groupId, candidateId: v.id }));
  if (toCreate.length > 0) await prisma.candidateGroupMember.createMany({ data: toCreate });
  revalidatePath(`/admin/groups/${groupId}`);
}

export async function removeGroupMemberAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const groupId = String(formData.get("groupId") ?? "");
  const candidateId = String(formData.get("candidateId") ?? "");
  if (!groupId || !candidateId) return;
  const group = await prisma.candidateGroup.findFirst({
    where: { id: groupId, orgId: admin.orgId }
  });
  if (!group) return;
  await prisma.candidateGroupMember
    .delete({ where: { groupId_candidateId: { groupId, candidateId } } })
    .catch(() => undefined);
  revalidatePath(`/admin/groups/${groupId}`);
}

export async function assignMockToGroupAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const groupId = String(formData.get("groupId") ?? "");
  const mockExamId = String(formData.get("mockExamId") ?? "");
  if (!groupId || !mockExamId) return;
  const [group, mock] = await Promise.all([
    prisma.candidateGroup.findFirst({ where: { id: groupId, orgId: admin.orgId } }),
    prisma.mockExam.findFirst({ where: { id: mockExamId, orgId: admin.orgId } })
  ]);
  if (!group || !mock) return;
  const existing = await prisma.mockAssignment.findFirst({ where: { groupId, mockExamId } });
  if (!existing) await prisma.mockAssignment.create({ data: { groupId, mockExamId } });
  revalidatePath(`/admin/groups/${groupId}`);
}

export async function unassignMockFromGroupAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const groupId = String(formData.get("groupId") ?? "");
  const mockExamId = String(formData.get("mockExamId") ?? "");
  if (!groupId || !mockExamId) return;
  const group = await prisma.candidateGroup.findFirst({
    where: { id: groupId, orgId: admin.orgId }
  });
  if (!group) return;
  await prisma.mockAssignment.deleteMany({ where: { groupId, mockExamId } });
  revalidatePath(`/admin/groups/${groupId}`);
}

export async function shuffleAssignAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const groupId = String(formData.get("groupId") ?? "");
  if (!groupId) return;
  const group = await prisma.candidateGroup.findFirst({
    where: { id: groupId, orgId: admin.orgId },
    include: { members: { select: { candidateId: true } } }
  });
  if (!group || group.members.length === 0) return;

  const pool = formData.getAll("mockExamId").map(String).filter(Boolean);
  if (pool.length === 0) return;
  const validMocks = await prisma.mockExam.findMany({
    where: { id: { in: pool }, orgId: admin.orgId, state: "published" },
    select: { id: true }
  });
  const mockIds = validMocks.map((m) => m.id);
  if (mockIds.length === 0) return;

  const memberIds = shuffle(group.members.map((m) => m.candidateId));
  const mockOrder = shuffle(mockIds);
  const assignments = memberIds.map((candidateId, index) => ({
    candidateId,
    mockExamId: mockOrder[index % mockOrder.length]!
  }));

  await prisma.$transaction([
    prisma.mockAssignment.deleteMany({ where: { groupId, mockExamId: { in: mockIds } } }),
    prisma.mockAssignment.deleteMany({
      where: { candidateId: { in: memberIds }, mockExamId: { in: mockIds } }
    }),
    prisma.mockAssignment.createMany({ data: assignments })
  ]);

  await logAudit({
    orgId: admin.orgId,
    actorId: admin.id,
    action: "group.shuffle_assign",
    entity: "candidateGroup",
    entityId: groupId,
    meta: { mocks: mockIds.length, members: memberIds.length }
  });
  revalidatePath(`/admin/groups/${groupId}`);
}
