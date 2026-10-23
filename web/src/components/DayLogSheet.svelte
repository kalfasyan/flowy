<script lang="ts">
  import { untrack } from 'svelte';
  import { cycleDay, pregnancyChance, toDay } from '../lib/cycle';
  import { formatDay } from '../lib/format';
  import { flows, moods, symptoms, type DayLog, type Flow } from '../lib/log';
  import { errorMessage } from '../lib/pb';
  import { tracker } from '../lib/tracker.svelte';

  // Logging one day: flow, symptoms, moods, sex, pill, temperature, weight and notes.
  let { date, onclose }: { date: string; onclose: () => void } = $props();

  const day = $derived(toDay(date));
  // the sheet is remade for each date (Home.svelte keys it), so reading it once is right
  const saved = untrack(() => tracker.logs.get(date));
  let flow = $state<Flow>(saved?.flow ?? '');
  let picked = $state<string[]>([...(saved?.symptoms ?? [])]);
  let feelings = $state<string[]>([...(saved?.moods ?? [])]);
  let sex = $state<DayLog['sex']>(saved?.sex ?? '');
  let pill = $state(saved?.pill ?? false);
  let temperature = $state<number | null>(saved?.temperature || null);
  let weight = $state<number | null>(saved?.weight || null);
  let notes = $state(saved?.notes ?? '');
  let busy = $state(false);
  let error = $state('');

  const toggle = (list: string[], value: string) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  async function save() {
    busy = true;
    error = '';
    try {
      await tracker.save(date, {
        flow,
        symptoms: picked,
        moods: feelings,
        sex,
        pill,
        temperature: temperature || 0,
        weight: weight || 0,
        notes: notes.trim(),
      });
      onclose();
    } catch (err) {
      error = errorMessage(err, 'Could not save. Please try again.');
    } finally {
      busy = false;
    }
  }

  const n = $derived(cycleDay(tracker.analysis, day));
  const chance = $derived(pregnancyChance(tracker.analysis, day));
  const future = $derived(day > tracker.now);
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && onclose()} />

<div class="fixed inset-0 z-20 flex items-end justify-center bg-black/40 sm:items-center">
  <button class="absolute inset-0 cursor-default" aria-label="Close" onclick={onclose}></button>
  <div
    class="relative flex max-h-[92dvh] w-full max-w-md flex-col gap-5 overflow-y-auto rounded-t-3xl bg-zinc-50 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-3xl dark:bg-zinc-950"
    role="dialog"
    aria-modal="true"
    aria-labelledby="log-title"
  >
    <header class="flex items-start justify-between gap-4">
      <div>
        <h2 id="log-title" class="text-xl font-bold">
          {formatDay(day, { weekday: 'long', month: 'long', day: 'numeric' })}
        </h2>
        <p class="text-sm text-zinc-500">
          {#if n}Cycle day {n} ·
          {/if}<span class="capitalize">{chance}</span> chance of pregnancy
        </p>
      </div>
      <button class="text-2xl leading-none text-zinc-400" aria-label="Close" onclick={onclose}
        >×</button
      >
    </header>

    {#if future}
      <p class="card text-sm text-zinc-500">
        This day hasn't happened yet. You can add notes for it.
      </p>
    {:else}
      <section class="flex flex-col gap-2">
        <h3 class="text-sm font-semibold">Period</h3>
        <div class="flex flex-wrap gap-2">
          {#each flows as f (f.value)}
            <button
              class="chip"
              aria-pressed={flow === f.value}
              onclick={() => (flow = flow === f.value ? '' : f.value)}>🩸 {f.label}</button
            >
          {/each}
        </div>
      </section>

      <section class="flex flex-col gap-2">
        <h3 class="text-sm font-semibold">Symptoms</h3>
        <div class="flex flex-wrap gap-2">
          {#each symptoms as s (s.value)}
            <button
              class="chip"
              aria-pressed={picked.includes(s.value)}
              onclick={() => (picked = toggle(picked, s.value))}>{s.icon} {s.label}</button
            >
          {/each}
        </div>
      </section>

      <section class="flex flex-col gap-2">
        <h3 class="text-sm font-semibold">Mood</h3>
        <div class="flex flex-wrap gap-2">
          {#each moods as m (m.value)}
            <button
              class="chip"
              aria-pressed={feelings.includes(m.value)}
              onclick={() => (feelings = toggle(feelings, m.value))}>{m.icon} {m.label}</button
            >
          {/each}
        </div>
      </section>

      <section class="flex flex-col gap-2">
        <h3 class="text-sm font-semibold">Sex and pill</h3>
        <div class="flex flex-wrap gap-2">
          <button
            class="chip"
            aria-pressed={sex === 'protected'}
            onclick={() => (sex = sex === 'protected' ? '' : 'protected')}>🛡️ Protected sex</button
          >
          <button
            class="chip"
            aria-pressed={sex === 'unprotected'}
            onclick={() => (sex = sex === 'unprotected' ? '' : 'unprotected')}
            >❤️ Unprotected sex</button
          >
          <button class="chip" aria-pressed={pill} onclick={() => (pill = !pill)}
            >💊 Took pill</button
          >
        </div>
      </section>

      <div class="grid grid-cols-2 gap-3">
        <label
          >Temperature (°C)
          <input
            type="number"
            inputmode="decimal"
            step="0.01"
            min="34"
            max="43"
            bind:value={temperature}
          />
        </label>
        <label
          >Weight
          <input
            type="number"
            inputmode="decimal"
            step="0.1"
            min="0"
            max="500"
            bind:value={weight}
          />
        </label>
      </div>
    {/if}

    <label>Notes <textarea rows="3" maxlength="2000" bind:value={notes}></textarea></label>

    {#if error}<p class="text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>{/if}
    <button class="btn-primary" onclick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
  </div>
</div>
