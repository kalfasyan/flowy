// Cycle math for the today screen, the calendar and insights. backend/cycle does
// the same for reminders: keep the two in step.

/** A date as whole days since 1970-01-01, so adding days never trips over time zones. */
export type Day = number;

const MS_PER_DAY = 86_400_000;

export function toDay(iso: string): Day {
  return Math.round(Date.parse(iso + 'T00:00:00Z') / MS_PER_DAY);
}

export function toIso(day: Day): string {
  return new Date(day * MS_PER_DAY).toISOString().slice(0, 10);
}

/** A Date to format with `timeZone: 'UTC'`. */
export function toDate(day: Day): Date {
  return new Date(day * MS_PER_DAY);
}

/** Today's date in this device's time zone. */
export function today(now = new Date()): Day {
  return Math.round(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / MS_PER_DAY);
}

export interface Settings {
  cycleLength: number;
  periodLength: number;
  /** Days from ovulation to the next period; about 14 for most people. */
  lutealLength: number;
}

export const defaults: Settings = { cycleLength: 28, periodLength: 5, lutealLength: 14 };

export interface Period {
  start: Day;
  end: Day;
}

/** Groups bleeding days into periods. One day without bleeding doesn't end a period. */
export function periods(bleeding: Day[]): Period[] {
  const out: Period[] = [];
  for (const d of [...new Set(bleeding)].sort((a, b) => a - b)) {
    const last = out.at(-1);
    if (last && d - last.end <= 2) last.end = d;
    else out.push({ start: d, end: d });
  }
  return out;
}

export interface PastCycle {
  start: Day;
  length: number;
  periodLength: number;
}

export interface Analysis {
  periods: Period[];
  /** Finished cycles, oldest first: from one period's start to the next. */
  history: PastCycle[];
  cycleLength: number;
  periodLength: number;
  /** Whether the lengths come from logged periods rather than the settings. */
  learned: boolean;
  /** The period going on today: its logged days and the rest of its expected length. */
  current: Period | null;
  /** When the next period should start, or null before any period is logged. */
  nextStart: Day | null;
  /** Days past nextStart without a period. */
  late: number;
  predicted: Period[];
  ovulations: Day[];
}

// lengths are learned from the last few cycles; longer or shorter ones are
// most likely a period that wasn't logged, so they're left out
const learnFrom = 6;
const usableCycle = (length: number) => length >= 15 && length <= 60;
const average = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);

/** Works out cycle lengths and predictions from the days with bleeding. */
export function analyze(bleeding: Day[], settings: Settings, now: Day, cycles = 12): Analysis {
  const ps = periods(bleeding);
  const history = ps.slice(0, -1).map((p, i) => ({
    start: p.start,
    length: ps[i + 1].start - p.start,
    periodLength: p.end - p.start + 1,
  }));
  const recent = history.filter((c) => usableCycle(c.length)).slice(-learnFrom);
  const cycleLength = recent.length ? average(recent.map((c) => c.length)) : settings.cycleLength;
  // a period that could still get another day isn't finished
  const finished = ps
    .filter((p) => p.end + 2 < now)
    .map((p) => p.end - p.start + 1)
    .filter((l) => l <= 15)
    .slice(-learnFrom);
  const periodLength = finished.length ? average(finished) : settings.periodLength;
  const base = { periods: ps, history, cycleLength, periodLength, learned: recent.length > 0 };

  const last = ps.at(-1);
  if (!last)
    return { ...base, current: null, nextStart: null, late: 0, predicted: [], ovulations: [] };

  const end = Math.max(last.end, last.start + periodLength - 1);
  const current = last.start <= now && now <= end ? { start: last.start, end } : null;
  const nextStart = last.start + cycleLength;
  const late = current ? 0 : Math.max(0, now - nextStart);
  // a late period is expected any day now
  const first = Math.max(nextStart, now);
  const predicted = Array.from({ length: cycles }, (_, k) => {
    const start = first + k * cycleLength;
    return { start, end: start + periodLength - 1 };
  });
  const starts = [
    ...ps.slice(1).map((p) => p.start),
    nextStart,
    ...predicted.slice(1).map((p) => p.start),
  ];
  const ovulations = starts.map((s) => s - settings.lutealLength);
  return { ...base, current, nextStart, late, predicted, ovulations };
}

export type Phase = 'period' | 'predicted' | 'ovulation' | 'fertile';

/** What each day is, for colouring the calendar. Days not in the map are ordinary. */
export function phases(a: Analysis): Map<Day, Phase> {
  const m = new Map<Day, Phase>();
  const fill = (from: Day, to: Day, phase: Phase) => {
    for (let d = from; d <= to; d++) m.set(d, phase);
  };
  for (const o of a.ovulations) fill(o - 5, o + 1, 'fertile');
  for (const o of a.ovulations) m.set(o, 'ovulation');
  for (const p of a.predicted) fill(p.start, p.end, 'predicted');
  if (a.current) fill(a.current.start, a.current.end, 'predicted');
  for (const p of a.periods) fill(p.start, p.end, 'period');
  return m;
}

export type Chance = 'low' | 'medium' | 'high';

/** The chance of getting pregnant from sex on a day, from the fertile window. */
export function pregnancyChance(a: Analysis, day: Day): Chance {
  if (a.periods.some((p) => p.start <= day && day <= p.end)) return 'low';
  if (a.ovulations.some((o) => o - 2 <= day && day <= o)) return 'high';
  if (a.ovulations.some((o) => o - 5 <= day && day <= o + 1)) return 'medium';
  return 'low';
}

/** Which day of the cycle a day is: 1 is the first day of the period. */
export function cycleDay(a: Analysis, day: Day): number | null {
  const before = a.periods.filter((p) => p.start <= day);
  return before.length ? day - before[before.length - 1].start + 1 : null;
}

export type CyclePhase = 'menstrual' | 'follicular' | 'fertile' | 'luteal';

/** The phase of the cycle a day falls in, or null before any period is logged. */
export function cyclePhase(a: Analysis, day: Day): CyclePhase | null {
  const inPeriod = (p: Period) => p.start <= day && day <= p.end;
  if (a.periods.some(inPeriod) || (a.current && inPeriod(a.current))) return 'menstrual';
  const before = a.periods.filter((p) => p.start <= day);
  if (!before.length) return null;
  const ovulation = a.ovulations.find((o) => o > before[before.length - 1].start);
  if (ovulation === undefined || day > ovulation + 1) return 'luteal';
  return day >= ovulation - 5 ? 'fertile' : 'follicular';
}
