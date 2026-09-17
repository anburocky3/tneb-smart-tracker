import { NextResponse } from "next/server";
import { fetchTNEBData, parseTNEBHtml } from "@/lib/tnebScraper";

interface RequestBody {
  consumerNo: string | number;
  tokenId: string;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RequestBody;
    const { consumerNo, tokenId } = body;

    if (!tokenId) {
      return NextResponse.json(
        { success: false, error: "Token ID is required" },
        { status: 400 },
      );
    }

    const htmlData = await fetchTNEBData(consumerNo, tokenId);
    const result = parseTNEBHtml(htmlData, String(consumerNo));

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch data",
      },
      { status: 500 },
    );
  }
}
