import { describe, expect, it } from 'vitest';
import {
  analyze,
  cycleDay,
  defaults,
  periods,
  phases,
  pregnancyChance,
  toDay,
  toIso,
  today,
} from './cycle';

const d = toDay;
const range = (from: string, n: number) => Array.from({ length: n }, (_, i) => d(from) + i);

describe('days', () => {
  it('round-trips ISO dates', () => {
    expect(toIso(d('2026-03-29'))).toBe('2026-03-29');
    expect(d('2026-03-30') - d('2026-03-29')).toBe(1);
  });

  it('takes today from the local date', () => {
    expect(toIso(today(new Date(2026, 9, 23, 23, 59)))).toBe('2026-10-23');
  });
});

describe('periods', () => {
  it('groups bleeding days, bridging one missed day', () => {
    const days = [d('2026-01-01'), d('2026-01-02'), d('2026-01-04'), d('2026-01-29')];
    expect(periods(days)).toEqual([
      { start: d('2026-01-01'), end: d('2026-01-04') },
      { start: d('2026-01-29'), end: d('2026-01-29') },
    ]);
  });
});

describe('analyze', () => {
  it('uses the settings until there is something to learn', () => {
    const a = analyze([], defaults, d('2026-01-10'));
    expect(a).toMatchObject({ cycleLength: 28, periodLength: 5, learned: false, nextStart: null });
  });

  it('learns cycle and period lengths from logged periods', () => {
    const bleeding = [
      ...range('2026-01-01', 4),
      ...range('2026-01-31', 4), // 30 days later
      ...range('2026-03-02', 4), // 30 days later
    ];
    const a = analyze(bleeding, defaults, d('2026-03-20'));
    expect(a.history.map((c) => c.length)).toEqual([30, 30]);
    expect(a).toMatchObject({ cycleLength: 30, periodLength: 4, learned: true, late: 0 });
    expect(toIso(a.nextStart!)).toBe('2026-04-01');
    expect(toIso(a.predicted[0].start)).toBe('2026-04-01');
    expect(toIso(a.predicted[1].start)).toBe('2026-05-01');
    // ovulation 14 days before each next period
    expect(a.ovulations.map(toIso).slice(0, 3)).toEqual(['2026-01-17', '2026-02-16', '2026-03-18']);
  });

  it('ignores cycles that are most likely a missed log', () => {
    const bleeding = [
      ...range('2026-01-01', 3),
      ...range('2026-01-29', 3),
      ...range('2026-04-23', 3),
    ];
    expect(analyze(bleeding, defaults, d('2026-05-01')).cycleLength).toBe(28);
  });

  it('knows a period is going on, for its expected length', () => {
    const a = analyze([d('2026-02-01')], defaults, d('2026-02-03'));
    expect(a.current).toEqual({ start: d('2026-02-01'), end: d('2026-02-05') });
    expect(cycleDay(a, d('2026-02-03'))).toBe(3);
  });

  it('counts days late and expects the period from today', () => {
    const a = analyze(range('2026-01-01', 5), defaults, d('2026-02-02'));
    expect(a.current).toBeNull();
    expect(a.late).toBe(4);
    expect(toIso(a.predicted[0].start)).toBe('2026-02-02');
  });
});

describe('phases and chance', () => {
  const a = analyze(range('2026-01-01', 5), defaults, d('2026-01-10'));
  const p = phases(a);

  it('colours logged, predicted and fertile days', () => {
    expect(p.get(d('2026-01-03'))).toBe('period');
    expect(p.get(d('2026-01-29'))).toBe('predicted');
    expect(p.get(d('2026-01-15'))).toBe('ovulation');
    expect(p.get(d('2026-01-10'))).toBe('fertile');
    expect(p.get(d('2026-01-08'))).toBeUndefined();
  });

  it('rates the chance of pregnancy by the fertile window', () => {
    expect(pregnancyChance(a, d('2026-01-14'))).toBe('high');
    expect(pregnancyChance(a, d('2026-01-11'))).toBe('medium');
    expect(pregnancyChance(a, d('2026-01-20'))).toBe('low');
  });
});
