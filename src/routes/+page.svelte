<script>
  import DigitalClock from '$lib/components/DigitalClock.svelte';
  import EDIGreeting from '$lib/components/EDIGreeting.svelte';

  let { data } = $props();
</script>

<div data-section="dashboard" class="dashboard">
  <div class="center-group">
    <DigitalClock />
    <EDIGreeting healthSummary={data?.healthSummary} />
  </div>
</div>

<style>
  div[data-section="dashboard"] {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
  }

  .center-group {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
</style>
