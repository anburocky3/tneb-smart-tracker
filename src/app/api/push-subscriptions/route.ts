import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { adminDb } from "@/lib/firebaseAdmin";

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET_KEY || "default_secret_key",
);

async function verifyAuth() {
  const token = (await cookies()).get("tneb_auth_token")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    const userId = payload.userId as string;
    const user = await adminDb.collection("tneb_users").doc(userId).get();
    return user.exists && user.data()?.isActive !== false ? userId : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const userId = await verifyAuth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return NextResponse.json(
      { error: "Invalid push subscription" },
      { status: 400 },
    );
  }

  const subscriptionRef = adminDb.collection("tneb_push_subscriptions");
  const existing = await subscriptionRef
    .where("userId", "==", userId)
    .where("endpoint", "==", body.endpoint)
    .limit(1)
    .get();
  const document = existing.docs[0]?.ref ?? subscriptionRef.doc();
  await document.set({
    userId,
    endpoint: body.endpoint,
    keys: body.keys,
    updatedAt: new Date(),
    createdAt: existing.empty ? new Date() : existing.docs[0].data().createdAt,
  });

  return NextResponse.json({ success: true, id: document.id });
}

export async function DELETE(request: Request) {
  const userId = await verifyAuth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { endpoint } = await request.json();
  if (!endpoint)
    return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });

  const snapshot = await adminDb
    .collection("tneb_push_subscriptions")
    .where("userId", "==", userId)
    .where("endpoint", "==", endpoint)
    .get();
  await Promise.all(snapshot.docs.map((document) => document.ref.delete()));
  return NextResponse.json({ success: true });
}
