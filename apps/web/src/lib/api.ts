import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { ExamError } from "@/lib/exam";

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return session.user;
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function badRequest(message = "Invalid request") {
  return NextResponse.json({ error: message }, { status: 400 });
}

const EXAM_ERROR_STATUS: Record<ExamError["code"], number> = {
  NOT_FOUND: 404,
  FORBIDDEN: 403,
  EXPIRED: 409,
  CONFLICT: 409,
  INVALID: 400
};

export function handleError(error: unknown) {
  if (error instanceof ExamError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: EXAM_ERROR_STATUS[error.code] }
    );
  }
  console.error(error);
  return NextResponse.json({ error: "Internal error" }, { status: 500 });
}
