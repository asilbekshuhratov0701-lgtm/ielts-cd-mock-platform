import { NextResponse, type NextRequest } from "next/server";
import { writingSubmissionSchema } from "@ielts/validators";
import { saveWriting } from "@/lib/exam";
import { badRequest, handleError, requireUser, unauthorized } from "@/lib/api";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = writingSubmissionSchema.safeParse(body);
  if (!parsed.success) return badRequest();

  try {
    const result = await saveWriting(id, user.id, parsed.data.taskNo, parsed.data.content);
    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
}
