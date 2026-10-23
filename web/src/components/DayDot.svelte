<script lang="ts">
  import { toIso, type Day } from '../lib/cycle';
  import { formatDay } from '../lib/format';
  import { tracker } from '../lib/tracker.svelte';

  // One day as a coloured circle: logged period, predicted period, fertile or ovulation.
  let { day, today = false, dim = false }: { day: Day; today?: boolean; dim?: boolean } = $props();

  const phase = $derived(tracker.phases.get(day));
  const log = $derived(tracker.logs.get(toIso(day)));
  const noted = $derived(
    !!log && (!!log.symptoms?.length || !!log.moods?.length || !!log.notes || !!log.sex),
  );

  const styles = {
    period: 'bg-brand-500 text-white',
    predicted: 'border-2 border-dashed border-brand-400 text-brand-600 dark:text-brand-400',
    ovulation: 'bg-fertile-500 text-white',
    fertile: 'bg-fertile-100 text-fertile-700 dark:bg-fertile-500/20 dark:text-fertile-500',
  };
</script>

<span
  class="relative flex size-10 items-center justify-center rounded-full text-sm font-medium
    {phase ? styles[phase] : ''} {today
    ? 'ring-2 ring-zinc-900 ring-offset-2 dark:ring-white dark:ring-offset-zinc-950'
    : ''}
    {dim ? 'opacity-40' : ''}"
>
  {formatDay(day, { day: 'numeric' })}
  {#if noted}
    <span class="absolute -bottom-1 size-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500"></span>
  {/if}
</span>
