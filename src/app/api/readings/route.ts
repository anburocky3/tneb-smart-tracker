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
    const userQuery = await adminDb
      .collection("tneb_users")
      .where("email", "==", userId)
      .get();
    if (userQuery.empty || userQuery.docs[0].data().isActive === false)
      return null;
    return userId;
  } catch {
    return null;
  }
}

function normalizeDate(value: unknown) {
  if (typeof value !== "string") return null;

  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const date = new Date(
      Date.UTC(Number(year), Number(month) - 1, Number(day)),
    );
    return date.getUTCFullYear() === Number(year) &&
      date.getUTCMonth() === Number(month) - 1 &&
      date.getUTCDate() === Number(day)
      ? `${year}-${month}-${day}`
      : null;
  }

  const tnebMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
  if (!tnebMatch) return null;
  const [, day, month, year] = tnebMatch;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return date.getUTCFullYear() === Number(year) &&
    date.getUTCMonth() === Number(month) - 1 &&
    date.getUTCDate() === Number(day)
    ? `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
    : null;
}

function getTodayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function GET(request: Request) {
  const userId = await verifyAuth();
  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized access" },
      { status: 401 },
    );
  }

  const consumerNo = new URL(request.url).searchParams.get("consumerNo");
  if (!consumerNo) {
    return NextResponse.json(
      { success: false, error: "Missing consumerNo" },
      { status: 400 },
    );
  }

  try {
    const snapshot = await adminDb
      .collection("tneb_readings")
      .where("userId", "==", userId)
      .where("consumerNo", "==", consumerNo)
      .get();

    const readings = snapshot.docs
      .map((doc) => {
        const reading = doc.data();
        return {
          id: doc.id,
          consumerNo: reading.consumerNo,
          date: reading.date,
          currentKwh: reading.currentKwh,
          cycleStartKwh: reading.cycleStartKwh,
          cycleStartDate: reading.cycleStartDate,
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));

    return NextResponse.json({ success: true, readings });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch readings",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const userId = await verifyAuth();
  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized access" },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();
    const { consumerNo, date, currentKwh, cycleStartKwh, cycleStartDate } =
      body;

    const normalizedDate = normalizeDate(date);
    const normalizedCycleStartDate = normalizeDate(cycleStartDate);

    if (
      typeof consumerNo !== "string" ||
      !consumerNo.trim() ||
      !normalizedDate ||
      !normalizedCycleStartDate ||
      typeof currentKwh !== "number" ||
      !Number.isFinite(currentKwh) ||
      currentKwh < cycleStartKwh ||
      typeof cycleStartKwh !== "number" ||
      !Number.isFinite(cycleStartKwh) ||
      cycleStartKwh < 0 ||
      normalizedDate > getTodayDate() ||
      normalizedDate < normalizedCycleStartDate
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            normalizedDate && normalizedDate > getTodayDate()
              ? "Reading date cannot be in the future"
              : normalizedDate &&
                  normalizedCycleStartDate &&
                  normalizedDate < normalizedCycleStartDate
                ? "Reading date cannot be before the cycle start date"
                : typeof currentKwh === "number" &&
                    typeof cycleStartKwh === "number" &&
                    currentKwh < cycleStartKwh
                  ? "Current kWh cannot be less than the cycle-start reading"
                  : "Invalid meter reading payload",
        },
        { status: 400 },
      );
    }

    const connection = await adminDb
      .collection("tneb_connections")
      .where("userId", "==", userId)
      .where("consumerNo", "==", consumerNo.trim())
      .limit(1)
      .get();
    if (connection.empty) {
      return NextResponse.json(
        { success: false, error: "Meter not found" },
        { status: 404 },
      );
    }

    const reading = {
      consumerNo: consumerNo.trim(),
      date: normalizedDate,
      currentKwh,
      cycleStartKwh,
      cycleStartDate: normalizedCycleStartDate,
    };

    const readingsRef = adminDb.collection("tneb_readings");
    const existingReadingSnapshot = await readingsRef
      .where("userId", "==", userId)
      .where("consumerNo", "==", reading.consumerNo)
      .get();

    const now = new Date();
    const existingReading = existingReadingSnapshot.docs.find(
      (doc) => doc.data().date === reading.date,
    );
    const document = existingReading ? existingReading.ref : readingsRef.doc();

    await document.set({
      userId,
      ...reading,
      createdAt: existingReading?.data().createdAt ?? now,
      updatedAt: now,
    });

    return NextResponse.json(
      {
        success: true,
        replaced: Boolean(existingReading),
        reading: { id: document.id, ...reading },
      },
      { status: existingReading ? 200 : 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to save reading",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
