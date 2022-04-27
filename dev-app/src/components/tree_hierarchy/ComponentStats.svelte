<script>
  // STORE IMPORT
  import { compArrayStore } from "../../store";
</script>

<div id="component-stats">
  Component stats

  <ul id="stat-list">
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

  #stat-list {
    list-style: none;
    text-align: left;
  }

  li {
    margin-bottom: 5px;
  }
</style>
