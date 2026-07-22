import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@ielts/db";
import { auth } from "@/auth";
import { gatherReport, type ReportType } from "@/lib/exports/reports";
import { buildResultsExport, isExportFormat } from "@/lib/exports/build";

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
  const format = params.get("format") ?? "xlsx";
  if (!isExportFormat(format)) return new NextResponse("Unsupported format", { status: 400 });

  const typeRaw = params.get("type");
  const type: ReportType =
    typeRaw === "attendance" ? "attendance" : typeRaw === "bands" ? "bands" : "exam";

  try {
    const dataset = await gatherReport(me.orgId, type);
    const file = await buildResultsExport(format, dataset, `report-${type}`);
    const body = typeof file.body === "string" ? file.body : new Uint8Array(file.body);
    return new NextResponse(body, {
      headers: {
        "Content-Type": file.mime,
        "Content-Disposition": `attachment; filename="${file.filename}"`,
        "Cache-Control": "no-store"
      }
    });
  } catch {
    return new NextResponse("Failed to build report", { status: 500 });
  }
}
