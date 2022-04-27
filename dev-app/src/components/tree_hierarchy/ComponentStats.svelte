<script>
  // STORE IMPORT
  import { compArrayStore } from "../../store";
</script>

<div id="component-stats">
  <div id="stats-header">Component stats</div>

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

  #stats-header {
    background-color: rgb(45, 42, 45);
    border-bottom: 1px solid rgb(70, 80, 90);
    display: flex;
    justify-content: space-evenly;
    align-items: center;
    height: 4%;
    width: 100%;
  }
</style>
