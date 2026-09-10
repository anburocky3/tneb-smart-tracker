import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET_KEY || "default_secret_key",
);

async function verifyAuth() {
  const token = (await cookies()).get("tneb_auth_token")?.value;
  if (!token) return false;

  try {
    await jwtVerify(token, SECRET_KEY);
    return true;
  } catch (err) {
    return false;
  }
}

// GET: Fetch all connections
export async function GET() {
  const isAuth = await verifyAuth();
  if (!isAuth) {
    return NextResponse.json(
      { success: false, error: "Unauthorized access" },
      { status: 401 },
    );
  }

  try {
    const snapshot = await adminDb
      .collection("tneb_connections")
      .orderBy("createdAt", "desc")
      .get();
    const connections = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    return NextResponse.json(connections);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch connections" },
      { status: 500 },
    );
  }
}

// POST: Add new connections
export async function POST(req: Request) {
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
        .get();
      if (existingQuery.empty) {
        await collectionRef.add({
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

// PUT: Edit an existing connection
export async function PUT(req: Request) {
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
      .get();

    if (snapshot.empty) {
      return NextResponse.json(
        { success: false, error: "Connection not found" },
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

// DELETE: Remove a connection
export async function DELETE(req: Request) {
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
