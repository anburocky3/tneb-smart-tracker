import { NextResponse } from "next/server";
import { clearAdminSession } from "@/lib/superAdmin";

export async function POST() {
  await clearAdminSession();
  return NextResponse.json({ success: true });
}
