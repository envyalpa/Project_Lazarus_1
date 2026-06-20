<script>
  import { browser } from '$app/environment';

  let now = $state(new Date());
  let interval = $state(null);

  $effect(() => {
    if (browser) {
      now = new Date();
      interval = setInterval(() => {
        now = new Date();
      }, 1000);
      return () => {
        if (interval) clearInterval(interval);
      };
    }
  });

  let timeStr = $derived(
    String(now.getHours()).padStart(2, '0') + ':' +
    String(now.getMinutes()).padStart(2, '0') + ':' +
    String(now.getSeconds()).padStart(2, '0')
  );

  let dateStr = $derived(
    now.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  );
</script>

<section data-section="clock">
  <div class="clock-display">
    <time data-label="clock-time" class="clock-time">{timeStr}</time>
    <p data-label="clock-date" class="clock-date">{dateStr}</p>
  </div>
</section>

<style>
  section[data-section="clock"] {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .clock-display {
    text-align: center;
  }

  .clock-time {
    display: block;
    font-family: var(--font-heading-1);
    font-size: clamp(42px, 11vw, var(--fs-display));
    font-weight: 700;
    color: var(--text);
    letter-spacing: 4px;
    line-height: 1;
    text-shadow:
      0 0 10px var(--cyan-glow),
      0 0 40px rgba(0, 212, 255, 0.1);
  }

  .clock-date {
    margin-top: 12px;
    font-family: var(--font-body);
    font-size: clamp(14px, 2.8vw, var(--fs-heading-2));
    font-weight: 500;
    color: var(--text-dim);
    text-transform: uppercase;
    letter-spacing: 2px;
  }
</style>
