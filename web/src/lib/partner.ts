import { toDay, type CyclePhase, type Day } from './cycle';
import { days } from './format';
import { moods, type CustomSymptom } from './log';

// What a partner sees with someone's share link (backend/app/partner.go), and
// the quiz they can take about it.

export interface PartnerView {
  name: string;
  today: string;
  /** False until a period is logged; the rest is empty then. */
  logged: boolean;
  cycleDay: number;
  phase: CyclePhase | '';
  inPeriod: boolean;
  periodEnd: string;
  nextStart: string;
  late: number;
  ovulation: string;
  cycleLength: number;
  periodLength: number;
  /** Today's moods and symptoms, when they chose to share them. */
  log: {
    moods: string[] | null;
    symptoms: string[] | null;
    custom_symptoms: CustomSymptom[] | null;
  } | null;
}

export type DayKind = 'period' | 'predicted' | 'ovulation' | 'fertile' | null;

/** What the coming days look like, from today, for the partner's strip of days. */
export function upcoming(v: PartnerView, count = 14): { day: Day; kind: DayKind }[] {
  const now = toDay(v.today);
  const out = Array.from({ length: count }, (_, i) => ({ day: now + i, kind: null as DayKind }));
  if (!v.logged) return out;
  const periodEnd = toDay(v.periodEnd);
  const first = v.inPeriod ? toDay(v.nextStart) : Math.max(toDay(v.nextStart), now);
  const ovulation = toDay(v.ovulation);
  for (const d of out) {
    const sinceStart = d.day - first;
    const inNext = sinceStart >= 0 && sinceStart % v.cycleLength < v.periodLength;
    const sinceOvulation = (((d.day - ovulation) % v.cycleLength) + v.cycleLength) % v.cycleLength;
    if (v.inPeriod && d.day <= periodEnd) d.kind = d.day === now ? 'period' : 'predicted';
    else if (inNext) d.kind = 'predicted';
    else if (d.day >= ovulation - 5 && sinceOvulation === 0) d.kind = 'ovulation';
    else if (d.day >= ovulation - 5 && (sinceOvulation <= 1 || sinceOvulation >= v.cycleLength - 5))
      d.kind = 'fertile';
  }
  return out;
}

/** The name to use for the person who shared, at the start of a sentence or in it. */
export const nameOf = (v: PartnerView) => v.name.trim().split(/\s+/)[0] || 'your partner';

/** Ways a partner can help in each phase. */
export const partnerTips: Record<CyclePhase, string[]> = {
  menstrual: [
    'Offer a heat pad, a warm drink or a back rub.',
    'Take a chore or two off their plate.',
    'Keep painkillers, snacks and plans flexible.',
  ],
  follicular: [
    'Energy usually picks up: plan something active or new together.',
    'A good week for a date night or a trip.',
    'Ask about their plans: this is often a motivated, social time.',
  ],
  fertile: [
    'Pregnancy is most likely now: agree on protection, or on trying.',
    'Mood and energy are often at their best.',
    'Make time for each other.',
  ],
  luteal: [
    'Be patient if moods swing; it’s hormones, not you.',
    'Bring their favourite snack: cravings are real.',
    'Plan cosy nights in as the period gets closer.',
  ],
};

export const phaseNames: Record<CyclePhase, string> = {
  menstrual: 'Period',
  follicular: 'Follicular phase',
  fertile: 'Fertile window',
  luteal: 'Luteal phase',
};

export interface Question {
  question: string;
  options: string[];
  answer: number;
  /** Shown after answering, right or wrong. */
  why: string;
}

/** A random number from 0 up to 1, like Math.random. */
type Random = () => number;

function shuffle<T>(xs: T[], random: Random): T[] {
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// a question with the right answer and three wrong ones, in random order
function pick(question: string, right: string, wrong: string[], why: string, random: Random) {
  const options = shuffle([right, ...shuffle(wrong, random).slice(0, 3)], random);
  return { question, options, answer: options.indexOf(right), why };
}

function aboutDays(question: string, n: number, why: string, random: Random): Question {
  const wrong = [...new Set([n - 5, n - 2, n + 2, n + 4, n + 7].filter((x) => x >= 0 && x !== n))];
  return pick(question, days(n), wrong.map(days), why, random);
}

const facts: { question: string; right: string; wrong: string[]; why: string }[] = [
  {
    question: 'About how long before a period does ovulation happen?',
    right: '14 days',
    wrong: ['3 days', '7 days', '21 days'],
    why: 'For most people the time from ovulation to the next period is about two weeks, even when cycle lengths vary.',
  },
  {
    question: 'Why is the fertile window about 6 days long?',
    right: 'Sperm can live up to 5 days',
    wrong: ['The egg lives a week', 'Ovulation lasts 6 days', 'It’s always 6 days after a period'],
    why: 'The egg lives about a day, but sperm can survive up to 5 days, so sex in the days before ovulation counts too.',
  },
  {
    question: 'Which hormone rises after ovulation and can bring PMS?',
    right: 'Progesterone',
    wrong: ['Adrenaline', 'Insulin', 'Melatonin'],
    why: 'Progesterone rises in the luteal phase. Its drop before a period is linked to mood changes, bloating and cravings.',
  },
  {
    question: 'What counts as a normal cycle length for adults?',
    right: '21 to 35 days',
    wrong: ['Exactly 28 days', '10 to 20 days', '40 to 50 days'],
    why: 'Only a few people have exactly 28-day cycles. Anything from 21 to 35 days is common.',
  },
];

/** A short quiz about the shared cycle, ending with a couple of general questions. */
export function quiz(v: PartnerView, random: Random = Math.random): Question[] {
  const name = nameOf(v);
  const out: Question[] = [];
  if (v.logged && v.phase) {
    const right = phaseNames[v.phase];
    const options = Object.values(phaseNames);
    out.push({
      question: `Which part of the cycle is ${name} in today?`,
      options,
      answer: options.indexOf(right),
      why: `Today is cycle day ${v.cycleDay}: the ${right.toLowerCase()}.`,
    });

    const now = toDay(v.today);
    if (v.inPeriod) {
      const left = toDay(v.periodEnd) - now;
      out.push(
        aboutDays(
          `How many more days is ${name}’s period expected to last?`,
          left,
          `Periods last about ${days(v.periodLength)} for ${name}, so about ${days(left)} to go.`,
          random,
        ),
      );
    } else if (!v.late) {
      const until = toDay(v.nextStart) - now;
      out.push(
        aboutDays(
          `In how many days is ${name}’s next period expected?`,
          until,
          `With a ${v.cycleLength}-day cycle, it’s due in ${days(until)}.`,
          random,
        ),
      );
    }

    const fertile = v.phase === 'fertile';
    out.push({
      question: `Is today in ${name}’s fertile window?`,
      options: ['Yes', 'No'],
      answer: fertile ? 0 : 1,
      why: fertile
        ? 'Yes: these are the days around ovulation, when pregnancy is most likely.'
        : `No: the fertile window is the 6 days up to and just after ovulation${v.ovulation ? ', which comes next around ' + new Date(v.ovulation).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' }) : ''}.`,
    });

    out.push(
      aboutDays(
        `How long is ${name}’s cycle, on average?`,
        v.cycleLength,
        `From the start of one period to the next takes about ${days(v.cycleLength)} for ${name}.`,
        random,
      ),
    );
  }

  const feeling = v.log?.moods?.length ? moods.find((m) => m.value === v.log!.moods![0]) : null;
  if (feeling) {
    const wrong = moods
      .filter((m) => !v.log!.moods!.includes(m.value))
      .map((m) => `${m.icon} ${m.label}`);
    out.push(
      pick(
        `How is ${name} feeling today?`,
        `${feeling.icon} ${feeling.label}`,
        wrong,
        `${name} logged feeling ${feeling.label.toLowerCase()} today.`,
        random,
      ),
    );
  }

  for (const f of shuffle(facts, random).slice(0, out.length ? 2 : 4)) {
    out.push(pick(f.question, f.right, f.wrong, f.why, random));
  }
  return out;
}
