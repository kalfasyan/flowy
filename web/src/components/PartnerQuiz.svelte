<script lang="ts">
  import { nameOf, quiz, type PartnerView, type Question } from '../lib/partner';

  // A few quick questions on how well the partner knows the shared cycle, with
  // the answer explained after each one. The best score is kept on this device.
  let { view, token }: { view: PartnerView; token: string } = $props();

  const name = $derived(nameOf(view));
  const bestKey = $derived(`flowy:quiz:${token}`);

  let questions = $state<Question[]>([]);
  let at = $state(-1);
  let chosen = $state<number | null>(null);
  let score = $state(0);
  let best = $state(readBest());

  function readBest(): number | null {
    try {
      const v = localStorage.getItem(`flowy:quiz:${token}`);
      return v === null ? null : Number(v);
    } catch {
      return null;
    }
  }

  function start() {
    questions = quiz(view);
    at = 0;
    chosen = null;
    score = 0;
  }

  function choose(i: number) {
    if (chosen !== null) return;
    chosen = i;
    if (i === questions[at].answer) score++;
  }

  function next() {
    chosen = null;
    at++;
    if (at === questions.length && (best === null || score > best)) {
      best = score;
      try {
        localStorage.setItem(bestKey, String(score));
      } catch {
        // private browsing: the best score just isn't kept
      }
    }
  }

  const q = $derived(questions[at]);
  const done = $derived(at >= 0 && at === questions.length);
  const verdict = $derived.by(() => {
    const share = score / questions.length;
    if (share === 1) return { icon: '🏆', text: `Perfect! You really know ${name}’s cycle.` };
    if (share >= 0.7) return { icon: '🌟', text: 'Great job! Just a detail or two to learn.' };
    if (share >= 0.4) return { icon: '🌱', text: 'Not bad! Read the tips above and try again.' };
    return { icon: '💡', text: 'Room to grow. Every question you missed taught you something.' };
  });
</script>

<section class="card flex flex-col gap-4 overflow-hidden">
  {#if at < 0}
    <div class="flex items-center gap-4">
      <span
        class="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-fertile-500 text-2xl shadow-md"
        aria-hidden="true">🧠</span
      >
      <div>
        <h2 class="font-semibold">How well do you know {name}’s cycle?</h2>
        <p class="text-sm text-zinc-500">
          A few quick questions{best !== null ? ` · your best: ${best}` : ''}
        </p>
      </div>
    </div>
    <button class="btn-primary" onclick={start}>Take the quiz</button>
  {:else if done}
    <div class="flex flex-col items-center gap-2 py-2 text-center">
      <span class="pop text-5xl" aria-hidden="true">{verdict.icon}</span>
      <p class="text-3xl font-bold">{score} / {questions.length}</p>
      <p class="text-sm text-zinc-600 dark:text-zinc-400">{verdict.text}</p>
    </div>
    <button class="btn-secondary" onclick={start}>Play again</button>
  {:else if q}
    <div class="flex items-center gap-1.5" aria-hidden="true">
      {#each questions as _, i (i)}
        <span
          class="h-1.5 flex-1 rounded-full transition-colors {i < at ||
          (i === at && chosen !== null)
            ? 'bg-brand-500'
            : 'bg-zinc-200 dark:bg-zinc-700'}"
        ></span>
      {/each}
    </div>
    <p class="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
      Question {at + 1} of {questions.length}
    </p>
    <h2 class="text-lg leading-snug font-semibold">{q.question}</h2>
    <div class="grid gap-2 {q.options.length === 2 ? 'grid-cols-2' : ''}">
      {#each q.options as option, i (option)}
        {@const right = chosen !== null && i === q.answer}
        {@const wrong = chosen === i && i !== q.answer}
        <button
          class="rounded-xl border-2 px-4 py-3 text-left font-medium transition
            {right
            ? 'border-fertile-500 bg-fertile-100 text-fertile-700 dark:bg-fertile-500/20 dark:text-fertile-500'
            : wrong
              ? 'shake border-red-400 bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400'
              : chosen !== null
                ? 'border-zinc-200 opacity-60 dark:border-zinc-700'
                : 'border-zinc-200 hover:border-brand-400 active:scale-[0.98] dark:border-zinc-700'}"
          disabled={chosen !== null}
          onclick={() => choose(i)}
        >
          {option}{right ? ' ✓' : wrong ? ' ✗' : ''}
        </button>
      {/each}
    </div>
    {#if chosen !== null}
      <p
        class="rounded-xl bg-zinc-50 p-3 text-sm text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300"
      >
        {chosen === q.answer ? 'Right! ' : ''}{q.why}
      </p>
      <button class="btn-primary" onclick={next}>
        {at + 1 === questions.length ? 'See your score' : 'Next'}
      </button>
    {/if}
  {/if}
</section>

<style>
  .pop {
    animation: pop 0.5s cubic-bezier(0.3, 1.6, 0.5, 1);
  }
  .shake {
    animation: shake 0.35s;
  }
  @keyframes pop {
    from {
      transform: scale(0.3);
      opacity: 0;
    }
  }
  @keyframes shake {
    25% {
      transform: translateX(-4px);
    }
    75% {
      transform: translateX(4px);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .pop,
    .shake {
      animation: none;
    }
  }
</style>
