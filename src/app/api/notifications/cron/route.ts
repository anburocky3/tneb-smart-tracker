import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { fetchTNEBData, parseTNEBHtml } from "@/lib/tnebScraper";
import { sendPushNotification } from "@/lib/push";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && request.headers.get("authorization") === `Bearer ${secret}`);
}

async function notifyUser(userId: string, payload: { title: string; body: string; url: string; tag: string }) {
  const subscriptions = await adminDb
    .collection("tneb_push_subscriptions")
    .where("userId", "==", userId)
    .get();
  await Promise.all(
    subscriptions.docs.map(async (document) => {
      try {
        await sendPushNotification(document.data() as Parameters<typeof sendPushNotification>[0], payload);
      } catch (error: any) {
        if (error?.statusCode === 404 || error?.statusCode === 410) await document.ref.delete();
      }
    }),
  );
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const connections = await adminDb.collection("tneb_connections").get();
  let notificationsSent = 0;

  for (const connectionDocument of connections.docs) {
    const connection = connectionDocument.data();
    if (!connection.userId || !connection.consumerNo || !connection.tokenId) continue;

    const userId = connection.userId as string;
    const notificationBase = adminDb
      .collection("tneb_notification_log")
      .where("userId", "==", userId)
      .where("consumerNo", "==", connection.consumerNo);
    const sentKeys = new Set((await notificationBase.get()).docs.map((document) => document.data().key));

    if (now.getDate() <= 7 && !sentKeys.has(`monthly-${monthKey}`)) {
      await notifyUser(userId, {
        title: "Monthly meter check-in",
        body: `Log the latest reading for ${connection.nickname || connection.consumerNo} to keep your forecast current.`,
        url: `/meter/${connection.consumerNo}`,
        tag: `monthly-${monthKey}-${connection.consumerNo}`,
      });
      await adminDb.collection("tneb_notification_log").add({ userId, consumerNo: connection.consumerNo, key: `monthly-${monthKey}`, createdAt: now });
      notificationsSent++;
    }

    try {
      const html = await fetchTNEBData(connection.consumerNo, connection.tokenId);
      const result = parseTNEBHtml(html, String(connection.consumerNo));
      const bill = result.bills[0];
      if (!bill) continue;
      const billKey = `bill-${bill.date}`;
      if (!sentKeys.has(billKey)) {
        await notifyUser(userId, {
          title: `New bill for ${connection.nickname || connection.consumerNo}`,
          body: `Your latest TNEB bill is ₹${bill.amount.toLocaleString()} for ${bill.units} units.`,
          url: `/meter/${connection.consumerNo}`,
          tag: billKey,
        });
        await adminDb.collection("tneb_notification_log").add({ userId, consumerNo: connection.consumerNo, key: billKey, createdAt: now });
        notificationsSent++;
      }
      if (bill.isPaid && !sentKeys.has(`${billKey}-paid`)) {
        await notifyUser(userId, {
          title: "TNEB bill marked paid",
          body: `${connection.nickname || connection.consumerNo} has a paid bill of ₹${bill.amount.toLocaleString()}.`,
          url: `/meter/${connection.consumerNo}`,
          tag: `${billKey}-paid`,
        });
        await adminDb.collection("tneb_notification_log").add({ userId, consumerNo: connection.consumerNo, key: `${billKey}-paid`, createdAt: now });
        notificationsSent++;
      }
    } catch (error) {
      console.error("Notification sync failed", connection.consumerNo, error);
    }
  }

  return NextResponse.json({ success: true, notificationsSent });
}