import { describe, expect, it } from 'vitest';
import { exportCsv, isEmpty, type DayLog } from './log';

const log = (l: Partial<DayLog>) => ({ symptoms: [], moods: [], ...l }) as DayLog;

describe('exportCsv', () => {
  it('writes one row per day, oldest first, quoting where needed', () => {
    const csv = exportCsv([
      log({ date: '2026-02-02', notes: 'tired, "very"' }),
      log({ date: '2026-02-01', flow: 'heavy', symptoms: ['cramps', 'acne'], pill: true }),
    ]);
    expect(csv.split('\n')).toEqual([
      'date,flow,symptoms,moods,sex,pill,temperature,weight,notes',
      '2026-02-01,heavy,cramps acne,,,true,,,',
      '2026-02-02,,,,,,,,"tired, ""very"""',
      '',
    ]);
  });
});

describe('isEmpty', () => {
  it('keeps a day with anything logged', () => {
    expect(isEmpty({ flow: '', symptoms: [], notes: '  ' })).toBe(true);
    expect(isEmpty({ moods: ['calm'] })).toBe(false);
  });
});
