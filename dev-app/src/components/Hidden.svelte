<script>
  import { createEventDispatcher } from 'svelte';

  let shown = false;

  let dispatch = createEventDispatcher();

  export function show() {
      shown = !shown;
      dispatch('show', shown);
  }

  export function noShow() {
    shown = false;
    dispatch('show', shown);
  }
</script>

<svelte:options accessors={true}/>
{#if shown}
  <slot/>
{/if}