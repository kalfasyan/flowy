<script lang="ts">
  import { defaults } from '../lib/cycle';
  import { exportCsv } from '../lib/log';
  import { install } from '../lib/install.svelte';
  import { errorMessage, pb, type User } from '../lib/pb';
  import { session } from '../lib/session.svelte';
  import { tracker } from '../lib/tracker.svelte';
  import Notifications from './Notifications.svelte';

  const user = $derived(session.user!);
  const version = pb
    .send<{ version: string }>('/api/app/info', {})
    .then((i) => i.version)
    .catch(() => '');

  let cycleLength = $state(session.user?.cycle_length || defaults.cycleLength);
  let periodLength = $state(session.user?.period_length || defaults.periodLength);
  let lutealLength = $state(session.user?.luteal_length || defaults.lutealLength);
  let busy = $state(false);
  let message = $state('');

  async function update(changes: Partial<User>) {
    message = '';
    try {
      // the SDK refreshes the signed-in user, so predictions update straight away
      await pb.collection('users').update(user.id, changes);
      return true;
    } catch (err) {
      message = errorMessage(err, 'Could not save. Please try again.');
      return false;
    }
  }

  function download(csv: string) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'flowy.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function saveCycle(e: SubmitEvent) {
    e.preventDefault();
    busy = true;
    if (
      await update({
        cycle_length: cycleLength,
        period_length: periodLength,
        luteal_length: lutealLength,
      })
    ) {
      message = 'Saved.';
    }
    busy = false;
  }
</script>

<h1 class="text-2xl font-bold tracking-tight">Settings</h1>

<form class="card flex flex-col gap-4" onsubmit={saveCycle}>
  <div>
    <h2 class="font-semibold">Your cycle</h2>
    <p class="mt-1 text-sm text-zinc-500">
      {tracker.analysis.learned
        ? `Flowy now predicts from your logged periods (a ${tracker.analysis.cycleLength}-day cycle). These are used if it can't.`
        : 'Flowy uses these until you have logged two periods.'}
    </p>
  </div>
  <div class="grid grid-cols-2 gap-3">
    <label
      >Cycle length (days)<input
        type="number"
        min="15"
        max="60"
        bind:value={cycleLength}
        required
      /></label
    >
    <label
      >Period length (days)<input
        type="number"
        min="1"
        max="15"
        bind:value={periodLength}
        required
      /></label
    >
  </div>
  <label>
    Days from ovulation to period
    <input type="number" min="7" max="20" bind:value={lutealLength} required />
    <span class="font-normal text-zinc-500"
      >14 for most people. Leave it unless you know yours.</span
    >
  </label>
  <button class="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
  {#if message}<p class="text-sm text-zinc-500" role="status">{message}</p>{/if}
</form>

<section class="card flex flex-col gap-3">
  <h2 class="font-semibold">Reminders</h2>
  <label class="flex-row items-center justify-between font-normal">
    Period expected in 2 days
    <input
      type="checkbox"
      checked={user.remind_period}
      onchange={(e) => update({ remind_period: e.currentTarget.checked })}
    />
  </label>
  <label class="flex-row items-center justify-between font-normal">
    Fertile window starts
    <input
      type="checkbox"
      checked={user.remind_fertile}
      onchange={(e) => update({ remind_fertile: e.currentTarget.checked })}
    />
  </label>
  <label class="flex-row items-center justify-between font-normal">
    Pill, at 21:00 if not logged yet
    <input
      type="checkbox"
      checked={user.remind_pill}
      onchange={(e) => update({ remind_pill: e.currentTarget.checked })}
    />
  </label>
  <p class="text-sm text-zinc-500">
    Period and fertile reminders come at 9:00, on devices with notifications turned on.
  </p>
</section>

<Notifications />

<section class="card flex items-center justify-between gap-4">
  <div>
    <h2 class="font-semibold">Your data</h2>
    <p class="text-sm text-zinc-500">Download everything you logged, as a spreadsheet.</p>
  </div>
  <button class="btn-secondary shrink-0" onclick={() => download(exportCsv(tracker.logs.values()))}
    >Export</button
  >
</section>

{#if install.canPrompt}
  <section class="card flex items-center justify-between gap-4">
    <p>Install Flowy for quick access from your home screen.</p>
    <button class="btn-primary shrink-0" onclick={() => install.install()}>Install</button>
  </section>
{:else if install.needsIosSteps}
  <section class="card">
    <p>To install Flowy, tap <b>Share</b> in Safari, then <b>Add to Home Screen</b>.</p>
  </section>
{/if}

<section class="card flex flex-col gap-3 text-sm">
  <div class="flex items-center justify-between gap-4">
    <p class="text-zinc-600 dark:text-zinc-400">
      Signed in as {user.name || user.email}{session.isOwner ? ' (owner)' : ''}.
    </p>
    <button class="btn-secondary shrink-0 px-3 py-2 text-sm" onclick={() => session.logout()}
      >Sign out</button
    >
  </div>
  {#if session.isOwner}
    <p class="text-zinc-600 dark:text-zinc-400">
      Add people and manage data in the <a
        class="text-brand-600 underline dark:text-brand-400"
        href="/_/">admin page</a
      >. In the app, each person only sees their own calendar.
    </p>
  {/if}
</section>

{#await version then v}
  {#if v}<p class="text-center text-xs text-zinc-400">Flowy {v}</p>{/if}
{/await}
