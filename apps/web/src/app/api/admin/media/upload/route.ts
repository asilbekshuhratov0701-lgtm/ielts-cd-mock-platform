import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma, Prisma } from "@ielts/db";
import { auth } from "@/auth";
import { saveMediaObject, mediaPublicUrl, safeKeySegment } from "@/lib/media-storage";
import { setGroupImageOn } from "@/lib/exam-blueprint-media";

export const dynamic = "force-dynamic";

const MAX_BYTES = 80 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user?.id || (role !== "ADMIN" && role !== "SUPER_ADMIN")) {
    return NextResponse.json({ ok: false, code: "forbidden" }, { status: 403 });
  }
  const me = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!me) return NextResponse.json({ ok: false, code: "forbidden" }, { status: 403 });

  const form = await request.formData();
  const kind = String(form.get("kind") ?? "");
  const blueprintId = String(form.get("blueprintId") ?? "");
  const file = form.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ ok: false, code: "empty" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ ok: false, code: "too_large" }, { status: 413 });
  }

  const bp = await prisma.examBlueprint.findFirst({
    where: { id: blueprintId, orgId: me.orgId }
  });
  if (!bp) return NextResponse.json({ ok: false, code: "not_found" }, { status: 404 });

  if (kind === "audio") {
    const ext = (file.name.split(".").pop() ?? "mp3").toLowerCase();
    const key = `${safeKeySegment(bp.examKey)}-v${bp.version}-${safeKeySegment(
      bp.audioRef ?? "audio"
    )}.${ext}`;
    await saveMediaObject(key, new Uint8Array(await file.arrayBuffer()));
    const media = await prisma.media.create({
      data: {
        orgId: me.orgId,
        r2Key: key,
        kind: "AUDIO" as Prisma.MediaCreateInput["kind"],
        mime: file.type || "audio/mpeg",
        bytes: file.size,
        originalName: file.name,
        createdById: me.id
      }
    });
    await prisma.examBlueprint.update({
      where: { id: bp.id },
      data: {
        audioMediaId: media.id,
        state: bp.state === "audio_pending" ? "draft" : bp.state
      }
    });
    revalidatePath(`/admin/exam-import/${bp.id}`);
    return NextResponse.json({ ok: true, code: "audio_attached" });
  }

  if (kind === "group-image") {
    const groupId = String(form.get("groupId") ?? "");
    if (!groupId) return NextResponse.json({ ok: false, code: "not_found" }, { status: 400 });

    const ext = (file.name.split(".").pop() ?? "png").toLowerCase();
    const key = `${safeKeySegment(bp.examKey)}-v${bp.version}-${safeKeySegment(
      groupId
    )}-${Date.now()}.${ext}`;
    await saveMediaObject(key, new Uint8Array(await file.arrayBuffer()));
    const url = mediaPublicUrl(key);

    await prisma.media.create({
      data: {
        orgId: me.orgId,
        r2Key: key,
        kind: "IMAGE" as Prisma.MediaCreateInput["kind"],
        mime: file.type || "image/png",
        bytes: file.size,
        originalName: file.name,
        createdById: me.id
      }
    });

    const engine = structuredClone(bp.engineJson) as unknown;
    const source = structuredClone(bp.sourceJson) as unknown;
    setGroupImageOn(engine, groupId, url);
    setGroupImageOn(source, groupId, url);

    await prisma.examBlueprint.update({
      where: { id: bp.id },
      data: {
        engineJson: engine as Prisma.InputJsonValue,
        sourceJson: source as Prisma.InputJsonValue
      }
    });
    revalidatePath(`/admin/exam-import/${bp.id}`);
    return NextResponse.json({ ok: true, code: "image_attached" });
  }

  return NextResponse.json({ ok: false, code: "invalid" }, { status: 400 });
}
