import { describe, expect, it } from 'vitest';
import { toDay } from './cycle';
import { quiz, upcoming, type PartnerView } from './partner';

const view = (v: Partial<PartnerView> = {}): PartnerView => ({
  name: 'Alex Smith',
  today: '2026-01-10',
  logged: true,
  cycleDay: 10,
  phase: 'fertile',
  inPeriod: false,
  periodEnd: '2026-01-05',
  nextStart: '2026-01-29',
  late: 0,
  ovulation: '2026-01-15',
  cycleLength: 28,
  periodLength: 5,
  log: null,
  ...v,
});

// a random function that always picks the same, so the quiz comes out the same
const fixed = () => 0;

describe('upcoming', () => {
  it('marks fertile days, ovulation and the next period', () => {
    const kinds = upcoming(view(), 25).map((d) => d.kind);
    expect(kinds.slice(0, 7)).toEqual([
      'fertile',
      'fertile',
      'fertile',
      'fertile',
      'fertile',
      'ovulation',
      'fertile',
    ]);
    expect(kinds[7]).toBeNull();
    expect(kinds.slice(19, 24)).toEqual(Array(5).fill('predicted'));
    expect(kinds[24]).toBeNull();
  });

  it('shows the rest of a period going on', () => {
    const v = view({ today: '2026-01-02', inPeriod: true, phase: 'menstrual', cycleDay: 2 });
    const kinds = upcoming(v, 5).map((d) => d.kind);
    expect(kinds).toEqual(['period', 'predicted', 'predicted', 'predicted', null]);
  });

  it('expects a late period any day now', () => {
    const v = view({ today: '2026-02-01', late: 3, phase: 'luteal' });
    expect(upcoming(v, 6).map((d) => d.kind)).toEqual([...Array(5).fill('predicted'), null]);
  });

  it('is blank before any period is logged', () => {
    expect(upcoming(view({ logged: false }), 3).every((d) => d.kind === null)).toBe(true);
    expect(upcoming(view(), 3)[0].day).toBe(toDay('2026-01-10'));
  });
});

describe('quiz', () => {
  it('asks about the shared cycle by first name, then a couple of facts', () => {
    const qs = quiz(view(), fixed);
    expect(qs.map((q) => q.question)).toEqual([
      'Which part of the cycle is Alex in today?',
      'In how many days is Alex’s next period expected?',
      'Is today in Alex’s fertile window?',
      'How long is Alex’s cycle, on average?',
      expect.any(String),
      expect.any(String),
    ]);
    expect(qs[0].options[qs[0].answer]).toBe('Fertile window');
    expect(qs[1].options[qs[1].answer]).toBe('19 days');
    expect(qs[2].options[qs[2].answer]).toBe('Yes');
    expect(qs[3].options[qs[3].answer]).toBe('28 days');
    for (const q of qs) {
      expect(new Set(q.options).size).toBe(q.options.length);
      expect(q.answer).toBeGreaterThanOrEqual(0);
    }
  });

  it('asks how they feel when moods are shared', () => {
    const qs = quiz(view({ log: { moods: ['calm'], symptoms: [], custom_symptoms: null } }), fixed);
    const q = qs.find((q) => q.question.startsWith('How is Alex feeling'))!;
    expect(q.options[q.answer]).toBe('😌 Calm');
  });

  it('sticks to general questions before any period is logged', () => {
    const qs = quiz(view({ logged: false, phase: '', name: '' }), fixed);
    expect(qs).toHaveLength(4);
  });
});
