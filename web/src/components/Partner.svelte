<script lang="ts">
  import { toDay, toIso, today } from '../lib/cycle';
  import { days, formatDay } from '../lib/format';
  import { moods, symptoms } from '../lib/log';
  import {
    nameOf,
    partnerTips,
    phaseNames,
    upcoming,
    type DayKind,
    type PartnerView,
  } from '../lib/partner';
  import { pb } from '../lib/pb';
  import Cat from './Cat.svelte';
  import PartnerQuiz from './PartnerQuiz.svelte';

  // What a partner sees with someone's share link (/#partner/<token>), signed in or not.
  let { token }: { token: string } = $props();

  let view = $state<PartnerView | null>(null);
  let error = $state('');

  async function load() {
    error = '';
    try {
      view = await pb.send<PartnerView>(`/api/app/partner/${encodeURIComponent(token)}`, {
        query: { today: toIso(today()) },
      });
    } catch (err) {
      const status = (err as { status?: number }).status;
      error =
        status === 404
          ? 'This link was turned off or isn’t complete. Ask for a new one.'
          : "Can't reach the server. Check your connection.";
    }
  }
  load();

  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const name = $derived(view ? nameOf(view) : '');
  const now = $derived(view ? toDay(view.today) : 0);
  const phase = $derived(view?.phase || null);

  const status = $derived.by(() => {
    const v = view!;
    if (!v.logged)
      return { label: 'Nothing yet', big: '–', small: `${cap(name)} hasn’t logged a period yet.` };
    if (v.inPeriod) {
      const left = toDay(v.periodEnd) - now;
      return {
        label: `${cap(name)}’s period`,
        big: `Day ${v.cycleDay}`,
        small: left > 0 ? `About ${days(left)} to go` : 'Expected to end today',
      };
    }
    if (v.late)
      return { label: 'Period is late', big: days(v.late), small: 'It can start any day now.' };
    const until = toDay(v.nextStart) - now;
    return {
      label: 'Period in',
      big: until === 0 ? 'Today' : days(until),
      small: `Expected ${formatDay(toDay(v.nextStart), { weekday: 'short', month: 'short', day: 'numeric' })}`,
    };
  });

  const strip = $derived(view ? upcoming(view) : []);
  const kindStyle: Record<Exclude<DayKind, null>, string> = {
    period: 'bg-brand-500 text-white',
    predicted: 'border-2 border-dashed border-brand-400 text-brand-600 dark:text-brand-400',
    ovulation: 'bg-fertile-500 text-white',
    fertile: 'bg-fertile-100 text-fertile-700 dark:bg-fertile-500/20 dark:text-fertile-500',
  };

  const feelings = $derived(
    view?.log
      ? [
          ...(view.log.moods ?? []).map((m) => moods.find((x) => x.value === m)),
          ...(view.log.symptoms ?? []).map((s) => symptoms.find((x) => x.value === s)),
          ...(view.log.custom_symptoms ?? []),
        ].filter((x) => !!x)
      : [],
  );
</script>

<div class="mx-auto min-h-dvh max-w-md">
  <main class="flex flex-col gap-4 px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-10">
    <header class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <img src="/icons/icon.svg" alt="" class="size-8" />
        <h1 class="text-xl font-bold tracking-tight">Flowy</h1>
      </div>
      {#if view}
        <span class="chip text-xs">Shared by {view.name.trim() || 'your partner'}</span>
      {/if}
    </header>

    {#if error}
      <section class="card flex flex-col items-center gap-4 py-10 text-center">
        <span class="text-4xl" aria-hidden="true">🔒</span>
        <p role="alert">{error}</p>
        <button class="btn-secondary" onclick={load}>Try again</button>
      </section>
    {:else if !view}
      <p class="py-20 text-center text-zinc-500">Loading…</p>
    {:else}
      <section class="flex justify-center py-2">
        <div
          class="flex aspect-square w-64 flex-col items-center justify-center rounded-full p-8 text-center shadow-lg {view.inPeriod
            ? 'bg-gradient-to-br from-rose-400 to-pink-600 text-white shadow-rose-500/30'
            : phase === 'fertile'
              ? 'bg-gradient-to-br from-teal-300 to-teal-600 text-white shadow-teal-500/30'
              : 'border-8 border-rose-100 bg-white shadow-rose-200/40 dark:border-rose-500/20 dark:bg-zinc-900 dark:shadow-none'}"
        >
          <p class="text-sm font-semibold tracking-wide uppercase opacity-80">{status.label}</p>
          <p class="my-1 text-4xl leading-tight font-bold">{status.big}</p>
          <p class="text-sm opacity-80">{status.small}</p>
        </div>
      </section>

      {#if view.logged && phase}
        <div class="grid grid-cols-2 gap-3">
          <section class="card p-4">
            <p class="text-xs text-zinc-500">Cycle day</p>
            <p class="text-2xl font-bold">{view.cycleDay}</p>
            <p class="mt-1 text-xs text-zinc-500">of about {view.cycleLength}</p>
          </section>
          <section class="card p-4">
            <p class="text-xs text-zinc-500">Phase</p>
            <p class="text-lg leading-tight font-bold">{phaseNames[phase]}</p>
            <p class="mt-1 text-xs {phase === 'fertile' ? 'text-fertile-600' : 'text-zinc-500'}">
              {phase === 'fertile' ? 'Pregnancy is likely' : 'Pregnancy is less likely'}
            </p>
          </section>
        </div>

        <section class="card flex items-start gap-3 py-4 pl-2">
          <Cat {phase} />
          <div class="flex flex-col gap-2">
            <h2 class="font-semibold">How you can help</h2>
            <ul class="flex flex-col gap-1.5 text-sm text-zinc-600 dark:text-zinc-400">
              {#each partnerTips[phase] as tip (tip)}
                <li class="flex gap-2">
                  <span class="text-brand-500" aria-hidden="true">♥</span>{tip}
                </li>
              {/each}
            </ul>
          </div>
        </section>

        <section class="card flex flex-col gap-3 px-3">
          <h2 class="px-1 font-semibold">The next two weeks</h2>
          <div class="grid grid-cols-7 gap-y-2 text-center">
            {#each strip as d (d.day)}
              <div class="flex flex-col items-center gap-1">
                <span
                  class="text-[10px] text-zinc-400 {d.day === now
                    ? 'font-bold text-brand-600'
                    : ''}">{formatDay(d.day, { weekday: 'narrow' })}</span
                >
                <span
                  class="flex size-9 items-center justify-center rounded-full text-sm font-medium {d.kind
                    ? kindStyle[d.kind]
                    : ''} {d.day === now
                    ? 'ring-2 ring-zinc-900 ring-offset-2 dark:ring-white dark:ring-offset-zinc-900'
                    : ''}"
                  title={d.kind ?? ''}>{formatDay(d.day, { day: 'numeric' })}</span
                >
              </div>
            {/each}
          </div>
          <div class="flex flex-wrap gap-x-4 gap-y-1 px-1 text-xs text-zinc-500">
            <span class="flex items-center gap-1.5"
              ><span class="size-2.5 rounded-full bg-brand-500"></span>Period</span
            >
            <span class="flex items-center gap-1.5"
              ><span class="size-2.5 rounded-full border border-dashed border-brand-400"
              ></span>Expected</span
            >
            <span class="flex items-center gap-1.5"
              ><span class="size-2.5 rounded-full bg-fertile-100 dark:bg-fertile-500/30"
              ></span>Fertile</span
            >
            <span class="flex items-center gap-1.5"
              ><span class="size-2.5 rounded-full bg-fertile-500"></span>Ovulation</span
            >
          </div>
        </section>
      {/if}

      {#if view.log}
        <section class="card flex flex-col gap-3">
          <h2 class="font-semibold">How {name} feels today</h2>
          {#if feelings.length}
            <div class="flex flex-wrap gap-2">
              {#each feelings as f (f.label)}<span class="chip">{f.icon} {f.label}</span>{/each}
            </div>
          {:else}
            <p class="text-sm text-zinc-500">Nothing logged yet today.</p>
          {/if}
        </section>
      {/if}

      <PartnerQuiz {view} {token} />

      <p class="px-2 text-center text-xs text-zinc-400">
        Predictions are estimates and are not a form of birth control.
      </p>
    {/if}
  </main>
</div>
