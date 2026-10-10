import { describe, expect, it } from "bun:test";
import {
  getOrdinalSuffix,
  parseTnebDate,
  projectNextBillingCycle,
} from "./projection";

describe("Billing Cycle Projection", () => {
  it("returns null for empty or invalid bills", () => {
    expect(projectNextBillingCycle(undefined)).toBeNull();
    expect(projectNextBillingCycle([])).toBeNull();
    expect(projectNextBillingCycle([{ date: "invalid-date" }])).toBeNull();
  });

  it("correctly calculates next projected bill date and days left for upcoming cycle", () => {
    const bills = [
      { date: "14/08/2024" },
      { date: "12/06/2024" },
      { date: "15/04/2024" },
    ];
    // 24 days before projected 14/10/2024
    const simulatedNow = new Date(2024, 8, 20); // Sept 20, 2024
    const projection = projectNextBillingCycle(bills, simulatedNow);

    expect(projection).not.toBeNull();
    expect(projection?.status).toBe("upcoming");
    expect(projection?.daysLeft).toBe(24);
    expect(projection?.daysBadgeText).toBe("24d left");
    expect(projection?.daysText).toBe("24 days left");
    expect(projection?.formattedNextBillDate).toBe("14 Oct 2024");
    expect(projection?.shortNextBillDate).toBe("14/10/2024");
    expect(projection?.typicalDayOfMonth).toBe(14);
    expect(projection?.billsAnalyzedCount).toBe(3);
  });

  it("handles bill due today", () => {
    const bills = [{ date: "14/08/2024" }];
    const simulatedNow = new Date(2024, 9, 14); // Oct 14, 2024
    const projection = projectNextBillingCycle(bills, simulatedNow);

    expect(projection).not.toBeNull();
    expect(projection?.status).toBe("today");
    expect(projection?.daysLeft).toBe(0);
    expect(projection?.daysBadgeText).toBe("Due today");
    expect(projection?.daysText).toBe("Due today");
  });

  it("handles bill overdue for generation", () => {
    const bills = [{ date: "14/08/2024" }];
    const simulatedNow = new Date(2024, 9, 18); // Oct 18, 2024 (4 days past Oct 14)
    const projection = projectNextBillingCycle(bills, simulatedNow);

    expect(projection).not.toBeNull();
    expect(projection?.status).toBe("overdue");
    expect(projection?.daysLeft).toBe(-4);
    expect(projection?.daysBadgeText).toBe("4d overdue");
    expect(projection?.daysText).toBe("4 days overdue");
  });

  it("formats ordinal suffixes accurately", () => {
    expect(getOrdinalSuffix(1)).toBe("st");
    expect(getOrdinalSuffix(2)).toBe("nd");
    expect(getOrdinalSuffix(3)).toBe("rd");
    expect(getOrdinalSuffix(4)).toBe("th");
    expect(getOrdinalSuffix(11)).toBe("th");
    expect(getOrdinalSuffix(12)).toBe("th");
    expect(getOrdinalSuffix(13)).toBe("th");
    expect(getOrdinalSuffix(14)).toBe("th");
    expect(getOrdinalSuffix(21)).toBe("st");
    expect(getOrdinalSuffix(22)).toBe("nd");
    expect(getOrdinalSuffix(23)).toBe("rd");
    expect(getOrdinalSuffix(31)).toBe("st");
  });
});
