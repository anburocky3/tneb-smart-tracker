import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { SignJWT } from "jose";
import { cookies } from "next/headers";

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET_KEY || "default_secret_key",
);

export async function POST(req: Request) {
  try {
    const { email, pin } = await req.json();

    if (!email || !pin) {
      return NextResponse.json(
        { success: false, error: "Email and PIN are required" },
        { status: 400 },
      );
    }
    // 1. Direct lookup using the normalized email document ID
    const normalizedEmail = email.toLowerCase().trim();
    const userDoc = await adminDb
      .collection("tneb_users")
      .doc(normalizedEmail)
      .get();

    // Check if the user document exists at all
    if (!userDoc.exists) {
      return NextResponse.json(
        { success: false, error: "Invalid email or PIN." },
        { status: 401 },
      );
    }

    const userData = userDoc.data();

    // 2. Validate the PIN (Direct string comparison for now)
    if (!userData || userData.pin !== pin) {
      return NextResponse.json(
        { success: false, error: "Invalid email or PIN." },
        { status: 401 },
      );
    }

    // 3. Check if the user is active
    if (userData.isActive === false) {
      return NextResponse.json(
        {
          success: false,
          error: "Your account is inactive. Please contact support.",
        },
        { status: 403 },
      );
    }

    // 4. Create the secure JWT token using the email as the stable identifier
    const token = await new SignJWT({
      userId: userData.email,
      authenticated: true,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(SECRET_KEY);

    // 5. Set the HTTP-Only cookie securely
    const cookieStore = await cookies();
    cookieStore.set("tneb_auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24, // 1 day
      path: "/",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    // console.error("Login Error:", error);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 },
    );
  }
}
