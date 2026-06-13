import { NextResponse, type NextRequest } from "next/server";
import { startAttemptSchema } from "@ielts/validators";
import { startAttempt } from "@/lib/exam";
import { badRequest, handleError, requireUser, unauthorized } from "@/lib/api";

export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const body = await req.json().catch(() => null);
  const parsed = startAttemptSchema.safeParse(body);
  if (!parsed.success) return badRequest();

  try {
    const attemptId = await startAttempt(user.id, parsed.data.examId);
    return NextResponse.json({ attemptId });
  } catch (error) {
    return handleError(error);
  }
}
