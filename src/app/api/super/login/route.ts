import { NextResponse } from "next/server";
import { createAdminSession, getAdminCredentials } from "@/lib/superAdmin";

export async function POST(request: Request) {
  const body = await request.json();
  const credentials = getAdminCredentials();
  const email =
    typeof body.email === "string" ? body.email.toLowerCase().trim() : "";
  const pin = typeof body.pin === "string" ? body.pin : "";

  if (!credentials.email || !credentials.pin) {
    return NextResponse.json(
      { success: false, error: "Super admin credentials are not configured" },
      { status: 503 },
    );
  }

  if (email !== credentials.email || pin !== credentials.pin) {
    return NextResponse.json(
      { success: false, error: "Invalid super admin credentials" },
      { status: 401 },
    );
  }

  await createAdminSession(email);
  return NextResponse.json({ success: true });
}
