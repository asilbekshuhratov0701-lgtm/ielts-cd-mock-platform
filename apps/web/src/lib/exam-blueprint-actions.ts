"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma, Prisma } from "@ielts/db";
import { auth } from "@/auth";
import { createBlueprintFromJson } from "@/lib/exam-blueprint";
import { saveMediaObject, safeKeySegment, mediaPublicUrl } from "@/lib/media-storage";

async function requireStaff() {
  const session = await auth();
  if (!session?.user?.id || session.user.role === "CANDIDATE") redirect("/login");
  return session.user;
}

async function orgIdFor(userId: string): Promise<string> {
  const dbUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!dbUser) redirect("/login");
  return dbUser.orgId;
}

async function loadOwnedBlueprint(id: string, orgId: string) {
  if (!id) return null;
  return prisma.examBlueprint.findFirst({ where: { id, orgId } });
}

function refresh(id?: string) {
  revalidatePath("/admin/exam-import");
  if (id) revalidatePath(`/admin/exam-import/${id}`);
}

export async function importBlueprintAction(formData: FormData): Promise<void> {
  const user = await requireStaff();
  const orgId = await orgIdFor(user.id);
  const raw = String(formData.get("json") ?? "");
  if (!raw.trim()) redirect("/admin/exam-import?error=empty");
  if (raw.length > 5_000_000) redirect("/admin/exam-import?error=too_large");

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    redirect("/admin/exam-import?error=parse");
  }

  const result = await createBlueprintFromJson({ orgId, createdById: user.id, rawJson: json });
  if (!result.ok) redirect("/admin/exam-import?error=invalid");
  refresh(result.blueprintId);
  redirect(`/admin/exam-import/${result.blueprintId}`);
}

export async function createWritingExamAction(formData: FormData): Promise<void> {
  const user = await requireStaff();
  const orgId = await orgIdFor(user.id);
  const title = String(formData.get("title") ?? "").trim();
  const task1 = String(formData.get("task1") ?? "").trim();
  const task2 = String(formData.get("task2") ?? "").trim();
  if (!title || !task1 || !task2) redirect("/admin/exam-import?error=writing_incomplete");

  let imageUrl: string | undefined;
  const file = formData.get("task1Image");
  if (file instanceof File && file.size > 0) {
    const ext = (file.name.split(".").pop() ?? "png").toLowerCase();
    const key = `writing-${safeKeySegment(title)}-${Date.now()}.${ext}`;
    await saveMediaObject(key, new Uint8Array(await file.arrayBuffer()));
    imageUrl = mediaPublicUrl(key);
  }

  const examId = `writing-${safeKeySegment(title)}-${Date.now()}`;
  const json = {
    schemaVersion: 1,
    examId,
    module: "writing",
    title,
    totalQuestions: 2,
    timerSource: "fixed",
    timeLimitMinutes: 60,
    sections: [
      {
        id: "w-s1",
        order: 0,
        title: "Writing Task 1",
        groups: [
          {
            id: "w-g1",
            questionType: "writing_task_1",
            primitive: "essay",
            instructions: "You should spend about 20 minutes on this task.",
            questions: [
              { type: "essay", id: "task1", number: 1, prompt: task1, minWords: 150, imageUrl }
            ]
          }
        ]
      },
      {
        id: "w-s2",
        order: 1,
        title: "Writing Task 2",
        groups: [
          {
            id: "w-g2",
            questionType: "writing_task_2",
            primitive: "essay",
            instructions: "You should spend about 40 minutes on this task.",
            questions: [{ type: "essay", id: "task2", number: 2, prompt: task2, minWords: 250 }]
          }
        ]
      }
    ]
  };

  const result = await createBlueprintFromJson({ orgId, createdById: user.id, rawJson: json });
  if (!result.ok) redirect("/admin/exam-import?error=writing_invalid");
  refresh(result.blueprintId);
  redirect(`/admin/exam-import/${result.blueprintId}`);
}

export async function publishBlueprintAction(formData: FormData): Promise<void> {
  const user = await requireStaff();
  const orgId = await orgIdFor(user.id);
  const id = String(formData.get("id") ?? "");
  const bp = await loadOwnedBlueprint(id, orgId);
  if (!bp || bp.state === "audio_pending") {
    refresh(id);
    return;
  }
  if (bp.module === "listening" && !bp.audioMediaId) {
    refresh(id);
    return;
  }
  await prisma.examBlueprint.update({
    where: { id },
    data: { state: "published", publishedAt: new Date() }
  });
  refresh(id);
}

export async function unpublishBlueprintAction(formData: FormData): Promise<void> {
  const user = await requireStaff();
  const orgId = await orgIdFor(user.id);
  const id = String(formData.get("id") ?? "");
  const bp = await loadOwnedBlueprint(id, orgId);
  if (!bp) return;
  const next =
    bp.module === "listening" && bp.audioRef && !bp.audioMediaId ? "audio_pending" : "draft";
  await prisma.examBlueprint.update({
    where: { id },
    data: { state: next, publishedAt: null }
  });
  refresh(id);
}

export async function attachAudioAction(formData: FormData): Promise<void> {
  const user = await requireStaff();
  const orgId = await orgIdFor(user.id);
  const id = String(formData.get("id") ?? "");
  const mockId = String(formData.get("mockId") ?? "");
  const file = formData.get("audio");
  if (mockId) revalidatePath(`/admin/exam-import/mock/${mockId}`);
  if (!id || !(file instanceof File) || file.size === 0) {
    refresh(id);
    return;
  }
  const bp = await loadOwnedBlueprint(id, orgId);
  if (!bp) return;

  const ext = (file.name.split(".").pop() ?? "mp3").toLowerCase();
  const key = `${safeKeySegment(bp.examKey)}-v${bp.version}-${safeKeySegment(
    bp.audioRef ?? "audio"
  )}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  await saveMediaObject(key, bytes);

  const media = await prisma.media.create({
    data: {
      orgId,
      r2Key: key,
      kind: "AUDIO" as Prisma.MediaCreateInput["kind"],
      mime: file.type || "audio/mpeg",
      bytes: file.size,
      originalName: file.name,
      createdById: user.id
    }
  });

  await prisma.examBlueprint.update({
    where: { id },
    data: {
      audioMediaId: media.id,
      state: bp.state === "audio_pending" ? "draft" : bp.state
    }
  });
  refresh(id);
}

function setGroupImage(root: unknown, groupId: string, url: string): boolean {
  if (!root || typeof root !== "object") return false;
  const sections = (root as { sections?: unknown }).sections;
  if (!Array.isArray(sections)) return false;
  let changed = false;
  for (const section of sections) {
    const groups = (section as { groups?: unknown }).groups;
    if (!Array.isArray(groups)) continue;
    for (const group of groups) {
      if (group && typeof group === "object" && (group as { id?: unknown }).id === groupId) {
        (group as Record<string, unknown>).imageUrl = url;
        changed = true;
      }
    }
  }
  return changed;
}

export async function attachGroupImageAction(formData: FormData): Promise<void> {
  const user = await requireStaff();
  const orgId = await orgIdFor(user.id);
  const id = String(formData.get("id") ?? "");
  const groupId = String(formData.get("groupId") ?? "");
  const mockId = String(formData.get("mockId") ?? "");
  const file = formData.get("image");
  if (mockId) revalidatePath(`/admin/exam-import/mock/${mockId}`);
  if (!id || !groupId || !(file instanceof File) || file.size === 0) {
    refresh(id);
    return;
  }
  const bp = await loadOwnedBlueprint(id, orgId);
  if (!bp) return;

  const ext = (file.name.split(".").pop() ?? "png").toLowerCase();
  const key = `${safeKeySegment(bp.examKey)}-v${bp.version}-${safeKeySegment(groupId)}-${Date.now()}.${ext}`;
  await saveMediaObject(key, new Uint8Array(await file.arrayBuffer()));
  const url = mediaPublicUrl(key);

  await prisma.media.create({
    data: {
      orgId,
      r2Key: key,
      kind: "IMAGE" as Prisma.MediaCreateInput["kind"],
      mime: file.type || "image/png",
      bytes: file.size,
      originalName: file.name,
      createdById: user.id
    }
  });

  const engine = structuredClone(bp.engineJson) as unknown;
  const source = structuredClone(bp.sourceJson) as unknown;
  setGroupImage(engine, groupId, url);
  setGroupImage(source, groupId, url);

  await prisma.examBlueprint.update({
    where: { id },
    data: {
      engineJson: engine as Prisma.InputJsonValue,
      sourceJson: source as Prisma.InputJsonValue
    }
  });
  refresh(id);
}

export async function deleteBlueprintAction(formData: FormData): Promise<void> {
  const user = await requireStaff();
  const orgId = await orgIdFor(user.id);
  const id = String(formData.get("id") ?? "");
  const bp = await loadOwnedBlueprint(id, orgId);
  if (!bp) return;
  const attempts = await prisma.blueprintAttempt.count({ where: { blueprintId: id } });
  const usedInMock = await prisma.mockExamPart.count({ where: { blueprintId: id } });
  if (attempts > 0 || usedInMock > 0) {
    redirect(`/admin/exam-import/${id}?error=in_use`);
  }
  await prisma.examBlueprint.delete({ where: { id } });
  revalidatePath("/admin/exam-import");
  redirect("/admin/exam-import");
}
