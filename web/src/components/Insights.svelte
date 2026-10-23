<script lang="ts">
  import { toDay } from '../lib/cycle';
  import { formatDay } from '../lib/format';
  import { moods, symptoms } from '../lib/log';
  import { tracker } from '../lib/tracker.svelte';

  const a = $derived(tracker.analysis);
  // newest first, at most a year
  const cycles = $derived([...a.history].reverse().slice(0, 13));
  const longest = $derived(Math.max(35, ...cycles.map((c) => c.length)));
  const short = (d: number) => formatDay(d, { month: 'short', day: 'numeric' });

  function top(field: 'symptoms' | 'moods', labels: typeof symptoms) {
    const counts = new Map<string, number>();
    for (const l of tracker.logs.values()) {
      for (const v of l[field] ?? []) counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    return [...counts]
      .sort((x, y) => y[1] - x[1])
      .slice(0, 5)
      .map(([v, count]) => ({ ...labels.find((l) => l.value === v)!, count }))
      .filter((x) => x.label);
  }
  const topSymptoms = $derived(top('symptoms', symptoms));
  const topMoods = $derived(top('moods', moods));

  // the last 60 days of temperatures, for a small line chart
  const temps = $derived(
    [...tracker.logs.values()]
      .filter((l) => l.temperature && toDay(l.date) > tracker.now - 60)
      .map((l) => ({ day: toDay(l.date), t: l.temperature })),
  );
  const chart = $derived.by(() => {
    if (temps.length < 2) return null;
    const lo = Math.min(...temps.map((p) => p.t)) - 0.1;
    const hi = Math.max(...temps.map((p) => p.t)) + 0.1;
    const x = (d: number) => ((d - (tracker.now - 60)) / 60) * 300;
    const y = (t: number) => 100 - ((t - lo) / (hi - lo)) * 100;
    return {
      points: temps.map((p) => `${x(p.day).toFixed(1)},${y(p.t).toFixed(1)}`).join(' '),
      lo: lo + 0.1,
      hi: hi - 0.1,
    };
  });
</script>

<h1 class="text-2xl font-bold tracking-tight">Insights</h1>

<div class="grid grid-cols-3 gap-3 text-center">
  <section class="card p-3">
    <p class="text-2xl font-bold">{a.cycleLength}</p>
    <p class="text-xs text-zinc-500">day cycle</p>
  </section>
  <section class="card p-3">
    <p class="text-2xl font-bold text-brand-600 dark:text-brand-400">{a.periodLength}</p>
    <p class="text-xs text-zinc-500">day period</p>
  </section>
  <section class="card p-3">
    <p class="text-2xl font-bold">{a.periods.length}</p>
    <p class="text-xs text-zinc-500">periods logged</p>
  </section>
</div>
{#if !a.learned}
  <p class="px-1 text-sm text-zinc-500">
    These are your settings for now. After two logged periods, Flowy uses your own averages.
  </p>
{/if}

<section class="card flex flex-col gap-3">
  <h2 class="font-semibold">Cycle history</h2>
  {#if cycles.length}
    {#each cycles as c (c.start)}
      <div class="flex flex-col gap-1">
        <div class="flex justify-between text-sm">
          <span>{short(c.start)} – {short(c.start + c.length - 1)}</span>
          <span class="font-semibold">{c.length} days</span>
        </div>
        <div class="flex h-3 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div
            class="h-full bg-zinc-200 dark:bg-zinc-700"
            style:width="{(c.length / longest) * 100}%"
          >
            <div
              class="h-full rounded-full bg-brand-500"
              style:width="{(c.periodLength / c.length) * 100}%"
            ></div>
          </div>
        </div>
      </div>
    {/each}
  {:else}
    <p class="text-sm text-zinc-500">Your cycles show up here once you've logged two periods.</p>
  {/if}
</section>

{#if chart}
  <section class="card flex flex-col gap-2">
    <h2 class="font-semibold">Temperature, last 60 days</h2>
    <svg viewBox="-4 -4 308 108" class="h-32 w-full" preserveAspectRatio="none" aria-hidden="true">
      <polyline
        points={chart.points}
        fill="none"
        class="stroke-brand-500"
        stroke-width="2"
        vector-effect="non-scaling-stroke"
      />
    </svg>
    <p class="flex justify-between text-xs text-zinc-500">
      <span>Low {chart.lo.toFixed(2)}°</span><span>High {chart.hi.toFixed(2)}°</span>
    </p>
  </section>
{/if}

{#each [{ title: 'Most common symptoms', list: topSymptoms }, { title: 'Most common moods', list: topMoods }] as group (group.title)}
  {#if group.list.length}
    <section class="card flex flex-col gap-2">
      <h2 class="font-semibold">{group.title}</h2>
      {#each group.list as item (item.value)}
        <div class="flex justify-between text-sm">
          <span>{item.icon} {item.label}</span>
          <span class="text-zinc-500">{item.count} {item.count === 1 ? 'day' : 'days'}</span>
        </div>
      {/each}
    </section>
  {/if}
{/each}
