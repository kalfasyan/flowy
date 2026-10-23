import { toDate, type Day } from './cycle';

// Dates in the person's language. Days are stored at midnight UTC (see cycle.ts),
// so they're formatted in UTC to show the same date everywhere.

export function formatDay(day: Day, options: Intl.DateTimeFormatOptions): string {
  return toDate(day).toLocaleDateString(undefined, { ...options, timeZone: 'UTC' });
}

/** "3 days", "1 day". */
export function days(n: number): string {
  return `${n} ${n === 1 ? 'day' : 'days'}`;
}
