import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

// --- TypeScript Interfaces ---
export interface ConsumerInfo {
  consumerNo: string;
  name: string;
  address: string;
  region: string;
  circle: string;
  section: string;
  distribution: string;
  phase: string;
  meterNumber: string;
  serviceStatus: string;
  sanctionedLoad: string;
  reducedLoad: string;
  aadhaarStatus: string;
  panStatus: string;
}

export interface BillRecord {
  date: string;
  kwhReading: number;
  units: number;
  amount: number;
  dueDate: string;
  paidDate: string | null;
  receiptNo: string | null;
  isPaid: boolean;
  rawDate: number;
}

export interface SlabRate {
  from: string;
  to: string;
  rate: string;
  maxLimit: string;
}

export interface BillRecord {
  date: string;
  kwhReading: number;
  units: number;
  amount: number;
  dueDate: string;
  paidDate: string | null;
  receiptNo: string | null;
  isPaid: boolean;
  rawDate: number;
}

export interface ConsumerInfo {
  consumerNo: string;
  name: string;
  address: string;
  region: string;
  circle: string;
  section: string;
  distribution: string;
  phase: string;
  meterNumber: string;
  serviceStatus: string;
  sanctionedLoad: string;
  reducedLoad: string;
  aadhaarStatus: string;
  panStatus: string;
}

interface RequestBody {
  consumerNo: string | number;
  tokenId: string; // Optional tokenID for future use
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
    const $ = cheerio.load(htmlData);

    // --- 1. Extract Consumer Profile ---
    const nameText = $('td:contains("CONSUMER NAME")').first().text();
    const name = nameText.split(":")[1]?.trim() || "Unknown";

    // Helper to safely extract next cell's text
    const getNextCellText = (label: string) => {
      const text = $(`th:contains("${label}"), td:contains("${label}")`)
        .first()
        .next("td")
        .text()
        .trim();
      return text.replace(/&nbsp;/g, "").trim();
    };

    // Safely check status strings
    const rawAadhaar = getNextCellText("AADHAR");
    const aadhaarStatus = rawAadhaar.toLowerCase().includes("not")
      ? "Not Updated"
      : "Updated";

    const rawPan = getNextCellText("PAN Number");
    const panStatus = rawPan.toLowerCase().includes("not")
      ? "Not Updated"
      : "Updated";

    const consumer: ConsumerInfo = {
      consumerNo: String(consumerNo),
      name,
      region: getNextCellText("REGION"),
      circle: getNextCellText("CIRCLE"),
      section: getNextCellText("SECTION"),
      distribution: getNextCellText("DISTRIBUTION"),
      phase: getNextCellText("PHASE"),
      meterNumber: getNextCellText("METER NUMBER"),
      serviceStatus: getNextCellText("SERVICE STATUS"),
      sanctionedLoad: getNextCellText("SANCTIONED LOAD"),
      reducedLoad: getNextCellText("TEMPORARILY REDUCED LOAD") || "N/A",
      address: getNextCellText("ADDRESS"),
      aadhaarStatus,
      panStatus,
    };

    // --- 2. Extract Slab Rates ---
    const slabRates: SlabRate[] = [];
    $('table:contains("From Unit") tr').each((_, el) => {
      const tds = $(el).find("td");

      if (tds.length === 4) {
        const from = $(tds[0]).text().trim();
        const to = $(tds[1]).text().trim();
        const rate = $(tds[2]).text().trim();
        const maxLimit = $(tds[3]).text().trim(); // Extract the 4th column

        if (/^\d+$/.test(from)) {
          slabRates.push({ from, to, rate, maxLimit });
        }
      }
    });

    // --- 3. Extract Billing Ledger ---
    const bills: BillRecord[] = [];
    $("table.ccbills tr").each((_, el) => {
      const tds = $(el).find("td");

      // The main data row always has exactly 22 columns
      if (tds.length === 22) {
        const date = $(tds[0]).text().trim();

        // --- FIX: Ignore the column numbers header row ---
        // The column numbers row has "1" in the first column.
        // Real billing dates will always contain a slash (e.g., "21/07/2026").
        if (date === "1" || !date.includes("/")) {
          return; // Skip this iteration and move to the next row
        }

        const kwhStr = $(tds[3]).text().trim();
        const unitsStr = $(tds[7]).text().trim();
        const amountStr = $(tds[17]).text().trim();
        const dueDate = $(tds[18]).text().trim();
        const receiptNoStr = $(tds[20]).text().trim();
        const paidDateStr = $(tds[21]).text().trim();

        if (date && !isNaN(parseInt(unitsStr, 10))) {
          const amount = parseInt(amountStr, 10) || 0;

          // Logic: Clean up HTML garbage from receipt. If it's 0 amount (free), it's automatically 'paid'.
          // Otherwise, check if a valid alphanumeric receipt exists.
          const cleanReceipt = receiptNoStr.replace(/[^a-zA-Z0-9]/g, "");
          const isPaid = amount === 0 || cleanReceipt.length > 3;

          bills.push({
            date,
            kwhReading: parseInt(kwhStr, 10) || 0,
            units: parseInt(unitsStr, 10) || 0,
            amount,
            dueDate: dueDate.replace(/&nbsp;/g, "").trim(),
            paidDate:
              isPaid && amount > 0
                ? paidDateStr.replace(/&nbsp;/g, "").trim()
                : null,
            receiptNo: isPaid && amount > 0 ? cleanReceipt : null,
            isPaid,
            rawDate: new Date(date.split("/").reverse().join("-")).getTime(),
          });
        }
      }
    });

    // Sort bills newest to oldest for the dashboard UI
    bills.sort((a, b) => b.rawDate - a.rawDate);

    return NextResponse.json({
      success: true,
      consumer,
      slabRates,
      bills,
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

// --- Fetch Helper Function ---
async function fetchTNEBData(
  consumerNo: string | number,
  tokenId: string,
): Promise<string> {
  const value = String(consumerNo).trim();

  if (!value) {
    throw new Error("A valid consumer number is required");
  }

  const myHeaders = new Headers();
  myHeaders.append(
    "Accept",
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  );
  myHeaders.append("Accept-Language", "en-IN,en-GB;q=0.9,en-US;q=0.8,en;q=0.7");
  myHeaders.append("Cache-Control", "max-age=0");
  myHeaders.append("Connection", "keep-alive");
  myHeaders.append("Content-Type", "application/x-www-form-urlencoded");
  myHeaders.append("Origin", "https://www.tnebnet.org");
  myHeaders.append("Referer", "https://www.tnebnet.org/");
  myHeaders.append("Sec-Fetch-Dest", "document");
  myHeaders.append("Sec-Fetch-Mode", "navigate");
  myHeaders.append("Sec-Fetch-Site", "same-site");
  myHeaders.append("Sec-Fetch-User", "?1");
  myHeaders.append("Upgrade-Insecure-Requests", "1");
  myHeaders.append(
    "User-Agent",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36",
  );
  myHeaders.append(
    "sec-ch-ua",
    '"Not=A?Brand";v="99", "Google Chrome";v="151", "Chromium";v="151"',
  );
  myHeaders.append("sec-ch-ua-mobile", "?0");
  myHeaders.append("sec-ch-ua-platform", '"Windows"');
  myHeaders.append("Cookie", `PHPSESSID=${process.env.PHP_SESSION}`);

  const urlencoded = new URLSearchParams();
  // Ensure the actual consumer number is passed to TNEB if required by their API
  // urlencoded.append("consumerNo", value);
  urlencoded.append("tokenID", tokenId);

  const requestOptions: RequestInit = {
    method: "POST",
    headers: myHeaders,
    body: urlencoded,
    redirect: "follow",
  };

  const response = await fetch(
    "https://tneb.tnebnet.org/newlt/detconws.php",
    requestOptions,
  );

  if (!response.ok) {
    throw new Error(`TNEB request failed with status ${response.status}`);
  }

  return await response.text();
}
