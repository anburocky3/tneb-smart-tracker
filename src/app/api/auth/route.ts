import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { SignJWT } from "jose";
import { cookies } from "next/headers";

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET_KEY ||
    "fallback_super_secret_key_change_in_production",
);

export async function POST(req: Request) {
  try {
    const { pin } = await req.json();

    // 1. Search the tneb_pin collection for the matching PIN
    const pinQuery = await adminDb
      .collection("tneb_pin")
      .where("pin", "==", pin)
      .get();

    let isValid = false;

    if (!pinQuery.empty) {
      // 2. We found the PIN! Now check if it is active.
      const pinData = pinQuery.docs[0].data();

      // We assume it's active unless explicitly marked as false
      if (pinData.isActive !== false) {
        isValid = true;
      }
    } else if (pin === "1234") {
      // Fallback: If you haven't created the collection yet, let 1234 work
      // so you don't lock yourself out during setup!
      isValid = true;
    }

    if (isValid) {
      // 3. Create the secure JWT token
      const token = await new SignJWT({ authenticated: true })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("24h") // Session lasts 24 hours
        .sign(SECRET_KEY);

      // 4. Set the HTTP-Only cookie securely
      (await cookies()).set("tneb_auth_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 60 * 60 * 24, // 1 day
        path: "/",
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { success: false, error: "Invalid or inactive PIN." },
      { status: 401 },
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 },
    );
  }
}
