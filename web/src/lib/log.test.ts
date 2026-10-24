import { describe, expect, it } from 'vitest';
import { customSymptoms, exportCsv, isEmpty, type DayLog } from './log';

const log = (l: Partial<DayLog>) => ({ symptoms: [], moods: [], ...l }) as DayLog;

describe('exportCsv', () => {
  it('writes one row per day, oldest first, quoting where needed', () => {
    const csv = exportCsv([
      log({ date: '2026-02-02', notes: 'tired, "very"' }),
      log({
        date: '2026-02-01',
        flow: 'heavy',
        symptoms: ['cramps', 'acne'],
        custom_symptoms: [{ label: 'Dizzy', icon: '😵‍💫' }],
        pill: true,
      }),
    ]);
    expect(csv.split('\n')).toEqual([
      'date,flow,symptoms,custom_symptoms,moods,sex,pill,temperature,weight,notes',
      '2026-02-01,heavy,cramps acne,Dizzy,,,true,,,',
      '2026-02-02,,,,,,,,,"tired, ""very"""',
      '',
    ]);
  });
});

describe('isEmpty', () => {
  it('keeps a day with anything logged', () => {
    expect(isEmpty({ flow: '', symptoms: [], notes: '  ' })).toBe(true);
    expect(isEmpty({ moods: ['calm'] })).toBe(false);
    expect(isEmpty({ custom_symptoms: [{ label: 'Dizzy', icon: '✨' }] })).toBe(false);
  });
});

describe('customSymptoms', () => {
  it('lists your own symptoms once each, most used first', () => {
    const dizzy = { label: 'Dizzy', icon: '😵‍💫' };
    const list = customSymptoms([
      log({ custom_symptoms: [{ label: 'Hot flush', icon: '🔥' }, dizzy] }),
      log({ custom_symptoms: [{ ...dizzy, label: 'dizzy' }] }),
      log({}),
    ]);
    expect(list).toEqual([
      { ...dizzy, count: 2 },
      { label: 'Hot flush', icon: '🔥', count: 1 },
    ]);
  });
});
