<script lang="ts">
  import type { CyclePhase } from '../lib/cycle';

  // Mochi, the cat on the today screen. It naps during a period, plays in the
  // follicular phase, sends hearts in the fertile window and curls up before the
  // next period. Tap it for a little jump.
  let { phase }: { phase: CyclePhase | null } = $props();

  const mood = $derived(
    phase === 'menstrual'
      ? 'sleepy'
      : phase === 'fertile'
        ? 'love'
        : phase === 'luteal'
          ? 'cozy'
          : 'happy',
  );

  let jumping = $state(false);
  function tap() {
    jumping = false;
    requestAnimationFrame(() => (jumping = true));
  }
</script>

<button
  class="cat {mood} shrink-0"
  class:jumping
  onclick={tap}
  onanimationend={(e) => e.animationName.endsWith('jump') && (jumping = false)}
  aria-label="Mochi the cat"
>
  <svg viewBox="0 0 120 120" class="size-24" aria-hidden="true">
    <ellipse cx="60" cy="112" rx="34" ry="5" class="fill-zinc-900/10 dark:fill-white/10" />
    <g class="body">
      <path
        class="tail"
        d="M88 96c14 0 22-10 20-24-1-7-8-8-9-2 0 8-3 14-12 15"
        fill="none"
        stroke="#f2a35e"
        stroke-width="9"
        stroke-linecap="round"
      />
      <ellipse cx="60" cy="88" rx="30" ry="22" fill="#f6b16e" />
      <path
        d="M44 72c4 4 4 10 0 14M60 68v12M76 72c-4 4-4 10 0 14"
        stroke="#e08b45"
        stroke-width="3.5"
        stroke-linecap="round"
        fill="none"
      />
      <ellipse cx="60" cy="96" rx="16" ry="12" fill="#fde7d0" />
      <ellipse cx="46" cy="108" rx="8" ry="5" fill="#fde7d0" />
      <ellipse cx="74" cy="108" rx="8" ry="5" fill="#fde7d0" />
      <g class="head">
        <path d="M30 34 34 10l20 16ZM90 34 86 10 66 26Z" fill="#f6b16e" />
        <path d="M35 28 37 16l9 8ZM85 28l-2-12-9 8Z" fill="#fda4af" />
        <ellipse cx="60" cy="44" rx="32" ry="27" fill="#f6b16e" />
        <path
          d="M52 20c2 4 2 8 0 11M60 18v12M68 20c-2 4-2 8 0 11"
          stroke="#e08b45"
          stroke-width="3"
          stroke-linecap="round"
          fill="none"
        />
        {#if mood === 'sleepy'}
          <path
            d="M41 46q6 5 12 0M67 46q6 5 12 0"
            stroke="#3f2a1d"
            stroke-width="3"
            stroke-linecap="round"
            fill="none"
          />
        {:else if mood === 'cozy'}
          <path d="M41 45h12M67 45h12" stroke="#3f2a1d" stroke-width="3" stroke-linecap="round" />
          <path
            d="M42 48q5 3 10 0M68 48q5 3 10 0"
            stroke="#3f2a1d"
            stroke-width="2"
            stroke-linecap="round"
            fill="none"
          />
        {:else}
          <g class="eyes">
            <ellipse cx="47" cy="45" rx="5" ry="6" fill="#3f2a1d" />
            <ellipse cx="73" cy="45" rx="5" ry="6" fill="#3f2a1d" />
            <circle cx="49" cy="43" r="1.8" fill="#fff" />
            <circle cx="75" cy="43" r="1.8" fill="#fff" />
          </g>
        {/if}
        <ellipse cx="38" cy="54" rx="5" ry="3" fill="#fb7185" opacity=".45" />
        <ellipse cx="82" cy="54" rx="5" ry="3" fill="#fb7185" opacity=".45" />
        <path d="M57 52h6l-3 3.5Z" fill="#f43f5e" />
        <path
          d="M60 55.5q-3 4-7 2M60 55.5q3 4 7 2"
          stroke="#3f2a1d"
          stroke-width="2"
          stroke-linecap="round"
          fill="none"
        />
        <path
          d="M24 50l12 2M24 57l12-1M96 50l-12 2M96 57l-12-1"
          stroke="#3f2a1d"
          stroke-width="1.5"
          stroke-linecap="round"
          opacity=".5"
        />
      </g>
    </g>
    {#if mood === 'sleepy'}
      <g class="zzz fill-zinc-400 font-bold">
        <text x="92" y="24" font-size="12">z</text>
        <text x="100" y="14" font-size="9">z</text>
      </g>
    {:else if mood === 'love'}
      <path class="heart" d="M100 26c-3-5-10-2-8 3l8 8 8-8c2-5-5-8-8-3Z" fill="#f43f5e" />
    {/if}
  </svg>
</button>

<style>
  .body {
    transform-origin: 60px 110px;
    animation: breathe 3s ease-in-out infinite;
  }
  .tail {
    transform-origin: 88px 96px;
    animation: wag 2.4s ease-in-out infinite;
  }
  .happy .tail,
  .love .tail {
    animation-duration: 0.9s;
  }
  .sleepy .tail,
  .cozy .tail {
    animation-duration: 4s;
  }
  .eyes {
    transform-origin: 60px 45px;
    animation: blink 4s infinite;
  }
  .sleepy .head {
    transform-origin: 60px 70px;
    transform: rotate(-6deg) translateY(3px);
  }
  .zzz text {
    animation: float 3s ease-in-out infinite;
  }
  .zzz text + text {
    animation-delay: 1.2s;
  }
  .heart {
    transform-origin: 100px 30px;
    animation: float 2s ease-in-out infinite;
  }
  .jumping svg {
    animation: jump 0.6s ease-out;
  }

  @keyframes breathe {
    50% {
      transform: scale(1.025, 0.98);
    }
  }
  @keyframes wag {
    0%,
    100% {
      transform: rotate(-8deg);
    }
    50% {
      transform: rotate(14deg);
    }
  }
  @keyframes blink {
    0%,
    92%,
    100% {
      transform: scaleY(1);
    }
    95% {
      transform: scaleY(0.1);
    }
  }
  @keyframes float {
    0% {
      opacity: 0;
      transform: translateY(6px);
    }
    40% {
      opacity: 1;
    }
    100% {
      opacity: 0;
      transform: translateY(-10px);
    }
  }
  @keyframes jump {
    30% {
      transform: translateY(-18px) scale(1.04, 0.96);
    }
    60% {
      transform: translateY(0) scale(1.06, 0.92);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .cat * {
      animation: none !important;
    }
  }
</style>
