import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import {
  maskEmail,
  maskEndpoint,
  maskPin,
  verifyAdminSession,
} from "@/lib/superAdmin";

export async function GET(request: Request) {
  const adminEmail = await verifyAdminSession();
  if (!adminEmail) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const reveal = new URL(request.url).searchParams.get("reveal") === "true";
  const [
    usersSnapshot,
    connectionsSnapshot,
    subscriptionsSnapshot,
    readingsSnapshot,
  ] = await Promise.all([
    adminDb.collection("tneb_users").get(),
    adminDb.collection("tneb_connections").get(),
    adminDb.collection("tneb_push_subscriptions").get(),
    adminDb.collection("tneb_readings").get(),
  ]);

  const connectionsByUser = new Map<string, any[]>();
  connectionsSnapshot.docs.forEach((document) => {
    const connection = document.data();
    const items = connectionsByUser.get(connection.userId) || [];
    items.push({
      id: document.id,
      nickname: connection.nickname || "Unnamed meter",
      consumerNo: connection.consumerNo,
      location: connection.location || "Unassigned",
      isUsageVacant: connection.isUsageVacant || false,
      tokenId: reveal ? connection.tokenId || "" : "••••••••",
    });
    connectionsByUser.set(connection.userId, items);
  });

  const devicesByUser = new Map<string, number>();
  const deviceDetailsByUser = new Map<
    string,
    Array<{
      endpoint: string;
      createdAt: string | null;
      updatedAt: string | null;
    }>
  >();
  subscriptionsSnapshot.docs.forEach((document) => {
    const subscription = document.data();
    const userId = subscription.userId;
    devicesByUser.set(userId, (devicesByUser.get(userId) || 0) + 1);
    const devices = deviceDetailsByUser.get(userId) || [];
    devices.push({
      endpoint: reveal
        ? subscription.endpoint
        : maskEndpoint(subscription.endpoint),
      createdAt: subscription.createdAt?.toDate?.()?.toISOString?.() || null,
      updatedAt: subscription.updatedAt?.toDate?.()?.toISOString?.() || null,
    });
    deviceDetailsByUser.set(userId, devices);
  });

  const readingsByUser = new Map<string, number>();
  const readingDetailsByUser = new Map<
    string,
    Array<{
      id: string;
      consumerNo: string;
      date: string;
      currentKwh: number;
      cycleStartKwh: number;
      cycleStartDate: string;
    }>
  >();
  readingsSnapshot.docs.forEach((document) => {
    const reading = document.data();
    const userId = reading.userId;
    readingsByUser.set(userId, (readingsByUser.get(userId) || 0) + 1);
    const details = readingDetailsByUser.get(userId) || [];
    details.push({
      id: document.id,
      consumerNo: reading.consumerNo,
      date: reading.date,
      currentKwh: reading.currentKwh,
      cycleStartKwh: reading.cycleStartKwh,
      cycleStartDate: reading.cycleStartDate,
    });
    readingDetailsByUser.set(userId, details);
  });

  const users = usersSnapshot.docs.map((document) => {
    const user = document.data();
    const email = user.email || document.id;
    return {
      id: document.id,
      email: reveal ? email : maskEmail(email),
      pin: reveal ? user.pin || "" : maskPin(String(user.pin || "")),
      isActive: user.isActive !== false,
      createdAt: user.createdAt?.toDate?.()?.toISOString?.() || null,
      meterCount: (connectionsByUser.get(email) || []).length,
      deviceCount: devicesByUser.get(email) || 0,
      readingCount: readingsByUser.get(email) || 0,
      devices: deviceDetailsByUser.get(email) || [],
      readings: readingDetailsByUser.get(email) || [],
      meters: connectionsByUser.get(email) || [],
    };
  });

  return NextResponse.json({
    success: true,
    adminEmail,
    metrics: {
      users: users.length,
      activeUsers: users.filter((user) => user.isActive).length,
      meters: connectionsSnapshot.size,
      devices: subscriptionsSnapshot.size,
      readings: readingsSnapshot.size,
    },
    users,
  });
}

export async function DELETE(request: Request) {
  const adminEmail = await verifyAdminSession();
  if (!adminEmail) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const body = await request.json();
  const userId = typeof body.userId === "string" ? body.userId.trim() : "";
  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Missing user id" },
      { status: 400 },
    );
  }

  const collections = [
    "tneb_connections",
    "tneb_push_subscriptions",
    "tneb_readings",
    "tneb_notification_log",
  ];
  let deletedRecords = 0;

  for (const collectionName of collections) {
    const snapshot = await adminDb
      .collection(collectionName)
      .where("userId", "==", userId)
      .get();
    for (let index = 0; index < snapshot.docs.length; index += 400) {
      const batch = adminDb.batch();
      snapshot.docs.slice(index, index + 400).forEach((document) => {
        batch.delete(document.ref);
      });
      await batch.commit();
      deletedRecords += Math.min(400, snapshot.docs.length - index);
    }
  }

  await adminDb.collection("tneb_users").doc(userId).delete();
  return NextResponse.json({ success: true, deletedRecords, userId });
}
