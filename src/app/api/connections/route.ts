import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET_KEY || "default_secret_key",
);

async function verifyAuth() {
  const token = (await cookies()).get("tneb_auth_token")?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    const userId = payload.userId as string;

    // Verify that the user still exists and is active in the database
    const userQuery = await adminDb
      .collection("tneb_users")
      .where("email", "==", userId)
      .get();

    // console.log(
    //   `User query for userId ${userId}:`,
    //   userQuery.empty ? "No user found" : "User found",
    // ); // Debugging log

    if (userQuery.empty) return null;

    const userData = userQuery.docs[0].data();
    if (userData.isActive === false) return null;

    return userId;
  } catch (err) {
    return null;
  }
}

// GET: Fetch all connections for the current user
export async function GET() {
  const userId = await verifyAuth();
  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized access" },
      { status: 401 },
    );
  }

  try {
    const snapshot = await adminDb
      .collection("tneb_connections")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .get();

    const connections = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    console.log(`Fetching connections for userId: ${userId}`); // Debugging log
    console.log(`Connections fetched:`, connections); // Debugging log

    return NextResponse.json(connections);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch connections",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

// POST: Add new connections for the current user
export async function POST(req: Request) {
  const userId = await verifyAuth();
  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized access" },
      { status: 401 },
    );
  }

  try {
    const body = await req.json();
    const itemsToProcess = Array.isArray(body.connections)
      ? body.connections
      : [body];
    const collectionRef = adminDb.collection("tneb_connections");

    let addedCount = 0;
    for (const item of itemsToProcess) {
      if (!item.consumerNo || !item.nickname || !item.location) continue;

      const existingQuery = await collectionRef
        .where("consumerNo", "==", item.consumerNo)
        .where("userId", "==", userId)
        .get();
      if (existingQuery.empty) {
        await collectionRef.add({
          userId,
          nickname: item.nickname,
          consumerNo: item.consumerNo,
          tokenId: item.tokenId || "",
          location: item.location,
          createdAt: new Date(),
        });
        addedCount++;
      }
    }
    return NextResponse.json({ success: true, addedCount });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Operation failed" },
      { status: 500 },
    );
  }
}

// PUT: Edit an existing connection owned by the current user
export async function PUT(req: Request) {
  const userId = await verifyAuth();
  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized access" },
      { status: 401 },
    );
  }

  try {
    const body = await req.json();
    const { oldConsumerNo, nickname, consumerNo, tokenId, location } = body;

    if (!oldConsumerNo || !consumerNo) {
      return NextResponse.json(
        { success: false, error: "Missing required identifiers" },
        { status: 400 },
      );
    }

    const collectionRef = adminDb.collection("tneb_connections");
    const snapshot = await collectionRef
      .where("consumerNo", "==", oldConsumerNo)
      .where("userId", "==", userId)
      .get();

    if (snapshot.empty) {
      return NextResponse.json(
        { success: false, error: "Connection not found or unauthorized" },
        { status: 404 },
      );
    }

    // Update the document
    const docId = snapshot.docs[0].id;
    await collectionRef.doc(docId).update({
      nickname,
      consumerNo,
      tokenId,
      location,
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to update connection" },
      { status: 500 },
    );
  }
}

// DELETE: Remove a connection owned by the current user
export async function DELETE(req: Request) {
  const userId = await verifyAuth();
  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized access" },
      { status: 401 },
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const consumerNo = searchParams.get("consumerNo");

    if (!consumerNo) {
      return NextResponse.json(
        { success: false, error: "Missing consumerNo" },
        { status: 400 },
      );
    }

    const collectionRef = adminDb.collection("tneb_connections");
    const snapshot = await collectionRef
      .where("consumerNo", "==", consumerNo)
      .where("userId", "==", userId)
      .get();

    if (!snapshot.empty) {
      const batch = adminDb.batch();
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to delete" },
      { status: 500 },
    );
  }
}
