import { NextResponse, type NextRequest } from "next/server";

/**
 * Catch-all stub for the v1 API. Every endpoint returns 501 until implemented.
 * Real route handlers are added as files under /api/v1/** and take precedence over
 * this catch-all. Layering per request: validation (Zod) → RBAC guard → service → repo.
 */
type Ctx = { params: Promise<{ path?: string[] }> };

async function notImplemented(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return NextResponse.json(
    {
      error: "Not implemented",
      method: req.method,
      endpoint: `/api/v1/${(path ?? []).join("/")}`
    },
    { status: 501 }
  );
}

export const GET = notImplemented;
export const POST = notImplemented;
export const PUT = notImplemented;
export const PATCH = notImplemented;
export const DELETE = notImplemented;
