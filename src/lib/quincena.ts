// =============================================================================
// Quincena helpers
//
// Panama's payroll cadence: two "quincenas" per month.
//   Q1: day 1  → day 15 (inclusive)
//   Q2: day 16 → last day of month (inclusive)
//
// Everything the stylist earnings view groups by quincena flows through here so
// the boundaries are computed in ONE place and stay consistent.
// =============================================================================

export interface Quincena {
  /** Stable id used as a map key and for React lists. e.g. "2026-05-1" */
  id: string;
  year: number;
  /** 1-12 */
  month: number;
  /** 1 = first half (1-15), 2 = second half (16-end). */
  half: 1 | 2;
  /** Inclusive start of the period. */
  start: Date;
  /** Inclusive end of the period. */
  end: Date;
  labelEs: string;
  labelEn: string;
}

const MONTH_ES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];
const MONTH_EN = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** Compute the quincena that contains the given date. */
export function getQuincenaOf(input: Date | string): Quincena {
  const d = input instanceof Date ? new Date(input.getTime()) : new Date(input);
  const year = d.getFullYear();
  const monthIdx = d.getMonth(); // 0-11
  const month = monthIdx + 1;
  const day = d.getDate();
  const half: 1 | 2 = day <= 15 ? 1 : 2;

  let start: Date;
  let end: Date;
  if (half === 1) {
    start = new Date(year, monthIdx, 1, 0, 0, 0, 0);
    end = new Date(year, monthIdx, 15, 23, 59, 59, 999);
  } else {
    start = new Date(year, monthIdx, 16, 0, 0, 0, 0);
    // day 0 of the next month = last day of this month
    end = new Date(year, monthIdx + 1, 0, 23, 59, 59, 999);
  }

  const dayStart = half === 1 ? 1 : 16;
  const dayEnd = end.getDate();
  const id = `${year}-${String(month).padStart(2, "0")}-${half}`;
  const labelEs = `${dayStart}–${dayEnd} de ${MONTH_ES[monthIdx]} ${year}`;
  const labelEn = `${MONTH_EN[monthIdx]} ${dayStart}–${dayEnd}, ${year}`;

  return { id, year, month, half, start, end, labelEs, labelEn };
}

/** The quincena that today belongs to. */
export function getCurrentQuincena(): Quincena {
  return getQuincenaOf(new Date());
}

/** Convenience: a bilingual label picker. */
export function quincenaLabel(q: Quincena, language: "es" | "en"): string {
  return language === "es" ? q.labelEs : q.labelEn;
}
