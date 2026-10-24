<script lang="ts">
  import { onMount } from 'svelte';
  import type { RecordModel } from 'pocketbase';
  import { errorMessage, pb } from '../lib/pb';
  import { session } from '../lib/session.svelte';

  // Settings for sharing with a partner: a private link to a summary of the
  // cycle (Partner.svelte), which can be renewed or turned off at any time.
  interface Share extends RecordModel {
    token: string;
    show_log: boolean;
  }

  const shares = pb.collection('shares');
  let share = $state<Share | null>(null);
  let loaded = $state(false);
  let busy = $state(false);
  let message = $state('');
  let copied = $state(false);
  let confirmStop = $state(false);
  const link = $derived(share ? `${location.origin}/#partner/${share.token}` : '');
  const canShare = typeof navigator.share === 'function';

  onMount(async () => {
    try {
      const list = await shares.getFullList<Share>({
        filter: pb.filter('user = {:user}', { user: session.user!.id }),
      });
      share = list[0] ?? null;
      loaded = true;
    } catch (err) {
      message = errorMessage(err, 'Could not load your sharing settings.');
    }
  });

  async function run(action: () => Promise<void>) {
    busy = true;
    message = '';
    try {
      await action();
    } catch (err) {
      message = errorMessage(err, 'Could not save. Please try again.');
    } finally {
      busy = false;
    }
  }

  const create = (showLog = false) =>
    shares.create<Share>({ user: session.user!.id, show_log: showLog });

  const start = () =>
    run(async () => {
      share = await create();
    });

  // the old link stops working straight away
  const renew = () =>
    run(async () => {
      const showLog = share!.show_log;
      await shares.delete(share!.id);
      share = null;
      share = await create(showLog);
      message = 'New link made. The old one no longer works.';
    });

  function stop() {
    if (!confirmStop) {
      confirmStop = true;
      setTimeout(() => (confirmStop = false), 4000);
      return;
    }
    confirmStop = false;
    run(async () => {
      await shares.delete(share!.id);
      share = null;
    });
  }

  const setShowLog = (show_log: boolean) =>
    run(async () => {
      share = await shares.update<Share>(share!.id, { show_log });
    });

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      copied = true;
      setTimeout(() => (copied = false), 2000);
    } catch {
      message = 'Could not copy. Select the link and copy it instead.';
    }
  }

  function send() {
    navigator
      .share({
        title: 'My cycle on Flowy',
        text: 'Here’s where I am in my cycle, plus a quiz to see how well you know it.',
        url: link,
      })
      .catch(() => {});
  }
</script>

<section class="card flex flex-col gap-4">
  <div class="flex items-start gap-3">
    <span
      class="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xl dark:bg-brand-500/15"
      aria-hidden="true">💞</span
    >
    <div>
      <h2 class="font-semibold">Share with your partner</h2>
      <p class="text-sm text-zinc-500">
        A private link to where you are in your cycle. They don’t need an account.
      </p>
    </div>
  </div>

  {#if !loaded && !message}
    <p class="text-sm text-zinc-500">Loading…</p>
  {:else if loaded && !share}
    <ul class="flex flex-col gap-2 text-sm text-zinc-600 dark:text-zinc-400">
      <li class="flex gap-2">
        <span aria-hidden="true">🗓️</span> Your phase, cycle day and when your period is due
      </li>
      <li class="flex gap-2"><span aria-hidden="true">🌱</span> Your fertile days</li>
      <li class="flex gap-2">
        <span aria-hidden="true">🤝</span> Tips on how to support you in each phase
      </li>
      <li class="flex gap-2">
        <span aria-hidden="true">🧠</span> A quiz on how well they know your cycle
      </li>
    </ul>
    <p class="text-xs text-zinc-500">
      Never your notes, history, sex or other logs. You can turn the link off any time.
    </p>
    <button class="btn-primary" disabled={busy} onclick={start}>Create a private link</button>
  {:else if share}
    <div
      class="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-1.5 pl-3 dark:border-zinc-700 dark:bg-zinc-800/60"
    >
      <span class="min-w-0 flex-1 truncate text-sm text-zinc-600 dark:text-zinc-300">{link}</span>
      <button class="btn-secondary shrink-0 px-3 py-2 text-sm" onclick={copy}
        >{copied ? 'Copied ✓' : 'Copy'}</button
      >
      {#if canShare}
        <button class="btn-primary shrink-0 px-3 py-2 text-sm" onclick={send}>Send</button>
      {/if}
    </div>

    <label class="flex-row items-center justify-between gap-4 font-normal">
      <span>
        Also share today’s moods and symptoms
        <span class="block text-xs text-zinc-500">Adds a “How are they feeling?” question too.</span
        >
      </span>
      <input
        type="checkbox"
        checked={share.show_log}
        disabled={busy}
        onchange={(e) => setShowLog(e.currentTarget.checked)}
      />
    </label>

    <div class="flex flex-wrap gap-2 text-sm">
      <a class="btn-secondary px-3 py-2 text-sm" href={link} target="_blank" rel="noopener"
        >Preview</a
      >
      <button class="btn-secondary px-3 py-2 text-sm" disabled={busy} onclick={renew}
        >New link</button
      >
      <button
        class="btn px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
        disabled={busy}
        onclick={stop}>{confirmStop ? 'Tap again to stop' : 'Stop sharing'}</button
      >
    </div>
  {/if}
  {#if message}<p class="text-sm text-zinc-500" role="status">{message}</p>{/if}
</section>
