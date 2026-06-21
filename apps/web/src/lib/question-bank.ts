import { prisma, Prisma } from "@ielts/db";

export const LIBRARY_PAGE_SIZE = 24;

export const CONTENT_TYPES = ["PASSAGE", "AUDIO", "QUESTION_GROUP", "WRITING_TASK"] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export const CONTENT_LABELS: Record<ContentType, string> = {
  PASSAGE: "Passage",
  AUDIO: "Audio track",
  QUESTION_GROUP: "Question group",
  WRITING_TASK: "Writing task"
};

export type SectionKindLiteral = "LISTENING" | "READING" | "WRITING";

export type LibraryRow = {
  id: string;
  contentType: ContentType;
  refId: string;
  title: string;
  preview: string;
  meta: string;
  category: string | null;
  difficulty: string | null;
  tags: string[];
  reuseCount: number;
  createdAt: Date;
  compatibleKind: SectionKindLiteral;
};

export type LibraryListResult = {
  rows: LibraryRow[];
  total: number;
  page: number;
  totalPages: number;
  pageSize: number;
  categories: string[];
  difficulties: string[];
  counts: Record<ContentType, number>;
};

function tagsOf(json: Prisma.JsonValue | null | undefined): string[] {
  return Array.isArray(json) ? json.map((t) => String(t)).filter(Boolean) : [];
}

function clip(text: string, max = 160): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}

async function libraryRefIdsMatching(q: string): Promise<string[]> {
  const [passages, groups, writings, audios] = await Promise.all([
    prisma.passage.findMany({
      where: {
        isLibrary: true,
        OR: [{ title: { contains: q } }, { bodyRichtext: { contains: q } }]
      },
      select: { id: true }
    }),
    prisma.questionGroup.findMany({
      where: { isLibrary: true, instructionsRichtext: { contains: q } },
      select: { id: true }
    }),
    prisma.writingTask.findMany({
      where: { isLibrary: true, promptRichtext: { contains: q } },
      select: { id: true }
    }),
    prisma.audioTrack.findMany({
      where: { isLibrary: true, media: { originalName: { contains: q } } },
      select: { id: true }
    })
  ]);
  return [...passages, ...groups, ...writings, ...audios].map((r) => r.id);
}

export async function listLibrary(params: {
  orgId: string;
  contentType?: string;
  category?: string;
  difficulty?: string;
  q?: string;
  page?: number;
}): Promise<LibraryListResult> {
  const { orgId } = params;
  const where: Prisma.LibraryItemWhereInput = { orgId };
  if (params.contentType && CONTENT_TYPES.includes(params.contentType as ContentType)) {
    where.contentType = params.contentType as Prisma.LibraryItemWhereInput["contentType"];
  }
  if (params.category) where.category = params.category;
  if (params.difficulty) where.difficulty = params.difficulty;

  const q = params.q?.trim();
  if (q) where.refId = { in: await libraryRefIdsMatching(q) };

  const total = await prisma.libraryItem.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / LIBRARY_PAGE_SIZE));
  const page = Math.min(Math.max(1, params.page ?? 1), totalPages);

  const items = await prisma.libraryItem.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * LIBRARY_PAGE_SIZE,
    take: LIBRARY_PAGE_SIZE
  });

  const byType: Record<string, string[]> = {};
  for (const item of items) (byType[item.contentType] ??= []).push(item.refId);

  const [passages, audios, groups, writings] = await Promise.all([
    byType.PASSAGE?.length
      ? prisma.passage.findMany({
          where: { id: { in: byType.PASSAGE } },
          select: { id: true, title: true, bodyRichtext: true, section: { select: { kind: true } } }
        })
      : Promise.resolve([]),
    byType.AUDIO?.length
      ? prisma.audioTrack.findMany({
          where: { id: { in: byType.AUDIO } },
          select: { id: true, durationSec: true, media: { select: { originalName: true } } }
        })
      : Promise.resolve([]),
    byType.QUESTION_GROUP?.length
      ? prisma.questionGroup.findMany({
          where: { id: { in: byType.QUESTION_GROUP } },
          select: {
            id: true,
            type: true,
            instructionsRichtext: true,
            section: { select: { kind: true } },
            _count: { select: { questions: true } }
          }
        })
      : Promise.resolve([]),
    byType.WRITING_TASK?.length
      ? prisma.writingTask.findMany({
          where: { id: { in: byType.WRITING_TASK } },
          select: { id: true, taskNo: true, promptRichtext: true, minWords: true }
        })
      : Promise.resolve([])
  ]);

  const passageMap = new Map(passages.map((p) => [p.id, p]));
  const audioMap = new Map(audios.map((a) => [a.id, a]));
  const groupMap = new Map(groups.map((g) => [g.id, g]));
  const writingMap = new Map(writings.map((w) => [w.id, w]));

  const rows: LibraryRow[] = [];
  for (const item of items) {
    const base = {
      id: item.id,
      refId: item.refId,
      category: item.category,
      difficulty: item.difficulty,
      tags: tagsOf(item.tagsJson),
      reuseCount: item.reuseCount,
      createdAt: item.createdAt
    };
    if (item.contentType === "PASSAGE") {
      const p = passageMap.get(item.refId);
      if (!p) continue;
      rows.push({
        ...base,
        contentType: "PASSAGE",
        title: p.title?.trim() || "Untitled passage",
        preview: clip(p.bodyRichtext),
        meta: "Passage",
        compatibleKind: (p.section.kind as SectionKindLiteral) ?? "READING"
      });
    } else if (item.contentType === "AUDIO") {
      const a = audioMap.get(item.refId);
      if (!a) continue;
      rows.push({
        ...base,
        contentType: "AUDIO",
        title: a.media?.originalName?.trim() || "Audio track",
        preview: a.durationSec ? `${a.durationSec}s` : "",
        meta: "Audio",
        compatibleKind: "LISTENING"
      });
    } else if (item.contentType === "QUESTION_GROUP") {
      const g = groupMap.get(item.refId);
      if (!g) continue;
      rows.push({
        ...base,
        contentType: "QUESTION_GROUP",
        title: String(g.type).replace(/_/g, " "),
        preview: clip(g.instructionsRichtext),
        meta: `${g._count.questions} question${g._count.questions === 1 ? "" : "s"}`,
        compatibleKind: (g.section.kind as SectionKindLiteral) ?? "READING"
      });
    } else if (item.contentType === "WRITING_TASK") {
      const w = writingMap.get(item.refId);
      if (!w) continue;
      rows.push({
        ...base,
        contentType: "WRITING_TASK",
        title: `Writing Task ${w.taskNo}`,
        preview: clip(w.promptRichtext),
        meta: `min ${w.minWords} words`,
        compatibleKind: "WRITING"
      });
    }
  }

  const [catRows, diffRows, typeCounts] = await Promise.all([
    prisma.libraryItem.findMany({
      where: { orgId },
      distinct: ["category"],
      select: { category: true },
      orderBy: { category: "asc" }
    }),
    prisma.libraryItem.findMany({
      where: { orgId },
      distinct: ["difficulty"],
      select: { difficulty: true },
      orderBy: { difficulty: "asc" }
    }),
    prisma.libraryItem.groupBy({
      by: ["contentType"],
      where: { orgId },
      _count: { _all: true }
    })
  ]);

  const counts = { PASSAGE: 0, AUDIO: 0, QUESTION_GROUP: 0, WRITING_TASK: 0 } as Record<
    ContentType,
    number
  >;
  for (const c of typeCounts) {
    if (CONTENT_TYPES.includes(c.contentType as ContentType)) {
      counts[c.contentType as ContentType] = c._count._all;
    }
  }

  return {
    rows,
    total,
    page,
    totalPages,
    pageSize: LIBRARY_PAGE_SIZE,
    categories: catRows.map((c) => c.category).filter((c): c is string => Boolean(c)),
    difficulties: diffRows.map((d) => d.difficulty).filter((d): d is string => Boolean(d)),
    counts
  };
}
