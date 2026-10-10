export const BI_MONTHLY_DAYS = 60;
export const FREE_UNITS_LIMIT = 200;

export interface MeterProjectionInput {
  initialKwh: number;
  cycleStartDate: string;
  currentKwh: number;
  now?: Date;
}

export interface MeterProjection {
  daysElapsed: number;
  daysRemaining: number;
  unitsConsumed: number;
  unitsPerDay: number;
  projectedUnits: number;
  projectedBill: number;
  freeUnitsBudgetLeft: number;
  dailyAllowanceToStayFree: number;
}

export function computeTnebBill(units: number): number {
  const normalizedUnits = Math.max(0, Math.round(units));
  if (normalizedUnits <= FREE_UNITS_LIMIT) return 0;

  let total = 0;
  if (normalizedUnits <= 400) {
    total = (normalizedUnits - 200) * 4.7;
  } else if (normalizedUnits <= 500) {
    total = 200 * 4.7 + (normalizedUnits - 400) * 6.3;
  } else if (normalizedUnits <= 600) {
    total = 300 * 4.7 + 100 * 6.3 + (normalizedUnits - 500) * 8.4;
  } else if (normalizedUnits <= 800) {
    total =
      300 * 4.7 +
      100 * 6.3 +
      100 * 8.4 +
      (normalizedUnits - 600) * 9.45;
  } else if (normalizedUnits <= 1000) {
    total =
      300 * 4.7 +
      100 * 6.3 +
      100 * 8.4 +
      200 * 9.45 +
      (normalizedUnits - 800) * 10.5;
  } else {
    total =
      300 * 4.7 +
      100 * 6.3 +
      100 * 8.4 +
      200 * 9.45 +
      200 * 10.5 +
      (normalizedUnits - 1000) * 11.55;
  }

  return Math.round(total);
}

export function parseTnebDate(value: string): Date | null {
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const isoDate = new Date(Number(year), Number(month) - 1, Number(day));
    return isoDate.getFullYear() === Number(year) &&
      isoDate.getMonth() === Number(month) - 1 &&
      isoDate.getDate() === Number(day)
      ? isoDate
      : null;
  }

  const [day, month, year] = value.split("/").map(Number);
  if (!day || !month || !year) return null;

  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1
    ? date
    : null;
}

export function projectMeterReading({
  initialKwh,
  cycleStartDate,
  currentKwh,
  now = new Date(),
}: MeterProjectionInput): MeterProjection {
  const cycleStart = parseTnebDate(cycleStartDate) ?? now;
  const elapsedMilliseconds = Math.max(0, now.getTime() - cycleStart.getTime());
  const rawDaysElapsed = Math.floor(elapsedMilliseconds / 86_400_000);
  const daysElapsed = Math.min(BI_MONTHLY_DAYS, Math.max(1, rawDaysElapsed));
  const daysRemaining = BI_MONTHLY_DAYS - daysElapsed;
  const unitsConsumed = Math.max(0, currentKwh - initialKwh);
  const unitsPerDay = unitsConsumed / daysElapsed;
  const projectedUnits = Math.round(unitsPerDay * BI_MONTHLY_DAYS);
  const freeUnitsBudgetLeft = Math.max(0, FREE_UNITS_LIMIT - unitsConsumed);

  return {
    daysElapsed,
    daysRemaining,
    unitsConsumed,
    unitsPerDay,
    projectedUnits,
    projectedBill: computeTnebBill(projectedUnits),
    freeUnitsBudgetLeft,
    dailyAllowanceToStayFree:
      daysRemaining > 0 ? freeUnitsBudgetLeft / daysRemaining : 0,
  };
}

export interface BillingCycleProjection {
  nextBillDate: Date;
  formattedNextBillDate: string;
  shortNextBillDate: string;
  daysLeft: number;
  daysBadgeText: string;
  daysText: string;
  status: "upcoming" | "today" | "overdue";
  typicalDayOfMonth: number;
  cycleIntervalDays: number;
  lastBillDate: string;
  billsAnalyzedCount: number;
}

export function projectNextBillingCycle(
  bills: Array<{ date: string; rawDate?: number }> | undefined | null,
  now = new Date(),
): BillingCycleProjection | null {
  if (!bills || !Array.isArray(bills) || bills.length === 0) return null;

  const parsedBills: Array<{ original: { date: string; rawDate?: number }; date: Date }> = [];
  for (const b of bills) {
    if (!b?.date) continue;
    const parsed = parseTnebDate(b.date);
    if (parsed) {
      parsedBills.push({ original: b, date: parsed });
    }
  }

  if (parsedBills.length === 0) return null;

  // Sort descending by bill date
  parsedBills.sort((a, b) => b.date.getTime() - a.date.getTime());

  const latest = parsedBills[0];
  const lastBillDate = latest.original.date;

  // 1. Analyze historical days of the month (median day)
  const historicalDays = parsedBills.map((b) => b.date.getDate());
  const sortedDays = [...historicalDays].sort((a, b) => a - b);
  const medianDay = sortedDays[Math.floor(sortedDays.length / 2)];
  const typicalDayOfMonth = medianDay;

  // 2. Analyze interval between consecutive bills (if multiple bills)
  let totalIntervalDays = 0;
  let intervalCount = 0;
  for (let i = 0; i < parsedBills.length - 1; i++) {
    const diff = Math.round(
      (parsedBills[i].date.getTime() - parsedBills[i + 1].date.getTime()) / 86_400_000,
    );
    if (diff >= 45 && diff <= 75) {
      totalIntervalDays += diff;
      intervalCount++;
    }
  }
  const cycleIntervalDays =
    intervalCount > 0 ? Math.round(totalIntervalDays / intervalCount) : BI_MONTHLY_DAYS;

  // 3. Project next bill date (+2 months from latest bill in TNEB)
  let targetYear = latest.date.getFullYear();
  let targetMonth = latest.date.getMonth() + 2;

  targetYear += Math.floor(targetMonth / 12);
  targetMonth = targetMonth % 12;

  const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const projectedDay = Math.min(typicalDayOfMonth, daysInTargetMonth);
  let nextBillDate = new Date(targetYear, targetMonth, projectedDay);

  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  let projMidnight = new Date(
    nextBillDate.getFullYear(),
    nextBillDate.getMonth(),
    nextBillDate.getDate(),
  ).getTime();

  // If latest bill is more than 1 cycle in the past, advance in 2-month steps
  // up to within 20 days overdue relative to now.
  while (projMidnight < todayMidnight - 20 * 86_400_000) {
    targetMonth += 2;
    targetYear += Math.floor(targetMonth / 12);
    targetMonth = targetMonth % 12;
    const maxDays = new Date(targetYear, targetMonth + 1, 0).getDate();
    const nextDay = Math.min(typicalDayOfMonth, maxDays);
    nextBillDate = new Date(targetYear, targetMonth, nextDay);
    projMidnight = new Date(targetYear, targetMonth, nextDay).getTime();
  }

  const diffDays = Math.round((projMidnight - todayMidnight) / 86_400_000);

  let status: "upcoming" | "today" | "overdue";
  let daysBadgeText: string;
  let daysText: string;

  if (diffDays > 1) {
    status = "upcoming";
    daysBadgeText = `${diffDays}d left`;
    daysText = `${diffDays} days left`;
  } else if (diffDays === 1) {
    status = "upcoming";
    daysBadgeText = "1d left";
    daysText = "1 day left (Tomorrow)";
  } else if (diffDays === 0) {
    status = "today";
    daysBadgeText = "Due today";
    daysText = "Due today";
  } else if (diffDays === -1) {
    status = "overdue";
    daysBadgeText = "1d overdue";
    daysText = "1 day overdue";
  } else {
    status = "overdue";
    const abs = Math.abs(diffDays);
    daysBadgeText = `${abs}d overdue`;
    daysText = `${abs} days overdue`;
  }

  const formattedNextBillDate = nextBillDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const dd = String(nextBillDate.getDate()).padStart(2, "0");
  const mm = String(nextBillDate.getMonth() + 1).padStart(2, "0");
  const yyyy = nextBillDate.getFullYear();
  const shortNextBillDate = `${dd}/${mm}/${yyyy}`;

  return {
    nextBillDate,
    formattedNextBillDate,
    shortNextBillDate,
    daysLeft: diffDays,
    daysBadgeText,
    daysText,
    status,
    typicalDayOfMonth,
    cycleIntervalDays,
    lastBillDate,
    billsAnalyzedCount: parsedBills.length,
  };
}

export function getOrdinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}