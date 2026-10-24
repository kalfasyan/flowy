<script lang="ts">
  import { currentCycle, fertility, pregnancyChance, toIso, type Day } from '../lib/cycle';
  import { formatDay } from '../lib/format';
  import { tracker } from '../lib/tracker.svelte';

  // The cycle going on today as a curve of how likely pregnancy is each day, over
  // a strip of period, fertile and ovulation days. Drag across it (or use the
  // arrow keys) to look at any day.
  let { onlog }: { onlog: (date: string) => void } = $props();

  const a = $derived(tracker.analysis);
  const now = $derived(tracker.now);
  const cycle = $derived(currentCycle(a, now));
  const length = $derived(cycle ? cycle.end - cycle.start + 1 : 0);
  const ovulation = $derived(cycle && a.ovulations.find((o) => o >= cycle.start && o <= cycle.end));

  let picked = $state<Day | null>(null);
  // stays on today until someone picks a day of this cycle
  const selected = $derived(
    cycle && picked !== null && picked >= cycle.start && picked <= cycle.end ? picked : now,
  );

  const W = 320;
  const top = 18;
  const bottom = 104;
  const x = (d: Day) => (cycle ? 10 + ((d - cycle.start + 0.5) / length) * (W - 20) : 0);
  const y = (f: number) => bottom - f * (bottom - top);

  const points = $derived(
    cycle
      ? Array.from({ length }, (_, i) => [x(cycle.start + i), y(fertility(a, cycle.start + i))])
      : [],
  );

  // a smooth line through the points (Catmull-Rom as cubic Béziers), kept from
  // overshooting so it never dips below the flat days
  const between = (v: number, a: number, b: number) =>
    Math.min(Math.max(v, Math.min(a, b)), Math.max(a, b));
  const line = $derived.by(() => {
    if (points.length < 2) return '';
    let path = `M${points[0][0]},${points[0][1]}`;
    for (let i = 0; i < points.length - 1; i++) {
      const [p0, p1, p2, p3] = [
        points[i - 1] ?? points[i],
        points[i],
        points[i + 1],
        points[i + 2] ?? points[i + 1],
      ];
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, between(p1[1] + (p2[1] - p0[1]) / 6, p1[1], p2[1])];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, between(p2[1] - (p3[1] - p1[1]) / 6, p1[1], p2[1])];
      path += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
    }
    return path;
  });
  const area = $derived(
    line && `${line} L${points.at(-1)![0]},${bottom} L${points[0][0]},${bottom} Z`,
  );

  const segment = {
    period: 'fill-brand-500',
    predicted: 'fill-brand-400/45',
    ovulation: 'fill-fertile-500',
    fertile: 'fill-fertile-100 dark:fill-fertile-500/30',
  };

  const chance = $derived(pregnancyChance(a, selected));
  const chanceStyle = {
    low: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300',
    medium: 'bg-fertile-100 text-fertile-700 dark:bg-fertile-500/20 dark:text-fertile-500',
    high: 'bg-fertile-500 text-white',
  };

  function pickAt(e: PointerEvent) {
    if (!cycle) return;
    const box = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    const i = Math.floor(((e.clientX - box.left) / box.width) * length);
    picked = cycle.start + Math.max(0, Math.min(length - 1, i));
  }
  function key(e: KeyboardEvent) {
    if (!cycle) return;
    const step = { ArrowLeft: -1, ArrowRight: 1, Home: -length, End: length }[e.key];
    if (step === undefined) return;
    e.preventDefault();
    picked = Math.max(cycle.start, Math.min(cycle.end, selected + step));
  }
</script>

{#if cycle}
  <section class="card flex flex-col gap-3 px-4">
    <div class="flex items-start justify-between gap-3">
      <div>
        <h2 class="font-semibold">This cycle</h2>
        <p class="text-sm text-zinc-500">
          {selected === now
            ? 'Today'
            : formatDay(selected, { weekday: 'short', month: 'short', day: 'numeric' })}
          · day {selected - cycle.start + 1} of {length}
        </p>
      </div>
      <span class="rounded-full px-3 py-1 text-xs font-semibold {chanceStyle[chance]}"
        >{chance === 'low' ? 'Low' : chance === 'medium' ? 'Medium' : 'High'} chance</span
      >
    </div>

    <svg
      viewBox="0 0 {W} 142"
      class="w-full cursor-ew-resize touch-pan-y select-none outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 rounded-xl"
      role="slider"
      tabindex="0"
      aria-label="Day of this cycle"
      aria-valuemin={1}
      aria-valuemax={length}
      aria-valuenow={selected - cycle.start + 1}
      aria-valuetext="Cycle day {selected - cycle.start + 1}, {chance} chance of pregnancy"
      onpointerdown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        pickAt(e);
      }}
      onpointermove={(e) => e.buttons && pickAt(e)}
      onkeydown={key}
    >
      <defs>
        <linearGradient id="fertile-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" class="[stop-color:var(--color-fertile-500)]" stop-opacity="0.45" />
          <stop offset="1" class="[stop-color:var(--color-fertile-500)]" stop-opacity="0" />
        </linearGradient>
      </defs>

      <!-- how likely pregnancy is, day by day -->
      <path d={area} fill="url(#fertile-fill)" />
      <path
        d={line}
        fill="none"
        class="stroke-fertile-500"
        stroke-width="2.5"
        stroke-linecap="round"
      />

      {#if ovulation}
        <text
          x={x(ovulation)}
          y={top - 6}
          text-anchor="middle"
          class="fill-fertile-700 text-[9px] font-semibold dark:fill-fertile-500">Ovulation</text
        >
      {/if}

      <!-- the days, coloured like the calendar -->
      {#each { length } as _, i (i)}
        {@const d = cycle.start + i}
        {@const phase = tracker.phases.get(d)}
        <rect
          x={x(d) - (W - 20) / length / 2 + 0.75}
          y="114"
          width={Math.max(1, (W - 20) / length - 1.5)}
          height="10"
          rx="3"
          class={phase ? segment[phase] : 'fill-zinc-200 dark:fill-zinc-700'}
        />
      {/each}
      <text x="10" y="138" class="fill-zinc-400 text-[9px]">Day 1</text>
      <text x={W - 10} y="138" text-anchor="end" class="fill-zinc-400 text-[9px]">
        {a.late ? 'Today' : 'Next period'}
      </text>

      <!-- today, and the day being looked at -->
      <line
        x1={x(now)}
        x2={x(now)}
        y1={top}
        y2="126"
        class="stroke-zinc-400 dark:stroke-zinc-500"
        stroke-dasharray="2 3"
      />
      {#if selected !== now}
        <line x1={x(selected)} x2={x(selected)} y1={top} y2="126" class="stroke-brand-400" />
      {/if}
      <circle
        cx={x(selected)}
        cy={y(fertility(a, selected))}
        r="6"
        class="fill-white stroke-brand-500 dark:fill-zinc-900"
        stroke-width="3"
      />
    </svg>

    <div class="flex items-center justify-between gap-3 text-xs text-zinc-500">
      <span class="flex flex-wrap gap-x-3 gap-y-1">
        <span class="flex items-center gap-1"
          ><span class="size-2.5 rounded-full bg-brand-500"></span>Period</span
        >
        <span class="flex items-center gap-1"
          ><span class="size-2.5 rounded-full bg-fertile-100 dark:bg-fertile-500/30"
          ></span>Fertile</span
        >
        <span class="flex items-center gap-1"
          ><span class="size-2.5 rounded-full bg-fertile-500"></span>Ovulation</span
        >
      </span>
      <button
        class="shrink-0 font-semibold text-brand-600 dark:text-brand-400"
        onclick={() => onlog(toIso(selected))}
      >
        Log {selected === now ? 'today' : 'this day'}
      </button>
    </div>
  </section>
{/if}
