import { NextResponse, type NextRequest } from "next/server";
import { autosaveAnswerSchema } from "@ielts/validators";
import { saveAnswer } from "@/lib/exam";
import { badRequest, handleError, requireUser, unauthorized } from "@/lib/api";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = autosaveAnswerSchema.safeParse(body);
  if (!parsed.success) return badRequest();

  try {
    const result = await saveAnswer(
      id,
      user.id,
      parsed.data.questionId,
      parsed.data.response,
      parsed.data.isFlagged
    );
    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
}
