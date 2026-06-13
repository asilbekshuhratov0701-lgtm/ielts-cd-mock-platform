import { NextResponse, type NextRequest } from "next/server";
import { loadRunnerState } from "@/lib/exam";
import { handleError, requireUser, unauthorized } from "@/lib/api";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const { id } = await ctx.params;
  try {
    const state = await loadRunnerState(id, user.id);
    return NextResponse.json(state);
  } catch (error) {
    return handleError(error);
  }
}
