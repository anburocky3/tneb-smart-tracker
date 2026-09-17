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

    const userQuery = await adminDb
      .collection("tneb_users")
      .where("email", "==", userId)
      .get();

    if (userQuery.empty) return null;

    const userData = userQuery.docs[0].data();
    if (userData.isActive === false) return null;

    return userId;
  } catch (err) {
    return null;
  }
}

// PATCH: Update sort order of meters or the priority of locations
export async function PATCH(req: Request) {
  const userId = await verifyAuth();
  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized access" },
      { status: 401 },
    );
  }

  try {
    const body = await req.json();
    const { orderedConsumerNos, locationOrder } = body;
    const batch = adminDb.batch();
    const collectionRef = adminDb.collection("tneb_connections");
    const snapshot = await collectionRef.where("userId", "==", userId).get();

    const docMap = new Map();
    snapshot.docs.forEach((doc) => {
      docMap.set(doc.data().consumerNo, doc.ref);
    });

    // 1. Handle Meter Ordering
    if (Array.isArray(orderedConsumerNos)) {
      orderedConsumerNos.forEach((consumerNo, index) => {
        const ref = docMap.get(consumerNo);
        if (ref) batch.update(ref, { sortOrder: index });
      });
    }

    // 2. Handle Location Priority
    if (Array.isArray(locationOrder)) {
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        const priority = locationOrder.indexOf(data.location);
        if (priority !== -1) {
          batch.update(doc.ref, { locationPriority: priority });
        }
      });
    }

    await batch.commit();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to update order" },
      { status: 500 },
    );
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
      .orderBy("locationPriority", "asc")
      .orderBy("sortOrder", "asc")
      .get();

    const connections = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

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
        // Determine locationPriority
        let locationPriority = 999;
        const locQuery = await collectionRef
          .where("userId", "==", userId)
          .where("location", "==", item.location)
          .limit(1)
          .get();

        const allConnections = await collectionRef
          .where("userId", "==", userId)
          .get();

        if (!locQuery.empty) {
          locationPriority = locQuery.docs[0].data().locationPriority ?? 999;
        } else {
          const uniqueLocs = new Set(
            allConnections.docs.map((d) => d.data().location),
          );
          locationPriority = uniqueLocs.size;
        }

        await collectionRef.add({
          userId,
          nickname: item.nickname,
          consumerNo: item.consumerNo,
          tokenId: item.tokenId || "",
          location: item.location,
          locationPriority,
          sortOrder: allConnections.size, // Simple append
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

    const docId = snapshot.docs[0].id;
    const updateData: any = {
      nickname,
      consumerNo,
      tokenId,
      location,
      updatedAt: new Date(),
    };

    // If location changed, we should ideally update priority.
    // For simplicity, we'll let the user reorder or assign a default.
    if (location) {
      const locQuery = await collectionRef
        .where("userId", "==", userId)
        .where("location", "==", location)
        .limit(1)
        .get();
      if (!locQuery.empty) {
        updateData.locationPriority = locQuery.docs[0].data().locationPriority;
      } else {
        const allLocs = await collectionRef.where("userId", "==", userId).get();
        updateData.locationPriority = new Set(
          allLocs.docs.map((d) => d.data().location),
        ).size;
      }
    }

    await collectionRef.doc(docId).update(updateData);
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
