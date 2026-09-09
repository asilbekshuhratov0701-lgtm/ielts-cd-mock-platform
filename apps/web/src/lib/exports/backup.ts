import ExcelJS from "exceljs";
import { prisma } from "@ielts/db";
import { gatherResults, gatherWriting } from "./gather";
import { formatMinutesSeconds } from "@/lib/mock";
import { fileStamp, formatDate } from "@/lib/datetime";

export type BackupFormat = "json" | "xlsx";

interface BackupExport {
  filename: string;
  mime: string;
  body: Buffer | string;
}

function stamp(): string {
  return fileStamp();
}

function iso(value: Date | null | undefined): string {
  return value ? new Date(value).toISOString() : "";
}

async function collectBackup(orgId: string) {
  const [
    org,
    users,
    groups,
    mockExams,
    blueprints,
    assignments,
    attempts,
    settings,
    mediaFolders,
    media
  ] = await Promise.all([
    prisma.organization.findUnique({ where: { id: orgId } }),
    prisma.user.findMany({
      where: { orgId },
      include: {
        candidateProfile: true,
        staffProfile: true,
        groupMemberships: { select: { groupId: true } }
      },
      orderBy: { createdAt: "asc" }
    }),
    prisma.candidateGroup.findMany({
      where: { orgId },
      include: { members: { select: { candidateId: true } } },
      orderBy: { createdAt: "asc" }
    }),
    prisma.mockExam.findMany({ where: { orgId }, include: { parts: true } }),
    prisma.examBlueprint.findMany({ where: { orgId } }),
    prisma.mockAssignment.findMany({ where: { mockExam: { orgId } } }),
    prisma.mockAttempt.findMany({
      where: { mockExam: { orgId } },
      include: { partAttempts: { orderBy: { partOrder: "asc" } } }
    }),
    prisma.setting.findMany({ where: { orgId } }),
    prisma.mediaFolder.findMany({ where: { orgId }, orderBy: { path: "asc" } }),
    prisma.media.findMany({ where: { orgId }, orderBy: { createdAt: "asc" } })
  ]);

  const candidateCount = users.filter((u) => u.role === "CANDIDATE").length;
  const submittedCount = attempts.filter((a) => a.status === "submitted").length;
  const mediaBytes = media.reduce((sum, m) => sum + m.bytes, 0);

  return {
    meta: {
      platform: "ZiyoMock",
      backupVersion: 3,
      exportedAt: new Date().toISOString(),
      organisation: org ? { id: org.id, name: org.name, slug: org.slug } : null
    },
    counts: {
      users: users.length,
      candidates: candidateCount,
      staff: users.length - candidateCount,
      groups: groups.length,
      mockExams: mockExams.length,
      blueprints: blueprints.length,
      assignments: assignments.length,
      attempts: attempts.length,
      submittedAttempts: submittedCount,
      settings: settings.length,
      mediaFolders: mediaFolders.length,
      media: media.length,
      mediaBytes
    },
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      status: u.status,
      locale: u.locale,
      createdAt: iso(u.createdAt),
      groupIds: u.groupMemberships.map((g) => g.groupId),
      candidateProfile: u.candidateProfile
        ? {
            targetBand: u.candidateProfile.targetBand,
            country: u.candidateProfile.country,
            phone: u.candidateProfile.phone,
            dob: iso(u.candidateProfile.dob),
            notes: u.candidateProfile.notes
          }
        : null,
      staffProfile: u.staffProfile
        ? { title: u.staffProfile.title, permissionsJson: u.staffProfile.permissionsJson }
        : null
    })),
    groups: groups.map((g) => ({
      id: g.id,
      name: g.name,
      kind: g.kind,
      createdAt: iso(g.createdAt),
      memberIds: g.members.map((m) => m.candidateId)
    })),
    mockExams: mockExams.map((m) => ({
      id: m.id,
      title: m.title,
      state: m.state,
      publishedAt: iso(m.publishedAt),
      createdAt: iso(m.createdAt),
      parts: m.parts.map((p) => ({ blueprintId: p.blueprintId, module: p.module, order: p.order }))
    })),
    blueprints: blueprints.map((b) => ({
      id: b.id,
      examKey: b.examKey,
      module: b.module,
      title: b.title,
      version: b.version,
      state: b.state,
      totalQuestions: b.totalQuestions,
      timerSource: b.timerSource,
      timeLimitMin: b.timeLimitMin,
      audioRef: b.audioRef,
      audioMediaId: b.audioMediaId,
      createdById: b.createdById,
      publishedAt: iso(b.publishedAt),
      sourceJson: b.sourceJson,
      engineJson: b.engineJson,
      answerKeyJson: b.answerKeyJson
    })),
    assignments: assignments.map((a) => ({
      id: a.id,
      mockExamId: a.mockExamId,
      candidateId: a.candidateId,
      groupId: a.groupId,
      createdAt: iso(a.createdAt)
    })),
    attempts: attempts.map((a) => ({
      id: a.id,
      mockExamId: a.mockExamId,
      candidateId: a.candidateId,
      status: a.status,
      currentIndex: a.currentIndex,
      startedAt: iso(a.startedAt),
      submittedAt: iso(a.submittedAt),
      speakingBand: a.speakingBand,
      resultsReleased: a.resultsReleased,
      releasedAt: iso(a.releasedAt),
      resultJson: a.resultJson,
      parts: a.partAttempts.map((p) => ({
        id: p.id,
        blueprintId: p.blueprintId,
        partOrder: p.partOrder,
        status: p.status,
        startedAt: iso(p.startedAt),
        submittedAt: iso(p.submittedAt),
        rawScore: p.rawScore,
        totalScore: p.totalScore,
        answersJson: p.answersJson,
        resultJson: p.resultJson
      }))
    })),
    settings: settings.map((s) => ({ key: s.key, valueJson: s.valueJson })),
    mediaFolders: mediaFolders.map((f) => ({
      id: f.id,
      parentId: f.parentId,
      name: f.name,
      path: f.path
    })),
    media: media.map((m) => ({
      id: m.id,
      r2Key: m.r2Key,
      kind: String(m.kind),
      mime: m.mime,
      bytes: m.bytes,
      durationSec: m.durationSec,
      originalName: m.originalName,
      checksum: m.checksum,
      folderId: m.folderId,
      tagsJson: m.tagsJson,
      version: m.version,
      parentMediaId: m.parentMediaId,
      archived: m.archived,
      createdById: m.createdById,
      createdAt: iso(m.createdAt)
    }))
  };
}

type BackupData = Awaited<ReturnType<typeof collectBackup>>;

function addSheet(
  workbook: ExcelJS.Workbook,
  name: string,
  columns: string[],
  rows: (string | number | null)[][]
) {
  const sheet = workbook.addWorksheet(name.slice(0, 28));
  sheet.addRow(columns);
  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };
  for (const row of rows) sheet.addRow(row);
  sheet.columns.forEach((column, index) => {
    let max = columns[index]?.length ?? 10;
    for (const row of rows) {
      const cell = row[index];
      const len = cell === null || cell === undefined ? 0 : String(cell).length;
      if (len > max) max = len;
    }
    column.width = Math.min(60, Math.max(10, max + 2));
  });
  sheet.views = [{ state: "frozen", ySplit: 1 }];
}

async function backupWorkbook(data: BackupData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ZiyoMock";
  workbook.created = new Date();

  addSheet(
    workbook,
    "Summary",
    ["Field", "Value"],
    [
      ["Platform", "ZiyoMock backup"],
      ["Organisation", data.meta.organisation?.name ?? ""],
      ["Exported at", data.meta.exportedAt],
      ["Candidates", data.counts.candidates],
      ["Staff", data.counts.staff],
      ["Groups", data.counts.groups],
      ["Mock exams", data.counts.mockExams],
      ["Exam blueprints", data.counts.blueprints],
      ["Assignments", data.counts.assignments],
      ["Attempts", data.counts.attempts],
      ["Submitted attempts", data.counts.submittedAttempts],
      ["Media files", data.counts.media],
      ["Media size (MB)", Math.round((data.counts.mediaBytes / 1024 / 1024) * 10) / 10]
    ]
  );

  const groupName = new Map(data.groups.map((g) => [g.id, g.name]));
  addSheet(
    workbook,
    "Candidates",
    ["Name", "Email", "Role", "Status", "Groups", "Phone", "Country", "Target", "Created"],
    data.users.map((u) => [
      u.name ?? "",
      u.email,
      u.role,
      u.status,
      u.groupIds.map((id) => groupName.get(id) ?? id).join(", "),
      u.candidateProfile?.phone ?? "",
      u.candidateProfile?.country ?? "",
      u.candidateProfile?.targetBand ?? "",
      formatDate(u.createdAt, "")
    ])
  );

  addSheet(
    workbook,
    "Groups",
    ["Name", "Kind", "Members", "Created"],
    data.groups.map((g) => [g.name, g.kind, g.memberIds.length, formatDate(g.createdAt, "")])
  );

  addSheet(
    workbook,
    "Exams",
    ["Mock title", "State", "Modules", "Published"],
    data.mockExams.map((m) => [
      m.title,
      m.state,
      m.parts.map((p) => p.module).join(", "),
      formatDate(m.publishedAt, "")
    ])
  );

  const folderPath = new Map(data.mediaFolders.map((f) => [f.id, f.path]));
  const audioUser = new Map<string, string[]>();
  for (const b of data.blueprints) {
    if (!b.audioMediaId) continue;
    audioUser.set(b.audioMediaId, [...(audioUser.get(b.audioMediaId) ?? []), b.title]);
  }
  addSheet(
    workbook,
    "Media",
    ["File", "Kind", "Type", "Size (KB)", "Length", "Folder", "Used by", "R2 key", "Uploaded"],
    data.media.map((m) => [
      m.originalName ?? m.r2Key,
      m.kind,
      m.mime,
      Math.round(m.bytes / 1024),
      m.durationSec ? formatMinutesSeconds(m.durationSec) : "",
      m.folderId ? (folderPath.get(m.folderId) ?? "") : "",
      (audioUser.get(m.id) ?? []).join(", "),
      m.r2Key,
      formatDate(m.createdAt, "")
    ])
  );

  const [results, writing] = await Promise.all([
    gatherResults({ orgId: data.meta.organisation?.id ?? "" }),
    gatherWriting({ orgId: data.meta.organisation?.id ?? "" })
  ]);

  addSheet(workbook, "Results", results.columns, results.rows);

  const writingRows: (string | number | null)[][] = [];
  for (const doc of writing.docs) {
    for (const task of doc.tasks) {
      writingRows.push([
        doc.candidate,
        doc.email,
        doc.mock,
        doc.submittedAt,
        `Task ${task.number}`,
        task.wordCount,
        task.band !== null ? task.band.toFixed(1) : "",
        task.essay
      ]);
    }
  }
  addSheet(
    workbook,
    "Writing",
    ["Candidate", "Email", "Mock", "Submitted", "Task", "Words", "Band", "Answer"],
    writingRows
  );

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

export async function buildBackupExport(format: BackupFormat, orgId: string): Promise<BackupExport> {
  const data = await collectBackup(orgId);
  if (format === "json") {
    return {
      filename: `ziyomock-backup-${stamp()}.json`,
      mime: "application/json; charset=utf-8",
      body: JSON.stringify(data, null, 2)
    };
  }
  return {
    filename: `ziyomock-backup-${stamp()}.xlsx`,
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    body: await backupWorkbook(data)
  };
}
