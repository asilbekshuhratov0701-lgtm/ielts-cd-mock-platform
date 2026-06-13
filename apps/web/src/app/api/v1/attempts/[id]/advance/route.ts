import { NextResponse, type NextRequest } from "next/server";
import { advanceSection } from "@/lib/exam";
import { handleError, requireUser, unauthorized } from "@/lib/api";

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const { id } = await ctx.params;
  try {
    const result = await advanceSection(id, user.id);
    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
}
