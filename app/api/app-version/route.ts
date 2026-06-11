import { NextResponse } from "next/server";

// Always reflects the LIVE deployment's build id, so a browser running an older
// cached bundle can detect it's stale (see components/providers/version-gate).
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    { buildId: process.env.VERCEL_GIT_COMMIT_SHA || "dev" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
