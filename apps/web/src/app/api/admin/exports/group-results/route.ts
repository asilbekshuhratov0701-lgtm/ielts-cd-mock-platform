import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@ielts/db";
import { auth } from "@/auth";
import { gatherGroupSummary } from "@/lib/exports/group-summary";
import { buildGroupSummaryExport, isExportFormat } from "@/lib/exports/build";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user?.id || (role !== "ADMIN" && role !== "SUPER_ADMIN")) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  const me = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!me) return new NextResponse("Forbidden", { status: 403 });

  const params = request.nextUrl.searchParams;
  const format = params.get("format") ?? "pdf";
  if (!isExportFormat(format)) return new NextResponse("Unsupported format", { status: 400 });

  const groupId = params.get("groupId");
  if (!groupId) return new NextResponse("groupId is required", { status: 400 });

  let summary;
  try {
    summary = await gatherGroupSummary(me.orgId, groupId);
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }

  const file = await buildGroupSummaryExport(
    format,
    summary,
    `group-results-${summary.groupName}`
  );
  const body = typeof file.body === "string" ? file.body : new Uint8Array(file.body);
  return new NextResponse(body, {
    headers: {
      "Content-Type": file.mime,
      "Content-Disposition": `attachment; filename="${file.filename}"`,
      "Cache-Control": "no-store"
    }
  });
}
