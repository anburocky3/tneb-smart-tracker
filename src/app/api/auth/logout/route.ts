import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  // Delete the HTTP-Only cookie
  const cookieStore = await cookies();
  cookieStore.delete("tneb_auth_token");

  return NextResponse.json({ success: true });
}
