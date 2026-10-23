import { SvelteMap } from 'svelte/reactivity';
import { analyze, defaults, phases, toDay, today, type Settings } from './cycle';
import { isBleeding, isEmpty, type DayLog } from './log';
import { errorMessage, pb } from './pb';
import { session } from './session.svelte';

// The signed-in person's logged days, and what the cycle math makes of them.
class Tracker {
  /** Day logs by date (YYYY-MM-DD). */
  logs = new SvelteMap<string, DayLog>();
  loaded = $state(false);
  error = $state('');
  now = $state(today());

  settings: Settings = $derived({
    cycleLength: session.user?.cycle_length || defaults.cycleLength,
    periodLength: session.user?.period_length || defaults.periodLength,
    lutealLength: session.user?.luteal_length || defaults.lutealLength,
  });

  analysis = $derived(
    analyze(
      [...this.logs.values()].filter((l) => isBleeding(l.flow)).map((l) => toDay(l.date)),
      this.settings,
      this.now,
    ),
  );

  phases = $derived(phases(this.analysis));

  constructor() {
    // the app can stay open overnight
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') this.now = today();
    });
  }

  async load() {
    const user = session.user;
    if (!user) return;
    this.error = '';
    try {
      const list = await pb.collection('days').getFullList<DayLog>({
        filter: pb.filter('user = {:user}', { user: user.id }),
        sort: 'date',
      });
      this.logs.clear();
      for (const l of list) this.logs.set(l.date, l);
      this.loaded = true;
    } catch (err) {
      this.error = errorMessage(err, 'Could not load your calendar.');
    }
  }

  /** Saves changes to a day's log, removing the log when nothing is left in it. */
  async save(date: string, changes: Partial<DayLog>) {
    const user = session.user;
    if (!user) return;
    const days = pb.collection('days');
    const existing = this.logs.get(date);
    if (existing) {
      if (isEmpty({ ...existing, ...changes })) {
        await days.delete(existing.id);
        this.logs.delete(date);
      } else {
        this.logs.set(date, await days.update<DayLog>(existing.id, changes));
      }
    } else if (!isEmpty(changes)) {
      this.logs.set(date, await days.create<DayLog>({ ...changes, user: user.id, date }));
    }
  }

  /** Marks a day as a period day, or not. */
  togglePeriod(date: string) {
    const flow = this.logs.get(date)?.flow ?? '';
    return this.save(date, { flow: isBleeding(flow) ? '' : 'medium' });
  }
}

export const tracker = new Tracker();
