import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { fetchTNEBData, parseTNEBHtml } from "@/lib/tnebScraper";

/**
 * GET /api/meter-readings
 * Query Params: consumerNo, tokenID
 *
 * This endpoint allows third-party services to retrieve meter reading data
 * by providing a consumer number and its associated TNEB token ID.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const consumerNo = searchParams.get("consumerNo");
    const tokenID = searchParams.get("tokenID");

    if (!consumerNo || !tokenID) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required parameters: consumerNo and tokenID are required."
        },
        { status: 400 },
      );
    }

    // --- Authorization Check ---
    // We verify that this combination of consumerNo and tokenID is registered in our system.
    // This prevents arbitrary scraping through our API.
    const connectionsSnapshot = await adminDb
      .collection("tneb_connections")
      .where("consumerNo", "==", consumerNo)
      .where("tokenId", "==", tokenID)
      .get();

    if (connectionsSnapshot.empty) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized: Invalid Consumer Number or Token ID combination."
        },
        { status: 401 },
      );
    }

    // --- Data Retrieval ---
    // We use the same scraping logic as the internal dashboard
    const htmlData = await fetchTNEBData(consumerNo, tokenID);
    const readings = parseTNEBHtml(htmlData, consumerNo);

    // Standardized response format for third-party integrations
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        consumer: readings.consumer,
        latestReading: readings.bills[0] || null,
        billingHistory: readings.bills,
        slabRates: readings.slabRates,
      },
    });

  } catch (error) {
    console.error("Meter Readings API Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "An internal server error occurred while fetching readings."
      },
      { status: 500 },
    );
  }
}
