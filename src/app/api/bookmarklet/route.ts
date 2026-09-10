import { NextResponse } from "next/server";
import { tnebBookmarkCode } from "../../../../scripts/bookmark";

export function GET() {
  return new NextResponse(tnebBookmarkCode, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
