<script>
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  $effect(() => {
    const id = $page.params.id;
    if (id) goto('/lounge/tv?open=' + id, { replaceState: true });
  });
</script>
