<script>
  // STORE IMPORT
  import { compArrayStore } from "../../store";
</script>

<div id="component-stats">
  Component stats

  <ul>
    {#each $compArrayStore as comp}
      <li>
        {`${comp.$$.id}: ${JSON.stringify(comp.$$.ctx[0])}`}
      </li>
    {/each}
  </ul>
</div>

<style>
  #component-stats {
    border-left: 1px solid rgb(1, 1, 1);

    width: 50%;
    height: 100%;
  }
</style>
