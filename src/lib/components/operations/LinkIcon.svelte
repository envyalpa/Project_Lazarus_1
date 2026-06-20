<script>
  import DynamicIcon from './DynamicIcon.svelte';
  import { getIconForUrl } from '$lib/links.js';

  let { url, size = 16, color = 'var(--accent-cyan)' } = $props();

  let iconName = $derived(getIconForUrl(url));
</script>

<DynamicIcon name={iconName} {size} {color} />
