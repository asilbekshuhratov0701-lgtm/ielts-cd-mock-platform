"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma, Prisma } from "@ielts/db";
import { auth } from "@/auth";
import { logAudit } from "@/lib/audit";
import { CONTENT_TYPES, type ContentType } from "@/lib/question-bank";

async function requireStaff() {
  const session = await auth();
  if (!session?.user?.id || session.user.role === "CANDIDATE") redirect("/login");
  const dbUser = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!dbUser) redirect("/login");
  return dbUser;
}

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function jsonOrSkip(value: Prisma.JsonValue | null): Prisma.InputJsonValue | undefined {
  return value == null ? undefined : (value as Prisma.InputJsonValue);
}

function asContentType(value: string): ContentType | null {
  return CONTENT_TYPES.includes(value as ContentType) ? (value as ContentType) : null;
}

async function nextOrder(model: "passage" | "audio" | "group", sectionId: string): Promise<number> {
  if (model === "passage") {
    const agg = await prisma.passage.aggregate({ where: { sectionId }, _max: { order: true } });
    return (agg._max.order ?? -1) + 1;
  }
  if (model === "audio") {
    const agg = await prisma.audioTrack.aggregate({ where: { sectionId }, _max: { order: true } });
    return (agg._max.order ?? -1) + 1;
  }
  const agg = await prisma.questionGroup.aggregate({ where: { sectionId }, _max: { order: true } });
  return (agg._max.order ?? -1) + 1;
}

async function setLibraryFlag(
  contentType: ContentType,
  refId: string,
  data: { isLibrary: boolean; category?: string | null; difficulty?: string | null; tags?: string[] }
): Promise<void> {
  const patch: {
    isLibrary: boolean;
    category?: string | null;
    difficulty?: string | null;
    tagsJson?: Prisma.InputJsonValue;
  } = { isLibrary: data.isLibrary };
  if (data.category !== undefined) patch.category = data.category;
  if (data.difficulty !== undefined) patch.difficulty = data.difficulty;
  if (data.tags && data.tags.length > 0) patch.tagsJson = data.tags;

  if (contentType === "PASSAGE") await prisma.passage.update({ where: { id: refId }, data: patch });
  else if (contentType === "AUDIO")
    await prisma.audioTrack.update({ where: { id: refId }, data: patch });
  else if (contentType === "QUESTION_GROUP")
    await prisma.questionGroup.update({ where: { id: refId }, data: patch });
  else if (contentType === "WRITING_TASK")
    await prisma.writingTask.update({ where: { id: refId }, data: patch });
}

export async function saveToLibraryAction(formData: FormData): Promise<void> {
  const user = await requireStaff();
  const contentType = asContentType(String(formData.get("contentType") ?? ""));
  const refId = String(formData.get("refId") ?? "").trim();
  const examId = String(formData.get("examId") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim() || null;
  const difficulty = String(formData.get("difficulty") ?? "").trim() || null;
  const tags = splitList(String(formData.get("tags") ?? ""));
  if (!contentType || !refId) return;

  await setLibraryFlag(contentType, refId, { isLibrary: true, category, difficulty, tags });

  const tagsJson = tags.length > 0 ? (tags as Prisma.InputJsonValue) : undefined;
  const existing = await prisma.libraryItem.findFirst({
    where: { orgId: user.orgId, contentType: contentType as Prisma.LibraryItemWhereInput["contentType"], refId }
  });
  if (existing) {
    await prisma.libraryItem.update({
      where: { id: existing.id },
      data: { category, difficulty, tagsJson }
    });
  } else {
    await prisma.libraryItem.create({
      data: {
        orgId: user.orgId,
        contentType: contentType as Prisma.LibraryItemCreateInput["contentType"],
        refId,
        category,
        difficulty,
        tagsJson
      }
    });
  }

  await logAudit({
    orgId: user.orgId,
    actorId: user.id,
    action: "library.save",
    entity: contentType.toLowerCase(),
    entityId: refId,
    meta: { category: category ?? "", difficulty: difficulty ?? "" }
  });

  if (examId) revalidatePath(`/admin/exams/${examId}/edit`);
  revalidatePath("/admin/question-bank");
}

export async function removeFromLibraryAction(formData: FormData): Promise<void> {
  const user = await requireStaff();
  const contentType = asContentType(String(formData.get("contentType") ?? ""));
  const refId = String(formData.get("refId") ?? "").trim();
  const examId = String(formData.get("examId") ?? "").trim();
  if (!contentType || !refId) return;

  await setLibraryFlag(contentType, refId, { isLibrary: false });
  await prisma.libraryItem.deleteMany({
    where: { orgId: user.orgId, contentType: contentType as Prisma.LibraryItemWhereInput["contentType"], refId }
  });

  await logAudit({
    orgId: user.orgId,
    actorId: user.id,
    action: "library.remove",
    entity: contentType.toLowerCase(),
    entityId: refId
  });

  if (examId) revalidatePath(`/admin/exams/${examId}/edit`);
  revalidatePath("/admin/question-bank");
}

async function clonePassage(passageId: string, sectionId: string): Promise<string> {
  const src = await prisma.passage.findUniqueOrThrow({ where: { id: passageId } });
  const copy = await prisma.passage.create({
    data: {
      sectionId,
      order: await nextOrder("passage", sectionId),
      title: src.title,
      bodyRichtext: src.bodyRichtext,
      imageMediaId: src.imageMediaId
    }
  });
  return copy.id;
}

async function cloneAudio(audioId: string, sectionId: string): Promise<string> {
  const src = await prisma.audioTrack.findUniqueOrThrow({ where: { id: audioId } });
  const copy = await prisma.audioTrack.create({
    data: {
      sectionId,
      mediaId: src.mediaId,
      durationSec: src.durationSec,
      order: await nextOrder("audio", sectionId)
    }
  });
  return copy.id;
}

async function cloneWritingTask(taskId: string, sectionId: string): Promise<string> {
  const src = await prisma.writingTask.findUniqueOrThrow({ where: { id: taskId } });
  const agg = await prisma.writingTask.aggregate({ where: { sectionId }, _max: { taskNo: true } });
  const copy = await prisma.writingTask.create({
    data: {
      sectionId,
      taskNo: (agg._max.taskNo ?? 0) + 1,
      promptRichtext: src.promptRichtext,
      imageMediaId: src.imageMediaId,
      minWords: src.minWords
    }
  });
  return copy.id;
}

async function cloneQuestionGroup(groupId: string, sectionId: string): Promise<string> {
  const src = await prisma.questionGroup.findUniqueOrThrow({
    where: { id: groupId },
    include: { questions: { include: { options: true, answerKey: true } } }
  });

  let passageId: string | null = null;
  if (src.passageId) passageId = await clonePassage(src.passageId, sectionId);
  let audioTrackId: string | null = null;
  if (src.audioTrackId) audioTrackId = await cloneAudio(src.audioTrackId, sectionId);

  const copy = await prisma.questionGroup.create({
    data: {
      sectionId,
      passageId,
      audioTrackId,
      type: src.type,
      instructionsRichtext: src.instructionsRichtext,
      order: await nextOrder("group", sectionId),
      layoutJson: jsonOrSkip(src.layoutJson),
      questions: {
        create: src.questions.map((q) => ({
          number: q.number,
          prompt: q.prompt,
          answerType: q.answerType,
          optionsInlineJson: jsonOrSkip(q.optionsInlineJson),
          points: q.points,
          options:
            q.options.length > 0
              ? {
                  create: q.options.map((o) => ({ label: o.label, value: o.value, order: o.order }))
                }
              : undefined,
          answerKey: q.answerKey
            ? {
                create: {
                  acceptedJson: q.answerKey.acceptedJson as Prisma.InputJsonValue,
                  matchMode: q.answerKey.matchMode,
                  caseSensitive: q.answerKey.caseSensitive
                }
              }
            : undefined
        }))
      }
    }
  });
  return copy.id;
}

async function cloneContent(
  contentType: ContentType,
  refId: string,
  sectionId: string
): Promise<void> {
  if (contentType === "PASSAGE") await clonePassage(refId, sectionId);
  else if (contentType === "AUDIO") await cloneAudio(refId, sectionId);
  else if (contentType === "WRITING_TASK") await cloneWritingTask(refId, sectionId);
  else if (contentType === "QUESTION_GROUP") await cloneQuestionGroup(refId, sectionId);
}

export async function cloneLibraryItemAction(formData: FormData): Promise<void> {
  const user = await requireStaff();
  const libraryItemId = String(formData.get("libraryItemId") ?? "").trim();
  const targetSectionId = String(formData.get("targetSectionId") ?? "").trim();
  if (!libraryItemId || !targetSectionId) return;

  const item = await prisma.libraryItem.findUnique({ where: { id: libraryItemId } });
  if (!item || item.orgId !== user.orgId) return;
  const contentType = asContentType(item.contentType);
  if (!contentType) return;

  const section = await prisma.examSection.findUnique({
    where: { id: targetSectionId },
    include: { exam: { select: { id: true, orgId: true, frozen: true, status: true } } }
  });
  if (!section || section.exam.orgId !== user.orgId) return;
  if (section.exam.frozen || section.exam.status === "PUBLISHED" || section.exam.status === "ARCHIVED")
    return;

  await cloneContent(contentType, item.refId, targetSectionId);
  await prisma.libraryItem.update({
    where: { id: item.id },
    data: { reuseCount: { increment: 1 } }
  });

  await logAudit({
    orgId: user.orgId,
    actorId: user.id,
    action: "library.clone",
    entity: contentType.toLowerCase(),
    entityId: item.refId,
    meta: { intoExam: section.exam.id }
  });

  revalidatePath(`/admin/exams/${section.exam.id}/edit`);
  revalidatePath("/admin/question-bank");
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i]!;
    a[i] = a[j]!;
    a[j] = tmp;
  }
  return a;
}

async function pickLibraryGroupIds(
  orgId: string,
  kind: "READING" | "LISTENING",
  count: number
): Promise<string[]> {
  if (count <= 0) return [];
  const candidates = await prisma.questionGroup.findMany({
    where: {
      isLibrary: true,
      section: { kind: kind as Prisma.ExamSectionWhereInput["kind"], exam: { orgId } }
    },
    select: { id: true }
  });
  return shuffle(candidates.map((c) => c.id)).slice(0, count);
}

async function pickLibraryWritingTaskIds(orgId: string, count: number): Promise<string[]> {
  if (count <= 0) return [];
  const candidates = await prisma.writingTask.findMany({
    where: { isLibrary: true, section: { exam: { orgId } } },
    select: { id: true }
  });
  return shuffle(candidates.map((c) => c.id)).slice(0, count);
}

export async function generateMockAction(formData: FormData): Promise<void> {
  const user = await requireStaff();
  const title = String(formData.get("title") ?? "").trim() || "Randomized mock";
  const moduleType =
    String(formData.get("moduleType") ?? "ACADEMIC") === "GENERAL" ? "GENERAL" : "ACADEMIC";
  const listeningGroups = Math.max(0, Math.min(10, Number(formData.get("listeningGroups") ?? 0)));
  const readingGroups = Math.max(0, Math.min(10, Number(formData.get("readingGroups") ?? 0)));
  const writingTasks = Math.max(0, Math.min(2, Number(formData.get("writingTasks") ?? 0)));

  const [listeningIds, readingIds, writingIds] = await Promise.all([
    pickLibraryGroupIds(user.orgId, "LISTENING", listeningGroups),
    pickLibraryGroupIds(user.orgId, "READING", readingGroups),
    pickLibraryWritingTaskIds(user.orgId, writingTasks)
  ]);

  if (listeningIds.length === 0 && readingIds.length === 0 && writingIds.length === 0) {
    redirect("/admin/question-bank?error=empty");
  }

  const exam = await prisma.exam.create({
    data: {
      orgId: user.orgId,
      title,
      moduleType: moduleType as Prisma.ExamCreateInput["moduleType"],
      status: "DRAFT",
      source: "MANUAL",
      createdById: user.id
    }
  });

  let order = 0;
  if (listeningIds.length > 0) {
    const section = await prisma.examSection.create({
      data: { examId: exam.id, kind: "LISTENING", order: order++, durationSec: 30 * 60 }
    });
    for (const gid of listeningIds) await cloneQuestionGroup(gid, section.id);
  }
  if (readingIds.length > 0) {
    const section = await prisma.examSection.create({
      data: { examId: exam.id, kind: "READING", order: order++, durationSec: 60 * 60 }
    });
    for (const gid of readingIds) await cloneQuestionGroup(gid, section.id);
  }
  if (writingIds.length > 0) {
    const section = await prisma.examSection.create({
      data: { examId: exam.id, kind: "WRITING", order: order++, durationSec: 60 * 60 }
    });
    for (const tid of writingIds) await cloneWritingTask(tid, section.id);
  }

  await prisma.libraryItem.updateMany({
    where: {
      orgId: user.orgId,
      refId: { in: [...listeningIds, ...readingIds, ...writingIds] }
    },
    data: { reuseCount: { increment: 1 } }
  });

  await logAudit({
    orgId: user.orgId,
    actorId: user.id,
    action: "library.generate_mock",
    entity: "exam",
    entityId: exam.id,
    meta: {
      title,
      listening: listeningIds.length,
      reading: readingIds.length,
      writing: writingIds.length
    }
  });

  redirect(`/admin/exams/${exam.id}/edit`);
}
