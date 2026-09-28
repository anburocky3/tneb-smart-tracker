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