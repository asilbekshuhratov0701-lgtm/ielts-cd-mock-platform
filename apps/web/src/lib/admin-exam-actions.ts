"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma, Prisma } from "@ielts/db";
import { auth } from "@/auth";
import { logAudit } from "@/lib/audit";

async function requireStaff() {
  const session = await auth();
  if (!session?.user?.id || session.user.role === "CANDIDATE") redirect("/login");
  return session.user;
}

function refresh(examId: string) {
  revalidatePath(`/admin/exams/${examId}/edit`);
  revalidatePath("/admin/exams");
}

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function parseOptions(value: string): { value: string; label: string; order: number }[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [rawValue, rawLabel] = line.split("|");
      const v = (rawValue ?? "").trim();
      return { value: v, label: (rawLabel ?? rawValue ?? "").trim(), order: index };
    })
    .filter((o) => o.value.length > 0);
}

async function nextOrder(
  model: "section" | "group" | "passage",
  parentId: string
): Promise<number> {
  if (model === "section") {
    const agg = await prisma.examSection.aggregate({
      where: { examId: parentId },
      _max: { order: true }
    });
    return (agg._max.order ?? -1) + 1;
  }
  if (model === "group") {
    const agg = await prisma.questionGroup.aggregate({
      where: { sectionId: parentId },
      _max: { order: true }
    });
    return (agg._max.order ?? -1) + 1;
  }
  const agg = await prisma.passage.aggregate({
    where: { sectionId: parentId },
    _max: { order: true }
  });
  return (agg._max.order ?? -1) + 1;
}

export async function createExamAction(formData: FormData): Promise<void> {
  const user = await requireStaff();
  const title = String(formData.get("title") ?? "").trim();
  const moduleType =
    String(formData.get("moduleType") ?? "ACADEMIC") === "GENERAL" ? "GENERAL" : "ACADEMIC";
  if (!title) redirect("/admin/exams");

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) redirect("/admin/exams");

  const exam = await prisma.exam.create({
    data: {
      orgId: dbUser.orgId,
      title,
      moduleType,
      status: "DRAFT",
      source: "MANUAL",
      createdById: user.id
    }
  });
  redirect(`/admin/exams/${exam.id}/edit`);
}

export async function updateExamAction(formData: FormData): Promise<void> {
  await requireStaff();
  const examId = String(formData.get("examId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const moduleType =
    String(formData.get("moduleType") ?? "ACADEMIC") === "GENERAL" ? "GENERAL" : "ACADEMIC";
  if (!examId || !title) return;
  await prisma.exam.update({ where: { id: examId }, data: { title, moduleType } });
  refresh(examId);
}

export async function publishExamAction(formData: FormData): Promise<void> {
  const user = await requireStaff();
  const examId = String(formData.get("examId") ?? "");
  if (!examId) return;
  const exam = await prisma.exam.update({
    where: { id: examId },
    data: { status: "PUBLISHED", publishedAt: new Date() }
  });
  await logAudit({
    orgId: exam.orgId,
    actorId: user.id,
    action: "exam.publish",
    entity: "exam",
    entityId: exam.id,
    meta: { title: exam.title }
  });
  refresh(examId);
}

export async function archiveExamAction(formData: FormData): Promise<void> {
  await requireStaff();
  const examId = String(formData.get("examId") ?? "");
  if (!examId) return;
  await prisma.exam.update({ where: { id: examId }, data: { status: "ARCHIVED" } });
  refresh(examId);
}

export async function deleteExamAction(formData: FormData): Promise<void> {
  await requireStaff();
  const examId = String(formData.get("examId") ?? "");
  if (!examId) return;
  await prisma.exam.delete({ where: { id: examId } });
  redirect("/admin/exams");
}

export async function addSectionAction(formData: FormData): Promise<void> {
  await requireStaff();
  const examId = String(formData.get("examId") ?? "");
  const kindRaw = String(formData.get("kind") ?? "");
  const durationMin = Number(formData.get("durationMin") ?? 0);
  const kind = ["LISTENING", "READING", "WRITING"].includes(kindRaw) ? kindRaw : null;
  if (!examId || !kind || durationMin <= 0) return;
  await prisma.examSection.create({
    data: {
      examId,
      kind: kind as "LISTENING" | "READING" | "WRITING",
      order: await nextOrder("section", examId),
      durationSec: Math.round(durationMin * 60)
    }
  });
  refresh(examId);
}

export async function deleteSectionAction(formData: FormData): Promise<void> {
  await requireStaff();
  const examId = String(formData.get("examId") ?? "");
  const sectionId = String(formData.get("sectionId") ?? "");
  if (!sectionId) return;
  await prisma.examSection.delete({ where: { id: sectionId } });
  refresh(examId);
}

export async function addPassageAction(formData: FormData): Promise<void> {
  await requireStaff();
  const examId = String(formData.get("examId") ?? "");
  const sectionId = String(formData.get("sectionId") ?? "");
  const title = String(formData.get("title") ?? "").trim() || null;
  const body = String(formData.get("body") ?? "").trim();
  if (!sectionId || !body) return;
  await prisma.passage.create({
    data: { sectionId, title, bodyRichtext: body, order: await nextOrder("passage", sectionId) }
  });
  refresh(examId);
}

export async function addWritingTaskAction(formData: FormData): Promise<void> {
  await requireStaff();
  const examId = String(formData.get("examId") ?? "");
  const sectionId = String(formData.get("sectionId") ?? "");
  const taskNo = Number(formData.get("taskNo") ?? 0);
  const prompt = String(formData.get("prompt") ?? "").trim();
  const minWords = Number(formData.get("minWords") ?? 150);
  if (!sectionId || !taskNo || !prompt) return;
  await prisma.writingTask.create({
    data: { sectionId, taskNo, promptRichtext: prompt, minWords: minWords > 0 ? minWords : 150 }
  });
  refresh(examId);
}

export async function addGroupAction(formData: FormData): Promise<void> {
  await requireStaff();
  const examId = String(formData.get("examId") ?? "");
  const sectionId = String(formData.get("sectionId") ?? "");
  const type = String(formData.get("type") ?? "").trim();
  const instructions = String(formData.get("instructions") ?? "").trim();
  const passageId = String(formData.get("passageId") ?? "").trim() || null;
  if (!sectionId || !type || !instructions) return;
  await prisma.questionGroup.create({
    data: {
      sectionId,
      passageId,
      type: type as Prisma.QuestionGroupCreateInput["type"],
      instructionsRichtext: instructions,
      order: await nextOrder("group", sectionId)
    }
  });
  refresh(examId);
}

export async function deleteGroupAction(formData: FormData): Promise<void> {
  await requireStaff();
  const examId = String(formData.get("examId") ?? "");
  const groupId = String(formData.get("groupId") ?? "");
  if (!groupId) return;
  await prisma.questionGroup.delete({ where: { id: groupId } });
  refresh(examId);
}

export async function addQuestionAction(formData: FormData): Promise<void> {
  await requireStaff();
  const examId = String(formData.get("examId") ?? "");
  const groupId = String(formData.get("groupId") ?? "");
  const prompt = String(formData.get("prompt") ?? "").trim();
  const answerType = String(formData.get("answerType") ?? "TEXT");
  const optionsText = String(formData.get("options") ?? "");
  const acceptedText = String(formData.get("accepted") ?? "");
  const matchMode = String(formData.get("matchMode") ?? "EXACT");
  if (!groupId || !prompt) return;

  let number = Number(formData.get("number") ?? 0);
  if (!number || number <= 0) {
    const agg = await prisma.question.aggregate({ where: { groupId }, _max: { number: true } });
    number = (agg._max.number ?? 0) + 1;
  }

  const options = parseOptions(optionsText);
  const accepted = splitList(acceptedText);

  await prisma.question.create({
    data: {
      groupId,
      number,
      prompt,
      answerType: answerType as Prisma.QuestionCreateInput["answerType"],
      options: options.length > 0 ? { create: options } : undefined,
      answerKey:
        accepted.length > 0
          ? {
              create: {
                acceptedJson: accepted as unknown as Prisma.InputJsonValue,
                matchMode: matchMode as Prisma.AnswerKeyCreateInput["matchMode"]
              }
            }
          : undefined
    }
  });
  refresh(examId);
}

export async function deleteQuestionAction(formData: FormData): Promise<void> {
  await requireStaff();
  const examId = String(formData.get("examId") ?? "");
  const questionId = String(formData.get("questionId") ?? "");
  if (!questionId) return;
  await prisma.question.delete({ where: { id: questionId } });
  refresh(examId);
}
