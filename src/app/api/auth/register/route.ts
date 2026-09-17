import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export async function POST(req: Request) {
  try {
    const { email, pin } = await req.json();

    if (!email || !pin) {
      return NextResponse.json(
        { success: false, error: "Email and PIN are required" },
        { status: 400 },
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: "Invalid email format" },
        { status: 400 },
      );
    }

    // Check if user already exists
    const normalizedEmail = email.toLowerCase().trim();
    const userDocRef = adminDb.collection("tneb_users").doc(normalizedEmail);

    // 2. Efficiently check if the user exists via direct lookup
    const userSnapshot = await userDocRef.get();

    if (userSnapshot.exists) {
      return NextResponse.json(
        { success: false, error: "User already exists with this email" },
        { status: 409 },
      );
    }

    // 3. Create the document using .set()
    await userDocRef.set({
      email: normalizedEmail,
      pin, // Consider hashing this for security!
      isActive: true,
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Registration Error:", error);
    return NextResponse.json(
      { success: false, error: "Server error occurred during registration" },
      { status: 500 },
    );
  }
}
